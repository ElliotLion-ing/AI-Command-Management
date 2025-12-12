/**
 * report_feedback tool handler
 * Handles user feedback on analysis reports and decides whether to upload or save locally
 */

import { ReportFeedbackInput, ReportFeedbackOutput, ReportUploadError } from '../types';
import { ReportUploader } from '../reports/uploader';
import { logger } from '../utils/logger';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Report feedback handler
 * Saves report locally or uploads based on user decision
 */
export async function handleReportFeedback(
  input: ReportFeedbackInput,
  uploader: ReportUploader
): Promise<ReportFeedbackOutput | { error: unknown }> {
  try {
    logger.info('report_feedback tool invoked', {
      commandName: input.command_name,
      contentSize: input.report_content?.length,
      userWantsUpload: input.user_wants_upload,
      hasCustomName: !!input.report_name,
    });

    if (input.user_wants_upload) {
      // User wants to upload - use the existing uploader
      logger.info('User confirmed upload, uploading report...', {
        owner: input.owner,
      });
      
      const uploadResult = await uploader.upload({
        command_name: input.command_name,
        report_content: input.report_content,
        report_name: input.report_name,
        owner: input.owner,
      });

      // Build message and database_sync info based on sync status
      let message = 'Report uploaded to server successfully';
      let databaseSync: { status: 'success' | 'failed' | 'skipped'; message: string };
      
      if (uploadResult.sync_status === 'success') {
        message = 'Report uploaded to server successfully, database sync completed';
        databaseSync = {
          status: 'success',
          message: '✅ Database sync successful - report metadata saved to database',
        };
      } else if (uploadResult.sync_status === 'failed') {
        message = `Report file saved successfully, but database sync failed: ${uploadResult.sync_error}`;
        databaseSync = {
          status: 'failed',
          message: `❌ Database sync FAILED: ${uploadResult.sync_error}`,
        };
      } else {
        message = 'Report uploaded to server successfully (database sync skipped - no domain or owner configured)';
        databaseSync = {
          status: 'skipped',
          message: '⚠️ Database sync skipped - mcp_server_domain or owner not configured',
        };
      }

      return {
        success: true,
        action_taken: 'uploaded',
        report_path: uploadResult.report_path,
        report_name: uploadResult.report_name,
        report_link: uploadResult.report_link,
        message,
        version: uploadResult.version,
        sync_status: uploadResult.sync_status,
        sync_error: uploadResult.sync_error,
        database_sync: databaseSync,
      };
    } else {
      // User wants local only - save to a temporary/local directory
      logger.info('User declined upload, saving locally only...');
      
      const localResult = await saveReportLocally(
        input.command_name,
        input.report_content,
        input.report_name
      );

      return {
        success: true,
        action_taken: 'saved_locally',
        report_path: localResult.path,
        report_name: localResult.name,
        message: 'Report saved locally (not uploaded to server)',
      };
    }
  } catch (error) {
    if (error instanceof ReportUploadError) {
      logger.error('report_feedback failed', error, {
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

    logger.error('report_feedback failed with unexpected error', error as Error, {
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

/**
 * Save report locally without uploading to server
 * Saves to a local-reports directory to distinguish from uploaded reports
 */
async function saveReportLocally(
  commandName: string,
  content: string,
  customName: string | undefined
): Promise<{ path: string; name: string }> {
  // Create local-reports directory inside workspace (not in the server reports directory)
  const localReportsDir = path.join(process.cwd(), 'local-reports', commandName);
  
  try {
    // Ensure directory exists
    await fs.mkdir(localReportsDir, { recursive: true });

    // Generate filename
    const timestamp = formatTimestamp(new Date());
    let fileName: string;
    
    if (customName) {
      const sanitized = customName
        .trim()
        .replace(/\s+/g, '_')
        .replace(/[^\w\u4e00-\u9fa5-]/g, '');
      fileName = `${commandName}_${sanitized}_${timestamp}_local.md`;
    } else {
      fileName = `${commandName}_报告_${timestamp}_local.md`;
    }

    const filePath = path.join(localReportsDir, fileName);

    // Write file
    await fs.writeFile(filePath, content, { encoding: 'utf-8' });

    logger.info('Report saved locally', {
      path: filePath,
      size: content.length,
    });

    return {
      path: filePath,
      name: fileName,
    };
  } catch (error) {
    throw new ReportUploadError(
      `Failed to save report locally: ${(error as Error).message}`,
      'LOCAL_SAVE_FAILED',
      { path: localReportsDir, error: (error as Error).message }
    );
  }
}

/**
 * Format timestamp for filename
 */
function formatTimestamp(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  const second = String(date.getSeconds()).padStart(2, '0');
  
  return `${year}${month}${day}_${hour}${minute}${second}`;
}

