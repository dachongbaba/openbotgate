import { BaseToolAdapter } from './base';
import type { RunOptions, ToolCapabilities } from './base';

/**
 * Adapter for Cursor Agent CLI (headless).
 * - Execute: agent -p "prompt"
 * - Non-interactive / print mode; optional --force for file modifications.
 */
export class CursorCodeAdapter extends BaseToolAdapter {
  readonly name = 'cursorcode';
  readonly commandName = 'cursor';
  readonly displayName = 'Cursor';
  readonly capabilities: ToolCapabilities = {
    session: false,
    model: false,
    agent: false,
    compact: false,
    listModels: false,
    listSessions: false,
    listAgents: false,
  };

  buildCommand(prompt: string, options: RunOptions): string {
    const parts = ['agent', '-p'];
    parts.push(`"${this.escapePrompt(prompt)}"`);
    return parts.join(' ');
  }
}
