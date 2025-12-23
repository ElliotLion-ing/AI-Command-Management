/**
 * Command uploader module
 * Handles command file uploads with validation, and atomic operations
 * Per Sync-Mechanism-Requirements.md: Sync BEFORE file upload, stop on failure
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { logger } from '../utils/logger';
import { 
  UploadCommandInput, 
  UploadCommandOutput, 
  CommandUploadError,
  CommandUploadConfig,
  CommandDependencyInfo,
  CommandFileInfo,
  MultiFileAnalysisResult,
  FileNamingValidation,
  PreUploadValidationResult
} from '../types';
import { CommandSyncer } from './syncer';

/**
 * Command uploader class
 * Handles command file uploads with validation and dependency detection
 */
export class CommandUploader {
  private commandsDirectory: string;
  private config: CommandUploadConfig;
  private syncer: CommandSyncer;

  constructor(commandsDirectory: string, config: CommandUploadConfig, serverDomain?: string) {
    this.commandsDirectory = commandsDirectory;
    this.config = config;
    this.syncer = new CommandSyncer(serverDomain || '');
  }

  /**
   * Detect if a file is a dependency or main file by checking its header
   * Looks for "is_dependency: true" in the first 3 lines within YAML frontmatter
   */
  static detectFileType(content: string): CommandDependencyInfo {
    const lines = content.split('\n').slice(0, 5); // Check first 5 lines to be safe
    
    // Check for YAML frontmatter with is_dependency: true
    let inFrontmatter = false;
    let isDependency = false;
    
    for (let i = 0; i < lines.length; i++) {
      const lineContent = lines[i];
      if (lineContent === undefined) continue;
      const line = lineContent.trim();
      
      if (i === 0 && line === '---') {
        inFrontmatter = true;
        continue;
      }
      
      if (inFrontmatter) {
        if (line === '---') {
          break; // End of frontmatter
        }
        if (line === 'is_dependency: true' || line === 'is_dependency:true') {
          isDependency = true;
          break;
        }
      }
    }
    
    return {
      file_type: isDependency ? 'dependency' : 'main',
      is_dependency: isDependency,
    };
  }

  /**
   * Analyze multiple files and determine upload scenario
   * Returns scenario classification per requirements document
   */
  static analyzeMultipleFiles(files: CommandFileInfo[]): MultiFileAnalysisResult {
    const mainFiles: CommandFileInfo[] = [];
    const dependencyFiles: CommandFileInfo[] = [];
    
    // Classify files
    for (const file of files) {
      const detection = CommandUploader.detectFileType(file.content);
      const fileInfo: CommandFileInfo = {
        ...file,
        file_type: detection.file_type,
      };
      
      if (detection.is_dependency) {
        dependencyFiles.push(fileInfo);
      } else {
        mainFiles.push(fileInfo);
      }
    }
    
    const mainCount = mainFiles.length;
    const depCount = dependencyFiles.length;
    
    // Scenario classification
    if (mainCount === 1 && depCount === 0) {
      // Scenario A: Single main file, no dependencies
      return {
        scenario: 'A',
        scenario_description: '单个主文件，无依赖',
        main_files: mainFiles,
        dependency_files: dependencyFiles,
        can_proceed: true,
        requires_user_input: true, // Ask if there are dependencies to add
      };
    }
    
    if (mainCount === 1 && depCount > 0) {
      // Scenario F: Single main + multiple dependencies
      return {
        scenario: 'F',
        scenario_description: `单个主文件 + ${depCount}个依赖文件`,
        main_files: mainFiles,
        dependency_files: dependencyFiles,
        can_proceed: true,
        requires_user_input: true, // Confirm relationship, ask if missing dependencies
      };
    }
    
    if (mainCount === 0 && depCount > 0) {
      // Scenario C/H: Only dependency files
      return {
        scenario: 'C',
        scenario_description: `仅依赖文件（${depCount}个），需要指定主文件`,
        main_files: mainFiles,
        dependency_files: dependencyFiles,
        can_proceed: false,
        requires_user_input: true, // Must specify main file
        suggestion: '请指定这些依赖文件的主文件',
      };
    }
    
    if (mainCount > 1 && depCount === 0) {
      // Scenario D: Multiple main files, no dependencies
      return {
        scenario: 'D',
        scenario_description: `${mainCount}个主文件，无依赖`,
        main_files: mainFiles,
        dependency_files: dependencyFiles,
        can_proceed: true,
        requires_user_input: true, // Ask if there are dependencies
      };
    }
    
    if (mainCount > 1 && depCount > 0) {
      // Scenario G: Multiple main + multiple dependencies - REJECT
      return {
        scenario: 'G',
        scenario_description: `${mainCount}个主文件 + ${depCount}个依赖文件（混合上传）`,
        main_files: mainFiles,
        dependency_files: dependencyFiles,
        can_proceed: false,
        requires_user_input: false,
        error_message: `❌ 检测到多个主文件和多个依赖文件混合上传！\n\n无法确定依赖关系：\n- 主文件: ${mainFiles.map(f => f.name).join(', ')}\n- 依赖文件: ${dependencyFiles.map(f => f.name).join(', ')}\n\n请分批上传：将 [1个主文件 + 其所有依赖文件] 作为一批统一上传`,
        suggestion: '将 [1个主文件 + 其所有依赖文件] 作为一批统一上传',
      };
    }
    
    // Fallback (shouldn't reach here)
    return {
      scenario: 'A',
      scenario_description: '未知场景',
      main_files: mainFiles,
      dependency_files: dependencyFiles,
      can_proceed: false,
      requires_user_input: true,
      error_message: '无法确定上传场景，请重新选择文件',
    };
  }

