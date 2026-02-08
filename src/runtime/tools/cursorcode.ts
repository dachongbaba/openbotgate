import { BaseToolAdapter } from './base';
import { executor } from '../executor';
import { config } from '../../config/config';
import logger from '../../utils/logger';
import type { RunOptions, ToolCapabilities, ToolResult } from './base';

/**
 * Adapter for Cursor Agent CLI (headless).
 * - Execute: agent -p "prompt"
 * - Session: --resume <chatId> (resume previous conversation)
 * - Uses --output-format json to capture session_id; forwards only result text to user.
 */
export class CursorCodeAdapter extends BaseToolAdapter {
  readonly name = 'cursorcode';
  readonly commandName = 'cursor';
  readonly displayName = 'Cursor';
  readonly capabilities: ToolCapabilities = {
    session: true,
    model: false,
    agent: false,
    compact: false,
    listModels: false,
    listSessions: false,
    listAgents: false,
  };

  buildCommand(prompt: string, options: RunOptions): string {
    const parts = ['agent'];

    if (options.sessionId) {
      parts.push('--resume', options.sessionId);
    }

    parts.push('-p', `"${this.escapePrompt(prompt)}"`);
    parts.push('--output-format', 'json');
    return parts.join(' ');
  }

  protected parseSessionId(output: string): string | undefined {
    try {
      const lines = output.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('{')) continue;
        const obj = JSON.parse(trimmed) as { session_id?: string };
        if (obj.session_id) return obj.session_id;
      }
    } catch {
      // ignore
    }
    return undefined;
  }

  /** Override execute: JSON output is parsed; only result text is sent to onOutput. */
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

    // Buffer stdout; only forward parsed result text to user at the end (avoid raw JSON)
    const handleOutput = (chunk: string) => {
      const cleaned = chunk.replace(/\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g, '').trim();
      if (cleaned) {
        process.stdout.write(cleaned + '\n');
        logger.writeRawToFile(cleaned);
      }
    };

    try {
      const result = await executor.execute(command, {
        timeout,
        workingDir: options.cwd,
        onStdout: handleOutput,
        onStderr: handleOutput,
      });
      const duration = Date.now() - startTime;

      const sessionId = this.parseSessionId(result.stdout);
      let displayOutput = result.stdout;
      if (result.success && result.stdout.trim()) {
        try {
          const line = result.stdout.trim().split('\n').find(l => l.trim().startsWith('{'));
          if (line) {
            const obj = JSON.parse(line) as { result?: string };
            if (typeof obj.result === 'string') displayOutput = obj.result;
          }
        } catch {
          // keep raw stdout
        }
      }

      if (options.onOutput && displayOutput) options.onOutput(displayOutput);

      const toolResult: ToolResult = {
        tool: this.name,
        success: result.success,
        output: displayOutput,
        error: result.success ? undefined : (result.stderr || 'Command failed'),
        duration,
      };
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
}
