import { BaseToolAdapter } from './base';
import type { RunOptions, ToolCapabilities, SessionInfo } from './base';

/**
 * Adapter for Gemini CLI (Gemini Code) headless mode.
 * - Execute: gemini -p "prompt" (headless)
 * - Model: -m / --model
 * - Session: --resume (latest) / --resume <index|UUID>
 * - List sessions: gemini --list-sessions
 * @see https://google-gemini.github.io/gemini-cli/docs/cli/headless.html
 * @see https://geminicli.com/docs/cli/session-management/
 */
export class GeminiCodeAdapter extends BaseToolAdapter {
  readonly name = 'geminicode';
  readonly commandName = 'gemini';
  readonly displayName = 'Gemini Code';
  readonly capabilities: ToolCapabilities = {
    session: true,
    model: true,
    agent: false,
    compact: false,
    listModels: false,
    listSessions: true,
    listAgents: false,
  };

  buildCommand(prompt: string, options: RunOptions): string {
    const parts = [this.getExecutable(), '-p', `"${this.escapePrompt(prompt)}"`];

    if (options.model) parts.push('-m', options.model);

    if (!options.newSession) {
      if (options.sessionId) {
        parts.push('--resume', options.sessionId);
      } else {
        parts.push('--resume'); // latest session
      }
    }

    return parts.join(' ');
  }

  async listSessions(): Promise<SessionInfo[]> {
    const output = await this.runHelper(`${this.getExecutable()} --list-sessions`);
    if (!output) return [];

    // "Available sessions for this project (3):\n1. Fix bug in auth (2 days ago) [a1b2c3d4]\n..."
    const lines = output.split('\n').filter(l => l.trim());
    const sessions: SessionInfo[] = [];

    for (const line of lines) {
      const match = line.match(/^\s*(\d+)\.\s+(.+?)\s+\(([^)]+)\)\s*(?:\[([^\]]+)\])?/);
      if (match) {
        sessions.push({
          id: match[1],
          title: match[2].trim(),
          updatedAt: match[3].trim(),
        });
      }
    }
    return sessions;
  }
}
