/**
 * Search engine orchestrator
 * Coordinates three-tier search with automatic fallback
 */

import { CommandMetadata, SearchResult, SearchTimeoutError } from '../types';
import { FileNameSearcher } from './tier1-filename';
import { ContentSearcher } from './tier2-content';
import { ReportSearcher } from './tier3-reports';
import { Cache, createCache } from '../cache';
import { logger } from '../utils/logger';
import * as crypto from 'crypto';

/**
 * Search engine class
 */
export class SearchEngine {
  private tier1: FileNameSearcher;
  private tier2: ContentSearcher;
  private tier3: ReportSearcher;
  private cache: Cache<SearchResult[]>;
  private cacheEnabled: boolean;
  private timeoutMs: number;

  constructor(
    reportsDir: string,
    _cacheTTL: number,
    cacheEnabled: boolean,
    timeoutMs: number
  ) {
    this.tier1 = new FileNameSearcher();
    this.tier2 = new ContentSearcher();
    this.tier3 = new ReportSearcher(reportsDir);
    this.cache = createCache<SearchResult[]>({ ttl: 300, maxSize: 100 }); // Shorter TTL for search
    this.cacheEnabled = cacheEnabled;
    this.timeoutMs = timeoutMs;
  }

  /**
   * Perform three-tier search with automatic fallback
   */
  async search(query: string, commands: CommandMetadata[], maxResults: number): Promise<SearchResult[]> {
    // Generate cache key
    const cacheKey = this.generateCacheKey(query, commands.length);

    // Check cache
    if (this.cacheEnabled) {
      const cached = this.cache.get(cacheKey);
      if (cached) {
        logger.debug('Search cache hit', { query });
        return cached.slice(0, maxResults);
      }
    }

    // Execute search with timeout
    const results = await this.executeWithTimeout(
      () => this.performSearch(query, commands, maxResults),
      this.timeoutMs
    );

    // Cache results
    if (this.cacheEnabled && results.length > 0) {
      this.cache.set(cacheKey, results);
    }

    return results;
  }

  /**
   * Perform the actual search logic
   */
  private async performSearch(
    query: string,
    commands: CommandMetadata[],
    maxResults: number
  ): Promise<SearchResult[]> {
    const startTime = Date.now();

    // Tier 1: Filename search
    logger.debug('Executing Tier 1 (Filename) search', { query });
    const tier1Results = this.tier1.search(query, commands);

    // Check if Tier 1 is sufficient
    if (tier1Results.length >= maxResults) {
      const duration = Date.now() - startTime;
      logger.info('Search completed with Tier 1 only', {
        query,
        results: tier1Results.length,
        duration_ms: duration,
      });
      return tier1Results.slice(0, maxResults);
    }

    if (tier1Results.length >= 3) {
      const duration = Date.now() - startTime;
      logger.info('Search completed with Tier 1 (sufficient results)', {
        query,
        results: tier1Results.length,
        duration_ms: duration,
      });
      return tier1Results;
    }

    // Tier 2: Content search
    logger.debug('Executing Tier 2 (Content) search', { query });
    const tier2Results = this.tier2.search(query, commands);

    // Merge Tier 1 and Tier 2
    const merged12 = this.mergeResults([tier1Results, tier2Results]);

    // Check if Tier 1 + 2 is sufficient
    if (merged12.length >= 2) {
      const duration = Date.now() - startTime;
      logger.info('Search completed with Tier 1 + 2', {
        query,
        results: merged12.length,
        duration_ms: duration,
      });
      return merged12.slice(0, maxResults);
    }

    // Tier 3: Report search
    logger.debug('Executing Tier 3 (Reports) search', { query });
    const tier3Results = await this.tier3.search(query, commands);

    // Merge all three tiers
    const finalResults = this.mergeResults([merged12, tier3Results]);

    const duration = Date.now() - startTime;
    logger.info('Search completed with all 3 tiers', {
      query,
      results: finalResults.length,
      duration_ms: duration,
    });

    return finalResults.slice(0, maxResults);
  }

  /**
   * Merge and deduplicate search results
   */
  private mergeResults(resultSets: SearchResult[][]): SearchResult[] {
    const commandMap = new Map<string, SearchResult>();

    for (const results of resultSets) {
      for (const result of results) {
        const existing = commandMap.get(result.command.name);

        if (existing) {
          // Keep result with higher score, or lower tier (higher priority)
          if (
            result.relevance_score > existing.relevance_score ||
            (result.relevance_score === existing.relevance_score && result.match_tier < existing.match_tier)
          ) {
            commandMap.set(result.command.name, result);
          }
        } else {
          commandMap.set(result.command.name, result);
        }
      }
    }

    // Convert to array and sort
    const merged = Array.from(commandMap.values());
    merged.sort((a, b) => {
      // Sort by score desc
      if (a.relevance_score !== b.relevance_score) {
        return b.relevance_score - a.relevance_score;
      }
      // If same score, prefer lower tier (higher priority)
      if (a.match_tier !== b.match_tier) {
        return a.match_tier - b.match_tier;
      }
      // Finally, sort alphabetically
      return a.command.name.localeCompare(b.command.name);
    });

    return merged;
  }

  /**
   * Execute function with timeout
   */
  private async executeWithTimeout<T>(
    fn: () => Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    return Promise.race([
      fn(),
      new Promise<T>((_, reject) => {
        setTimeout(() => {
          reject(new SearchTimeoutError(timeoutMs));
        }, timeoutMs);
      }),
    ]);
  }

  /**
   * Generate cache key for search
   */
  private generateCacheKey(query: string, commandCount: number): string {
    const data = `${query}:${commandCount}`;
    const hash = crypto.createHash('md5').update(data).digest('hex');
    return `search:${hash}`;
  }

  /**
   * Clear search cache
   */
  clearCache(): void {
    this.cache.clear();
    logger.debug('Search cache cleared');
  }
}

