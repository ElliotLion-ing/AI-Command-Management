/**
 * Report finder
 * Discovers and searches report files
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { ReportMetadata, ReportMatch, FileSystemError } from '../types';
import { logger } from '../utils/logger';

/**
 * Report finder class
 */
export class ReportFinder {
  private reportsDir: string;

  constructor(reportsDir: string) {
    this.reportsDir = reportsDir;
  }

  /**
   * Search reports globally or within a specific command
   */
  async search(query: string, commandFilter?: string): Promise<ReportMatch[]> {
    const lowerQuery = query.toLowerCase();
    const matches: ReportMatch[] = [];

    try {
      // Determine search scope
      let searchDirs: string[];

      if (commandFilter) {
        // Search only in specific command's reports directory
        searchDirs = await this.getCommandReportDirs(commandFilter);
        if (searchDirs.length === 0) {
          logger.warn(`Report directory not found for command: ${commandFilter}`);
          return [];
        }
      } else {
        // Search all report directories (named by command name directly)
        searchDirs = await this.getAllReportDirs();
      }

      // Search each directory
      for (const dir of searchDirs) {
        try {
          const files = await fs.readdir(dir);
          const mdFiles = files.filter(f => f.endsWith('.md'));

          for (const file of mdFiles) {
            try {
              const filePath = path.join(dir, file);
              const content = await fs.readFile(filePath, 'utf-8');
              const stats = await fs.stat(filePath);

              // Check if query matches content
              const lowerContent = content.toLowerCase();
              if (lowerContent.includes(lowerQuery)) {
                const matchCount = this.countMatches(lowerContent, lowerQuery);
                const excerpt = this.extractExcerpt(content, query, 100);
                const commandName = this.extractCommandName(dir);
                const date = this.extractDate(file);

                matches.push({
                  name: file,
                  command_name: commandName,
                  path: filePath,
                  date,
                  size: stats.size,
                  excerpt,
                  match_count: matchCount,
                });
              }
            } catch (error) {
              logger.warn(`Failed to search report file: ${file}`, {
                error: error instanceof Error ? error.message : String(error),
              });
            }
          }
        } catch (error) {
          logger.warn(`Failed to search report directory: ${dir}`, {
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      // Sort by relevance (match count desc, then by date desc)
      matches.sort((a, b) => {
        if (a.match_count !== b.match_count) {
          return b.match_count - a.match_count;
        }
        if (a.date && b.date) {
          return b.date.getTime() - a.date.getTime();
        }
        if (a.date && !b.date) return -1;
        if (!a.date && b.date) return 1;
        return 0;
      });

      logger.info(`Report search completed: ${matches.length} matches found`, {
        query,
        commandFilter,
      });

      return matches;
    } catch (error) {
      throw new FileSystemError(
        `Failed to search reports: ${error instanceof Error ? error.message : String(error)}`,
        this.reportsDir
      );
    }
  }

  /**
   * List reports for a specific command
   * Directory naming convention: {command}/ (command name directly, no suffix)
   */
  async listForCommand(commandName: string): Promise<ReportMetadata[]> {
    // Get all directories that could contain reports for this command
    const reportDirs = await this.getCommandReportDirs(commandName);

    if (reportDirs.length === 0) {
      logger.debug(`No reports directory for command: ${commandName}`);
      return [];
    }

    const reports: ReportMetadata[] = [];

    try {
      for (const reportDir of reportDirs) {
        try {
          const files = await fs.readdir(reportDir);
          const mdFiles = files.filter(f => f.endsWith('.md'));

          for (const file of mdFiles) {
            try {
              const filePath = path.join(reportDir, file);
              const stats = await fs.stat(filePath);
              const date = this.extractDate(file);

              reports.push({
                name: file,
                command_name: commandName,
                path: filePath,
                date,
                size: stats.size,
              });
            } catch (error) {
              logger.warn(`Failed to load report metadata: ${file}`, {
                error: error instanceof Error ? error.message : String(error),
              });
            }
          }
        } catch (error) {
          logger.warn(`Failed to read report directory: ${reportDir}`, {
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      // Sort by date descending (newest first)
      reports.sort((a, b) => {
        if (a.date && b.date) {
          return b.date.getTime() - a.date.getTime();
        }
        if (a.date && !b.date) return -1;
        if (!a.date && b.date) return 1;
        return 0;
      });

      logger.debug(`Listed ${reports.length} reports for command: ${commandName}`);
      return reports;
    } catch (error) {
      throw new FileSystemError(
        `Failed to list reports for command: ${error instanceof Error ? error.message : String(error)}`,
        this.reportsDir
      );
    }
  }

  /**
   * Get report directory for a specific command
   * Directory naming convention: {command}/ (command name directly, no suffix)
   */
  private async getCommandReportDirs(commandName: string): Promise<string[]> {
    const dirs: string[] = [];

    // Check {command}/ directory (command name directly, no -reports suffix)
    const commandDir = path.join(this.reportsDir, commandName);
    try {
      await fs.access(commandDir);
      const stat = await fs.stat(commandDir);
      if (stat.isDirectory()) {
        dirs.push(commandDir);
      }
    } catch {
      // Directory doesn't exist, skip
    }

    return dirs;
  }

  /**
   * Get all report directories in the reports folder
   * Directory naming convention: {command}/ (command name directly, no suffix)
   * Note: Directories ending with '-reports' are excluded (legacy naming)
   */
  private async getAllReportDirs(): Promise<string[]> {
    try {
      const entries = await fs.readdir(this.reportsDir, { withFileTypes: true });
      const dirs: string[] = [];

      for (const entry of entries) {
        if (entry.isDirectory()) {
          // Exclude directories with -reports suffix (legacy naming convention)
          // Only include directories named directly after command names
          if (!entry.name.endsWith('-reports')) {
            dirs.push(path.join(this.reportsDir, entry.name));
          }
        }
      }

      return dirs;
    } catch (error) {
      logger.warn(`Failed to list report directories`, {
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }

  /**
   * Extract date from filename
   * Patterns: YYYYMMDD or YYYY-MM-DD or YYYY_MM_DD
   */
  private extractDate(filename: string): Date | null {
    // Try YYYYMMDD pattern
    const pattern1 = /(\d{8})/;
    const match1 = filename.match(pattern1);
    if (match1 && match1[1]) {
      const dateStr = match1[1];
      const year = parseInt(dateStr.substring(0, 4), 10);
      const month = parseInt(dateStr.substring(4, 6), 10) - 1;
      const day = parseInt(dateStr.substring(6, 8), 10);
      const date = new Date(year, month, day);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }

    // Try YYYY-MM-DD or YYYY_MM_DD pattern
    const pattern2 = /(\d{4})[-_](\d{2})[-_](\d{2})/;
    const match2 = filename.match(pattern2);
    if (match2 && match2[1] && match2[2] && match2[3]) {
      const year = parseInt(match2[1], 10);
      const month = parseInt(match2[2], 10) - 1;
      const day = parseInt(match2[3], 10);
      const date = new Date(year, month, day);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }

    return null;
  }

  /**
   * Extract command name from report directory path
   * Directory naming convention: {command}/ (command name directly, no suffix)
   */
  private extractCommandName(dirPath: string): string {
    // Directory name is the command name itself (no suffix to remove)
    return path.basename(dirPath);
  }

  /**
   * Extract excerpt around match
   */
  private extractExcerpt(content: string, query: string, contextChars: number): string {
    const lowerContent = content.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const index = lowerContent.indexOf(lowerQuery);

    if (index === -1) {
      return '';
    }

    const start = Math.max(0, index - contextChars);
    const end = Math.min(content.length, index + query.length + contextChars);

    let excerpt = content.substring(start, end);

    // Add ellipsis if truncated
    if (start > 0) {
      excerpt = '...' + excerpt;
    }
    if (end < content.length) {
      excerpt = excerpt + '...';
    }

    return excerpt.trim();
  }

  /**
   * Count number of matches in content
   */
  private countMatches(content: string, query: string): number {
    let count = 0;
    let pos = 0;

    while ((pos = content.indexOf(query, pos)) !== -1) {
      count++;
      pos += query.length;
    }

    return count;
  }
}

