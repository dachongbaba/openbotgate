import type { CommandContext } from '../types';
import { taskManager } from '../../runtime/taskManager';
import { sendResult } from './utils';

export async function run(ctx: CommandContext): Promise<void> {
  const prompt = ctx.args.trim();

  if (!prompt) {
    if (process.env.DEBUG === 'true') {
      console.log('ℹ️  Usage: /opencode <prompt>\nExample: /opencode Write a hello world function');
      return;
    }
    await ctx.reply('Usage: /opencode <prompt>\nExample: /opencode Write a hello world function');
    return;
  }

  if (process.env.DEBUG === 'true') {
    console.log('🤖 Running OpenCode...');
  } else {
    await ctx.reply('🤖 Running OpenCode...');
  }

  const task = await taskManager.createTask(ctx.senderId, prompt, 'opencode');
  const result = await taskManager.executeTask(task.id);

  if (result) {
    await sendResult(result, ctx.reply);
  }
}
