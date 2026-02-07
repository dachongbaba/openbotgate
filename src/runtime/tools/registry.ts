import type { ToolAdapter } from './types';
import { config } from '../../config/config';
import logger from '../../utils/logger';

/**
 * Central registry for all tool adapters.
 * Maps both internal name and command name to adapter instances.
 */
class ToolRegistry {
  private adapters = new Map<string, ToolAdapter>();
  private commandMap = new Map<string, ToolAdapter>();

  register(adapter: ToolAdapter): void {
    this.adapters.set(adapter.name, adapter);
    this.commandMap.set(adapter.commandName, adapter);
    logger.debug(`📦 Registered tool: ${adapter.displayName} (/${adapter.commandName})`);
  }

  /** Get adapter by internal name (e.g. 'opencode', 'claudecode') */
  get(name: string): ToolAdapter | undefined {
    return this.adapters.get(name);
  }

  /** Get adapter by Feishu command name (e.g. 'opencode', 'claude', 'qwen') */
  getByCommand(cmd: string): ToolAdapter | undefined {
    return this.commandMap.get(cmd);
  }

  /** List all registered adapters */
  list(): ToolAdapter[] {
    return Array.from(this.adapters.values());
  }

  /** List only enabled adapters (based on config.supportedTools) */
  getEnabled(): ToolAdapter[] {
    return this.list().filter(adapter => {
      const key = adapter.name as keyof typeof config.supportedTools;
      return config.supportedTools[key] !== false;
    });
  }
}

export const toolRegistry = new ToolRegistry();
