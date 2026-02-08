import { BaseToolAdapter } from './base';
import type { RunOptions, ToolCapabilities } from './base';

/**
 * Adapter for Claude Code CLI.
 * - Execute: claude -p "prompt"
 * - Session: -r <session> / -c (continue)
 * - Model: --model name
 * - Agent: --agent name
 */
export class ClaudeCodeAdapter extends BaseToolAdapter {
  readonly name = 'claudecode';
  readonly commandName = 'claude';
  readonly displayName = 'Claude Code';
  readonly capabilities: ToolCapabilities = {
    session: true,
    model: true,
    agent: true,
    compact: false,
    listModels: false,
    listSessions: false,
    listAgents: false,
  };

  buildCommand(prompt: string, options: RunOptions): string {
    const parts = ['claude', '-p'];

    if (options.sessionId) {
      parts.push('-r', options.sessionId);
    } else {
      parts.push('-c'); // continue last session by default
    }

    if (options.model) parts.push('--model', options.model);
    if (options.agent) parts.push('--agent', options.agent);
    parts.push(`"${this.escapePrompt(prompt)}"`);

    return parts.join(' ');
  }

  async listModels(): Promise<string[]> {
    // Claude Code has a preset list
    return [
      'claude-sonnet-4-20250514',
      'claude-opus-4-20250514',
      'claude-haiku-3.5',
    ];
  }

  async listAgents(): Promise<string[]> {
    return ['plan', 'build'];
  }
}
