import { executor } from '../executor';
import { config } from '../../config/config';
import logger from '../../utils/logger';

/**
 * Result from CLI tool execution
 */
export interface ToolResult {
  tool: string;
  success: boolean;
  output: string;
  error?: string;
  duration: number;
  /** Captured session ID from tool output (if available) */
  sessionId?: string;
}

/**
 * Options for tool execution
 */
export interface RunOptions {
  sessionId?: string;
  model?: string;
  agent?: string;
  cwd?: string;
  onOutput?: (chunk: string) => void;
  timeout?: number;
}

/**
 * Session info returned by tools that support listing sessions
 */
export interface SessionInfo {
  id: string;
  title: string;
  updatedAt: string;
}

/**
 * Capability declaration for a tool adapter
 */
export interface ToolCapabilities {
  session: boolean;
  model: boolean;
  agent: boolean;
  compact: boolean;
  listModels: boolean;
  listSessions: boolean;
  listAgents: boolean;
}

/**
 * Unified adapter interface for all AI CLI tools
 */
export interface ToolAdapter {
  readonly name: string;
  readonly commandName: string;
  readonly displayName: string;
  readonly capabilities: ToolCapabilities;

  execute(prompt: string, options: RunOptions): Promise<ToolResult>;
  listModels(): Promise<string[]>;
  listSessions(): Promise<SessionInfo[]>;
  listAgents(): Promise<string[]>;
  buildCommand(prompt: string, options: RunOptions): string;
}

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

  protected escapePrompt(str: string): string {
    return str
      .replace(/"/g, '\\"')
      .replace(/\r?\n/g, ' ')
      .replace(/[&|<>^]/g, '^$&');
  }

  protected async runHelper(command: string, cwd?: string): Promise<string> {
    const result = await executor.execute(command, {
      timeout: 30000,
      workingDir: cwd,
    });
    if (!result.success) return '';
    return result.stdout.replace(/\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g, '').trim();
  }
}
