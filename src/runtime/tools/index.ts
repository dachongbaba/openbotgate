import type { ToolAdapter } from './base';
import { OpenCodeAdapter } from './opencode';
import { ClaudeCodeAdapter } from './claudecode';
import { CodexAdapter } from './openaicodex';
import { QwenCodeAdapter } from './qwencode';
import { KimiAdapter } from './kimicode';
import { OpenClawAdapter } from './openclaw';
import { NanobotAdapter } from './nanobot';
import { CursorCodeAdapter } from './cursorcode';
import { GeminiCodeAdapter } from './geminicode';
import { CodeBuddyAdapter } from './codebuddy';

const ALL_ADAPTERS: ToolAdapter[] = [
  new OpenCodeAdapter(),
  new ClaudeCodeAdapter(),
  new CodexAdapter(),
  new QwenCodeAdapter(),
  new KimiAdapter(),
  new OpenClawAdapter(),
  new NanobotAdapter(),
  new CursorCodeAdapter(),
  new GeminiCodeAdapter(),
  new CodeBuddyAdapter(),
];

/**
 * Register all built-in tool adapters with the registry.
 * Add new adapters here when extending the gateway.
 */
export function registerAll(registry: { register(adapter: ToolAdapter): void }): void {
  for (const adapter of ALL_ADAPTERS) {
    registry.register(adapter);
  }
}

export type { ToolAdapter, ToolResult, RunOptions, SessionInfo, ToolCapabilities } from './base';
export { toolRegistry } from './registry';
