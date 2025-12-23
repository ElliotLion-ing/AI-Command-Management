/**
 * Command syncer module
 * Handles synchronization of command metadata to remote database via API
 * Implements retry mechanism per Sync-Mechanism-Requirements.md
 */

import { logger } from '../utils/logger';
import { 
  CommandSyncRequest, 
  CommandSyncResponse, 
  SyncResult, 
  SyncAttempt, 
  SyncPreconditionResult,
  SyncRetryConfig 
} from '../types';

// Default retry configuration: 3 retries = 4 total attempts
const DEFAULT_RETRY_CONFIG: SyncRetryConfig = {
  max_retries: 3,
  retry_delay_ms: 1000,
};

/**
 * Command syncer class
 * Synchronizes command metadata to remote server BEFORE file upload
 * Implements retry mechanism with detailed attempt logging
 */
export class CommandSyncer {
  private serverDomain: string;
  private readonly syncEndpoint = '/api/ai-commands/sync';
  private retryConfig: SyncRetryConfig;

  constructor(serverDomain: string, retryConfig?: Partial<SyncRetryConfig>) {
    this.serverDomain = serverDomain;
    this.retryConfig = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };
    logger.info('CommandSyncer initialized', {
      serverDomain: serverDomain || '(not configured)',
      syncEnabled: !!serverDomain && serverDomain.trim() !== '',
      maxRetries: this.retryConfig.max_retries,
    });
  }

  /**
   * Check if sync is enabled (domain is configured)
   */
  isEnabled(): boolean {
    const enabled = !!this.serverDomain && this.serverDomain.trim() !== '';
    logger.debug('Command sync enabled check', { enabled, serverDomain: this.serverDomain });
    return enabled;
  }

  /**
   * Check preconditions before sync (no retry on these failures)
   */
  checkPreconditions(owner?: string): SyncPreconditionResult {
    // Check 1: mcp_server_domain must be configured
    if (!this.isEnabled()) {
      return {
        passed: false,
        error_type: 'DOMAIN_NOT_CONFIGURED',
        error_message: 'Sync 失败: 未配置 mcp_server_domain',
      };
    }

    // Check 2: owner must be provided
    if (!owner || owner.trim() === '') {
      return {
        passed: false,
        error_type: 'OWNER_NOT_PROVIDED',
        error_message: 'Sync 失败: 未提供 owner',
      };
    }

    // Check 3: owner must be valid email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(owner)) {
      return {
        passed: false,
        error_type: 'OWNER_INVALID_FORMAT',
        error_message: `Sync 失败: owner 格式错误(需要邮箱格式)，提供的值: "${owner}"`,
      };
    }

    return { passed: true };
  }

  /**
   * Sync command metadata to remote server with retry mechanism
   * MUST be called BEFORE file upload
   * @param commandName - Command name
   * @param version - Semantic version
   * @param owner - User email
   * @param releaseNote - Release notes (optional)
   * @param description - Description (optional)
   * @param belongTo - Parent command name for dependency files (optional)
   * @returns SyncResult with detailed attempt history
   */
  async sync(
    commandName: string,
    version: string,
    owner?: string,
    releaseNote?: string,
    description?: string,
    belongTo?: string
  ): Promise<SyncResult> {
    // Step 1: Check preconditions (no retry on these failures)
    const preconditionResult = this.checkPreconditions(owner);
    if (!preconditionResult.passed) {
      logger.error('Command sync precondition failed', new Error(preconditionResult.error_message), {
        error_type: preconditionResult.error_type,
      });
      return {
        success: false,
        total_attempts: 0,
        attempts: [],
        precondition_failed: true,
        precondition_error: preconditionResult.error_message,
      };
    }

    // Step 2: Build request
    const url = this.buildSyncUrl();
    const commandNameWithSuffix = commandName.endsWith('.md') 
      ? commandName 
      : `${commandName}.md`;
    
    // Process belongTo: ensure it has .md suffix if provided
    let belongToWithSuffix: string | undefined;
    if (belongTo && belongTo.trim() !== '') {
      belongToWithSuffix = belongTo.endsWith('.md') ? belongTo : `${belongTo}.md`;
    }
    
    const requestBody: CommandSyncRequest = {
      commandName: commandNameWithSuffix,
      version,
      owner: owner!,
      releaseNote: releaseNote || '',
      description: description || '',
      belongTo: belongToWithSuffix || '',
    };

    logger.info('Starting command sync with retry mechanism', {
      url,
      commandName: commandNameWithSuffix,
      version,
      owner,
      belongTo: belongToWithSuffix || '(main file)',
      maxAttempts: this.retryConfig.max_retries + 1,
    });

    // Step 3: Execute with retry (1 initial + max_retries)
    const attempts: SyncAttempt[] = [];
    const maxAttempts = this.retryConfig.max_retries + 1;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const attemptResult = await this.executeSingleAttempt(url, requestBody, attempt);
      attempts.push(attemptResult);

      if (attemptResult.success) {
        logger.info('Command sync succeeded', {
          attempt,
          totalAttempts: attempt,
          commandName: commandNameWithSuffix,
          version,
        });
        return {
          success: true,
          total_attempts: attempt,
          attempts,
        };
      }

      // Log failed attempt
      logger.warn(`Command sync attempt ${attempt} failed`, {
        attempt,
        maxAttempts,
        error: attemptResult.error_message,
        httpStatus: attemptResult.http_status,
      });

      // Wait before retry (except for last attempt)
      if (attempt < maxAttempts) {
        await this.delay(this.retryConfig.retry_delay_ms);
      }
    }

    // All attempts failed
    const lastAttempt = attempts[attempts.length - 1];
    const finalError = lastAttempt?.error_message || 'Unknown error';

    logger.error('Command sync failed after all retries', new Error(finalError), {
      totalAttempts: maxAttempts,
      commandName: commandNameWithSuffix,
      version,
    });

    return {
      success: false,
      total_attempts: maxAttempts,
      attempts,
      final_error: finalError,
    };
  }

  /**
   * Execute a single sync attempt
   */
  private async executeSingleAttempt(
    url: string,
    requestBody: CommandSyncRequest,
    attemptNumber: number
  ): Promise<SyncAttempt> {
    const timestamp = new Date();

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        return {
          attempt_number: attemptNumber,
          success: false,
          timestamp,
          http_status: response.status,
          error_message: `HTTP ${response.status} - ${response.statusText}`,
        };
      }

      const result = (await response.json()) as CommandSyncResponse;

      // code 2000 means success
      if (result.code !== 2000) {
        return {
          attempt_number: attemptNumber,
          success: false,
          timestamp,
          http_status: 200,
          error_message: `API error: code=${result.code}, msg=${result.msg}`,
        };
      }

      return {
        attempt_number: attemptNumber,
        success: true,
        timestamp,
        http_status: 200,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      return {
        attempt_number: attemptNumber,
        success: false,
        timestamp,
        error_message: `Network error: ${errorMsg}`,
      };
    }
  }

  /**
   * Delay helper for retry mechanism
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Build the full sync URL
   */
  private buildSyncUrl(): string {
    const domain = this.serverDomain.endsWith('/')
      ? this.serverDomain.slice(0, -1)
      : this.serverDomain;
    
    return `${domain}${this.syncEndpoint}`;
  }

  /**
   * Format sync result for display (static helper)
   */
  static formatSyncResultForDisplay(result: SyncResult): string {
    const lines: string[] = [];

    // Precondition failure
    if (result.precondition_failed) {
      lines.push(`⛔ ${result.precondition_error}`);
      lines.push('已停止所有后续操作');
      return lines.join('\n');
    }

    // Show each attempt
    for (const attempt of result.attempts) {
      if (attempt.success) {
        lines.push(`✅ Sync 请求成功 (第${attempt.attempt_number}次尝试)`);
      } else {
        const errorInfo = attempt.http_status 
          ? `HTTP ${attempt.http_status} - ${attempt.error_message}`
          : attempt.error_message;
        lines.push(`❌ Sync 请求失败 (第${attempt.attempt_number}次): ${errorInfo}`);
      }
    }

    // Add final summary
    if (result.success) {
      // Sync succeeded - add clear success message
      lines.push('');
      lines.push('✅ 数据库同步成功，命令元数据已记录到 ZCT 数据库');
    } else if (!result.precondition_failed) {
      // All retries failed
      lines.push('');
      lines.push('⛔ Sync 到 ZCT 数据库失败');
      if (result.final_error) {
        lines.push(`错误信息: ${result.final_error}`);
      }
      lines.push('已停止 Command/Report 上传操作');
    }

    return lines.join('\n');
  }
}
