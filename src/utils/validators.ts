/**
 * Input validation utilities
 * Security and data integrity checks
 */

import * as path from 'path';

/**
 * Validate command name
 * - Alphanumeric, underscores, hyphens allowed
 * - Optional .md extension
 * - No directory traversal
 */
export function validateCommandName(name: string): boolean {
  if (!name || typeof name !== 'string') {
    return false;
  }

  // Remove .md extension if present
  const nameWithoutExt = name.endsWith('.md') ? name.slice(0, -3) : name;

  // Check for empty string after removing extension
  if (nameWithoutExt.length === 0) {
    return false;
  }

  // Allow alphanumeric, underscores, hyphens
  const validPattern = /^[a-zA-Z0-9_-]+$/;
  if (!validPattern.test(nameWithoutExt)) {
    return false;
  }

  // Check for directory traversal attempts
  if (nameWithoutExt.includes('..') || nameWithoutExt.includes('/') || nameWithoutExt.includes('\\')) {
    return false;
  }

  // Length check (reasonable limits)
  if (nameWithoutExt.length > 255) {
    return false;
  }

  return true;
}

/**
 * Validate search query
 * - Non-empty string
 * - Reasonable length
 * - No control characters
 */
export function validateQuery(query: string): boolean {
  if (!query || typeof query !== 'string') {
    return false;
  }

  // Trim whitespace
  const trimmed = query.trim();

  // Check length
  if (trimmed.length === 0 || trimmed.length > 500) {
    return false;
  }

  // Check for control characters (except newline and tab)
  // eslint-disable-next-line no-control-regex
  const controlCharsPattern = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/;
  if (controlCharsPattern.test(trimmed)) {
    return false;
  }

  return true;
}

/**
 * Validate file path
 * - Must be string
 * - No directory traversal
 * - Must be within allowed directories
 */
export function validatePath(filePath: string, allowedDir: string): boolean {
  if (!filePath || typeof filePath !== 'string') {
    return false;
  }

  if (!allowedDir || typeof allowedDir !== 'string') {
    return false;
  }

  // Resolve to absolute path
  const resolvedPath = path.resolve(filePath);
  const resolvedAllowedDir = path.resolve(allowedDir);

  // Check if path is within allowed directory
  return resolvedPath.startsWith(resolvedAllowedDir);
}

/**
 * Sanitize file path
 * - Remove directory traversal attempts
 * - Normalize path
 */
export function sanitizePath(filePath: string): string {
  if (!filePath || typeof filePath !== 'string') {
    return '';
  }

  // Remove null bytes
  let sanitized = filePath.replace(/\0/g, '');

  // Normalize path (resolves .. and .)
  sanitized = path.normalize(sanitized);

  // Remove any remaining ..
  sanitized = sanitized.replace(/\.\./g, '');

  return sanitized;
}

/**
 * Validate pagination parameters
 */
export function validatePagination(page?: number, pageSize?: number): { page: number; pageSize: number } {
  const validPage = page && page > 0 ? Math.floor(page) : 1;
  const validPageSize = pageSize && pageSize > 0 && pageSize <= 100 ? Math.floor(pageSize) : 50;

  return {
    page: validPage,
    pageSize: validPageSize,
  };
}

/**
 * Validate max results parameter
 */
export function validateMaxResults(maxResults: number | undefined, defaultValue: number): number {
  if (maxResults === undefined) {
    return defaultValue;
  }

  if (typeof maxResults !== 'number' || isNaN(maxResults)) {
    return defaultValue;
  }

  // Ensure within bounds
  const clamped = Math.max(1, Math.min(100, Math.floor(maxResults)));
  return clamped;
}

