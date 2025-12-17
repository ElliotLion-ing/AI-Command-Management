/**
 * Command uploader module
 * Handles command file uploads with validation, and atomic operations
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { logger } from '../utils/logger';
import { 
  UploadCommandInput, 
  UploadCommandOutput, 
  CommandUploadError,
  CommandUploadConfig 
} from '../types';
import { CommandSyncer } from './syncer';

/**
 * Command uploader class
 * Handles command file uploads with validation
 */
export class CommandUploader {
  private commandsDirectory: string;
  private config: CommandUploadConfig;
  private syncer: CommandSyncer;

  constructor(commandsDirectory: string, config: CommandUploadConfig, serverDomain?: string) {
    this.commandsDirectory = commandsDirectory;
    this.config = config;
    this.syncer = new CommandSyncer(serverDomain || '');
  }

  /**
   * Upload a command to the filesystem
   */
  async upload(input: UploadCommandInput): Promise<UploadCommandOutput> {
    try {
      // 1. Validate input
      this.validateInput(input);

      // 2. Generate filename (ensure .md extension)
      const fileName = this.generateFileName(input.command_name);

      // 3. Determine file path
      const filePath = path.join(this.commandsDirectory, fileName);

      // 4. Security check: prevent path traversal
      if (!filePath.startsWith(this.commandsDirectory)) {
        throw new CommandUploadError(
          'Invalid file path: path traversal detected',
          'PATH_TRAVERSAL_ATTEMPT',
          { attempted_path: filePath }
        );
      }

      // 5. Check if file already exists (for update vs new upload)
      let isUpdate = false;
      try {
        await fs.access(filePath);
        isUpdate = true;
      } catch {
        isUpdate = false;
      }

      // 6. Write file atomically
      await this.writeFileAtomic(filePath, input.command_content);

      // 7. Set permissions
      await this.setFilePermissions(filePath);

      // 8. Sync to remote database (after successful file write)
      let syncStatus: 'success' | 'failed' | 'skipped' = 'skipped';
      let syncError: string | undefined;

      if (this.syncer.isEnabled() && input.owner) {
        const syncResult = await this.syncer.sync(
          input.command_name,
          input.version,
          input.owner,
          input.release_note,
          input.description
        );
        syncStatus = syncResult.success ? 'success' : 'failed';
        syncError = syncResult.error;
      } else if (!this.syncer.isEnabled()) {
        logger.debug('Sync skipped: mcp_server_domain not configured');
      } else if (!input.owner) {
        logger.debug('Sync skipped: owner not provided');
      }

      // 9. Build result message
      const action = isUpdate ? 'updated' : 'uploaded';
      let message = `Command ${action} successfully`;
      if (syncStatus === 'success') {
        message += ', database sync completed';
      } else if (syncStatus === 'failed') {
        message += `. Warning: File saved but database sync failed - ${syncError}`;
      }

      logger.info(`Command ${action} successfully`, {
        command: input.command_name,
        path: filePath,
        version: input.version,
        isUpdate,
        syncStatus,
      });

      return {
        success: true,
        command_path: filePath,
        command_name: fileName,
        message,
        is_update: isUpdate,
        version: input.version,
        sync_status: syncStatus,
        sync_error: syncError,
      };
    } catch (error) {
      logger.error('Command upload failed', error as Error, {
        command: input.command_name,
        contentSize: input.command_content?.length,
      });
      throw error;
    }
  }

