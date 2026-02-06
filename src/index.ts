import logger from './utils/logger';
import { feishu } from './gateway/feishu';
import { handleFeishuMessageEvent } from './handler';

// Health check
logger.info('🤖 OpenGate - AI Code Gateway');
logger.info('✅ Starting Feishu WebSocket connection...');

// Start WebSocket connection for real-time events
feishu.startWebSocketConnection(handleFeishuMessageEvent);

// Keep the process alive
process.on('SIGINT', () => {
  logger.info('👋 Shutting down OpenGate...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('👋 Shutting down OpenGate...');
  process.exit(0);
});

logger.info('🔌 WebSocket connection established with Feishu');
logger.info('✨ Ready to receive messages via Feishu bot!');
