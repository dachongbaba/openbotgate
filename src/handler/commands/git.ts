import type { CommandContext } from '../types';
import { taskManager } from '../../runtime/taskManager';
import { sendResult } from './utils';

export async function run(ctx: CommandContext): Promise<void> {
  const command = ctx.args.trim();

  if (!command) {
    await ctx.reply('Usage: /git <command>\nExample: /git status');
    return;
  }

  await ctx.reply('🔧 Running Git...');

  const task = await taskManager.createTask(ctx.senderId, command, 'git');
  const result = await taskManager.executeTask(task.id);

  if (result) {
    await sendResult(result, ctx.reply);
  }
}
