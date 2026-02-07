import { BaseToolAdapter } from './base';
import type { RunOptions, ToolCapabilities, SessionInfo } from './base';

/**
 * Adapter for OpenCode CLI.
 * - Execute: opencode run "prompt"
 * - Session: -s <id>
 * - Model: -m provider/model
 * - Agent: --agent name
 * - List models: opencode models
 * - List sessions: opencode session list
 * - List agents: opencode agent list
 */
export class OpenCodeAdapter extends BaseToolAdapter {
  readonly name = 'opencode';
  readonly commandName = 'opencode';
  readonly displayName = 'OpenCode';
  readonly capabilities: ToolCapabilities = {
    session: true,
    model: true,
    agent: true,
    compact: true,
    listModels: true,
    listSessions: true,
    listAgents: true,
  };

  buildCommand(prompt: string, options: RunOptions): string {
    const parts = ['opencode', 'run'];

    if (options.sessionId) parts.push('-s', options.sessionId);
    if (options.model) parts.push('-m', options.model);
    if (options.agent) parts.push('--agent', options.agent);

    parts.push(`"${this.escapePrompt(prompt)}"`);
    return parts.join(' ');
  }

  async listModels(): Promise<string[]> {
    const output = await this.runHelper('opencode models');
    if (!output) return [];
    return output.split('\n').map(l => l.trim()).filter(Boolean);
  }

  async listSessions(): Promise<SessionInfo[]> {
    const output = await this.runHelper('opencode session list');
    if (!output) return [];

    // Parse table output - each line typically: ID  Title  Updated
    const lines = output.split('\n').filter(l => l.trim() && !l.startsWith('-'));
    const sessions: SessionInfo[] = [];

    for (const line of lines) {
      const parts = line.split(/\s{2,}/).map(p => p.trim()).filter(Boolean);
      if (parts.length >= 2) {
        sessions.push({
          id: parts[0],
          title: parts[1] || '',
          updatedAt: parts[2] || '',
        });
      }
    }
    return sessions;
  }

  async listAgents(): Promise<string[]> {
    const output = await this.runHelper('opencode agent list');
    if (!output) return [];
    return output.split('\n').map(l => l.trim()).filter(Boolean);
  }
}