  /**
   * Format file relationship for display
   */
  static formatFileRelationship(mainFiles: CommandFileInfo[], dependencyFiles: CommandFileInfo[]): string {
    const lines: string[] = [];
    
    if (mainFiles.length > 0) {
      lines.push(`📄 主文件 (${mainFiles.length}个):`);
      for (const f of mainFiles) {
        lines.push(`   └─ ${f.name}`);
      }
    }
    
    if (dependencyFiles.length > 0) {
      lines.push('');
      lines.push(`📎 依赖文件 (${dependencyFiles.length}个):`);
      for (const f of dependencyFiles) {
        const belongToInfo = f.belong_to ? ` → ${f.belong_to}` : '';
        lines.push(`   └─ ${f.name}${belongToInfo}`);
      }
    }
    
    return lines.join('\n');
  }

  /**
   * Validate a single file name against naming convention
   * Format: {Module}-xx-yy-zz
   */
  static validateFileName(fileName: string): FileNamingValidation {
    // Strip .md extension if present
    let nameToValidate = fileName.trim();
    if (nameToValidate.toLowerCase().endsWith('.md')) {
      nameToValidate = nameToValidate.slice(0, -3);
    }
    
    // Check basic characters (alphanumeric, underscores, hyphens)
    if (!/^[a-zA-Z0-9_-]+$/.test(nameToValidate)) {
      return {
        original_name: fileName,
        is_valid: false,
        validation_error: '文件名只能包含字母、数字、下划线和连字符',
      };
    }
    
    // Check naming convention: must have at least one hyphen (Module-xxx format)
    if (!nameToValidate.includes('-')) {
      // Try to suggest a valid name
      const suggestedName = `Dep-${nameToValidate}`;
      return {
        original_name: fileName,
        is_valid: false,
        suggested_name: `${suggestedName}.md`,
        validation_error: '命名格式不符合 {Module}-xx-yy-zz 规范，缺少模块前缀',
      };
    }
    
    return {
      original_name: fileName,
      is_valid: true,
    };
  }

