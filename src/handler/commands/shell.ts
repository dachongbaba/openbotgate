import type { CommandContext } from '../types';
import type { ToolResult } from '../../runtime/tools/base';
import { taskManager } from '../../runtime/taskManager';
import { config } from '../../config/config';
import logger, { formatDuration } from '../../utils/logger';

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

/** 输出到控制台和当日日志文件（原样，无时间戳）。 */
function printOutput(result: ToolResult, command: string): void {
  const output = result.success ? result.output : result.error;
  process.stdout.write(output + '\n');
  logger.writeRawToFile(output + '\n');
}

/**
 * Format and send execution result
 */
async function sendResult(
  result: ToolResult,
  reply: (text: string) => Promise<void>
): Promise<void> {
  const output = result.success ? result.output : result.error;

  const debugMode = config.log.debugMode ?? false;
  if (!output || output.trim() === '') {
    if (debugMode) {
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

    if (debugMode) {
      logger.debug(messageContent);
    } else {
      try {
        await reply(messageContent);
      } catch (err) {
        logger.error(`Reply failed for ${result.tool} chunk ${i + 1}:`, err);
        throw err;
      }
    }

    if (i < chunks.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
}

/**
 * Run a shell command (allowed by config.allowedShellCommands).
 * Generic: always builds full command "name args" and uses tool 'shell'.
 */
async function runShell(ctx: CommandContext, commandName: string): Promise<void> {
  if (!config.allowedShellCommands.includes(commandName)) {
    await ctx.reply(`Command "${commandName}" is not in allowed shell commands.`);
    return;
  }

  const command = (commandName + ' ' + ctx.args.trim()).trim();

  logger.info(`🚀 Running ${commandName}...`);

  const task = await taskManager.createTask(ctx.senderId, command, 'shell');
  const result = await taskManager.executeTask(task.id);

  if (result) {
    printOutput(result, command);
    const duration = formatDuration(result.duration);
    if (result.success) {
      logger.info(`✅ shell (${commandName}) 完成 (${duration})`);
    } else {
      logger.info(`❌ shell (${commandName}) 失败 (${duration})`);
    }
    const outLen = result.output?.length ?? 0;
    if (outLen > 0 && (config.log.debugMode ?? false)) {
      logger.debug(`shell result.output length=${outLen}, preview: ${result.output!.slice(0, 80).replace(/\n/g, ' ')}`);
    }
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
