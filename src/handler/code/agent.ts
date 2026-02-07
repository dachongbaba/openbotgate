import type { CommandContext } from '../types';
import { toolRegistry } from '../../runtime/tools/registry';
import { sessionManager } from '../../runtime/sessionManager';
import logger from '../../utils/logger';

/**
 * /agent command - list or switch agent
 *
 * /agent             -> list agents for current tool
 * /agent <name>      -> set agent
 * /agent reset       -> reset to default
 */
export async function run(ctx: CommandContext): Promise<void> {
  const args = ctx.args.trim();
  const session = sessionManager.getSession(ctx.senderId);
  const adapter = toolRegistry.get(session.tool);

  if (!adapter) {
    await ctx.reply(`Current tool "${session.tool}" is not available.`);
    return;
  }

  // Reset agent
  if (args.toLowerCase() === 'reset') {
    sessionManager.updateSession(ctx.senderId, { agent: null });
    await ctx.reply(`Agent reset to default for ${adapter.displayName}`);
    return;
  }

  // Set agent
  if (args) {
    if (!adapter.capabilities.agent) {
      await ctx.reply(`${adapter.displayName} does not support agent selection.`);
      return;
    }
    sessionManager.updateSession(ctx.senderId, { agent: args });
    logger.info(`🔄 Agent set to: ${args}`);
    await ctx.reply(`Agent set to: ${args}`);
    return;
  }

  // List agents
  if (!adapter.capabilities.listAgents) {
    const current = session.agent || 'default';
    await ctx.reply(`${adapter.displayName} current agent: ${current}\n(This tool does not support listing agents. Use /agent <name> to set.)`);
    return;
  }

  const agents = await adapter.listAgents();
  if (agents.length === 0) {
    await ctx.reply(`No agents found for ${adapter.displayName}.`);
    return;
  }

  const current = session.agent || 'default';
  const lines = [
    `${adapter.displayName} agents (current: ${current}):`,
    '',
    ...agents.map(a => `  ${a}`),
    '',
    'Usage: /agent <name>',
  ];
  await ctx.reply(lines.join('\n'));
}
