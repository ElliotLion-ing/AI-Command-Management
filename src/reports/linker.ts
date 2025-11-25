/**
 * Report linker
 * Generates accessible links to report files
 */

import * as path from 'path';
import { logger } from '../utils/logger';

/**
 * Report linker class
 */
export class ReportLinker {
  private reportsDir: string;
  private baseUrl: string;

  constructor(reportsDir: string, baseUrl: string) {
    this.reportsDir = reportsDir;
    this.baseUrl = baseUrl;
  }

  /**
   * Generate link for a report file
   */
  generateLink(reportPath: string): string {
    // If no base URL configured, return file:// URL
    if (!this.baseUrl || this.baseUrl === '') {
      return `file://${reportPath}`;
    }

    try {
      // Get relative path from reports directory
      const relativePath = path.relative(this.reportsDir, reportPath);

      // URL encode the path (preserve directory separators)
      const encodedPath = relativePath
        .split(path.sep)
        .map(segment => encodeURIComponent(segment))
        .join('/');

      // Construct full URL
      const url = this.baseUrl.endsWith('/')
        ? `${this.baseUrl}${encodedPath}`
        : `${this.baseUrl}/${encodedPath}`;

      logger.debug(`Generated link for report: ${reportPath} -> ${url}`);
      return url;
    } catch (error) {
      logger.warn(`Failed to generate link for report: ${reportPath}`, {
        error: error instanceof Error ? error.message : String(error),
      });
      // Fallback to file:// URL
      return `file://${reportPath}`;
    }
  }

  /**
   * Batch generate links for multiple reports
   */
  generateLinks(reportPaths: string[]): string[] {
    return reportPaths.map(reportPath => this.generateLink(reportPath));
  }

  /**
   * Update base URL (for runtime configuration changes)
   */
  updateBaseUrl(newBaseUrl: string): void {
    this.baseUrl = newBaseUrl;
    logger.info(`Report link base URL updated: ${newBaseUrl}`);
  }
}

