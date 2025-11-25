/**
 * Tier 1: Filename Search
 * Keyword matching against command filenames
 */

import { CommandMetadata, SearchResult } from '../types';
import { logger } from '../utils/logger';

/**
 * Stop words to remove from search queries
 */
const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for',
  'from', 'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on',
  'that', 'the', 'to', 'was', 'will', 'with',
]);

/**
 * Filename searcher class
 */
export class FileNameSearcher {
  /**
   * Search commands by filename
   */
  search(query: string, commands: CommandMetadata[]): SearchResult[] {
    const keywords = this.extractKeywords(query);

    if (keywords.length === 0) {
      logger.debug('No keywords extracted from query');
      return [];
    }

    const results: SearchResult[] = [];

    for (const command of commands) {
      const score = this.calculateScore(keywords, command.name);

      if (score > 0) {
        results.push({
          command,
          relevance_score: score,
          match_tier: 1,
          match_reason: this.buildMatchReason(keywords, command.name),
        });
      }
    }

    // Sort by score descending
    results.sort((a, b) => b.relevance_score - a.relevance_score);

    logger.info(`Tier 1 (Filename) search completed: ${results.length} results`, {
      query,
      keywords: keywords.length,
    });

    return results;
  }

  /**
   * Extract keywords from query
   */
  private extractKeywords(query: string): string[] {
    // Convert to lowercase and split
    const words = query.toLowerCase()
      .split(/[\s_-]+/) // Split on whitespace, underscores, hyphens
      .map(w => w.trim())
      .filter(w => w.length > 0);

    // Remove stop words
    const keywords = words.filter(w => !STOP_WORDS.has(w));

    return keywords;
  }

  /**
   * Calculate match score
   * Returns 0-100 score based on keyword matches
   */
  private calculateScore(keywords: string[], filename: string): number {
    if (keywords.length === 0) {
      return 0;
    }

    const lowerFilename = filename.toLowerCase();
    let matchCount = 0;

    for (const keyword of keywords) {
      if (lowerFilename.includes(keyword)) {
        matchCount++;
      }
    }

    // Score is percentage of keywords matched
    const score = (matchCount / keywords.length) * 100;

    // Bonus for exact match
    if (matchCount === keywords.length && keywords.length > 1) {
      return Math.min(100, score + 10);
    }

    return Math.floor(score);
  }

  /**
   * Build human-readable match reason
   */
  private buildMatchReason(keywords: string[], filename: string): string {
    const lowerFilename = filename.toLowerCase();
    const matched: string[] = [];
    const missed: string[] = [];

    for (const keyword of keywords) {
      if (lowerFilename.includes(keyword)) {
        matched.push(keyword);
      } else {
        missed.push(keyword);
      }
    }

    if (matched.length === keywords.length) {
      return `Filename matches all keywords: ${matched.join(', ')}`;
    }

    if (matched.length > 0) {
      return `Filename matches: ${matched.join(', ')}`;
    }

    return 'No filename match';
  }
}

