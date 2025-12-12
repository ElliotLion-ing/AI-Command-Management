/**
 * Report uploader module
 * Handles report file uploads with validation, versioning, and atomic operations
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { logger } from '../utils/logger';
import { 
  UploadReportInput, 
  UploadReportOutput, 
  ReportUploadError,
  ReportUploadConfig 
} from '../types';
import { ReportSyncer } from './syncer';

/**
 * Report uploader class
 * Handles report file uploads with validation and versioning
 */
export class ReportUploader {
  private reportsDirectory: string;
  private config: ReportUploadConfig;
  private syncer: ReportSyncer;

  constructor(reportsDirectory: string, config: ReportUploadConfig, serverDomain?: string) {
    this.reportsDirectory = reportsDirectory;
    this.config = config;
    this.syncer = new ReportSyncer(serverDomain || '');
  }

  /**
   * Upload a report to the filesystem
   */
  async upload(input: UploadReportInput): Promise<UploadReportOutput> {
    try {
      // 1. Validate input
      this.validateInput(input);

      // 2. Prepare directory
      const reportDir = await this.prepareReportDirectory(input.command_name);

      // 3. Generate filename
      const fileName = this.generateFileName(input.command_name, input.report_name);

      // 4. Resolve version conflicts
      const { finalPath, hadConflict, version } = await this.resolveVersionConflict(reportDir, fileName);

      // 5. Write file atomically
      await this.writeFileAtomic(finalPath, input.report_content);

      // 6. Set permissions
      await this.setFilePermissions(finalPath);

      // 7. Sync to remote database (after successful file write)
      const reportName = path.basename(finalPath);
      let syncStatus: 'success' | 'failed' | 'skipped' = 'skipped';
      let syncError: string | undefined;

      if (this.syncer.isEnabled() && input.owner) {
        const syncResult = await this.syncer.sync(
          input.command_name,
          reportName,
          input.owner
        );
        syncStatus = syncResult.success ? 'success' : 'failed';
        syncError = syncResult.error;
      } else if (!this.syncer.isEnabled()) {
        logger.debug('Sync skipped: mcp_server_domain not configured');
      } else if (!input.owner) {
        logger.debug('Sync skipped: owner not provided');
      }

      // 8. Generate result with conflict notification
      const link = this.generateLink(finalPath);
      
      // Build message based on upload and sync status
      let message = 'Report uploaded successfully';
      if (hadConflict) {
        message = `Report uploaded successfully (filename conflict detected, saved as _v${version})`;
      }
      if (syncStatus === 'success') {
        message += ', database sync completed';
      } else if (syncStatus === 'failed') {
        message += `. Warning: File saved but database sync failed - ${syncError}`;
      }

      logger.info('Report uploaded successfully', {
        command: input.command_name,
        path: finalPath,
        size: input.report_content.length,
        version,
        hadConflict,
        syncStatus,
      });

      return {
        success: true,
        report_path: finalPath,
        report_name: reportName,
        report_link: link,
        message,
        version,
        sync_status: syncStatus,
        sync_error: syncError,
      };
    } catch (error) {
      logger.error('Report upload failed', error as Error, {
        command: input.command_name,
        contentSize: input.report_content?.length,
      });
      throw error;
    }
  }

  /**
   * Validate upload input
   */
  private validateInput(input: UploadReportInput): void {
    // Validate command name
    if (!/^[a-zA-Z0-9_-]+$/.test(input.command_name)) {
      throw new ReportUploadError(
        'Invalid command name: must contain only alphanumeric characters, underscores, and hyphens',
        'INVALID_COMMAND_NAME',
        { command_name: input.command_name }
      );
    }

    // Validate content size
    const sizeMB = Buffer.byteLength(input.report_content, 'utf-8') / (1024 * 1024);
    if (sizeMB > this.config.maxSizeMB) {
      throw new ReportUploadError(
        `Report size ${sizeMB.toFixed(2)}MB exceeds limit ${this.config.maxSizeMB}MB`,
        'SIZE_LIMIT_EXCEEDED',
        { size_mb: sizeMB, limit_mb: this.config.maxSizeMB }
      );
    }

    // Validate content is not empty
    if (!input.report_content || input.report_content.trim().length === 0) {
      throw new ReportUploadError(
        'Report content cannot be empty',
        'EMPTY_CONTENT'
      );
    }

    // Validate custom report name if provided
    if (input.report_name) {
      // Strip .md suffix before validation (will be added back in generateFileName)
      let nameToValidate = input.report_name.trim();
      if (nameToValidate.toLowerCase().endsWith('.md')) {
        nameToValidate = nameToValidate.slice(0, -3);
      }
      
      // Check for invalid characters (after removing .md suffix)
      if (!/^[a-zA-Z0-9_\u4e00-\u9fa5\s-]+$/.test(nameToValidate)) {
        throw new ReportUploadError(
          'Invalid report name: must contain only letters, numbers, Chinese characters, underscores, hyphens, and spaces',
          'INVALID_REPORT_NAME',
          { report_name: input.report_name }
        );
      }
      // Check length
      if (nameToValidate.length > 100) {
        throw new ReportUploadError(
          'Report name too long: maximum 100 characters',
          'REPORT_NAME_TOO_LONG',
          { report_name_length: nameToValidate.length }
        );
      }
    }
  }

