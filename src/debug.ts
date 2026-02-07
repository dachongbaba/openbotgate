import { handleFeishuMessageEvent } from './handler';
import logger from './utils/logger';

// Set debug mode
process.env.DEBUG = 'true';

// Debug mode: simulate message processing without Feishu connection
async function debugMode() {
  logger.info('OpenGate Debug Mode');
  logger.info('Simulating message processing...');
  
  // Simulate a Feishu message event
  const mockMessage = {
    message: {
      message_id: 'mock_msg_123',
      chat_id: 'mock_chat_456',
      content: '{"text":"写一个hello world函数"}',
      message_type: 'text'
    },
    sender: {
      sender_id: {
        open_id: 'mock_user_789'
      }
    }
  };

  await handleFeishuMessageEvent(mockMessage);
}

// Run debug mode directly
debugMode().catch((err) => logger.error('Debug mode failed', err));

export {};