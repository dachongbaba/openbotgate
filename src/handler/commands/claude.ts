import type { CommandContext } from '../types';
import { taskManager } from '../../runtime/taskManager';
import { sendResult } from './utils';

export async function run(ctx: CommandContext): Promise<void> {
  const prompt = ctx.args.trim();

  if (!prompt) {
    await ctx.reply('Usage: /claudecode <prompt>\nExample: /claudecode Write a unit test');
    return;
  }

  await ctx.reply('🤖 Running Claude Code...');

  const task = await taskManager.createTask(ctx.senderId, prompt, 'claude-code');
  const result = await taskManager.executeTask(task.id);

  if (result) {
    await sendResult(result, ctx.reply);
  }
}