  /**
   * Validate upload input
   */
  private validateInput(input: UploadCommandInput): void {
    // Validate command name (allow alphanumeric, underscores, hyphens)
    // First strip .md suffix if present for validation
    let nameToValidate = input.command_name.trim();
    if (nameToValidate.toLowerCase().endsWith('.md')) {
      nameToValidate = nameToValidate.slice(0, -3);
    }
    
    // Basic character validation
    if (!/^[a-zA-Z0-9_-]+$/.test(nameToValidate)) {
      throw new CommandUploadError(
        'Invalid command name: must contain only alphanumeric characters, underscores, and hyphens (no spaces allowed)',
        'INVALID_COMMAND_NAME',
        { command_name: input.command_name }
      );
    }

    // Validate naming convention: {Module}-xx-yy-zz format
    // Check if name has at least one hyphen (Module prefix required)
    if (!nameToValidate.includes('-')) {
      throw new CommandUploadError(
        'Invalid command name format: must follow {Module}-xx-yy-zz convention. Missing Module prefix and hyphen separator.',
        'INVALID_NAMING_CONVENTION',
        { 
          command_name: input.command_name,
          rule: 'Format: {Module}-xx-yy-zz, e.g., zNet-proxy-slow-meeting-join, ZMDB-log-analyze'
        }
      );
    }

    // Check for redundant suffixes
    const redundantSuffixes = ['-command', '-analysis', '-tool', '-script'];
    for (const suffix of redundantSuffixes) {
      if (nameToValidate.toLowerCase().endsWith(suffix)) {
        logger.warn('Command name has redundant suffix', {
          command_name: nameToValidate,
          redundant_suffix: suffix,
          suggestion: nameToValidate.slice(0, -suffix.length)
        });
        // Just warn, don't throw - let AI handle the suggestion
      }
    }

    // Validate content size
    const sizeMB = Buffer.byteLength(input.command_content, 'utf-8') / (1024 * 1024);
    if (sizeMB > this.config.maxSizeMB) {
      throw new CommandUploadError(
        `Command size ${sizeMB.toFixed(2)}MB exceeds limit ${this.config.maxSizeMB}MB`,
        'SIZE_LIMIT_EXCEEDED',
        { size_mb: sizeMB, limit_mb: this.config.maxSizeMB }
      );
    }

    // Validate content is not empty
    if (!input.command_content || input.command_content.trim().length === 0) {
      throw new CommandUploadError(
        'Command content cannot be empty',
        'EMPTY_CONTENT'
      );
    }

    // Validate version format (semantic versioning)
    if (!/^\d+\.\d+\.\d+$/.test(input.version)) {
      throw new CommandUploadError(
        'Invalid version format: must be semantic versioning (e.g., 1.0.0)',
        'INVALID_VERSION',
        { version: input.version }
      );
    }

    // Validate owner if provided
    if (input.owner && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.owner)) {
      throw new CommandUploadError(
        'Invalid owner email format',
        'INVALID_OWNER_EMAIL',
        { owner: input.owner }
      );
    }
  }

  /**
   * Generate filename with .md extension
   */
  private generateFileName(commandName: string): string {
    let fileName = commandName.trim();
    
    // Add .md extension if not present
    if (!fileName.toLowerCase().endsWith('.md')) {
      fileName = `${fileName}.md`;
    }
    
    return fileName;
  }

  /**
   * Write file atomically (write to temp, then rename)
   */
  private async writeFileAtomic(filePath: string, content: string): Promise<void> {
    const tempPath = `${filePath}.tmp`;

    try {
      // Write to temp file
      await fs.writeFile(tempPath, content, { encoding: 'utf-8' });

      // Rename to final path (atomic on most filesystems)
      await fs.rename(tempPath, filePath);
    } catch (error) {
      // Clean up temp file on error
      try {
        await fs.unlink(tempPath);
      } catch {
        // Ignore cleanup errors
      }

      throw new CommandUploadError(
        `Failed to write command file: ${(error as Error).message}`,
        'FILE_WRITE_FAILED',
        { path: filePath, error: (error as Error).message }
      );
    }
  }

  /**
   * Set file permissions
   */
  private async setFilePermissions(filePath: string): Promise<void> {
    try {
      const mode = parseInt(this.config.filePermissions, 8);
      await fs.chmod(filePath, mode);
    } catch (error) {
      // Log warning but don't fail upload
      logger.warn('Failed to set file permissions', {
        path: filePath,
        permissions: this.config.filePermissions,
        error: (error as Error).message,
      });
    }
  }
}