  /**
   * Pre-upload validation for multi-file uploads
   * Checks if dependency files need renaming and if main files need reference updates
   * MUST be called BEFORE actual upload when uploading main + dependency files together
   */
  static preUploadValidation(
    mainFiles: CommandFileInfo[],
    dependencyFiles: CommandFileInfo[]
  ): PreUploadValidationResult {
    const dependencyRenames: FileNamingValidation[] = [];
    const mainFileReferences: Array<{
      main_file: string;
      old_reference: string;
      new_reference: string;
    }> = [];

    // Validate all dependency file names
    for (const depFile of dependencyFiles) {
      const validation = CommandUploader.validateFileName(depFile.name);
      if (!validation.is_valid && validation.suggested_name) {
        dependencyRenames.push(validation);
        
        // Check if any main file references this dependency
        for (const mainFile of mainFiles) {
          // Check if main file content contains reference to the old name
          const oldNameWithoutMd = depFile.name.replace(/\.md$/i, '');
          if (mainFile.content.includes(oldNameWithoutMd)) {
            const newNameWithoutMd = validation.suggested_name.replace(/\.md$/i, '');
            mainFileReferences.push({
              main_file: mainFile.name,
              old_reference: oldNameWithoutMd,
              new_reference: newNameWithoutMd,
            });
          }
        }
      }
    }

    // If there are dependency renames that affect main files, require user action
    if (dependencyRenames.length > 0 && mainFileReferences.length > 0) {
      const userActionLines: string[] = [];
      userActionLines.push('⚠️ 检测到依赖文件命名不符合规范，需要重命名：');
      userActionLines.push('');
      
      for (const rename of dependencyRenames) {
        userActionLines.push(`  📄 ${rename.original_name} → ${rename.suggested_name}`);
        userActionLines.push(`     原因: ${rename.validation_error}`);
      }
      
      userActionLines.push('');
      userActionLines.push('⚠️ 主文件中需要更新的引用：');
      
      for (const ref of mainFileReferences) {
        userActionLines.push(`  📝 在 ${ref.main_file} 中: "${ref.old_reference}" → "${ref.new_reference}"`);
      }
      
      userActionLines.push('');
      userActionLines.push('📋 建议操作顺序：');
      userActionLines.push('1. 先修改主文件中对依赖文件的引用');
      userActionLines.push('2. 确认修改完成后，重新上传所有文件');
      userActionLines.push('');
      userActionLines.push('或者：分开上传');
      userActionLines.push('1. 先单独上传依赖文件（将自动重命名）');
      userActionLines.push('2. 修改主文件中的引用后，再上传主文件');

      return {
        can_proceed: false,
        requires_main_file_update: true,
        dependency_renames: dependencyRenames,
        main_file_references_to_update: mainFileReferences,
        user_action_required: userActionLines.join('\n'),
      };
    }

    // If there are dependency renames but no main file references, can proceed with warning
    if (dependencyRenames.length > 0 && mainFileReferences.length === 0) {
      const userActionLines: string[] = [];
      userActionLines.push('⚠️ 依赖文件将被重命名以符合规范：');
      for (const rename of dependencyRenames) {
        userActionLines.push(`  📄 ${rename.original_name} → ${rename.suggested_name}`);
      }
      
      return {
        can_proceed: true,
        requires_main_file_update: false,
        dependency_renames: dependencyRenames,
        main_file_references_to_update: [],
        user_action_required: userActionLines.join('\n'),
      };
    }

    // All names are valid, can proceed
    return {
      can_proceed: true,
      requires_main_file_update: false,
      dependency_renames: [],
      main_file_references_to_update: [],
    };
  }

