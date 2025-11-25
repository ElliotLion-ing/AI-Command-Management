/**
 * list_command_reports tool handler
 */

import { ListCommandReportsInput, ListCommandReportsOutput } from '../types';
import { ReportFinder } from '../reports/finder';
import { ReportLinker } from '../reports/linker';
import { validateCommandName } from '../utils/validators';
import { createInvalidInputError } from '../utils/errors';
import { logger } from '../utils/logger';

/**
 * List command reports handler
 */
export async function handleListCommandReports(
  input: ListCommandReportsInput,
  reportFinder: ReportFinder,
  reportLinker: ReportLinker
): Promise<ListCommandReportsOutput | { error: unknown }> {
  try {
    // Validate input
    if (!validateCommandName(input.command_name)) {
      return createInvalidInputError(
        'Invalid command name: must be alphanumeric with underscores/hyphens only'
      );
    }

    logger.info('list_command_reports tool invoked', {
      commandName: input.command_name,
    });

    // List reports
    const reports = await reportFinder.listForCommand(input.command_name);

    // Format output
    const output: ListCommandReportsOutput = {
      reports: reports.map(report => ({
        name: report.name,
        date: report.date ? report.date.toISOString() : null,
        size: report.size,
        link: reportLinker.generateLink(report.path),
        path: report.path,
      })),
      command_name: input.command_name,
      total: reports.length,
    };

    logger.info('list_command_reports completed', {
      commandName: input.command_name,
      total: reports.length,
    });

    return output;
  } catch (error) {
    logger.error('list_command_reports failed', error as Error, {
      commandName: input.command_name,
    });
    return { error };
  }
}

