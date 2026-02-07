import { BaseToolAdapter } from './base';
import type { RunOptions, ToolCapabilities, SessionInfo } from './base';

/**
 * Adapter for OpenClaw CLI.
 * Rich AI agent platform with full session/model/agent management.
 * - Execute: openclaw agent --message "prompt"
 * - Session: --session-id <id>
 * - Agent: --agent <id>
 * - Thinking: --thinking <level>
 * - JSON output: --json
 * - List models: openclaw models list --json
 * - List sessions: openclaw sessions --json
 * - List agents: openclaw agents list --json
 */
export class OpenClawAdapter extends BaseToolAdapter {
  readonly name = 'openclaw';
  readonly commandName = 'openclaw';
  readonly displayName = 'OpenClaw';
  readonly capabilities: ToolCapabilities = {
    session: true,
    model: true,
    agent: true,
    compact: false,
    listModels: true,
    listSessions: true,
    listAgents: true,
  };

  buildCommand(prompt: string, options: RunOptions): string {
    const parts = ['openclaw', 'agent', '--message', `"${this.escapePrompt(prompt)}"`];

    if (options.sessionId) parts.push('--session-id', options.sessionId);
    if (options.agent) parts.push('--agent', options.agent);
    parts.push('--json');

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
        if (obj.sessionId) return obj.sessionId;
      }
    } catch {
      // ignore
    }
    return undefined;
  }

  async listModels(): Promise<string[]> {
    const output = await this.runHelper('openclaw models list --plain');
    if (!output) return [];
    return output.split('\n').map(l => l.trim()).filter(Boolean);
  }

  async listSessions(): Promise<SessionInfo[]> {
    const output = await this.runHelper('openclaw sessions --json');
    if (!output) return [];

    try {
      const data = JSON.parse(output);
      if (Array.isArray(data)) {
        return data.map((s: any) => ({
          id: s.id || s.session_id || '',
          title: s.title || s.name || '',
          updatedAt: s.updated_at || s.updatedAt || '',
        }));
      }
    } catch {
      // Parse line by line if not JSON array
      return output.split('\n')
        .filter(l => l.trim())
        .map(l => {
          const parts = l.split(/\s{2,}/);
          return { id: parts[0] || '', title: parts[1] || '', updatedAt: parts[2] || '' };
        });
    }

    return [];
  }

  async listAgents(): Promise<string[]> {
    const output = await this.runHelper('openclaw agents list --json');
    if (!output) return [];

    try {
      const data = JSON.parse(output);
      if (Array.isArray(data)) {
        return data.map((a: any) => a.name || a.id || String(a));
      }
    } catch {
      return output.split('\n').map(l => l.trim()).filter(Boolean);
    }

    return [];
  }
}
