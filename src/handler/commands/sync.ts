import type { CommandContext } from '../types';
import { taskManager } from '../../runtime/taskManager';
import { sendResult } from './utils';

export async function run(ctx: CommandContext): Promise<void> {
  const [tool, ...commandParts] = ctx.args.split(' ');
  const command = commandParts.join(' ');

  if (!tool || !command) {
    await ctx.reply('Usage: /sync <tool> <command>\nExample: /sync opencode Hello');
    return;
  }

  await ctx.reply(`Executing ${tool} synchronously...`);

  const task = await taskManager.createTask(ctx.senderId, command, tool.toLowerCase());
  const result = await taskManager.executeTask(task.id);

  if (result) {
    await sendResult(result, ctx.reply);
  }
}
