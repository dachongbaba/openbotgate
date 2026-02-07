import { BaseToolAdapter } from './base';
import type { RunOptions, ToolCapabilities } from './base';

/**
 * Adapter for Qwen Code CLI.
 * Similar to Claude Code CLI interface.
 * - Execute: qwen -p "prompt"
 * - Session: --resume <id> / --continue
 * - JSON output: --output-format json
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

    if (options.sessionId) {
      parts.push('--resume', options.sessionId);
    } else {
      parts.push('--continue'); // continue last session by default
    }

    parts.push('--output-format', 'json');
    parts.push(`"${this.escapePrompt(prompt)}"`);

    return parts.join(' ');
  }

  protected parseSessionId(output: string): string | undefined {
    try {
      const lines = output.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('{')) continue;
        const obj = JSON.parse(trimmed);
        if (obj.session_id) return obj.session_id;
      }
    } catch {
      // ignore
    }
    return undefined;
  }

  async listModels(): Promise<string[]> {
    return [
      'qwen3-coder-plus',
      'qwen3-coder',
    ];
  }
}
