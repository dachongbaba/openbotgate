import { BaseToolAdapter } from './base';
import type { RunOptions, ToolCapabilities } from './base';

/**
 * Adapter for OpenAI Codex CLI.
 * - Execute: codex exec resume [id|--last] "prompt"
 * - Session: resume <id> or resume --last (continue most recent in cwd)
 * - Model: -m model
 */
export class CodexAdapter extends BaseToolAdapter {
  readonly name = 'openaicodex';
  readonly commandName = 'codex';
  readonly displayName = 'OpenAI Codex';
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
    const parts = [this.getExecutable(), 'exec'];

    if (!options.newSession) {
      parts.push('resume');
      if (options.sessionId) {
        parts.push(options.sessionId);
      } else {
        parts.push('--last'); // continue most recent session in cwd
      }
    }
    // newSession: codex exec without resume (start fresh)

    if (options.model) parts.push('-m', options.model);
    parts.push('--full-auto');
    parts.push(`"${this.escapePrompt(prompt)}"`);

    return parts.join(' ');
  }

  async listModels(): Promise<string[]> {
    return [
      'o4-mini',
      'o3',
      'gpt-4.1',
    ];
  }
}
