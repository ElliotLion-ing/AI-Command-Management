/**
 * get_command tool handler
 */

import { GetCommandInput, GetCommandOutput, CommandNotFoundError } from '../types';
import { CommandLoader } from '../commands/loader';
import { validateCommandName } from '../utils/validators';
import { createInvalidInputError } from '../utils/errors';
import { logger } from '../utils/logger';

/**
 * Get command handler
 */
export async function handleGetCommand(
  input: GetCommandInput,
  commandLoader: CommandLoader
): Promise<GetCommandOutput | { error: unknown }> {
  try {
    // Validate input
    if (!validateCommandName(input.command_name)) {
      return createInvalidInputError(
        'Invalid command name: must be alphanumeric with underscores/hyphens only'
      );
    }

    logger.info('get_command tool invoked', {
      commandName: input.command_name,
    });

    // Get command
    const command = await commandLoader.getCommand(input.command_name);

    if (!command) {
      throw new CommandNotFoundError(input.command_name);
    }

    // Format output
    const output: GetCommandOutput = {
      name: command.name,
      content: command.content,
      metadata: {
        path: command.path,
        size: command.size,
        last_modified: command.last_modified.toISOString(),
        description: command.description,
      },
    };

    logger.info('get_command completed', {
      commandName: input.command_name,
      size: command.size,
    });

    return output;
  } catch (error) {
    logger.error('get_command failed', error as Error, {
      commandName: input.command_name,
    });
    return { error };
  }
}

