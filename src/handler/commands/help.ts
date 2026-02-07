import type { CommandContext } from '../types';
import logger from '../../utils/logger';

const HELP_TEXT = `
*AI Code Gateway - Help*

Available Commands:

*Tool Execution:*
• \`/opencode <prompt>\` - Execute OpenCode with prompt
• \`/git <command>\` - Execute Git command
• \`/shell <command>\` - Execute Shell command (if enabled)

*Execution Mode:*
• \`/sync <tool> <command>\` - Execute synchronously, wait for result
• \`/async <tool> <command>\` - Execute asynchronously, notify when done

*Task Management:*
• \`/status\` - Show system status
• \`/tasks\` - List your running tasks
• \`/cancel <task_id>\` - Cancel a running task
• \`/new\` - Start new conversation (clear history)

*Examples:*
• \`/opencode Write a function to calculate fibonacci\`
• \`/git status\`
• \`/sync opencode Summarize this code\`
• \`/async opencode Generate unit tests for all files\`
`;

export async function run(ctx: CommandContext): Promise<void> {
  logger.info('💬 Reply: AI Code Gateway Help');
  await ctx.send('AI Code Gateway Help', HELP_TEXT);
}
