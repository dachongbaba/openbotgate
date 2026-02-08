import type { CommandContext } from '../types';
import { toolRegistry } from '../../runtime/tools/registry';
import { sessionManager } from '../../runtime/sessionManager';
import { createStreamHandler } from '../../runtime/streamHandler';
import logger, { formatDuration } from '../../utils/logger';

/**
 * Execute prompt with current or specified code tool.
 * Used by default message handler (no slash) and /code one-shot.
 */
export async function executePrompt(
  ctx: CommandContext,
  prompt: string,
  toolNameOverride?: string
): Promise<void> {
  if (!prompt) {
    logger.info('💬 Reply: Usage: send a prompt to execute');
    await ctx.reply('Send a message to run with current tool, or use /code <tool> "prompt" for one-shot.');
    return;
  }

  const session = sessionManager.getSession(ctx.senderId);
  const toolName = toolNameOverride || session.tool;
  const adapter = toolRegistry.get(toolName);

  if (!adapter) {
    await ctx.reply(`Tool "${toolName}" is not available. Use /code to switch tools.`);
    return;
  }

  const newSession = !!session.newSessionRequested;
  if (newSession) {
    sessionManager.clearNewSessionRequest(ctx.senderId);
  }

  const streamHandler = createStreamHandler(ctx.reply);
  const runOpts = {
    newSession,
    sessionId: newSession ? undefined : (session.sessionId ?? undefined),
    model: session.model ?? undefined,
    agent: session.agent ?? undefined,
    cwd: session.cwd ?? undefined,
    onOutput: streamHandler.onOutput,
  };

  const command = adapter.buildCommand(prompt, runOpts);
  logger.info(`🚀 Running ${adapter.displayName}: ${command}`);

  const result = await adapter.execute(prompt, runOpts);

  await streamHandler.complete();

  const duration = formatDuration(result.duration);
  if (result.success) {
    logger.info(`✅ ${adapter.displayName} 完成 (${duration})`);
  } else {
    logger.info(`❌ ${adapter.displayName} 失败 (${duration})`);
  }
}

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

  const parts = args.split(/\s+/);
  const toolCmd = parts[0].toLowerCase();
  const prompt = parts.slice(1).join(' ').trim();

  const adapter = toolRegistry.getByCommand(toolCmd);
  if (!adapter) {
    const available = toolRegistry.getEnabled().map(t => t.commandName).join(', ');
    await ctx.reply(`Unknown tool: ${toolCmd}\nAvailable: ${available}`);
    return;
  }

  if (prompt) {
    logger.info(`🔧 One-shot ${adapter.displayName}: ${prompt.substring(0, 50)}...`);
    await executePrompt(ctx, prompt, adapter.name);
    return;
  }

  sessionManager.updateSession(ctx.senderId, {
    tool: adapter.name,
    sessionId: null,
    model: null,
    agent: null,
  });

  logger.info(`🔄 Switched to ${adapter.displayName}`);
  await ctx.reply(`Switched to ${adapter.displayName}`);
}
