import type { CommandContext } from '../types';
import { config } from '../../config/config';
import { toolRegistry } from '../../runtime/tools/registry';
import logger from '../../utils/logger';

const HELP_CODE = `*Code* (tool + session)
• \`/code\` - Show current tool / list available tools
• \`/code <tool>\` - Switch default tool (<allowed code tools>)
• \`/code <tool> "prompt"\` - One-shot execute with specified tool
• \`/new\` - Start new session (clear history)
• \`/session\` - List sessions | \`/session <id>\` - Switch to session
• \`/model\` - List models | \`/model <name>\` - Set model
• \`/agent\` - List agents | \`/agent <name>\` - Set agent
• \`/workspace\` - Show cwd | \`/workspace <path>\` - Set working directory`;

const HELP_SHELL = `*Shell*
<allowed shell commands>
`;

const HELP_TASK = `*Task*
• \`/status\` - Show system status
• \`/tasks\` - List running tasks
• \`/cancel <task_id>\` - Cancel a task`;

const PLACEHOLDER_CODE_TOOLS = '<allowed code tools>';
const PLACEHOLDER_SHELL = '<allowed shell commands>';

function buildHelpText(): string {
  const codeToolList = toolRegistry.getEnabled().map((t) => t.commandName).join(', ') || '(none)';
  const helpCode = HELP_CODE.replace(PLACEHOLDER_CODE_TOOLS, codeToolList);

  const shellLines = config.allowedShellCommands.length
    ? config.allowedShellCommands
        .map((name) => `• \`/${name} <args>\` - Execute ${name} command`)
        .join('\n')
    : '• (no shell commands configured)';
  const helpShell = HELP_SHELL.replace(PLACEHOLDER_SHELL, shellLines);

  return [
    '*AI Code Gateway - Help*',
    '',
    helpCode,
    '',
    helpShell,
    '',
    HELP_TASK,
    '',
    '*Tip:* Send a message without / to execute with current code tool.',
  ].join('\n');
}

export async function run(ctx: CommandContext): Promise<void> {
  logger.info('💬 Reply: AI Code Gateway Help');
  await ctx.send('AI Code Gateway Help', buildHelpText());
}
