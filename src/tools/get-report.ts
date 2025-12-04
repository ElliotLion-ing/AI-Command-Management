/**
 * get_report tool handler
 * Retrieves full content of a specific report
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { ReportFinder } from '../reports/finder';
import { ReportLinker } from '../reports/linker';
import { validateCommandName } from '../utils/validators';
import { createInvalidInputError } from '../utils/errors';
import { logger } from '../utils/logger';

/**
 * Input for get_report tool
 */
export interface GetReportInput {
  command_name: string;
  report_name: string;
}

/**
 * Output for get_report tool
 */
export interface GetReportOutput {
  name: string;
  command_name: string;
  content: string;
  metadata: {
    path: string;
    size: number;
    date: string | null;
    link?: string;
  };
}

/**
 * Get report handler
 */
export async function handleGetReport(
  input: GetReportInput,
  _reportFinder: ReportFinder,
  reportLinker: ReportLinker,
  reportsDirectory: string
): Promise<GetReportOutput | { error: unknown }> {
  try {
    // Validate command name
    if (!validateCommandName(input.command_name)) {
      return createInvalidInputError(
        'Invalid command name: must be alphanumeric with underscores/hyphens only'
      );
    }

    // Validate report name
    if (!input.report_name || typeof input.report_name !== 'string') {
      return createInvalidInputError('Report name is required');
    }

    logger.info('get_report tool invoked', {
      commandName: input.command_name,
      reportName: input.report_name,
    });

    // Build report file path
    const reportDir = path.join(reportsDirectory, input.command_name);
    const reportPath = path.join(reportDir, input.report_name);

    // Security check: prevent path traversal
    const normalizedPath = path.normalize(reportPath);
    if (!normalizedPath.startsWith(reportsDirectory)) {
      return createInvalidInputError('Invalid report path: path traversal detected');
    }

    // Check if file exists and read content
    try {
      const stats = await fs.stat(reportPath);
      const content = await fs.readFile(reportPath, 'utf-8');

      // Extract date from filename
      const date = extractDate(input.report_name);

      // Generate link if configured
      const link = reportLinker.generateLink(reportPath);

      const output: GetReportOutput = {
        name: input.report_name,
        command_name: input.command_name,
        content,
        metadata: {
          path: reportPath,
          size: stats.size,
          date: date ? date.toISOString() : null,
          link,
        },
      };

      logger.info('get_report completed', {
        commandName: input.command_name,
        reportName: input.report_name,
        size: stats.size,
      });

      return output;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return {
          error: {
            code: 'REPORT_NOT_FOUND',
            message: `Report not found: ${input.report_name} for command ${input.command_name}`,
            details: {
              command_name: input.command_name,
              report_name: input.report_name,
              expected_path: reportPath,
            },
          },
        };
      }
      throw error;
    }
  } catch (error) {
    logger.error('get_report failed', error as Error, {
      commandName: input.command_name,
      reportName: input.report_name,
    });
    return { error };
  }
}

/**
 * Extract date from filename
 * Patterns: YYYYMMDD or YYYY-MM-DD or YYYY_MM_DD
 */
function extractDate(filename: string): Date | null {
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

