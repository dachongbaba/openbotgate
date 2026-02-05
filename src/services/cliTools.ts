import logger from '../utils/logger';
import { commandExecutor, ExecutionOptions } from './commandExecutor';
import { config } from '../config/config';

export interface ToolResult {
  tool: string;
  success: boolean;
  output: string;
  error?: string;
  duration: number;
}

export class CLITools {
  private claudeCodePath: string = 'claude';

  /**
   * Execute OpenCode using node-pty (pseudo-terminal).
   * This approach solves the stdout buffering issue in non-TTY environments.
   */
  async executeOpenCode(
    prompt: string,
    options: ExecutionOptions = {}
  ): Promise<ToolResult> {
    if (!config.supportedTools.opencode) {
      return {
        tool: 'opencode',
        success: false,
        output: '',
        error: 'OpenCode tool is not enabled in configuration',
        duration: 0,
      };
    }

    const startTime = Date.now();
    const opencodeTimeout =
      options.timeout ?? config.execution.opencodeTimeout ?? config.execution.timeout;

    // Escape prompt for shell command
    const escapedPrompt = prompt.replace(/"/g, '\\"');
    const command = `opencode run "${escapedPrompt}"`;

    logger.info(`🤖 Executing OpenCode: ${prompt.substring(0, 50)}...`);

    try {
      // Use PTY mode to solve stdout buffering issue
      const result = await commandExecutor.execute(command, {
        ...options,
        timeout: opencodeTimeout,
        usePty: true,
      });

      const duration = Date.now() - startTime;
      logger.info(`📊 OpenCode execution completed with success: ${result.success}`);

      if (result.success) {
        return {
          tool: 'opencode',
          success: true,
          output: result.stdout,
          duration,
        };
      } else {
        const errorMsg = result.stderr || 'Command failed';
        logger.error(`❌ opencode failed in ${duration}ms: ${errorMsg}`);
        return {
          tool: 'opencode',
          success: false,
          output: result.stdout,
          error: errorMsg,
          duration,
        };
      }
    } catch (error: any) {
      const duration = Date.now() - startTime;
      const errorMsg = error.message || 'Unknown error occurred';
      logger.error(`❌ opencode exception: ${errorMsg}`);
      return {
        tool: 'opencode',
        success: false,
        output: '',
        error: errorMsg,
        duration,
      };
    }
  }

  async executeClaudeCode(
    prompt: string,
    options: ExecutionOptions = {}
  ): Promise<ToolResult> {
    if (!config.supportedTools.claudeCode) {
      return {
        tool: 'claude-code',
        success: false,
        output: '',
        error: 'Claude Code tool is not enabled in configuration',
        duration: 0,
      };
    }

    const startTime = Date.now();
    const command = `echo "${prompt.replace(/"/g, '\\"')}" | ${this.claudeCodePath}`;

    try {
      const result = await commandExecutor.execute(command, options);
      const duration = Date.now() - startTime;

      return {
        tool: 'claude-code',
        success: result.success,
        output: result.stdout || result.stderr,
        error: result.success ? undefined : result.stderr,
        duration,
      };
    } catch (error: any) {
      const duration = Date.now() - startTime;
      return {
        tool: 'claude-code',
        success: false,
        output: '',
        error: error.message || 'Unknown error occurred',
        duration,
      };
    }
  }

  async executeShell(
    command: string,
    options: ExecutionOptions = {}
  ): Promise<ToolResult> {
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
    const result = await commandExecutor.execute(command, options);
    const duration = Date.now() - startTime;

    return {
      tool: 'shell',
      success: result.success,
      output: result.stdout,
      error: result.success ? undefined : result.stderr,
      duration,
    };
  }

  async executeGit(
    command: string,
    options: ExecutionOptions = {}
  ): Promise<ToolResult> {
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
    const gitCommand = `git ${command}`;
    const result = await commandExecutor.execute(gitCommand, options);
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
