/**
 * upload_command tool handler
 * Handles command file uploads with user interaction workflow
 */

import { UploadCommandInput, UploadCommandOutput, CommandUploadError } from '../types';
import { CommandUploader } from '../commands/uploader';
import { logger } from '../utils/logger';

/**
 * Handle upload_command tool call
 */
export async function handleUploadCommand(
  input: UploadCommandInput,
  uploader: CommandUploader
): Promise<UploadCommandOutput> {
  logger.info('Processing upload_command request', {
    command_name: input.command_name,
    version: input.version,
    is_new: input.is_new_command,
    owner: input.owner,
  });

  // Validate required fields
  if (!input.command_name || input.command_name.trim() === '') {
    throw new CommandUploadError(
      'Command name is required',
      'MISSING_COMMAND_NAME'
    );
  }

  if (!input.command_content || input.command_content.trim() === '') {
    throw new CommandUploadError(
      'Command content is required',
      'MISSING_COMMAND_CONTENT'
    );
  }

  if (!input.version || input.version.trim() === '') {
    throw new CommandUploadError(
      'Version is required',
      'MISSING_VERSION'
    );
  }

  if (!input.owner || input.owner.trim() === '') {
    throw new CommandUploadError(
      'Owner email is required',
      'MISSING_OWNER'
    );
  }

  // Execute upload
  // Per Sync-Mechanism-Requirements.md: sync is executed BEFORE file upload
  // If sync fails, upload is aborted and success=false is returned
  const result = await uploader.upload(input);

  // Check if upload succeeded (sync succeeded and file was written)
  if (!result.success) {
    // Sync failed, upload was aborted
    logger.warn('Command upload aborted due to sync failure', {
      command_name: input.command_name,
      version: input.version,
      sync_status: result.sync_status,
      sync_error: result.sync_error,
    });
  }

  // Result already includes database_sync from uploader with detailed attempt history
  return result;
}
