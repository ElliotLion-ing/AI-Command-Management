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

/**
 * Report uploader class
 * Handles report file uploads with validation and versioning
 */
export class ReportUploader {
  private reportsDirectory: string;
  private config: ReportUploadConfig;

  constructor(reportsDirectory: string, config: ReportUploadConfig) {
    this.reportsDirectory = reportsDirectory;
    this.config = config;
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
      const finalPath = await this.resolveVersionConflict(reportDir, fileName);

      // 5. Write file atomically
      await this.writeFileAtomic(finalPath, input.report_content);

      // 6. Set permissions
      await this.setFilePermissions(finalPath);

      // 7. Generate result
      const version = this.extractVersion(path.basename(finalPath));
      const link = this.generateLink(finalPath);

      logger.info('Report uploaded successfully', {
        command: input.command_name,
        path: finalPath,
        size: input.report_content.length,
        version,
      });

      return {
        success: true,
        report_path: finalPath,
        report_name: path.basename(finalPath),
        report_link: link,
        message: 'Report uploaded successfully',
        version,
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
      // Check for invalid characters
      if (!/^[a-zA-Z0-9_\u4e00-\u9fa5\s-]+$/.test(input.report_name)) {
        throw new ReportUploadError(
          'Invalid report name: must contain only letters, numbers, Chinese characters, underscores, hyphens, and spaces',
          'INVALID_REPORT_NAME',
          { report_name: input.report_name }
        );
      }
      // Check length
      if (input.report_name.length > 100) {
        throw new ReportUploadError(
          'Report name too long: maximum 100 characters',
          'REPORT_NAME_TOO_LONG',
          { report_name_length: input.report_name.length }
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
   * Generate filename with timestamp
   */
  private generateFileName(commandName: string, customName?: string): string {
    const now = new Date();
    const timestamp = this.formatTimestamp(now);
    
    if (customName) {
      // Sanitize custom name (replace spaces and special chars)
      const sanitized = customName
        .trim()
        .replace(/\s+/g, '_')       // Replace spaces with underscores
        .replace(/[^\w\u4e00-\u9fa5-]/g, ''); // Keep only word chars, Chinese, hyphens
      return `${commandName}_${sanitized}_${timestamp}_v1.md`;
    }
    
    return `${commandName}_报告_${timestamp}_v1.md`;
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
   */
  private async resolveVersionConflict(
    directory: string,
    fileName: string
  ): Promise<string> {
    if (!this.config.autoVersioning) {
      return path.join(directory, fileName);
    }

    let version = 1;
    let finalPath = path.join(directory, fileName);
    let fileExists = true;

    // Check if file exists and increment version until we find a free slot
    while (fileExists) {
      try {
        await fs.access(finalPath);
        // File exists, increment version
        version++;
        const newFileName = fileName.replace(/_v\d+\.md$/, `_v${version}.md`);
        finalPath = path.join(directory, newFileName);
      } catch {
        // File doesn't exist, use this path
        fileExists = false;
      }
    }

    if (version > 1) {
      logger.info('Version conflict resolved', {
        original_file: fileName,
        final_version: version,
      });
    }

    return finalPath;
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
   * Extract version number from filename
   */
  private extractVersion(fileName: string): number {
    const match = fileName.match(/_v(\d+)\.md$/);
    if (match && match[1]) {
      return parseInt(match[1], 10);
    }
    return 1;
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

