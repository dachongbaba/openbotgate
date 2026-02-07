import type { CommandContext } from '../types';
import { taskManager } from '../../runtime/taskManager';
import { sendResult } from './utils';
import logger from '../../utils/logger';

export async function run(ctx: CommandContext): Promise<void> {
  const command = ctx.args.trim();

  if (!command) {
    logger.info('💬 Reply: Usage: /git <command>');
    await ctx.reply('Usage: /git <command>\nExample: /git status');
    return;
  }

  logger.info('🚀 Running Git...');
  // await ctx.reply('🔧 Running Git...');

  const task = await taskManager.createTask(ctx.senderId, command, 'git');
  const result = await taskManager.executeTask(task.id);

  if (result) {
    await sendResult(result, ctx.reply);
  }
}
