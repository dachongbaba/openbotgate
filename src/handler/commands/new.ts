import type { CommandContext } from '../types';
import { taskManager } from '../../runtime/taskManager';
import logger from '../../utils/logger';

export async function run(ctx: CommandContext): Promise<void> {
  const tasks = taskManager.getUserTasks(ctx.senderId);

  for (const task of tasks) {
    taskManager.cancelTask(task.id);
  }

  logger.info('💬 Reply: New conversation started! All previous tasks have been cleared.');
  await ctx.reply('🔄 New conversation started! All previous tasks have been cleared.');
}
