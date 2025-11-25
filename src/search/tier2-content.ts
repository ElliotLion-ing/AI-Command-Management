/**
 * Tier 2: Content Search
 * Semantic/fuzzy search of command content using fuse.js
 */

import Fuse, { IFuseOptions } from 'fuse.js';
import { CommandMetadata, SearchResult } from '../types';
import { logger } from '../utils/logger';

/**
 * Searchable command data for Fuse.js
 */
interface SearchableCommand extends CommandMetadata {
  searchableContent: string; // Combined name + description for search
}

/**
 * Content searcher class
 */
export class ContentSearcher {
  private fuseOptions: IFuseOptions<SearchableCommand> = {
    keys: [
      {
        name: 'name',
        weight: 0.4,
      },
      {
        name: 'description',
        weight: 0.3,
      },
      {
        name: 'searchableContent',
        weight: 0.3,
      },
    ],
    threshold: 0.4, // 0 = perfect match, 1 = match anything
    includeScore: true,
    minMatchCharLength: 3,
    ignoreLocation: true, // Search entire string, not just beginning
  };

  /**
   * Search commands by content
   */
  search(query: string, commands: CommandMetadata[]): SearchResult[] {
    // Prepare searchable data
    const searchableCommands: SearchableCommand[] = commands.map(cmd => ({
      ...cmd,
      searchableContent: `${cmd.name} ${cmd.description}`,
    }));

    // Create Fuse instance
    const fuse = new Fuse(searchableCommands, this.fuseOptions);

    // Perform search
    const fuseResults = fuse.search(query);

    // Convert to SearchResult format
    const results: SearchResult[] = fuseResults.map(result => {
      // Convert Fuse score (0 = perfect, 1 = worst) to 0-100 (100 = perfect)
      const fuseScore = result.score || 0;
      const relevanceScore = Math.max(0, Math.min(100, Math.floor((1 - fuseScore) * 100)));

      // Extract the command (remove searchableContent)
      const { searchableContent: _, ...command } = result.item;

      return {
        command,
        relevance_score: relevanceScore,
        match_tier: 2,
        match_reason: this.buildMatchReason(query, result.item),
        excerpt: this.extractExcerpt(result.item.description, query),
      };
    });

    // Filter out very low scores (below 30)
    const filtered = results.filter(r => r.relevance_score >= 30);

    logger.info(`Tier 2 (Content) search completed: ${filtered.length} results`, {
      query,
      totalResults: results.length,
      filtered: results.length - filtered.length,
    });

    return filtered;
  }

  /**
   * Build match reason
   */
  private buildMatchReason(query: string, command: SearchableCommand): string {
    const lowerQuery = query.toLowerCase();
    const lowerName = command.name.toLowerCase();
    const lowerDesc = command.description.toLowerCase();

    if (lowerName.includes(lowerQuery)) {
      return `Name contains: "${query}"`;
    }

    if (lowerDesc.includes(lowerQuery)) {
      return `Description mentions: "${query}"`;
    }

    // Fuzzy match
    return `Content semantically matches: "${query}"`;
  }

  /**
   * Extract excerpt around query match
   */
  private extractExcerpt(text: string, query: string, maxLength: number = 150): string {
    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const index = lowerText.indexOf(lowerQuery);

    if (index === -1) {
      // No exact match, return beginning of text
      return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    }

    // Extract around match
    const start = Math.max(0, index - 50);
    const end = Math.min(text.length, index + query.length + 50);

    let excerpt = text.substring(start, end);

    if (start > 0) {
      excerpt = '...' + excerpt;
    }
    if (end < text.length) {
      excerpt = excerpt + '...';
    }

    return excerpt;
  }
}

