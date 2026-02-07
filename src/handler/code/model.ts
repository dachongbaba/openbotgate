import type { CommandContext } from '../types';
import { toolRegistry } from '../../runtime/tools/registry';
import { sessionManager } from '../../runtime/sessionManager';
import logger from '../../utils/logger';

/**
 * /model command - list or switch model
 *
 * /model             -> list models for current tool
 * /model <name>      -> set model
 * /model reset       -> reset to default
 */
export async function run(ctx: CommandContext): Promise<void> {
  const args = ctx.args.trim();
  const session = sessionManager.getSession(ctx.senderId);
  const adapter = toolRegistry.get(session.tool);

  if (!adapter) {
    await ctx.reply(`Current tool "${session.tool}" is not available.`);
    return;
  }

  // Reset model
  if (args.toLowerCase() === 'reset') {
    sessionManager.updateSession(ctx.senderId, { model: null });
    await ctx.reply(`Model reset to default for ${adapter.displayName}`);
    return;
  }

  // Set model
  if (args) {
    if (!adapter.capabilities.model) {
      await ctx.reply(`${adapter.displayName} does not support model selection.`);
      return;
    }
    sessionManager.updateSession(ctx.senderId, { model: args });
    logger.info(`🔄 Model set to: ${args}`);
    await ctx.reply(`Model set to: ${args}`);
    return;
  }

  // List models
  if (!adapter.capabilities.listModels) {
    const current = session.model || 'default';
    await ctx.reply(`${adapter.displayName} current model: ${current}\n(This tool does not support listing models. Use /model <name> to set.)`);
    return;
  }

  const models = await adapter.listModels();
  if (models.length === 0) {
    await ctx.reply(`No models found for ${adapter.displayName}.`);
    return;
  }

  const current = session.model || 'default';
  const lines = [
    `${adapter.displayName} models (current: ${current}):`,
    '',
    ...models.map(m => `  ${m}`),
    '',
    'Usage: /model <name>',
  ];
  await ctx.reply(lines.join('\n'));
}
