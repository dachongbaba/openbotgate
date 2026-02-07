import type { CommandContext } from '../types';
import logger from '../../utils/logger';

const HELP_TEXT = `
*AI Code Gateway - Help*

Available Commands:

*Tool Management:*
• \`/code\` - Show current tool / list available tools
• \`/code <tool>\` - Switch default tool (opencode, claude, codex, qwen, kimi, openclaw, nanobot)
• \`/code <tool> "prompt"\` - One-shot execute with specified tool

*Session Management:*
• \`/new\` - Start new session (clear history)
• \`/session\` - List sessions
• \`/session <id>\` - Switch to session
• \`/model\` - List models
• \`/model <name>\` - Set model
• \`/agent\` - List agents
• \`/agent <name>\` - Set agent
• \`/workspace\` - Show working directory
• \`/workspace <path>\` - Set working directory

*Direct Execution:*
• \`/opencode <prompt>\` - Execute with OpenCode
• \`/git <command>\` - Execute Git command
• \`/sync <tool> <command>\` - Sync execution
• \`/async <tool> <command>\` - Async execution

*Task Management:*
• \`/status\` - Show system status
• \`/tasks\` - List running tasks
• \`/cancel <task_id>\` - Cancel a task

*Tip:* Send a message without / to execute with current tool (default: opencode).
`;

export async function run(ctx: CommandContext): Promise<void> {
  logger.info('💬 Reply: AI Code Gateway Help');
  await ctx.send('AI Code Gateway Help', HELP_TEXT);
}
