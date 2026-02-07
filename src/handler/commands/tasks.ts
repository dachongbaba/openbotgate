import type { CommandContext } from '../types';
import { taskManager } from '../../runtime/taskManager';
import logger from '../../utils/logger';

/**
 * List user's tasks
 */
export async function run(ctx: CommandContext): Promise<void> {
  const tasks = taskManager.getUserTasks(ctx.senderId);

  if (tasks.length === 0) {
    logger.info('💬 Reply: No running tasks.');
    await ctx.reply('No running tasks.');
    return;
  }

  const taskList = tasks
    .filter((t) => t.status === 'running' || t.status === 'pending')
    .map(
      (t) =>
        `• [${t.status.toUpperCase()}] ${t.tool}: ${t.command.substring(0, 50)}... (ID: ${t.id})`
    )
    .join('\n');

  logger.info(`💬 Reply: ${taskList || 'No active tasks.'}`);
  await ctx.reply(taskList || 'No active tasks.');
}

/**
 * Cancel a task
 */
export async function cancel(ctx: CommandContext): Promise<void> {
  const taskId = ctx.args.trim();

  if (!taskId) {
    logger.info('💬 Reply: Usage: /cancel <task_id>');
    await ctx.reply('Usage: /cancel <task_id>');
    return;
  }

  const task = taskManager.getTask(taskId);

  if (!task) {
    logger.info(`💬 Reply: Task ${taskId} not found.`);
    await ctx.reply(`Task ${taskId} not found.`);
    return;
  }

  if (task.userId !== ctx.senderId) {
    logger.info('💬 Reply: You can only cancel your own tasks.');
    await ctx.reply('You can only cancel your own tasks.');
    return;
  }

  const success = taskManager.cancelTask(taskId);

  if (success) {
    logger.info(`💬 Reply: Task ${taskId} has been cancelled.`);
    await ctx.reply(`Task ${taskId} has been cancelled.`);
  } else {
    logger.info(`💬 Reply: Failed to cancel task ${taskId}.`);
    await ctx.reply(`Failed to cancel task ${taskId}.`);
  }
}
