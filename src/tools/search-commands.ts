/**
 * search_commands tool handler
 */

import { SearchCommandsInput, SearchCommandsOutput } from '../types';
import { SearchEngine } from '../search';
import { CommandLoader } from '../commands/loader';
import { validateQuery, validateMaxResults } from '../utils/validators';
import { createInvalidInputError } from '../utils/errors';
import { logger } from '../utils/logger';

/**
 * Search commands handler
 */
export async function handleSearchCommands(
  input: SearchCommandsInput,
  searchEngine: SearchEngine,
  commandLoader: CommandLoader,
  maxResultsDefault: number
): Promise<SearchCommandsOutput | { error: unknown }> {
  try {
    // Validate input
    if (!validateQuery(input.query)) {
      return createInvalidInputError('Invalid query: must be 1-500 characters with no control characters');
    }

    const maxResults = validateMaxResults(input.max_results, maxResultsDefault);

    logger.info('search_commands tool invoked', {
      query: input.query,
      maxResults,
    });

    // Load all commands
    const commands = await commandLoader.listAll();

    if (commands.length === 0) {
      logger.warn('No commands available');
      return {
        results: [],
      };
    }

    // Perform search
    const searchResults = await searchEngine.search(input.query, commands, maxResults);

    // Format output
    const output: SearchCommandsOutput = {
      results: searchResults.map(result => ({
        name: result.command.name,
        description: result.command.description,
        relevance_score: result.relevance_score,
        match_tier: result.match_tier,
        match_reason: result.match_reason,
        path: result.command.path,
        last_modified: result.command.last_modified.toISOString(),
      })),
    };

    logger.info('search_commands completed', {
      query: input.query,
      results: output.results.length,
    });

    return output;
  } catch (error) {
    logger.error('search_commands failed', error as Error);
    return { error };
  }
}

