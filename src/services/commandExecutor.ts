import { spawn, SpawnOptions } from 'child_process';
import * as pty from 'node-pty';
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
  usePty?: boolean; // Use pseudo-terminal for commands that need TTY
}

export class CommandExecutor {
  /**
   * Execute a command using spawn with cmd /c on Windows.
   * This approach solves the stdout buffering issue that occurs with exec().
   */
  async execute(
    command: string,
    options: ExecutionOptions = {}
  ): Promise<ExecutionResult> {
    // Use PTY for commands that need it (like opencode)
    if (options.usePty) {
      return this.executeWithPty(command, options);
    }

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
      shell: false,
    };

    return new Promise((resolve) => {
      // Use cmd /c on Windows to execute the command
      // This avoids the buffering issues caused by shell: true in spawn
      const isWindows = process.platform === 'win32';
      const child = isWindows
        ? spawn('cmd', ['/c', command], spawnOptions)
        : spawn('/bin/sh', ['-c', command], spawnOptions);

      let stdout = '';
      let stderr = '';
      let killed = false;

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

      // Collect stdout
      child.stdout?.on('data', (data: Buffer) => {
        stdout += data.toString();
      });

      // Collect stderr
      child.stderr?.on('data', (data: Buffer) => {
        stderr += data.toString();
      });

      // Handle process exit
      child.on('close', (code: number | null) => {
        clearTimeout(timeoutId);
        const duration = Date.now() - startTime;

        // Truncate outputs
        stdout = this.truncateOutput(stdout);
        stderr = this.truncateOutput(stderr);

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
   * Execute a command using node-pty (pseudo-terminal).
   * This is needed for commands like opencode that require a TTY environment
   * to properly flush their output buffers.
   */
  private async executeWithPty(
    command: string,
    options: ExecutionOptions = {}
  ): Promise<ExecutionResult> {
    const startTime = Date.now();
    const timeout = options.timeout || config.execution.timeout;
    const env = {
      ...process.env,
      ...options.env,
    } as Record<string, string>;

    // Use shell wrapper because commands like opencode are .cmd scripts on Windows
    const isWindows = process.platform === 'win32';
    const shell = isWindows ? 'cmd.exe' : '/bin/bash';
    const shellArgs = isWindows ? ['/c', command] : ['-c', command];

    return new Promise((resolve) => {
      let output = '';
      let killed = false;

      const ptyProcess = pty.spawn(shell, shellArgs, {
        name: 'xterm-256color',
        cols: 120,
        rows: 30,
        cwd: options.workingDir || process.cwd(),
        env,
      });

      // Set up timeout
      const timeoutId = setTimeout(() => {
        killed = true;
        ptyProcess.kill();
      }, timeout);

      // Collect all output (PTY combines stdout and stderr)
      ptyProcess.onData((data: string) => {
        output += data;
      });

      // Handle process exit
      ptyProcess.onExit(({ exitCode }) => {
        clearTimeout(timeoutId);
        const duration = Date.now() - startTime;

        // Clean up ANSI escape codes from output
        const cleanOutput = this.stripAnsiCodes(output);

        // Truncate output
        let stdout = this.truncateOutput(cleanOutput);
        let stderr = '';

        // Add timeout message if killed
        if (killed) {
          const timeoutMsg = `Execution timed out after ${timeout}ms.`;
          stderr = timeoutMsg;
        }

        resolve({
          success: exitCode === 0 && !killed,
          exitCode,
          stdout,
          stderr,
          duration,
        });
      });
    });
  }

  /**
   * Strip ANSI escape codes, opencode status lines, and node-pty internal output
   */
  private stripAnsiCodes(str: string): string {
    // Remove ANSI escape codes
    // eslint-disable-next-line no-control-regex
    let result = str.replace(/\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g, '');
    
    // Remove unwanted lines
    result = result
      .split('\n')
      .filter(line => {
        // Remove opencode status/progress lines (e.g., "> build · MiniMax-M2.1")
        if (line.match(/^>\s*(build|think|write|run)\s*·/i)) return false;
        // Remove node-pty internal paths/stack traces
        if (line.includes('node_modules') && line.includes('node-pty')) return false;
        if (line.includes('windowsPtyAgent.js')) return false;
        if (line.includes('_ptyNative.connect')) return false;
        return true;
      })
      .join('\n');
    
    return result.trim();
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
