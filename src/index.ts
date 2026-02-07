import logger from './utils/logger';
import { feishu } from './gateway/feishu';
import { handleFeishuMessageEvent } from './handler';
import { toolRegistry, registerAll } from './runtime/tools';

logger.info('🤖 OpenGate - AI Code Gateway starting...');

registerAll(toolRegistry);
logger.info(`📦 ${toolRegistry.getEnabled().length} tools registered`);

feishu.startWebSocketConnection(handleFeishuMessageEvent);

process.on('SIGINT', () => {
  logger.info('👋 Shutting down...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('👋 Shutting down...');
  process.exit(0);
});
