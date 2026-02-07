import { BaseToolAdapter } from './base';
import type { RunOptions, ToolCapabilities } from './types';

/**
 * Adapter for Kimi CLI (kimiai-cli).
 * Simple AI assistant, no session/model/agent management.
 * - Execute: kimi ask "prompt"
 * - Requires OpenRouter API key (kimi config set-key)
 */
export class KimiAdapter extends BaseToolAdapter {
  readonly name = 'kimi';
  readonly commandName = 'kimi';
  readonly displayName = 'Kimi';
  readonly capabilities: ToolCapabilities = {
    session: false,
    model: false,
    agent: false,
    compact: false,
    listModels: false,
    listSessions: false,
    listAgents: false,
  };

  buildCommand(prompt: string, _options: RunOptions): string {
    return `kimi ask "${this.escapePrompt(prompt)}"`;
  }
}
