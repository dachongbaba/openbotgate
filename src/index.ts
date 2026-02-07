import logger from './utils/logger';
import { feishu } from './gateway/feishu';
import { handleFeishuMessageEvent } from './handler';

// Import and register all tool adapters
import { toolRegistry } from './runtime/tools/registry';
import { OpenCodeAdapter } from './runtime/tools/opencode';
import { ClaudeCodeAdapter } from './runtime/tools/claudecode';
import { CodexAdapter } from './runtime/tools/codex';
import { QwenCodeAdapter } from './runtime/tools/qwencode';
import { KimiAdapter } from './runtime/tools/kimi';
import { OpenClawAdapter } from './runtime/tools/openclaw';
import { NanobotAdapter } from './runtime/tools/nanobot';

logger.info('🤖 OpenGate - AI Code Gateway starting...');

// Register tool adapters
toolRegistry.register(new OpenCodeAdapter());
toolRegistry.register(new ClaudeCodeAdapter());
toolRegistry.register(new CodexAdapter());
toolRegistry.register(new QwenCodeAdapter());
toolRegistry.register(new KimiAdapter());
toolRegistry.register(new OpenClawAdapter());
toolRegistry.register(new NanobotAdapter());

logger.info(`📦 ${toolRegistry.getEnabled().length} tools registered`);

// Start WebSocket connection for real-time events
feishu.startWebSocketConnection(handleFeishuMessageEvent);

// Keep the process alive
process.on('SIGINT', () => {
  logger.info('👋 Shutting down...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('👋 Shutting down...');
  process.exit(0);
});
