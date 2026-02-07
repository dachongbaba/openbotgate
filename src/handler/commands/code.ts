import type { CommandContext } from '../types';
import { toolRegistry } from '../../runtime/tools/registry';
import { sessionManager } from '../../runtime/sessionManager';
import { executePrompt } from './opencode';
import logger from '../../utils/logger';

/**
 * /code command - switch tools or one-shot execute
 *
 * /code              -> show current tool + list available
 * /code opencode     -> switch default tool
 * /code claude "msg" -> one-shot execute with specified tool
 */
export async function run(ctx: CommandContext): Promise<void> {
  const args = ctx.args.trim();
  const session = sessionManager.getSession(ctx.senderId);

  // No args: show current tool + list
  if (!args) {
    const current = toolRegistry.get(session.tool);
    const all = toolRegistry.getEnabled();
    const lines = [
      `Current tool: ${current?.displayName || session.tool}`,
      '',
      'Available tools:',
      ...all.map(t => `  ${t.commandName} - ${t.displayName}${t.name === session.tool ? ' (active)' : ''}`),
      '',
      'Usage:',
      '  /code <tool>           - switch default tool',
      '  /code <tool> "prompt"  - one-shot execute',
    ];
    await ctx.reply(lines.join('\n'));
    return;
  }

  // Parse: first word is tool name, rest is optional prompt
  const parts = args.split(/\s+/);
  const toolCmd = parts[0].toLowerCase();
  const prompt = parts.slice(1).join(' ').trim();

  // Find adapter by command name
  const adapter = toolRegistry.getByCommand(toolCmd);
  if (!adapter) {
    const available = toolRegistry.getEnabled().map(t => t.commandName).join(', ');
    await ctx.reply(`Unknown tool: ${toolCmd}\nAvailable: ${available}`);
    return;
  }

  // One-shot execute (don't switch default)
  if (prompt) {
    logger.info(`🔧 One-shot ${adapter.displayName}: ${prompt.substring(0, 50)}...`);
    await executePrompt(ctx, prompt, adapter.name);
    return;
  }

  // Switch default tool
  sessionManager.updateSession(ctx.senderId, {
    tool: adapter.name,
    sessionId: null,  // reset session when switching tools
    model: null,
    agent: null,
  });

  logger.info(`🔄 Switched to ${adapter.displayName}`);
  await ctx.reply(`Switched to ${adapter.displayName}`);
}
