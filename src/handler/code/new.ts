import type { CommandContext } from '../types';
import { taskManager } from '../../runtime/taskManager';
import { sessionManager } from '../../runtime/sessionManager';
import { toolRegistry } from '../../runtime/tools/registry';
import logger from '../../utils/logger';

export async function run(ctx: CommandContext): Promise<void> {
  // Cancel running tasks
  const tasks = taskManager.getUserTasks(ctx.senderId);
  for (const task of tasks) {
    taskManager.cancelTask(task.id);
  }

  // Reset session (clears sessionId/model/agent, keeps tool and cwd)
  sessionManager.resetSession(ctx.senderId);

  const session = sessionManager.getSession(ctx.senderId);
  const adapter = toolRegistry.get(session.tool);
  const toolDisplay = adapter?.displayName || session.tool;

  logger.info(`🔄 New session for ${toolDisplay}`);
  await ctx.reply(`🔄 New session started (${toolDisplay}). Previous tasks cleared.`);
}