  /**
   * Upload a command to the filesystem
   * IMPORTANT: Sync is performed BEFORE file upload per requirements
   */
  async upload(input: UploadCommandInput): Promise<UploadCommandOutput> {
    try {
      // 1. Validate input
      this.validateInput(input);

      // 2. Generate filename (ensure .md extension)
      const fileName = this.generateFileName(input.command_name);

      // 3. Determine file path
      const filePath = path.join(this.commandsDirectory, fileName);

      // 4. Security check: prevent path traversal
      if (!filePath.startsWith(this.commandsDirectory)) {
        throw new CommandUploadError(
          'Invalid file path: path traversal detected',
          'PATH_TRAVERSAL_ATTEMPT',
          { attempted_path: filePath }
        );
      }

      // 5. Check if file already exists (for update vs new upload)
      let isUpdate = false;
      try {
        await fs.access(filePath);
        isUpdate = true;
      } catch {
        isUpdate = false;
      }

      // 6. SYNC FIRST - Execute sync BEFORE file upload
      const syncResult = await this.syncer.sync(
        input.command_name,
        input.version,
        input.owner,
        input.release_note,
        input.description,
        input.belong_to  // Pass belongTo for dependency files
      );

      // 7. Check sync result - if failed, stop file upload
      if (!syncResult.success) {
        const syncMessage = CommandSyncer.formatSyncResultForDisplay(syncResult);
        
        logger.error('Command upload aborted due to sync failure', new Error(syncMessage), {
          command: input.command_name,
          version: input.version,
          syncResult,
        });

        // Return failure with detailed sync information
        return {
          success: false,
          command_path: '',
          command_name: fileName,
          message: syncMessage,
          is_update: isUpdate,
          version: input.version,
          sync_status: 'failed',
          sync_error: syncResult.final_error || syncResult.precondition_error,
          database_sync: {
            status: 'failed',
            message: syncMessage,
          },
        };
      }

      // 8. Sync succeeded - now write file atomically
      await this.writeFileAtomic(filePath, input.command_content);

      // 9. Set permissions
      await this.setFilePermissions(filePath);

      // 10. Build result message
      const action = isUpdate ? 'updated' : 'uploaded';
      const syncMessage = CommandSyncer.formatSyncResultForDisplay(syncResult);
      const message = `Command ${action} successfully\n${syncMessage}`;

      logger.info(`Command ${action} successfully`, {
        command: input.command_name,
        path: filePath,
        version: input.version,
        isUpdate,
        syncAttempts: syncResult.total_attempts,
      });

      return {
        success: true,
        command_path: filePath,
        command_name: fileName,
        message,
        is_update: isUpdate,
        version: input.version,
        sync_status: 'success',
        database_sync: {
          status: 'success',
          message: syncMessage,
        },
      };
    } catch (error) {
      logger.error('Command upload failed', error as Error, {
        command: input.command_name,
        contentSize: input.command_content?.length,
      });
      throw error;
    }
  }

