import { spawn, SpawnOptions } from 'child_process';
import { config } from '../config/config';
import { decodeShellChunk, ensureShellEncoding } from '../utils/encoding';

export interface ExecutionResult {
  success: boolean;
  exitCode: number | null;
  stdout: string;
  stderr: string;
  duration: number;
}

export interface ExecutionOptions {
  timeout?: number;
  workingDir?: string;
  env?: Record<string, string>;
  onStdout?: (data: string) => void;
  onStderr?: (data: string) => void;
}

export class CommandExecutor {
  /**
   * Execute a command using spawn with shell: true.
   * Uses child.stdin.end() to signal no more input for immediate output.
   */
  async execute(command: string, options: ExecutionOptions = {}): Promise<ExecutionResult> {
    if (process.platform === 'win32') {
      await ensureShellEncoding();
    }

    const startTime = Date.now();
    const timeout = options.timeout || config.execution.timeout;
    const env = { ...process.env, ...options.env };

    const spawnOptions: SpawnOptions = {
      cwd: options.workingDir || process.cwd(),
      env,
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true,
    };

    return new Promise((resolve) => {
      const child = spawn(command, [], spawnOptions);

      let stdout = '';
      let stderr = '';
      let killed = false;

      // Close stdin immediately to signal no more input
      child.stdin?.end();

      const timeoutId = setTimeout(() => {
        killed = true;
        child.kill('SIGTERM');
        setTimeout(() => {
          if (!child.killed) {
            child.kill('SIGKILL');
          }
        }, 5000);
      }, timeout);

      child.stdout?.on('data', (data: Buffer) => {
        const chunk = decodeShellChunk(data);
        stdout += chunk;
        options.onStdout?.(chunk);
      });

      child.stderr?.on('data', (data: Buffer) => {
        const chunk = decodeShellChunk(data);
        stderr += chunk;
        options.onStderr?.(chunk);
      });

      child.on('close', (code: number | null) => {
        clearTimeout(timeoutId);
        const duration = Date.now() - startTime;

        // TODO: 暂时不过滤输出，CLI 输出什么就发送什么
        // stdout = this.cleanOutput(stdout);
        // stderr = this.cleanOutput(stderr);
        stdout = this.truncateOutput(stdout.replace(/\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g, '').trim());
        stderr = this.truncateOutput(stderr.replace(/\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g, '').trim());

        if (killed) {
          const timeoutMsg = `Execution timed out after ${timeout}ms.`;
          stderr = stderr ? `${timeoutMsg} ${stderr}` : timeoutMsg;
          stderr = this.truncateOutput(stderr);
        }

        resolve({
          success: code === 0 && !killed,
          exitCode: code,
          stdout,
          stderr,
          duration,
        });
      });

      child.on('error', (error: Error) => {
        clearTimeout(timeoutId);
        const duration = Date.now() - startTime;

        resolve({
          success: false,
          exitCode: null,
          stdout: this.truncateOutput(stdout),
          stderr: this.truncateOutput(error.message),
          duration,
        });
      });
    });
  }

  private cleanOutput(output: string): string {
    // Remove ANSI escape codes
    // eslint-disable-next-line no-control-regex
    let result = output.replace(/\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g, '');

    // Remove opencode status/progress lines
    result = result
      .split('\n')
      .filter((line) => {
        if (line.match(/^>\s*(build|think|write|run)\s*·/i)) return false;
        return true;
      })
      .join('\n');

    return this.truncateOutput(result.trim());
  }

  private truncateOutput(output: string): string {
    const maxLength = config.execution.maxOutputLength;
    if (output.length > maxLength) {
      return output.substring(0, maxLength) + '\n\n[Output truncated - too long to display]';
    }
    return output;
  }
}

export const executor = new CommandExecutor();
