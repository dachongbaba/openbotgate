import type { CommandContext } from '../types';
import { taskManager } from '../../runtime/taskManager';
import { feishu } from '../../gateway/feishu';
import logger from '../../utils/logger';

export async function run(ctx: CommandContext): Promise<void> {
  const [tool, ...commandParts] = ctx.args.split(' ');
  const command = commandParts.join(' ');

  if (!tool || !command) {
    logger.info('💬 Reply: Usage: /async <tool> <command>');
    await ctx.reply('Usage: /async <tool> <command>\nExample: /async opencode Complex task');
    return;
  }

  logger.info(`🚀 Executing ${tool} asynchronously...`);
  // await ctx.reply(`Executing ${tool} asynchronously...`);

  const task = await taskManager.createTask(ctx.senderId, command, tool.toLowerCase());

  // Execute in background and notify when done
  taskManager.executeTask(task.id).then(async (result) => {
    if (result) {
      await feishu.sendTextMessage(
        ctx.chatId,
        'chat_id',
        `✅ Task completed! ID: ${task.id}\n\nUse /tasks to view results.`
      );
    }
  });

  logger.info(`💬 Reply: Task started! ID: ${task.id}`);
  await ctx.reply(`Task started! ID: ${task.id}\nI'll notify you when it's complete.`);
}
