import { BaseToolAdapter } from './base';
import { executor } from '../executor';
import type { RunOptions, ToolCapabilities, ToolResult } from './base';
import { config } from '../../config/config';
import logger from '../../utils/logger';

/**
 * Adapter for Nanobot CLI.
 * Personal AI assistant with basic session support.
 * - Execute: nanobot agent --message "prompt"
 * - Session: --session <id> (default: cli:default)
 * - Windows: needs PYTHONIOENCODING=utf-8 for Unicode
 */
export class NanobotAdapter extends BaseToolAdapter {
  readonly name = 'nanobot';
  readonly commandName = 'nanobot';
  readonly displayName = 'Nanobot';
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
    const parts = ['nanobot', 'agent', '--message', `"${this.escapePrompt(prompt)}"`];

    if (!options.newSession && options.sessionId) {
      parts.push('--session', options.sessionId);
    }

    return parts.join(' ');
  }

  /** Override execute to set PYTHONIOENCODING for Windows Unicode support */
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

    const command = this.buildCommand(prompt, options);
    logger.debug(`🔧 ${this.displayName} command: ${command}`);

    const startTime = Date.now();
    const timeout = options.timeout ?? config.execution.codeTimeout ?? config.execution.timeout;

    const handleOutput = options.onOutput ? (chunk: string) => {
      const cleaned = chunk.replace(/\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g, '').trim();
      if (cleaned) {
        logger.info(`📺 ${this.name}: ${cleaned}`);
        options.onOutput!(cleaned);
      }
    } : undefined;

    try {
      const result = await executor.execute(command, {
        timeout,
        workingDir: options.cwd,
        env: { PYTHONIOENCODING: 'utf-8' },
        onStdout: handleOutput,
        onStderr: handleOutput,
      });
      const duration = Date.now() - startTime;

      return {
        tool: this.name,
        success: result.success,
        output: result.stdout,
        error: result.success ? undefined : (result.stderr || 'Command failed'),
        duration,
      };
    } catch (error: any) {
      const duration = Date.now() - startTime;
      return {
        tool: this.name,
        success: false,
        output: '',
        error: error.message || 'Unknown error occurred',
        duration,
      };
    }
  }
}
