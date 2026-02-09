import { BaseToolAdapter } from './base';
import { config } from '../../config/config';
import type { RunOptions, ToolCapabilities, ToolResult, SessionInfo } from './base';

/** UUID pattern for Cursor chat ids */
const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;

/**
 * Adapter for Cursor Agent CLI (headless).
 * - Execute: agent -p "prompt"
 * - Session: --resume <chatId>. When no sessionId, we run `agent ls` to get latest chat id then resume it.
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
    listSessions: true,
    listAgents: false,
  };

  buildCommand(prompt: string, options: RunOptions): string {
    const parts = ['agent'];

    if (!options.newSession && options.sessionId) {
      parts.push('--resume', options.sessionId);
    }

    parts.push('-p', `"${this.escapePrompt(prompt)}"`);
    return parts.join(' ');
  }

  async listSessions(): Promise<SessionInfo[]> {
    const output = await this.runHelper('agent ls', undefined);
    if (!output) return [];

    const sessions: SessionInfo[] = [];
    const lines = output.split('\n').map(l => l.trim()).filter(Boolean);

    for (const line of lines) {
      const ids = line.match(UUID_RE);
      if (ids && ids.length > 0) {
        const id = ids[0];
        const rest = line.replace(new RegExp(id, 'gi'), '').trim();
        const parts = rest.split(/\s{2,}/).map(p => p.trim()).filter(Boolean);
        sessions.push({
          id,
          title: parts[0] || rest || '',
          updatedAt: parts[1] || '',
        });
      } else {
        const cols = line.split(/\s{2,}|\t/).map(p => p.trim()).filter(Boolean);
        if (cols.length >= 1 && cols[0].length >= 10 && !cols[0].match(/^(id|chat|session)$/i)) {
          sessions.push({
            id: cols[0],
            title: cols[1] || '',
            updatedAt: cols[2] || '',
          });
        }
      }
    }
    return sessions;
  }

  /** When no sessionId and not newSession, resolve latest chat via agent ls then run with --resume. */
  async execute(prompt: string, options: RunOptions): Promise<ToolResult> {
    if (!config.allowedCodeTools.includes(this.name)) {
      return {
        tool: this.name,
        success: false,
        output: '',
        error: `${this.displayName} is not in allowed code tools`,
        duration: 0,
      };
    }

    let runOpts = options;
    if (!options.newSession && !options.sessionId) {
      try {
        const list = await this.listSessions();
        if (list.length > 0) {
          runOpts = { ...options, sessionId: list[0].id };
        }
      } catch {
        // keep runOpts unchanged (no resume)
      }
    }

    return super.execute(prompt, runOpts);
  }
}
