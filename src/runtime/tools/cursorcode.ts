import { BaseToolAdapter } from './base';
import type { RunOptions, ToolCapabilities } from './base';

/**
 * Adapter for Cursor Agent CLI (headless).
 * - Execute: agent -p "prompt"
 * - Session: --resume <chatId> only when sessionId set via /session. Cursor has no "continue last" without chat ID; when sessionId is null we do not pass --resume (new run).
 */
export class CursorCodeAdapter extends BaseToolAdapter {
  readonly name = 'cursorcode';
  readonly commandName = 'cursor';
  readonly displayName = 'Cursor';
  readonly capabilities: ToolCapabilities = {
    session: true,
    model: false,
    agent: false,
    compact: false,
    listModels: false,
    listSessions: false,
    listAgents: false,
  };

  buildCommand(prompt: string, options: RunOptions): string {
    const parts = ['agent'];

    if (!options.newSession && options.sessionId) {
      parts.push('--resume', options.sessionId);
    }
    // newSession or no sessionId: don't pass --resume (new run for Cursor)

    parts.push('-p', `"${this.escapePrompt(prompt)}"`);
    return parts.join(' ');
  }
}
