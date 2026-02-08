import logger from './utils/logger';
import { config } from './config/config';
import { getGateway } from './gateway/registry';
import { handleMessageEvent } from './handler';
import { toolRegistry, registerAll } from './runtime/tools';

logger.info('🤖 OpenBotGate - AI Code Gateway starting...');

registerAll(toolRegistry);
logger.info(`📦 ${toolRegistry.getEnabled().length} tools registered`);

const gateway = getGateway(config.gateway.type);
logger.info(`🔌 Gateway: ${gateway.id}`);
gateway.start((data) => handleMessageEvent(gateway, data));

process.on('SIGINT', () => {
  logger.info('👋 Shutting down...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('👋 Shutting down...');
  process.exit(0);
});
