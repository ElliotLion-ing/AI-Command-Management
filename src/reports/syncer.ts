/**
 * Report syncer module
 * Handles synchronization of report metadata to remote database via API
 */

import { logger } from '../utils/logger';
import { ReportSyncRequest, ReportSyncResponse } from '../types';

/**
 * Report syncer class
 * Synchronizes report metadata to remote server after file upload
 */
export class ReportSyncer {
  private serverDomain: string;
  private readonly syncEndpoint = '/api/ai-commands/report/sync';

  constructor(serverDomain: string) {
    this.serverDomain = serverDomain;
    logger.info('ReportSyncer initialized', {
      serverDomain: serverDomain || '(not configured)',
      syncEnabled: !!serverDomain && serverDomain.trim() !== '',
    });
  }

  /**
   * Check if sync is enabled (domain is configured)
   */
  isEnabled(): boolean {
    const enabled = !!this.serverDomain && this.serverDomain.trim() !== '';
    logger.debug('Sync enabled check', { enabled, serverDomain: this.serverDomain });
    return enabled;
  }

  /**
   * Sync report metadata to remote server
   * @returns true if sync succeeded, false otherwise
   */
  async sync(
    commandName: string,
    reportName: string,
    owner: string
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.isEnabled()) {
      logger.debug('Report sync skipped: mcp_server_domain not configured');
      return { success: true }; // Skip is not an error
    }

    if (!owner || owner.trim() === '') {
      logger.warn('Report sync skipped: owner email not provided');
      return { success: false, error: 'Owner email is required for sync' };
    }

    const url = this.buildSyncUrl();
    // Add .md suffix to commandName if not present
    const commandNameWithSuffix = commandName.endsWith('.md') 
      ? commandName 
      : `${commandName}.md`;
    const requestBody: ReportSyncRequest = {
      commandName: commandNameWithSuffix,
      reportName,
      owner,
    };

    logger.info('Syncing report to remote server', {
      url,
      commandName,
      reportName,
      owner,
    });

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorMsg = `HTTP error: ${response.status} ${response.statusText}`;
        logger.error('Report sync HTTP error', new Error(errorMsg), {
          status: response.status,
          statusText: response.statusText,
        });
        return { success: false, error: errorMsg };
      }

      const result = (await response.json()) as ReportSyncResponse;

      // code 2000 means success, any other code is failure
      if (result.code !== 2000) {
        const errorMsg = `Sync API error: code=${result.code}, msg=${result.msg}`;
        logger.error('Report sync API error', new Error(errorMsg), {
          code: result.code,
          msg: result.msg,
        });
        return { success: false, error: errorMsg };
      }

      logger.info('Report synced successfully', {
        commandName,
        reportName,
      });

      return { success: true };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error('Report sync failed', error as Error, {
        url,
        commandName,
        reportName,
      });
      return { success: false, error: `Network error: ${errorMsg}` };
    }
  }

  /**
   * Build the full sync URL
   */
  private buildSyncUrl(): string {
    // Ensure domain doesn't end with slash
    const domain = this.serverDomain.endsWith('/')
      ? this.serverDomain.slice(0, -1)
      : this.serverDomain;
    
    return `${domain}${this.syncEndpoint}`;
  }
}