  /**
   * Prepare report directory (create if not exists)
   */
  private async prepareReportDirectory(commandName: string): Promise<string> {
    const dirName = commandName;
    const reportDir = path.join(this.reportsDirectory, dirName);

    // Security check: prevent path traversal
    if (!reportDir.startsWith(this.reportsDirectory)) {
      throw new ReportUploadError(
        'Invalid directory path: path traversal detected',
        'PATH_TRAVERSAL_ATTEMPT',
        { attempted_path: reportDir }
      );
    }

    try {
      // Check if directory exists
      try {
        await fs.access(reportDir);
      } catch {
        // Directory doesn't exist, create it
        await fs.mkdir(reportDir, { recursive: true });
        logger.info('Created report directory', { path: reportDir });
      }

      return reportDir;
    } catch (error) {
      throw new ReportUploadError(
        `Failed to prepare report directory: ${(error as Error).message}`,
        'DIRECTORY_PREPARATION_FAILED',
        { path: reportDir, error: (error as Error).message }
      );
    }
  }

  /**
   * Generate filename
   * If user provides a custom name, use it directly (only add .md if missing)
   * If no custom name, generate default format with timestamp
   */
  private generateFileName(commandName: string, customName?: string): string {
    if (customName) {
      // User provided a custom name - use it directly
      let fileName = customName.trim();
      
      // Sanitize: replace spaces with underscores, remove invalid chars
      // First strip .md suffix if present, sanitize, then add it back
      const hasMdSuffix = fileName.toLowerCase().endsWith('.md');
      if (hasMdSuffix) {
        fileName = fileName.slice(0, -3);
      }
      fileName = fileName
        .replace(/\s+/g, '_')
        .replace(/[^\w\u4e00-\u9fa5-]/g, '');
      
      // Add .md extension
      return `${fileName}.md`;
    }
    
    // No custom name - generate default format
    const now = new Date();
    const timestamp = this.formatTimestamp(now);
    return `${commandName}_报告_${timestamp}.md`;
  }

  /**
   * Format timestamp for filename
   */
  private formatTimestamp(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    const second = String(date.getSeconds()).padStart(2, '0');
    
    return `${year}${month}${day}_${hour}${minute}${second}`;
  }

  /**
   * Resolve version conflicts
   * If file exists, add _v1, _v2, etc. suffix before .md extension
   * Returns both the final path and whether a conflict was detected
   */
  private async resolveVersionConflict(
    directory: string,
    fileName: string
  ): Promise<{ finalPath: string; hadConflict: boolean; version: number }> {
    if (!this.config.autoVersioning) {
      return {
        finalPath: path.join(directory, fileName),
        hadConflict: false,
        version: 0,
      };
    }

    let finalPath = path.join(directory, fileName);
    
    // First check if original file exists
    try {
      await fs.access(finalPath);
    } catch {
      // File doesn't exist, use original name (no version suffix needed)
      return {
        finalPath,
        hadConflict: false,
        version: 0,
      };
    }

    // File exists, need to add version suffix
    // Extract base name without .md extension
    const baseName = fileName.replace(/\.md$/i, '');
    let version = 1;
    let fileExists = true;

    while (fileExists) {
      const versionedFileName = `${baseName}_v${version}.md`;
      finalPath = path.join(directory, versionedFileName);
      
      try {
        await fs.access(finalPath);
        // Versioned file also exists, try next version
        version++;
      } catch {
        // This version doesn't exist, use it
        fileExists = false;
      }
    }

    logger.info('Version conflict resolved', {
      original_file: fileName,
      final_version: version,
    });

    return { finalPath, hadConflict: true, version };
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

      throw new ReportUploadError(
        `Failed to write report file: ${(error as Error).message}`,
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

  /**
   * Generate HTTP link if base URL configured
   */
  private generateLink(filePath: string): string | undefined {
    if (!this.config.linkBaseUrl || this.config.linkBaseUrl === '') {
      return undefined;
    }

    const relativePath = path.relative(this.reportsDirectory, filePath);
    const urlPath = relativePath.replace(/\\/g, '/'); // Handle Windows paths
    
    // Ensure base URL ends with /
    const baseUrl: string = this.config.linkBaseUrl.endsWith('/') 
      ? this.config.linkBaseUrl 
      : `${this.config.linkBaseUrl}/`;
    
    return `${baseUrl}${urlPath}`;
  }
}

