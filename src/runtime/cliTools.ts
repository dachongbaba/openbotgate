import logger from '../utils/logger';
import { executor, ExecutionOptions } from './executor';
import { config } from '../config/config';

export interface ToolResult {
  tool: string;
  success: boolean;
  output: string;
  error?: string;
  duration: number;
}

export class CLITools {
  async executeOpenCode(prompt: string, options: ExecutionOptions = {}): Promise<ToolResult> {
    return this.executeCliTool({
      toolName: 'opencode',
      configKey: 'opencode',
      command: `opencode run "${this.escapePrompt(prompt)}"`,
      prompt,
      options,
    });
  }

  async executeClaudeCode(prompt: string, options: ExecutionOptions = {}): Promise<ToolResult> {
    return this.executeCliTool({
      toolName: 'claude-code',
      configKey: 'claudeCode',
      command: `claude -p "${this.escapePrompt(prompt)}"`,
      prompt,
      options,
    });
  }

  private async executeCliTool(params: {
    toolName: string;
    configKey: keyof typeof config.supportedTools;
    command: string;
    prompt: string;
    options: ExecutionOptions;
  }): Promise<ToolResult> {
    const { toolName, configKey, command, prompt, options } = params;

    if (!config.supportedTools[configKey]) {
      return {
        tool: toolName,
        success: false,
        output: '',
        error: `${toolName} tool is not enabled in configuration`,
        duration: 0,
      };
    }

    const startTime = Date.now();
    const timeout = options.timeout ?? config.execution.opencodeTimeout ?? config.execution.timeout;

    logger.info(`🤖 Executing ${toolName}: ${prompt.substring(0, 50)}...`);

    try {
      const result = await executor.execute(command, { ...options, timeout });
      const duration = Date.now() - startTime;

      logger.info(`📊 ${toolName} execution completed with success: ${result.success}`);

      if (result.success) {
        return { tool: toolName, success: true, output: result.stdout, duration };
      }

      const errorMsg = result.stderr || 'Command failed';
      logger.error(`❌ ${toolName} failed in ${duration}ms: ${errorMsg}`);
      return { tool: toolName, success: false, output: result.stdout, error: errorMsg, duration };
    } catch (error: any) {
      const duration = Date.now() - startTime;
      const errorMsg = error.message || 'Unknown error occurred';
      logger.error(`❌ ${toolName} exception: ${errorMsg}`);
      return { tool: toolName, success: false, output: '', error: errorMsg, duration };
    }
  }

  private escapePrompt(str: string): string {
    return str
      .replace(/"/g, '\\"')
      .replace(/\r?\n/g, ' ')
      .replace(/[&|<>^]/g, '^$&');
  }

  async executeShell(command: string, options: ExecutionOptions = {}): Promise<ToolResult> {
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
    const result = await executor.execute(command, options);
    const duration = Date.now() - startTime;

    return {
      tool: 'shell',
      success: result.success,
      output: result.stdout,
      error: result.success ? undefined : result.stderr,
      duration,
    };
  }

  async executeGit(command: string, options: ExecutionOptions = {}): Promise<ToolResult> {
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
    const result = await executor.execute(gitCommand, options);
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
