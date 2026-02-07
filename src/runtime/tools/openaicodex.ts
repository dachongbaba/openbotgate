import { BaseToolAdapter } from './base';
import type { RunOptions, ToolCapabilities } from './base';

/**
 * Adapter for OpenAI Codex CLI.
 * - Execute: codex exec "prompt"
 * - Resume: codex exec resume <id> "prompt"
 * - Model: -m model
 * - JSON output: --json
 */
export class CodexAdapter extends BaseToolAdapter {
  readonly name = 'codex';
  readonly commandName = 'codex';
  readonly displayName = 'Codex';
  readonly capabilities: ToolCapabilities = {
    session: true,
    model: true,
    agent: false,
    compact: false,
    listModels: false,
    listSessions: false,
    listAgents: false,
  };

  buildCommand(prompt: string, options: RunOptions): string {
    const parts = ['codex', 'exec'];

    if (options.sessionId) {
      parts.push('resume', options.sessionId);
    }

    if (options.model) parts.push('-m', options.model);
    parts.push('--full-auto');
    parts.push(`"${this.escapePrompt(prompt)}"`);

    return parts.join(' ');
  }

  protected parseSessionId(output: string): string | undefined {
    // Codex JSONL output may contain session/conversation ID
    try {
      const lines = output.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('{')) continue;
        const obj = JSON.parse(trimmed);
        if (obj.conversation_id) return obj.conversation_id;
        if (obj.session_id) return obj.session_id;
      }
    } catch {
      // ignore
    }
    return undefined;
  }

  async listModels(): Promise<string[]> {
    return [
      'o4-mini',
      'o3',
      'gpt-4.1',
    ];
  }
}
