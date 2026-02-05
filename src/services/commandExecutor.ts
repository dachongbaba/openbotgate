import { spawn, SpawnOptions } from 'child_process';
import { config } from '../config/config';

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
  onStdout?: (data: string) => void; // 实时输出回调
  onStderr?: (data: string) => void; // 实时错误回调
}

export class CommandExecutor {
  /**
   * Execute a command using spawn with shell: true.
   * Key: Use child.stdin.end() to signal no more input, which allows
   * CLI tools like opencode to flush their output buffers immediately.
   */
  async execute(
    command: string,
    options: ExecutionOptions = {}
  ): Promise<ExecutionResult> {
    const startTime = Date.now();
    const timeout = options.timeout || config.execution.timeout;
    const env = {
      ...process.env,
      ...options.env,
    };

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

      // IMPORTANT: Close stdin immediately to signal no more input
      // This allows CLI tools like opencode to flush output buffers
      // Without this, output may be buffered until process exits
      child.stdin?.end();

      // Set up timeout
      const timeoutId = setTimeout(() => {
        killed = true;
        child.kill('SIGTERM');
        // Force kill after 5 seconds if SIGTERM doesn't work
        setTimeout(() => {
          if (!child.killed) {
            child.kill('SIGKILL');
          }
        }, 5000);
      }, timeout);

      // Collect stdout with optional real-time callback
      child.stdout?.on('data', (data: Buffer) => {
        const chunk = data.toString();
        stdout += chunk;
        if (options.onStdout) {
          options.onStdout(chunk);
        }
      });

      // Collect stderr with optional real-time callback
      child.stderr?.on('data', (data: Buffer) => {
        const chunk = data.toString();
        stderr += chunk;
        if (options.onStderr) {
          options.onStderr(chunk);
        }
      });

      // Handle process exit
      child.on('close', (code: number | null) => {
        clearTimeout(timeoutId);
        const duration = Date.now() - startTime;

        // Clean and truncate outputs
        stdout = this.cleanOutput(stdout);
        stderr = this.cleanOutput(stderr);

        // Add timeout message if killed
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

      // Handle spawn errors
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

  /**
   * Clean output: strip ANSI codes and unwanted lines, then truncate
   */
  private cleanOutput(output: string): string {
    // Remove ANSI escape codes
    // eslint-disable-next-line no-control-regex
    let result = output.replace(/\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g, '');
    
    // Remove unwanted lines (opencode status/progress lines)
    result = result
      .split('\n')
      .filter(line => {
        // Remove opencode status/progress lines (e.g., "> build · MiniMax-M2.1")
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

export const commandExecutor = new CommandExecutor();
