import type { CommandContext } from '../types';
import { taskManager } from '../../runtime/taskManager';

export async function run(ctx: CommandContext): Promise<void> {
  const tasks = taskManager.getUserTasks(ctx.senderId);

  for (const task of tasks) {
    taskManager.cancelTask(task.id);
  }

  await ctx.reply('🔄 New conversation started! All previous tasks have been cleared.');
}
