/**
 * upload_command tool handler
 * Handles command file uploads with user interaction workflow
 * Supports file dependency detection and multi-file uploads
 */

import { 
  UploadCommandInput, 
  UploadCommandOutput, 
  CommandUploadError,
  CommandFileInfo,
  CommandDependencyInfo,
  MultiFileAnalysisResult,
  FileNamingValidation,
  PreUploadValidationResult
} from '../types';
import { CommandUploader } from '../commands/uploader';
import { logger } from '../utils/logger';

/**
 * Detect file type (main or dependency) from content
 * Exported for AI tool usage
 */
export function detectCommandFileType(content: string): CommandDependencyInfo {
  return CommandUploader.detectFileType(content);
}

/**
 * Analyze multiple files for upload scenario
 * Exported for AI tool usage
 */
export function analyzeCommandFiles(files: CommandFileInfo[]): MultiFileAnalysisResult {
  return CommandUploader.analyzeMultipleFiles(files);
}

/**
 * Validate a file name against naming convention
 * Exported for AI tool usage
 */
export function validateFileName(fileName: string): FileNamingValidation {
  return CommandUploader.validateFileName(fileName);
}

/**
 * Pre-upload validation to detect naming conflicts before upload
 * IMPORTANT: Call this when uploading main + dependency files together
 * Exported for AI tool usage
 */
export function preUploadValidation(
  mainFiles: CommandFileInfo[],
  dependencyFiles: CommandFileInfo[]
): PreUploadValidationResult {
  return CommandUploader.preUploadValidation(mainFiles, dependencyFiles);
}

/**
 * Format file relationship display
 * Exported for AI tool usage
 */
export function formatFileRelationship(
  mainFiles: CommandFileInfo[], 
  dependencyFiles: CommandFileInfo[]
): string {
  return CommandUploader.formatFileRelationship(mainFiles, dependencyFiles);
}

/**
 * Handle upload_command tool call
 * Supports both single file and multi-file uploads with dependency detection
 */
export async function handleUploadCommand(
  input: UploadCommandInput,
  uploader: CommandUploader
): Promise<UploadCommandOutput> {
  // Detect file type from content
  const fileTypeInfo = detectCommandFileType(input.command_content);
  
  logger.info('Processing upload_command request', {
    command_name: input.command_name,
    version: input.version,
    is_new: input.is_new_command,
    owner: input.owner,
    file_type: fileTypeInfo.file_type,
    is_dependency: fileTypeInfo.is_dependency,
    belong_to: input.belong_to,
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

  // Check if this is a dependency file without specified parent
  if (fileTypeInfo.is_dependency && !input.belong_to) {
    throw new CommandUploadError(
      '检测到依赖子文件（包含 is_dependency: true），但未指定主文件。请提供 belong_to 参数指定此依赖文件所属的主命令文件。',
      'DEPENDENCY_MISSING_PARENT',
      {
        file_type: 'dependency',
        suggestion: '请指定此依赖文件所属的主命令文件名',
      }
    );
  }

  // Handle multi-file upload if additional files provided
  if (input.additional_files && input.additional_files.length > 0) {
    // Create file list with main file first
    const allFiles: CommandFileInfo[] = [
      {
        name: input.command_name,
        content: input.command_content,
        file_type: fileTypeInfo.file_type,
        belong_to: input.belong_to,
      },
      ...input.additional_files,
    ];

    // Analyze files
    const analysis = analyzeCommandFiles(allFiles);
    
    // Log analysis result
    logger.info('Multi-file analysis result', {
      scenario: analysis.scenario,
      scenario_description: analysis.scenario_description,
      can_proceed: analysis.can_proceed,
      main_count: analysis.main_files.length,
      dep_count: analysis.dependency_files.length,
    });

    if (!analysis.can_proceed) {
      throw new CommandUploadError(
        analysis.error_message || 'Cannot proceed with multi-file upload',
        'MULTI_FILE_BLOCKED',
        {
          scenario: analysis.scenario,
          main_files: analysis.main_files.map(f => f.name),
          dependency_files: analysis.dependency_files.map(f => f.name),
          suggestion: analysis.suggestion,
        }
      );
    }

    // Execute multi-file upload
    const results = await uploader.uploadMultiple(
      allFiles,
      input.version,
      input.owner,
      input.release_note,
      input.description
    );

    // Return aggregated result
    const allSuccess = results.every(r => r.success);
    const firstResult = results[0];
    
    return {
      success: allSuccess,
      command_path: firstResult?.command_path || '',
      command_name: input.command_name,
      message: CommandUploader.formatMultiUploadResults(results),
      is_update: firstResult?.is_update || false,
      version: input.version,
      sync_status: allSuccess ? 'success' : 'failed',
      database_sync: {
        status: allSuccess ? 'success' : 'failed',
        message: CommandUploader.formatMultiUploadResults(results),
      },
    };
  }

  // Single file upload
  // Execute upload (sync is performed BEFORE file upload per requirements)
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
