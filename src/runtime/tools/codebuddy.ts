import { BaseToolAdapter } from './base';
import type { RunOptions, ToolCapabilities } from './base';

/**
 * Adapter for CodeBuddy Code CLI (腾讯云).
 * - Execute: codebuddy -p "prompt" [-y]
 * - Non-interactive: -p/--print; -y skips permission prompts for automation.
 * @see https://www.codebuddy.ai/docs/zh/cli/quickstart
 */
export class CodeBuddyAdapter extends BaseToolAdapter {
  readonly name = 'codebuddy';
  readonly commandName = 'codebuddy';
  readonly displayName = 'CodeBuddy';
  readonly capabilities: ToolCapabilities = {
    session: false,
    model: false,
    agent: false,
    compact: false,
    listModels: false,
    listSessions: false,
    listAgents: false,
  };

  buildCommand(prompt: string, _options: RunOptions): string {
    const exe = this.getExecutable();
    // -y: skip permission prompts in headless/gateway usage
    return `${exe} -p "${this.escapePrompt(prompt)}" -y`;
  }
}
