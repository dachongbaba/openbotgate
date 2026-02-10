import { BaseToolAdapter } from './base';
import type { RunOptions, ToolCapabilities } from './base';

/**
 * Adapter for Qoder CLI.
 * - Execute: qodercli -p "prompt" (Print mode, non-interactive)
 * @see https://docs.qoder.com/cli/using-cli
 */
export class QoderCodeAdapter extends BaseToolAdapter {
  readonly name = 'qodercode';
  readonly commandName = 'qoder';
  readonly displayName = 'Qoder';
  readonly capabilities: ToolCapabilities = {
    session: false,
    model: false,
    agent: false,
    compact: false,
    listModels: false,
    listSessions: false,
    listAgents: false,
  };

  /** Qoder CLI 可执行名为 qodercli */
  protected getDefaultExecutable(): string {
    return 'qodercli';
  }

  buildCommand(prompt: string, _options: RunOptions): string {
    return `${this.getExecutable()} -p "${this.escapePrompt(prompt)}"`;
  }
}
