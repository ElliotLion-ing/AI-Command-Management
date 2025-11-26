/**
 * Configuration management module
 * Loads configuration from file and environment variables
 */

import { cosmiconfig } from 'cosmiconfig';
import * as dotenv from 'dotenv';
import * as fs from 'fs/promises';
import * as path from 'path';
import { ConfigSchema, InvalidConfigError } from '../types';

// Load environment variables
dotenv.config();

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: ConfigSchema = {
  commands_directory: './Commands',
  reports_directory: './Commands-Analyze-Report',
  cache_ttl_seconds: 3600,
  max_search_results: 10,
  search_timeout_ms: 5000,
  enable_cache: true,
  report_link_base_url: '',
  enable_report_upload: true,
  report_upload_max_size_mb: 10,
  report_auto_versioning: true,
  report_file_permissions: '644',
  log_level: 'info',
};

/**
 * Configuration manager singleton
 */
class ConfigManager {
  private config: ConfigSchema | null = null;
  private readonly moduleName = 'ai-command-tool';

  /**
   * Load configuration from file and environment
   */
  async load(): Promise<ConfigSchema> {
    if (this.config) {
      return this.config;
    }

    // Load from config file
    const explorer = cosmiconfig(this.moduleName);
    let fileConfig: Partial<ConfigSchema> = {};

    try {
      const result = await explorer.search();
      if (result && !result.isEmpty) {
        fileConfig = result.config as Partial<ConfigSchema>;
      }
    } catch (error) {
      // Config file not found or invalid, use defaults
      console.warn('Config file not found, using defaults and environment variables');
    }

    // Merge with defaults
    const mergedConfig: ConfigSchema = {
      ...DEFAULT_CONFIG,
      ...fileConfig,
    };

    // Override with environment variables
    if (process.env.AICMD_COMMANDS_DIR) {
      mergedConfig.commands_directory = process.env.AICMD_COMMANDS_DIR;
    }
    if (process.env.AICMD_REPORTS_DIR) {
      mergedConfig.reports_directory = process.env.AICMD_REPORTS_DIR;
    }
    if (process.env.AICMD_CACHE_TTL) {
      mergedConfig.cache_ttl_seconds = parseInt(process.env.AICMD_CACHE_TTL, 10);
    }
    if (process.env.AICMD_REPORT_BASE_URL) {
      mergedConfig.report_link_base_url = process.env.AICMD_REPORT_BASE_URL;
    }
    if (process.env.AICMD_MAX_RESULTS) {
      mergedConfig.max_search_results = parseInt(process.env.AICMD_MAX_RESULTS, 10);
    }
    if (process.env.AICMD_SEARCH_TIMEOUT) {
      mergedConfig.search_timeout_ms = parseInt(process.env.AICMD_SEARCH_TIMEOUT, 10);
    }
    if (process.env.AICMD_ENABLE_CACHE) {
      mergedConfig.enable_cache = process.env.AICMD_ENABLE_CACHE === 'true';
    }
    if (process.env.AICMD_LOG_LEVEL) {
      const level = process.env.AICMD_LOG_LEVEL.toLowerCase();
      if (['debug', 'info', 'warn', 'error'].includes(level)) {
        mergedConfig.log_level = level as ConfigSchema['log_level'];
      }
    }
    if (process.env.AICMD_ENABLE_REPORT_UPLOAD !== undefined) {
      mergedConfig.enable_report_upload = process.env.AICMD_ENABLE_REPORT_UPLOAD === 'true';
    }
    if (process.env.AICMD_REPORT_UPLOAD_MAX_SIZE_MB) {
      mergedConfig.report_upload_max_size_mb = parseFloat(process.env.AICMD_REPORT_UPLOAD_MAX_SIZE_MB);
    }
    if (process.env.AICMD_REPORT_AUTO_VERSIONING !== undefined) {
      mergedConfig.report_auto_versioning = process.env.AICMD_REPORT_AUTO_VERSIONING === 'true';
    }
    if (process.env.AICMD_REPORT_FILE_PERMISSIONS) {
      mergedConfig.report_file_permissions = process.env.AICMD_REPORT_FILE_PERMISSIONS;
    }

    // Validate configuration
    await this.validate(mergedConfig);

    this.config = mergedConfig;
    return this.config;
  }

  /**
   * Get current configuration (must call load() first)
   */
  get(): ConfigSchema {
    if (!this.config) {
      throw new InvalidConfigError('Configuration not loaded. Call load() first.');
    }
    return this.config;
  }

  /**
   * Validate configuration
   */
  private async validate(config: ConfigSchema): Promise<void> {
    // Validate commands directory
    if (!config.commands_directory || config.commands_directory.trim() === '') {
      throw new InvalidConfigError('commands_directory is required');
    }

    try {
      await fs.access(config.commands_directory);
    } catch (error) {
      throw new InvalidConfigError(
        `commands_directory does not exist or is not accessible: ${config.commands_directory}`
      );
    }

    // Validate reports directory
    if (!config.reports_directory || config.reports_directory.trim() === '') {
      throw new InvalidConfigError('reports_directory is required');
    }

    try {
      await fs.access(config.reports_directory);
    } catch (error) {
      throw new InvalidConfigError(
        `reports_directory does not exist or is not accessible: ${config.reports_directory}`
      );
    }

    // Validate numeric values
    if (config.cache_ttl_seconds <= 0) {
      throw new InvalidConfigError('cache_ttl_seconds must be positive');
    }

    if (config.max_search_results < 1 || config.max_search_results > 100) {
      throw new InvalidConfigError('max_search_results must be between 1 and 100');
    }

    if (config.search_timeout_ms <= 0) {
      throw new InvalidConfigError('search_timeout_ms must be positive');
    }

    // Validate report_link_base_url if provided
    if (config.report_link_base_url && config.report_link_base_url !== '') {
      try {
        new URL(config.report_link_base_url);
      } catch (error) {
        throw new InvalidConfigError(
          `report_link_base_url is not a valid URL: ${config.report_link_base_url}`
        );
      }
    }

    // Validate upload configuration
    if (config.report_upload_max_size_mb !== undefined && config.report_upload_max_size_mb <= 0) {
      throw new InvalidConfigError('report_upload_max_size_mb must be positive');
    }
    
    if (config.report_file_permissions && !/^[0-7]{3}$/.test(config.report_file_permissions)) {
      throw new InvalidConfigError(
        `report_file_permissions must be a valid octal permission string (e.g., "644"): ${config.report_file_permissions}`
      );
    }

    // Validate paths are absolute or make them absolute
    config.commands_directory = path.resolve(config.commands_directory);
    config.reports_directory = path.resolve(config.reports_directory);
  }

  /**
   * Clear cached configuration (for testing)
   */
  clear(): void {
    this.config = null;
  }
}

// Export singleton instance
export const configManager = new ConfigManager();

// Export convenience function
export async function getConfig(): Promise<ConfigSchema> {
  return configManager.load();
}

