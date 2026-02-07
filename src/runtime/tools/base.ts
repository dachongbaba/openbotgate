import { executor } from '../executor';
import { config } from '../../config/config';
import logger from '../../utils/logger';
import type { ToolAdapter, ToolResult, RunOptions, SessionInfo, ToolCapabilities } from './types';

/**
 * Base class for tool adapters with shared execution logic.
 * Subclasses implement buildCommand() and optional list methods.
 */
export abstract class BaseToolAdapter implements ToolAdapter {
  abstract readonly name: string;
  abstract readonly commandName: string;
  abstract readonly displayName: string;
  abstract readonly capabilities: ToolCapabilities;

  abstract buildCommand(prompt: string, options: RunOptions): string;

  async execute(prompt: string, options: RunOptions): Promise<ToolResult> {
    const configKey = this.name as keyof typeof config.supportedTools;
    if (config.supportedTools[configKey] === false) {
      return {
        tool: this.name,
        success: false,
        output: '',
        error: `${this.displayName} is not enabled in configuration`,
        duration: 0,
      };
    }

    const command = this.buildCommand(prompt, options);
    logger.debug(`🔧 ${this.displayName} command: ${command}`);

    const startTime = Date.now();
    const timeout = options.timeout ?? config.execution.opencodeTimeout ?? config.execution.timeout;

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
        onStdout: handleOutput,
        onStderr: handleOutput,
      });
      const duration = Date.now() - startTime;

      const toolResult: ToolResult = {
        tool: this.name,
        success: result.success,
        output: result.stdout,
        error: result.success ? undefined : (result.stderr || 'Command failed'),
        duration,
      };

      // Try to capture session ID from output
      const sessionId = this.parseSessionId(result.stdout);
      if (sessionId) toolResult.sessionId = sessionId;

      return toolResult;
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

  /** Override in subclass to extract session ID from tool output */
  protected parseSessionId(_output: string): string | undefined {
    return undefined;
  }

  async listModels(): Promise<string[]> {
    return [];
  }

  async listSessions(): Promise<SessionInfo[]> {
    return [];
  }

  async listAgents(): Promise<string[]> {
    return [];
  }

  /** Escape prompt for shell command */
  protected escapePrompt(str: string): string {
    return str
      .replace(/"/g, '\\"')
      .replace(/\r?\n/g, ' ')
      .replace(/[&|<>^]/g, '^$&');
  }

  /** Execute a helper command and return stdout */
  protected async runHelper(command: string, cwd?: string): Promise<string> {
    const result = await executor.execute(command, {
      timeout: 30000,
      workingDir: cwd,
    });
    if (!result.success) return '';
    return result.stdout.replace(/\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g, '').trim();
  }
}
