/**
 * upload_report tool handler
 */

import { UploadReportInput, UploadReportOutput, ReportUploadError } from '../types';
import { ReportUploader } from '../reports/uploader';
import { logger } from '../utils/logger';

/**
 * Upload report handler
 */
export async function handleUploadReport(
  input: UploadReportInput,
  uploader: ReportUploader
): Promise<UploadReportOutput | { error: unknown }> {
  try {
    logger.info('upload_report tool invoked', {
      commandName: input.command_name,
      contentSize: input.report_content?.length,
      hasCustomName: !!input.report_name,
    });

    // Upload report (validation handled by uploader)
    const result = await uploader.upload(input);

    logger.info('upload_report completed', {
      commandName: input.command_name,
      reportPath: result.report_path,
      version: result.version,
    });

    return result;
  } catch (error) {
    if (error instanceof ReportUploadError) {
      logger.error('upload_report failed', error, {
        code: error.code,
        details: error.details,
      });
      return {
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
      };
    }

    logger.error('upload_report failed with unexpected error', error as Error, {
      commandName: input.command_name,
    });
    return { 
      error: {
        code: 'UNEXPECTED_ERROR',
        message: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

