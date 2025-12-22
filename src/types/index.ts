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
  
  // Report upload settings
  enable_report_upload?: boolean;
  report_upload_max_size_mb?: number;
  report_auto_versioning?: boolean;
  report_file_permissions?: string;
  
  // Command upload settings
  enable_command_upload?: boolean;
  command_upload_max_size_mb?: number;
  command_file_permissions?: string;
  
  // Logging
  log_level: 'debug' | 'info' | 'warn' | 'error';
  
  // MCP Server settings
  mcp_server_domain?: string;
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
  next_steps?: string; // Hint for AI about what to do after executing this command
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
 * MCP tool definition for upload_report
 */
export interface UploadReportInput {
  command_name: string;
  report_content: string;
  report_name?: string; // Optional custom report name from user
  owner?: string; // User email from Cursor client
}

export interface UploadReportOutput {
  success: boolean;
  report_path: string;
  report_name: string;
  report_link?: string;
  message: string;
  version?: number;
  sync_status?: 'success' | 'failed' | 'skipped'; // Sync API call status
  sync_error?: string; // Error message if sync failed
  database_sync?: {
    status: 'success' | 'failed' | 'skipped';
    message: string;
  };
}

/**
 * Report upload configuration
 */
export interface ReportUploadConfig {
  enableUpload: boolean;
  maxSizeMB: number;
  autoVersioning: boolean;
  filePermissions: string;
  linkBaseUrl?: string;
}

/**
 * Report upload error with specific error codes
 */
export class ReportUploadError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ReportUploadError';
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

/**
 * MCP tool definition for report_feedback
 */
export interface ReportFeedbackInput {
  command_name: string;
  report_content: string;
  report_name?: string; // Optional custom report name from user
  user_wants_upload: boolean; // User decision: true = upload, false = local only
  owner?: string; // User email from Cursor client
}

export interface ReportFeedbackOutput {
  success: boolean;
  action_taken: 'uploaded' | 'saved_locally';
  report_path: string;
  report_name: string;
  report_link?: string; // Only present when uploaded
  message: string;
  version?: number; // Only present when uploaded
  sync_status?: 'success' | 'failed' | 'skipped'; // Sync API call status
  sync_error?: string; // Error message if sync failed
  database_sync?: { // Detailed sync result for AI to display clearly
    status: 'success' | 'failed' | 'skipped';
    message: string;
  };
}

/**
 * Report sync API request/response types
 */
export interface ReportSyncRequest {
  commandName: string;
  reportName: string;
  owner: string;
}

export interface ReportSyncResponse {
  code: number;
  msg: string;
  data: unknown;
}

/**
 * Command sync API request/response types
 */
export interface CommandSyncRequest {
  commandName: string;
  version: string;
  releaseNote: string;
  description: string;
  owner: string;
}

export interface CommandSyncResponse {
  code: number;
  msg: string;
  data: unknown;
}

/**
 * MCP tool definition for upload_command
 */
export interface UploadCommandInput {
  command_name: string;          // Name of the command (with or without .md)
  command_content: string;       // Full markdown content
  version: string;               // Semantic version (e.g., "1.0.0")
  owner: string;                 // User email
  release_note?: string;         // Release notes (for updates)
  description?: string;          // Description (for new commands)
  is_new_command?: boolean;      // Whether this is a new command or update
}

export interface UploadCommandOutput {
  success: boolean;
  command_path: string;
  command_name: string;
  message: string;
  is_update: boolean;
  version: string;
  sync_status?: 'success' | 'failed' | 'skipped';
  sync_error?: string;
  database_sync?: {
    status: 'success' | 'failed' | 'skipped';
    message: string;
  };
}

/**
 * Command upload configuration
 */
export interface CommandUploadConfig {
  enableUpload: boolean;
  maxSizeMB: number;
  filePermissions: string;
}

/**
 * Command upload error with specific error codes
 */
export class CommandUploadError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'CommandUploadError';
  }
}

/**
 * Sync retry mechanism types
 */

/**
 * Individual sync attempt record
 */
export interface SyncAttempt {
  attempt_number: number;      // 1-based attempt number
  success: boolean;
  timestamp: Date;
  http_status?: number;        // HTTP status code if applicable
  error_message?: string;      // Error message if failed
}

/**
 * Sync result with retry history
 */
export interface SyncResult {
  success: boolean;
  total_attempts: number;      // Total number of attempts made
  attempts: SyncAttempt[];     // History of all attempts
  final_error?: string;        // Final error message if all attempts failed
  precondition_failed?: boolean; // True if failed due to precondition (no retry)
  precondition_error?: string; // Precondition error message
}

/**
 * Sync precondition check result
 */
export interface SyncPreconditionResult {
  passed: boolean;
  error_type?: 'DOMAIN_NOT_CONFIGURED' | 'OWNER_NOT_PROVIDED' | 'OWNER_INVALID_FORMAT';
  error_message?: string;
}

/**
 * Sync retry configuration
 */
export interface SyncRetryConfig {
  max_retries: number;         // Maximum number of retries (not including first attempt)
  retry_delay_ms: number;      // Delay between retries
}

