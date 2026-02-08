import { BaseToolAdapter } from './base';
import type { RunOptions, ToolCapabilities } from './base';

/**
 * Adapter for Kimi CLI (kimiai-cli or MoonshotAI kimi-cli).
 * - Execute: kimi ask "prompt"
 * - Session: --session <id> (resume when CLI supports it, e.g. MoonshotAI kimi-cli)
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
    const parts = ['kimi', 'ask'];
    if (options.sessionId) {
      parts.push('--session', options.sessionId);
    }
    parts.push(`"${this.escapePrompt(prompt)}"`);
    return parts.join(' ');
  }
}
