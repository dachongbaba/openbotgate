import type { CommandContext } from '../types';
import { toolRegistry } from '../../runtime/tools/registry';
import { sessionManager } from '../../runtime/sessionManager';
import logger from '../../utils/logger';

/**
 * /session command - list or switch session
 *
 * /session            -> list sessions or show current
 * /session <id>       -> switch to specific session
 */
export async function run(ctx: CommandContext): Promise<void> {
  const args = ctx.args.trim();
  const session = sessionManager.getSession(ctx.senderId);
  const adapter = toolRegistry.get(session.tool);

  if (!adapter) {
    await ctx.reply(`Current tool "${session.tool}" is not available.`);
    return;
  }

  // Switch session
  if (args) {
    if (!adapter.capabilities.session) {
      await ctx.reply(`${adapter.displayName} does not support session management.`);
      return;
    }
    sessionManager.updateSession(ctx.senderId, { sessionId: args });
    logger.info(`🔄 Session set to: ${args}`);
    await ctx.reply(`Session set to: ${args}`);
    return;
  }

  // List sessions
  const current = session.sessionId || 'none (new session)';

  if (!adapter.capabilities.listSessions) {
    await ctx.reply(`${adapter.displayName} current session: ${current}\n(This tool does not support listing sessions. Use /session <id> to set.)`);
    return;
  }

  const sessions = await adapter.listSessions();
  if (sessions.length === 0) {
    await ctx.reply(`No sessions found for ${adapter.displayName}.\nCurrent: ${current}`);
    return;
  }

  const lines = [
    `${adapter.displayName} sessions (current: ${current}):`,
    '',
    ...sessions.map(s => `  ${s.id}  ${s.title}  ${s.updatedAt}`),
    '',
    'Usage: /session <id>',
  ];
  await ctx.reply(lines.join('\n'));
}
