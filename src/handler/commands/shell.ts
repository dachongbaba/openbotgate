import type { CommandContext } from '../types';
import type { ToolResult } from '../../runtime/tools/base';
import { taskManager } from '../../runtime/taskManager';
import { config } from '../../config/config';
import logger from '../../utils/logger';

/**
 * Split string into chunks at newline boundaries
 */
export function splitString(str: string, maxLength: number): string[] {
  const chunks: string[] = [];
  let remaining = str;

  while (remaining.length > 0) {
    if (remaining.length <= maxLength) {
      chunks.push(remaining);
      break;
    }

    let splitIndex = remaining.lastIndexOf('\n', maxLength);
    if (splitIndex === -1) {
      splitIndex = maxLength;
    }

    chunks.push(remaining.substring(0, splitIndex));
    remaining = remaining.substring(splitIndex + 1);
  }

  return chunks;
}

/**
 * Format and send execution result
 */
async function sendResult(
  result: ToolResult,
  reply: (text: string) => Promise<void>
): Promise<void> {
  const output = result.success ? result.output : result.error;

  if (!output || output.trim() === '') {
    if (process.env.DEBUG === 'true') {
      logger.debug(`No output from ${result.tool}.`);
      return;
    }
    logger.info(`💬 Reply: No output from ${result.tool}.`);
    await reply(`No output from ${result.tool}.`);
    return;
  }

  const maxLength = 8000;
  const chunks = splitString(output, maxLength);

  for (let i = 0; i < chunks.length; i++) {
    const prefix = i === 0
      ? `📦 *${result.tool} Output* (${result.duration}ms)\n\n`
      : '';

    const messageContent = prefix + chunks[i];

    if (process.env.DEBUG === 'true') {
      logger.debug(messageContent);
    } else {
      logger.info(`💬 Reply: ${result.tool} output chunk ${i + 1}/${chunks.length}`);
      await reply(messageContent);
    }

    if (i < chunks.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
}

/**
 * Run a shell command (allowed by config.allowedShellCommands).
 * For "git", tool is 'git' and command is args only.
 * For others (e.g. ls, cat), tool is 'shell' and command is "name args".
 */
async function runShell(ctx: CommandContext, commandName: string): Promise<void> {
  if (!config.allowedShellCommands.includes(commandName)) {
    await ctx.reply(`Command "${commandName}" is not in allowed shell commands.`);
    return;
  }

  const isGit = commandName === 'git';
  const command = isGit ? ctx.args.trim() : (commandName + ' ' + ctx.args.trim()).trim();

  if (isGit && !command) {
    await ctx.reply('Usage: /git <command>\nExample: /git status');
    return;
  }

  logger.info(`🚀 Running ${commandName}...`);

  const tool = isGit ? 'git' : 'shell';
  const task = await taskManager.createTask(ctx.senderId, command, tool);
  const result = await taskManager.executeTask(task.id);

  if (result) {
    await sendResult(result, ctx.reply);
  }
}

/**
 * Returns a command handler that runs the given shell command name (e.g. 'git', 'ls').
 * Used when getCommand finds the slash command in allowedShellCommands but not in the static commands map.
 */
export function createShellHandler(commandName: string) {
  return (ctx: CommandContext) => runShell(ctx, commandName);
}
