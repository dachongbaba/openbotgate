import * as fs from 'fs';
import type { CommandContext } from '../types';
import { sessionManager } from '../../runtime/sessionManager';
import logger from '../../utils/logger';

/**
 * /workspace command - set or view working directory
 *
 * /workspace              -> show current cwd
 * /workspace <path>       -> set cwd
 * /workspace reset        -> reset to default (process.cwd())
 */
export async function run(ctx: CommandContext): Promise<void> {
  const args = ctx.args.trim();
  const session = sessionManager.getSession(ctx.senderId);

  // Reset
  if (args.toLowerCase() === 'reset') {
    sessionManager.updateSession(ctx.senderId, { cwd: null });
    await ctx.reply(`Workspace reset to default: ${process.cwd()}`);
    return;
  }

  // Set workspace
  if (args) {
    // Validate path exists
    if (!fs.existsSync(args)) {
      await ctx.reply(`Path does not exist: ${args}`);
      return;
    }

    const stat = fs.statSync(args);
    if (!stat.isDirectory()) {
      await ctx.reply(`Path is not a directory: ${args}`);
      return;
    }

    sessionManager.updateSession(ctx.senderId, { cwd: args });
    logger.info(`📂 Workspace set to: ${args}`);
    await ctx.reply(`Workspace set to: ${args}`);
    return;
  }

  // Show current
  const cwd = session.cwd || process.cwd();
  await ctx.reply(`Current workspace: ${cwd}${session.cwd ? '' : ' (default)'}`);
}
