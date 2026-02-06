import logger from './utils/logger';
import { feishu } from './gateway/feishu';
import { handleFeishuMessageEvent } from './handler';

logger.info('🤖 OpenGate - AI Code Gateway starting...');

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
