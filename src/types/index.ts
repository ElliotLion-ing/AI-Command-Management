/**
 * Type definitions for AI Command Tool Management
 */

/**
 * Configuration schema for the MCP tool
 */
export interface ConfigSchema {
  // File system paths (local to server)
  commands_directory: string;
  reports_directory: string;
  
  // Performance settings
  cache_ttl_seconds: number;
  max_search_results: number;
  search_timeout_ms: number;
  enable_cache: boolean;
  
  // External services
  report_link_base_url: string;
  
  // Logging
  log_level: 'debug' | 'info' | 'warn' | 'error';
}

/**
 * Command metadata (without full content)
 */
export interface CommandMetadata {
  name: string;
  path: string;
  size: number;
  last_modified: Date;
  description: string; // First 200 chars or extracted description
}

/**
 * Full command definition including content
 */
export interface Command extends CommandMetadata {
  content: string; // Full Markdown content
}

/**
 * Report metadata
 */
export interface ReportMetadata {
  name: string;
  command_name: string;
  path: string;
  date: Date | null; // Extracted from filename
  size: number;
}

/**
 * Report match with context
 */
export interface ReportMatch extends ReportMetadata {
  excerpt: string; // Context around match
  match_count: number;
}

/**
 * Search result from any tier
 */
export interface SearchResult {
  command: CommandMetadata;
  relevance_score: number; // 0-100
  match_tier: 1 | 2 | 3;
  match_reason: string;
  excerpt?: string; // Optional context snippet
}

/**
 * MCP tool definition for search_commands
 */
export interface SearchCommandsInput {
  query: string;
  max_results?: number;
}

export interface SearchCommandsOutput {
  results: Array<{
    name: string;
    description: string;
    relevance_score: number;
    match_tier: 1 | 2 | 3;
    match_reason: string;
    path: string;
    last_modified: string;
  }>;
}

/**
 * MCP tool definition for get_command
 */
export interface GetCommandInput {
  command_name: string;
}

export interface GetCommandOutput {
  name: string;
  content: string;
  metadata: {
    path: string;
    size: number;
    last_modified: string;
    description: string;
  };
}

/**
 * MCP tool definition for list_commands
 */
export interface ListCommandsInput {
  page?: number;
  page_size?: number;
}

export interface ListCommandsOutput {
  commands: Array<{
    name: string;
    description: string;
    size: number;
    last_modified: string;
  }>;
  total: number;
  page: number;
  page_size: number;
}

/**
 * MCP tool definition for search_reports
 */
export interface SearchReportsInput {
  query: string;
  command_filter?: string; // Optional command name to filter by
  max_results?: number;
}

export interface SearchReportsOutput {
  results: Array<{
    report_name: string;
    command_name: string;
    date: string | null;
    excerpt: string;
    link: string;
    path: string;
  }>;
}

/**
 * MCP tool definition for list_command_reports
 */
export interface ListCommandReportsInput {
  command_name: string;
}

export interface ListCommandReportsOutput {
  reports: Array<{
    name: string;
    date: string | null;
    size: number;
    link: string;
    path: string;
  }>;
  command_name: string;
  total: number;
}

/**
 * Cache entry with TTL
 */
export interface CacheEntry<T> {
  value: T;
  expires_at: number; // Timestamp
}

/**
 * Logger interface
 */
export interface Logger {
  debug(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, error?: Error, meta?: Record<string, unknown>): void;
}

/**
 * Custom error types
 */
export class CommandNotFoundError extends Error {
  constructor(commandName: string) {
    super(`Command not found: ${commandName}`);
    this.name = 'CommandNotFoundError';
  }
}

export class SearchTimeoutError extends Error {
  constructor(timeout: number) {
    super(`Search timeout after ${timeout}ms`);
    this.name = 'SearchTimeoutError';
  }
}

export class InvalidConfigError extends Error {
  constructor(message: string) {
    super(`Invalid configuration: ${message}`);
    this.name = 'InvalidConfigError';
  }
}

export class FileSystemError extends Error {
  constructor(message: string, public readonly path?: string) {
    super(message);
    this.name = 'FileSystemError';
  }
}

/**
 * MCP error response format
 */
export interface MCPError {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

