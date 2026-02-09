import { BaseToolAdapter } from './base';
import type { RunOptions, ToolCapabilities } from './base';

/**
 * Adapter for Kimi CLI (kimiai-cli or MoonshotAI kimi-cli).
 * - Execute: kimi ask "prompt"
 * - Session: --session <id> / --continue (continue last, MoonshotAI kimi-cli)
 * - Requires OpenRouter API key for kimiai-cli (kimi config set-key)
 */
export class KimiAdapter extends BaseToolAdapter {
  readonly name = 'kimicode';
  readonly commandName = 'kimi';
  readonly displayName = 'Kimi';
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
    const parts = [this.getExecutable(), 'ask'];
    if (!options.newSession) {
      if (options.sessionId) {
        parts.push('--session', options.sessionId);
      } else {
        parts.push('--continue'); // continue last session (MoonshotAI kimi-cli)
      }
    }
    // newSession: don't pass --session or --continue (start fresh)
    parts.push(`"${this.escapePrompt(prompt)}"`);
    return parts.join(' ');
  }
}