  /**
   * Validate upload input
   */
  private validateInput(input: UploadCommandInput): void {
    // Validate command name (allow alphanumeric, underscores, hyphens)
    // First strip .md suffix if present for validation
    let nameToValidate = input.command_name.trim();
    if (nameToValidate.toLowerCase().endsWith('.md')) {
      nameToValidate = nameToValidate.slice(0, -3);
    }
    
    // Basic character validation
    if (!/^[a-zA-Z0-9_-]+$/.test(nameToValidate)) {
      throw new CommandUploadError(
        'Invalid command name: must contain only alphanumeric characters, underscores, and hyphens (no spaces allowed)',
        'INVALID_COMMAND_NAME',
        { command_name: input.command_name }
      );
    }

    // Validate naming convention: {Module}-xx-yy-zz format
    // Check if name has at least one hyphen (Module prefix required)
    if (!nameToValidate.includes('-')) {
      throw new CommandUploadError(
        'Invalid command name format: must follow {Module}-xx-yy-zz convention. Missing Module prefix and hyphen separator.',
        'INVALID_NAMING_CONVENTION',
        { 
          command_name: input.command_name,
          rule: 'Format: {Module}-xx-yy-zz, e.g., zNet-proxy-slow-meeting-join, ZMDB-log-analyze'
        }
      );
    }

    // Check for redundant suffixes
    const redundantSuffixes = ['-command', '-analysis', '-tool', '-script'];
    for (const suffix of redundantSuffixes) {
      if (nameToValidate.toLowerCase().endsWith(suffix)) {
        logger.warn('Command name has redundant suffix', {
          command_name: nameToValidate,
          redundant_suffix: suffix,
          suggestion: nameToValidate.slice(0, -suffix.length)
        });
        // Just warn, don't throw - let AI handle the suggestion
      }
    }

    // Validate content size
    const sizeMB = Buffer.byteLength(input.command_content, 'utf-8') / (1024 * 1024);
    if (sizeMB > this.config.maxSizeMB) {
      throw new CommandUploadError(
        `Command size ${sizeMB.toFixed(2)}MB exceeds limit ${this.config.maxSizeMB}MB`,
        'SIZE_LIMIT_EXCEEDED',
        { size_mb: sizeMB, limit_mb: this.config.maxSizeMB }
      );
    }

    // Validate content is not empty
    if (!input.command_content || input.command_content.trim().length === 0) {
      throw new CommandUploadError(
        'Command content cannot be empty',
        'EMPTY_CONTENT'
      );
    }

    // Validate version format (semantic versioning)
    if (!/^\d+\.\d+\.\d+$/.test(input.version)) {
      throw new CommandUploadError(
        'Invalid version format: must be semantic versioning (e.g., 1.0.0)',
        'INVALID_VERSION',
        { version: input.version }
      );
    }

    // Validate owner if provided (will be checked again in sync preconditions)
    if (input.owner && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.owner)) {
      throw new CommandUploadError(
        'Invalid owner email format',
        'INVALID_OWNER_EMAIL',
        { owner: input.owner }
      );
    }
  }

  /**
   * Generate filename with .md extension
   */
  private generateFileName(commandName: string): string {
    let fileName = commandName.trim();
    
    // Add .md extension if not present
    if (!fileName.toLowerCase().endsWith('.md')) {
      fileName = `${fileName}.md`;
    }
    
    return fileName;
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

      throw new CommandUploadError(
        `Failed to write command file: ${(error as Error).message}`,
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
   * Upload multiple files with dependency relationships
   * IMPORTANT: Dependency files are uploaded FIRST, then main files
   * This allows detecting naming issues before main file references become stale
   * 
   * @param files - Array of files to upload
   * @param version - Semantic version for all files
   * @param owner - User email
   * @param releaseNote - Release notes (optional)
   * @param description - Description (optional)
   * @param skipValidation - Skip pre-upload validation (use when user has confirmed renames)
   * @returns Array of upload results
   */
  async uploadMultiple(
    files: CommandFileInfo[],
    version: string,
    owner: string,
    releaseNote?: string,
    description?: string,
    skipValidation: boolean = false
  ): Promise<UploadCommandOutput[]> {
    const results: UploadCommandOutput[] = [];
    
    // Analyze files first
    const analysis = CommandUploader.analyzeMultipleFiles(files);
    
    // Check if can proceed based on scenario
    if (!analysis.can_proceed) {
      throw new CommandUploadError(
        analysis.error_message || 'Cannot proceed with upload',
        'MULTI_FILE_UPLOAD_BLOCKED',
        {
          scenario: analysis.scenario,
          main_files: analysis.main_files.map(f => f.name),
          dependency_files: analysis.dependency_files.map(f => f.name),
        }
      );
    }
    
    // Pre-upload validation: check for naming issues that would affect main file references
    if (!skipValidation && analysis.dependency_files.length > 0 && analysis.main_files.length > 0) {
      const validation = CommandUploader.preUploadValidation(
        analysis.main_files,
        analysis.dependency_files
      );
      
      if (!validation.can_proceed) {
        // Naming issues detected that require user to update main file references first
        throw new CommandUploadError(
          validation.user_action_required || '依赖文件命名问题需要先解决',
          'DEPENDENCY_NAMING_CONFLICT',
          {
            requires_main_file_update: validation.requires_main_file_update,
            dependency_renames: validation.dependency_renames,
            main_file_references: validation.main_file_references_to_update,
          }
        );
      }
      
      // Log warning if there are renames but no conflicts
      if (validation.dependency_renames.length > 0) {
        logger.warn('Dependency files will be renamed', {
          renames: validation.dependency_renames,
        });
      }
    }
    
    logger.info('Starting multi-file upload (dependency files first)', {
      scenario: analysis.scenario,
      mainFileCount: analysis.main_files.length,
      dependencyFileCount: analysis.dependency_files.length,
      version,
      owner,
    });
    
    // ========================================
    // UPLOAD ORDER: Dependency files FIRST, then main files
    // This ensures naming issues are caught before main file is uploaded
    // ========================================
    
    // Step 1: Upload dependency files FIRST
    const uploadedDependencies: Map<string, string> = new Map(); // original -> actual name
    
    for (const depFile of analysis.dependency_files) {
      // Determine which main file this dependency belongs to
      let belongTo = depFile.belong_to;
      if (!belongTo && analysis.main_files.length === 1) {
        const mainFile = analysis.main_files[0];
        belongTo = mainFile?.name;
      }
      
      const input: UploadCommandInput = {
        command_name: depFile.name,
        command_content: depFile.content,
        version,
        owner,
        release_note: releaseNote,
        description,
        belong_to: belongTo,
      };
      
      try {
        const result = await this.upload(input);
        results.push(result);
        
        // Track the actual uploaded name (may be different if renamed)
        uploadedDependencies.set(depFile.name, result.command_name);
        
        if (!result.success) {
          logger.warn('Dependency file upload failed', {
            depFile: depFile.name,
            belongTo,
            error: result.message,
          });
          // Continue with other dependencies
        }
      } catch (error) {
        logger.error('Dependency file upload error', error as Error, { depFile: depFile.name });
        results.push({
          success: false,
          command_path: '',
          command_name: depFile.name,
          message: `Upload failed: ${(error as Error).message}`,
          is_update: false,
          version,
          sync_status: 'failed',
          sync_error: (error as Error).message,
        });
      }
    }
    
    // Step 2: Check if any dependency was renamed - warn about main file references
    const renamedDeps: Array<{original: string, actual: string}> = [];
    for (const [original, actual] of uploadedDependencies) {
      if (original !== actual) {
        renamedDeps.push({ original, actual });
      }
    }
    
    if (renamedDeps.length > 0) {
      logger.warn('Some dependency files were renamed during upload', {
        renamedFiles: renamedDeps,
        mainFilesAffected: analysis.main_files.map(f => f.name),
      });
    }
    
    // Step 3: Upload main files
    for (const mainFile of analysis.main_files) {
      const input: UploadCommandInput = {
        command_name: mainFile.name,
        command_content: mainFile.content,
        version,
        owner,
        release_note: releaseNote,
        description,
        belong_to: undefined, // Main files have no parent
      };
      
      try {
        const result = await this.upload(input);
        results.push(result);
        
        if (!result.success) {
          logger.error('Main file upload failed', new Error(result.message), {
            mainFile: mainFile.name,
          });
          // Don't abort - dependencies are already uploaded
        }
      } catch (error) {
        logger.error('Main file upload error', error as Error, { mainFile: mainFile.name });
        results.push({
          success: false,
          command_path: '',
          command_name: mainFile.name,
          message: `Upload failed: ${(error as Error).message}`,
          is_update: false,
          version,
          sync_status: 'failed',
          sync_error: (error as Error).message,
        });
      }
    }
    
    return results;
  }

  /**
   * Format multi-file upload results for display
   */
  static formatMultiUploadResults(results: UploadCommandOutput[]): string {
    const lines: string[] = [];
    const successCount = results.filter(r => r.success).length;
    const failCount = results.length - successCount;
    
    lines.push(`📊 上传结果: ${successCount}成功 / ${failCount}失败`);
    lines.push('');
    
    for (const result of results) {
      const icon = result.success ? '✅' : '❌';
      lines.push(`${icon} ${result.command_name}`);
      if (!result.success) {
        lines.push(`   错误: ${result.message}`);
      }
    }
    
    return lines.join('\n');
  }
}
