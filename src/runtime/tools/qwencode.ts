import { BaseToolAdapter } from './base';
import type { RunOptions, ToolCapabilities } from './base';

/**
 * Adapter for Qwen Code CLI.
 * Similar to Claude Code CLI interface.
 * - Execute: qwen -p "prompt"
 * - Session: --resume <id> / --continue
 */
export class QwenCodeAdapter extends BaseToolAdapter {
  readonly name = 'qwencode';
  readonly commandName = 'qwen';
  readonly displayName = 'Qwen Code';
  readonly capabilities: ToolCapabilities = {
    session: true,
    model: false,
    agent: false,
    compact: true,
    listModels: false,
    listSessions: false,
    listAgents: false,
  };

  buildCommand(prompt: string, options: RunOptions): string {
    const parts = ['qwen', '-p'];

    if (!options.newSession) {
      if (options.sessionId) {
        parts.push('--resume', options.sessionId);
      } else {
        parts.push('--continue'); // continue last session by default
      }
    }
    // newSession: don't pass --resume or --continue (start fresh)

    parts.push(`"${this.escapePrompt(prompt)}"`);

    return parts.join(' ');
  }

  async listModels(): Promise<string[]> {
    return [
      'qwen3-coder-plus',
      'qwen3-coder',
    ];
  }
}
