import type { CommandContext } from '../types';
import { taskManager } from '../../runtime/taskManager';
import { sessionManager } from '../../runtime/sessionManager';
import { toolRegistry } from '../../runtime/tools/registry';
import logger from '../../utils/logger';

/**
 * /new - Mark next code run as new session. Does NOT call any code tool.
 * When user sends a prompt afterward, we run the code tool with "new session" params and clear the mark.
 */
export async function run(ctx: CommandContext): Promise<void> {
  const tasks = taskManager.getUserTasks(ctx.senderId);
  for (const task of tasks) {
    taskManager.cancelTask(task.id);
  }

  sessionManager.requestNewSession(ctx.senderId);

  const session = sessionManager.getSession(ctx.senderId);
  const adapter = toolRegistry.get(session.tool);
  const toolDisplay = adapter?.displayName || session.tool;

  logger.info(`🔄 New session requested for ${toolDisplay}`);
  await ctx.reply(`🔄 开始新会话（${toolDisplay}）。下次发送指令时将在新会话中执行。`);
}
