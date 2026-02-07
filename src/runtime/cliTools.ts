import { executor, ExecutionOptions } from './executor';
import { config } from '../config/config';
import logger from '../utils/logger';

export interface ToolResult {
  tool: string;
  success: boolean;
  output: string;
  error?: string;
  duration: number;
}

export interface ToolOptions extends ExecutionOptions {
  /** Callback for real-time stdout streaming */
  onOutput?: (chunk: string) => void;
}

export class CLITools {
  async executeOpenCode(prompt: string, options: ToolOptions = {}): Promise<ToolResult> {
    return this.executeCliTool({
      toolName: 'opencode',
      configKey: 'opencode',
      command: `opencode run "${this.escapePrompt(prompt)}"`,
      prompt,
      options,
    });
  }

  private async executeCliTool(params: {
    toolName: string;
    configKey: keyof typeof config.supportedTools;
    command: string;
    prompt: string;
    options: ToolOptions;
  }): Promise<ToolResult> {
    const { toolName, configKey, command, options } = params;

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
    const { onOutput, ...execOptions } = options;

    // Clean and forward output chunk
    const handleOutput = onOutput ? (chunk: string) => {
      const cleaned = chunk.replace(/\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g, '').trim();
      if (cleaned) {
        logger.info(`📺 ${toolName}: ${cleaned}`);
        onOutput(cleaned);
      }
    } : undefined;

    try {
      // Stream both stdout and stderr (progress info often goes to stderr)
      const result = await executor.execute(command, { 
        ...execOptions, 
        timeout, 
        onStdout: handleOutput,
        onStderr: handleOutput,
      });
      const duration = Date.now() - startTime;

      if (result.success) {
        return { tool: toolName, success: true, output: result.stdout, duration };
      }

      const errorMsg = result.stderr || 'Command failed';
      return { tool: toolName, success: false, output: result.stdout, error: errorMsg, duration };
    } catch (error: any) {
      const duration = Date.now() - startTime;
      const errorMsg = error.message || 'Unknown error occurred';
      return { tool: toolName, success: false, output: '', error: errorMsg, duration };
    }
  }

  private escapePrompt(str: string): string {
    return str
      .replace(/"/g, '\\"')
      .replace(/\r?\n/g, ' ')
      .replace(/[&|<>^]/g, '^$&');
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
