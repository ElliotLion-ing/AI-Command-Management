/**
 * In-memory cache with TTL and LRU eviction
 */

import { CacheEntry } from '../types';

/**
 * Cache options
 */
interface CacheOptions {
  ttl: number; // Time to live in seconds
  maxSize: number; // Maximum number of entries
}

/**
 * Generic cache class with TTL and LRU eviction
 */
export class Cache<T> {
  private store: Map<string, CacheEntry<T>>;
  private accessOrder: string[]; // For LRU tracking
  private readonly options: CacheOptions;

  constructor(options: Partial<CacheOptions> = {}) {
    this.store = new Map();
    this.accessOrder = [];
    this.options = {
      ttl: options.ttl || 3600,
      maxSize: options.maxSize || 1000,
    };
  }

  /**
   * Set a cache entry
   */
  set(key: string, value: T, ttl?: number): void {
    const expiresAt = Date.now() + (ttl || this.options.ttl) * 1000;

    // Remove if exists (to update access order)
    if (this.store.has(key)) {
      this.removeFromAccessOrder(key);
    }

    // Check size limit
    if (this.store.size >= this.options.maxSize) {
      this.evictLRU();
    }

    // Add entry
    this.store.set(key, { value, expires_at: expiresAt });
    this.accessOrder.push(key);
  }

  /**
   * Get a cache entry
   */
  get(key: string): T | null {
    const entry = this.store.get(key);

    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expires_at) {
      this.delete(key);
      return null;
    }

    // Update access order (move to end)
    this.removeFromAccessOrder(key);
    this.accessOrder.push(key);

    return entry.value;
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    const entry = this.store.get(key);

    if (!entry) {
      return false;
    }

    // Check if expired
    if (Date.now() > entry.expires_at) {
      this.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Delete a cache entry
   */
  delete(key: string): boolean {
    this.removeFromAccessOrder(key);
    return this.store.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.store.clear();
    this.accessOrder = [];
  }

  /**
   * Clear entries matching a pattern
   */
  clearPattern(pattern: RegExp): void {
    const keysToDelete: string[] = [];

    for (const key of this.store.keys()) {
      if (pattern.test(key)) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.delete(key);
    }
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.store.size;
  }

  /**
   * Cleanup expired entries
   */
  cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.store.entries()) {
      if (now > entry.expires_at) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.delete(key);
    }
  }

  /**
   * Remove key from access order array
   */
  private removeFromAccessOrder(key: string): void {
    const index = this.accessOrder.indexOf(key);
    if (index !== -1) {
      this.accessOrder.splice(index, 1);
    }
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    if (this.accessOrder.length === 0) {
      return;
    }

    const lruKey = this.accessOrder[0];
    if (lruKey) {
      this.delete(lruKey);
    }
  }

  /**
   * Get cache statistics
   */
  stats(): {
    size: number;
    maxSize: number;
    ttl: number;
  } {
    return {
      size: this.store.size,
      maxSize: this.options.maxSize,
      ttl: this.options.ttl,
    };
  }
}

/**
 * Create a cache instance
 */
export function createCache<T>(options?: Partial<CacheOptions>): Cache<T> {
  return new Cache<T>(options);
}

