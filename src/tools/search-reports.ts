/**
 * search_reports tool handler
 */

import { SearchReportsInput, SearchReportsOutput } from '../types';
import { ReportFinder } from '../reports/finder';
import { ReportLinker } from '../reports/linker';
import { validateQuery, validateMaxResults, validateCommandName } from '../utils/validators';
import { createInvalidInputError } from '../utils/errors';
import { logger } from '../utils/logger';

/**
 * Search reports handler
 */
export async function handleSearchReports(
  input: SearchReportsInput,
  reportFinder: ReportFinder,
  reportLinker: ReportLinker,
  maxResultsDefault: number
): Promise<SearchReportsOutput | { error: unknown }> {
  try {
    // Validate input
    if (!validateQuery(input.query)) {
      return createInvalidInputError('Invalid query: must be 1-500 characters with no control characters');
    }

    if (input.command_filter && !validateCommandName(input.command_filter)) {
      return createInvalidInputError('Invalid command filter: must be alphanumeric with underscores/hyphens only');
    }

    const maxResults = validateMaxResults(input.max_results, maxResultsDefault);

    logger.info('search_reports tool invoked', {
      query: input.query,
      commandFilter: input.command_filter,
      maxResults,
    });

    // Search reports
    const reportMatches = await reportFinder.search(input.query, input.command_filter);

    // Limit results
    const limitedMatches = reportMatches.slice(0, maxResults);

    // Format output
    const output: SearchReportsOutput = {
      results: limitedMatches.map(report => ({
        report_name: report.name,
        command_name: report.command_name,
        date: report.date ? report.date.toISOString() : null,
        excerpt: report.excerpt,
        link: reportLinker.generateLink(report.path),
        path: report.path,
      })),
    };

    logger.info('search_reports completed', {
      query: input.query,
      results: output.results.length,
    });

    return output;
  } catch (error) {
    logger.error('search_reports failed', error as Error);
    return { error };
  }
}

