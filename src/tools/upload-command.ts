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
  const result = await uploader.upload(input);

  // Build detailed database sync info for AI to display
  let databaseSync: UploadCommandOutput['database_sync'];
  if (result.sync_status === 'success') {
    databaseSync = {
      status: 'success',
      message: '数据库同步成功',
    };
  } else if (result.sync_status === 'failed') {
    databaseSync = {
      status: 'failed',
      message: `数据库同步失败: ${result.sync_error}`,
    };
  } else {
    databaseSync = {
      status: 'skipped',
      message: '数据库同步已跳过（未配置 mcp_server_domain 或 owner）',
    };
  }

  return {
    ...result,
    database_sync: databaseSync,
  };
}
