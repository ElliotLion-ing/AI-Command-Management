/**
 * Error handling utilities
 * Convert errors to MCP-compatible format
 */

import {
  CommandNotFoundError,
  SearchTimeoutError,
  InvalidConfigError,
  FileSystemError,
  MCPError,
} from '../types';

/**
 * Error codes for MCP responses
 */
export const ERROR_CODES = {
  COMMAND_NOT_FOUND: 'COMMAND_NOT_FOUND',
  SEARCH_TIMEOUT: 'SEARCH_TIMEOUT',
  INVALID_CONFIG: 'INVALID_CONFIG',
  FILE_SYSTEM_ERROR: 'FILE_SYSTEM_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

/**
 * Convert error to MCP error format
 */
export function handleError(error: Error): MCPError {
  if (error instanceof CommandNotFoundError) {
    return {
      error: {
        code: ERROR_CODES.COMMAND_NOT_FOUND,
        message: error.message,
      },
    };
  }

  if (error instanceof SearchTimeoutError) {
    return {
      error: {
        code: ERROR_CODES.SEARCH_TIMEOUT,
        message: error.message,
      },
    };
  }

  if (error instanceof InvalidConfigError) {
    return {
      error: {
        code: ERROR_CODES.INVALID_CONFIG,
        message: error.message,
      },
    };
  }

  if (error instanceof FileSystemError) {
    return {
      error: {
        code: ERROR_CODES.FILE_SYSTEM_ERROR,
        message: error.message,
        details: error.path ? { path: error.path } : undefined,
      },
    };
  }

  // Generic error
  return {
    error: {
      code: ERROR_CODES.INTERNAL_ERROR,
      message: error.message || 'An unexpected error occurred',
      details: {
        name: error.name,
        stack: error.stack,
      },
    },
  };
}

/**
 * Create invalid input error
 */
export function createInvalidInputError(message: string): MCPError {
  return {
    error: {
      code: ERROR_CODES.INVALID_INPUT,
      message,
    },
  };
}

/**
 * Check if error is a known custom error type
 */
export function isCustomError(error: Error): boolean {
  return (
    error instanceof CommandNotFoundError ||
    error instanceof SearchTimeoutError ||
    error instanceof InvalidConfigError ||
    error instanceof FileSystemError
  );
}

