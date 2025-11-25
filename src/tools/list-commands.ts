/**
 * list_commands tool handler
 */

import { ListCommandsInput, ListCommandsOutput } from '../types';
import { CommandLoader } from '../commands/loader';
import { validatePagination } from '../utils/validators';
import { logger } from '../utils/logger';

/**
 * List commands handler
 */
export async function handleListCommands(
  input: ListCommandsInput,
  commandLoader: CommandLoader
): Promise<ListCommandsOutput | { error: unknown }> {
  try {
    const { page, pageSize } = validatePagination(input.page, input.page_size);

    logger.info('list_commands tool invoked', {
      page,
      pageSize,
    });

    // Load all commands
    const allCommands = await commandLoader.listAll();
    const total = allCommands.length;

    // Apply pagination
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedCommands = allCommands.slice(startIndex, endIndex);

    // Format output
    const output: ListCommandsOutput = {
      commands: paginatedCommands.map(cmd => ({
        name: cmd.name,
        description: cmd.description,
        size: cmd.size,
        last_modified: cmd.last_modified.toISOString(),
      })),
      total,
      page,
      page_size: pageSize,
    };

    logger.info('list_commands completed', {
      total,
      page,
      returned: output.commands.length,
    });

    return output;
  } catch (error) {
    logger.error('list_commands failed', error as Error);
    return { error };
  }
}

