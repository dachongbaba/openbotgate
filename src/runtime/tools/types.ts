/**
 * Result from CLI tool execution
 */
export interface ToolResult {
  tool: string;
  success: boolean;
  output: string;
  error?: string;
  duration: number;
  /** Captured session ID from tool output (if available) */
  sessionId?: string;
}

/**
 * Options for tool execution
 */
export interface RunOptions {
  sessionId?: string;
  model?: string;
  agent?: string;
  cwd?: string;
  onOutput?: (chunk: string) => void;
  timeout?: number;
}

/**
 * Session info returned by tools that support listing sessions
 */
export interface SessionInfo {
  id: string;
  title: string;
  updatedAt: string;
}

/**
 * Capability declaration for a tool adapter
 */
export interface ToolCapabilities {
  session: boolean;
  model: boolean;
  agent: boolean;
  compact: boolean;
  listModels: boolean;
  listSessions: boolean;
  listAgents: boolean;
}

/**
 * Unified adapter interface for all AI CLI tools
 */
export interface ToolAdapter {
  /** Internal identifier: 'opencode' | 'claudecode' | 'codex' | 'qwencode' | 'kimi' | 'openclaw' | 'nanobot' */
  readonly name: string;
  /** Feishu slash command name: 'opencode' | 'claude' | 'codex' | 'qwen' | 'kimi' | 'openclaw' | 'nanobot' */
  readonly commandName: string;
  /** Display name shown to users: 'OpenCode' | 'Claude Code' | ... */
  readonly displayName: string;
  /** Capability flags */
  readonly capabilities: ToolCapabilities;

  /** Execute a prompt with the tool */
  execute(prompt: string, options: RunOptions): Promise<ToolResult>;

  /** List available models (returns preset list if CLI has no list command) */
  listModels(): Promise<string[]>;

  /** List stored sessions */
  listSessions(): Promise<SessionInfo[]>;

  /** List available agents */
  listAgents(): Promise<string[]>;

  /** Build the CLI command string (for logging/debugging) */
  buildCommand(prompt: string, options: RunOptions): string;
}
