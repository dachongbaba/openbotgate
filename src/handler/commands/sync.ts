import type { CommandContext } from '../types';
import { taskManager } from '../../runtime/taskManager';
import { sendResult } from './utils';
import logger from '../../utils/logger';

export async function run(ctx: CommandContext): Promise<void> {
  const [tool, ...commandParts] = ctx.args.split(' ');
  const command = commandParts.join(' ');

  if (!tool || !command) {
    logger.info('💬 Reply: Usage: /sync <tool> <command>');
    await ctx.reply('Usage: /sync <tool> <command>\nExample: /sync opencode Hello');
    return;
  }

  logger.info(`🚀 Executing ${tool} synchronously...`);
  // await ctx.reply(`Executing ${tool} synchronously...`);

  const task = await taskManager.createTask(ctx.senderId, command, tool.toLowerCase());
  const result = await taskManager.executeTask(task.id);

  if (result) {
    await sendResult(result, ctx.reply);
  }
}
