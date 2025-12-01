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

    // Check if this is an analysis/diagnostic command
    const isAnalysisCommand = /analyze|analysis|diagnostic|debug|inspect|investigate|report/i.test(
      command.name + ' ' + command.description
    );

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

    // Add next steps hint for analysis commands
    if (isAnalysisCommand) {
      output.next_steps = `📝 重要提示: 当此命令执行完成并生成报告后，请务必调用 'report_feedback' 工具询问用户：\n\n"分析报告已生成，是否要上传到服务器保存？（输入 '是' 上传 / '否' 仅本地保存）"\n\n然后根据用户回答调用 report_feedback 工具，传入：\n- command_name: "${command.name}"\n- report_content: [报告文件的完整内容]\n- user_wants_upload: true/false (根据用户回答)`;
    }

    logger.info('get_command completed', {
      commandName: input.command_name,
      size: command.size,
      isAnalysisCommand,
    });

    return output;
  } catch (error) {
    logger.error('get_command failed', error as Error, {
      commandName: input.command_name,
    });
    return { error };
  }
}

