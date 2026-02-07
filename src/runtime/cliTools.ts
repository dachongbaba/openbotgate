import { executor, ExecutionOptions } from './executor';
import { config } from '../config/config';
import logger from '../utils/logger';
import { toolRegistry } from './tools/registry';
import type { ToolResult, RunOptions } from './tools/base';

export type { ToolResult } from './tools/base';

export interface ToolOptions extends ExecutionOptions {
  onOutput?: (chunk: string) => void;
}

export class CLITools {
  /**
   * Unified execution entry: Code adapter or Shell (git/shell).
   * taskManager and handlers call this.
   */
  async runTool(
    toolName: string,
    command: string,
    options: ToolOptions = {}
  ): Promise<ToolResult> {
    const adapter = toolRegistry.get(toolName);
    if (adapter) {
      if (!config.allowedCodeTools.includes(toolName)) {
        return {
          tool: toolName,
          success: false,
          output: '',
          error: `${toolName} is not in allowed code tools`,
          duration: 0,
        };
      }
      return this.runCodeTool(toolName, command, {
        onOutput: options.onOutput,
        timeout: options.timeout,
        cwd: options.workingDir,
      });
    }
    if (toolName === 'git') {
      return this.runGit(command, options);
    }
    if (toolName === 'shell') {
      return this.runShell(command, options);
    }
    return {
      tool: toolName,
      success: false,
      output: '',
      error: `Unknown tool: ${toolName}`,
      duration: 0,
    };
  }

  private async runCodeTool(
    toolName: string,
    prompt: string,
    runOptions: RunOptions
  ): Promise<ToolResult> {
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
    return adapter.execute(prompt, runOptions);
  }

  private async runShell(command: string, options: ToolOptions = {}): Promise<ToolResult> {
    const firstWord = command.trim().split(/\s+/)[0]?.toLowerCase() || '';
    if (!config.allowedShellCommands.includes(firstWord)) {
      return {
        tool: 'shell',
        success: false,
        output: '',
        error: `Command "${firstWord}" is not in allowed shell commands (${config.allowedShellCommands.join(', ')})`,
        duration: 0,
      };
    }

    const startTime = Date.now();
    const { onOutput, ...execOptions } = options;
    const onStdout = onOutput
      ? (chunk: string) => {
          const cleaned = chunk.trim();
          if (cleaned) {
            logger.info(`📺 shell: ${cleaned}`);
            onOutput(cleaned);
          }
        }
      : undefined;

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

  private async runGit(command: string, options: ToolOptions = {}): Promise<ToolResult> {
    if (!config.allowedShellCommands.includes('git')) {
      return {
        tool: 'git',
        success: false,
        output: '',
        error: 'Git is not in allowed shell commands',
        duration: 0,
      };
    }

    const startTime = Date.now();
    const { onOutput, ...execOptions } = options;
    const onStdout = onOutput
      ? (chunk: string) => {
          const cleaned = chunk.trim();
          if (cleaned) {
            logger.info(`📺 git: ${cleaned}`);
            onOutput(cleaned);
          }
        }
      : undefined;

    const result = await executor.execute(`git ${command}`, { ...execOptions, onStdout });
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
