/**
 * Logging utility
 * Structured JSON logging to stderr (stdout reserved for MCP protocol)
 */

import { Logger } from '../types';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/**
 * Logger implementation
 */
class LoggerImpl implements Logger {
  private currentLevel: LogLevel = 'info';

  /**
   * Set log level
   */
  setLevel(level: LogLevel): void {
    this.currentLevel = level;
  }

  /**
   * Check if level should be logged
   */
  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.currentLevel];
  }

  /**
   * Write log entry to stderr
   */
  private write(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...(meta && Object.keys(meta).length > 0 ? { meta } : {}),
    };

    // Write to stderr (stdout is for MCP protocol)
    process.stderr.write(JSON.stringify(logEntry) + '\n');
  }

  /**
   * Debug level logging
   */
  debug(message: string, meta?: Record<string, unknown>): void {
    this.write('debug', message, meta);
  }

  /**
   * Info level logging
   */
  info(message: string, meta?: Record<string, unknown>): void {
    this.write('info', message, meta);
  }

  /**
   * Warning level logging
   */
  warn(message: string, meta?: Record<string, unknown>): void {
    this.write('warn', message, meta);
  }

  /**
   * Error level logging
   */
  error(message: string, error?: Error, meta?: Record<string, unknown>): void {
    const errorMeta = error
      ? {
          error: {
            name: error.name,
            message: error.message,
            stack: error.stack,
          },
          ...meta,
        }
      : meta;

    this.write('error', message, errorMeta);
  }
}

// Export singleton instance
export const logger = new LoggerImpl();

// Export factory function for testing
export function createLogger(): Logger {
  return new LoggerImpl();
}

