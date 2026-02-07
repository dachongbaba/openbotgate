import { executor, ExecutionOptions } from './executor';
import { config } from '../config/config';
import logger from '../utils/logger';
import { toolRegistry } from './tools/registry';
import type { ToolResult as AdapterToolResult, RunOptions } from './tools/types';

export interface ToolResult {
  tool: string;
  success: boolean;
  output: string;
  error?: string;
  duration: number;
  sessionId?: string;
}

export interface ToolOptions extends ExecutionOptions {
  /** Callback for real-time stdout streaming */
  onOutput?: (chunk: string) => void;
}

export class CLITools {
  /**
   * Execute any registered tool adapter by name.
   * This is the primary entry point for all AI tool execution.
   */
  async executeTool(toolName: string, prompt: string, runOptions: RunOptions): Promise<ToolResult> {
    const adapter = toolRegistry.get(toolName);
    if (!adapter) {
      return {
        tool: toolName,
        success: false,
        output: '',
        error: `Unknown tool: ${toolName}`,
        duration: 0,
      };
    }
    const result: AdapterToolResult = await adapter.execute(prompt, runOptions);
    return result;
  }

  /** Backward-compat: execute opencode via adapter */
  async executeOpenCode(prompt: string, options: ToolOptions = {}): Promise<ToolResult> {
    return this.executeTool('opencode', prompt, {
      onOutput: options.onOutput,
      timeout: options.timeout,
      cwd: options.workingDir,
    });
  }

  async executeShell(command: string, options: ToolOptions = {}): Promise<ToolResult> {
    if (!config.supportedTools.shell) {
      return {
        tool: 'shell',
        success: false,
        output: '',
        error: 'Shell execution is not enabled in configuration (security risk)',
        duration: 0,
      };
    }

    const startTime = Date.now();
    const { onOutput, ...execOptions } = options;
    
    const onStdout = onOutput ? (chunk: string) => {
      const cleaned = chunk.trim();
      if (cleaned) {
        logger.info(`📺 shell: ${cleaned}`);
        onOutput(cleaned);
      }
    } : undefined;

    const result = await executor.execute(command, { ...execOptions, onStdout });
    const duration = Date.now() - startTime;

    return {
      tool: 'shell',
      success: result.success,
      output: result.stdout,
      error: result.success ? undefined : result.stderr,
      duration,
    };
  }

  async executeGit(command: string, options: ToolOptions = {}): Promise<ToolResult> {
    if (!config.supportedTools.git) {
      return {
        tool: 'git',
        success: false,
        output: '',
        error: 'Git execution is not enabled in configuration',
        duration: 0,
      };
    }

    const startTime = Date.now();
    const { onOutput, ...execOptions } = options;
    
    const onStdout = onOutput ? (chunk: string) => {
      const cleaned = chunk.trim();
      if (cleaned) {
        logger.info(`📺 git: ${cleaned}`);
        onOutput(cleaned);
      }
    } : undefined;

    const gitCommand = `git ${command}`;
    const result = await executor.execute(gitCommand, { ...execOptions, onStdout });
    const duration = Date.now() - startTime;

    return {
      tool: 'git',
      success: result.success,
      output: result.stdout,
      error: result.success ? undefined : result.stderr,
      duration,
    };
  }
}

export const cliTools = new CLITools();
