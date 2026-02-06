import logger from '../utils/logger';
import { parseFeishuEvent, parseCommand } from './parse';
import { getCommand } from './commands';
import { feishu } from '../gateway/feishu';
import type { CommandContext } from './types';

// Import default command for non-command messages
import { run as executeOpenCode } from './commands/opencode';

/**
 * Main message event handler - thin router
 */
export async function handleFeishuMessageEvent(data: any): Promise<void> {
  try {
    const event = parseFeishuEvent(data);
    logger.info(`👤 ${event.senderId}: ${event.text}`);

    // Build command context
    const ctx: CommandContext = {
      senderId: event.senderId,
      chatId: event.chatId,
      messageId: event.messageId,
      args: '',
      reply: (text: string) => feishu.replyToMessage(event.messageId, text),
      send: (title: string, content: string) =>
        feishu.sendRichTextMessage(event.chatId, 'chat_id', title, content),
    };

    // Route to command or default handler
    if (event.text.startsWith('/')) {
      const { cmd, args } = parseCommand(event.text);
      ctx.args = args;

      const handler = getCommand(cmd);
      if (handler) {
        console.log('🔧 Processing command:', cmd);
        await handler(ctx);
      } else {
        console.log('❓ Unknown command:', cmd);
        await ctx.reply(`Unknown command: ${cmd}\nUse /help to see available commands.`);
      }
    } else {
      // Default: execute as OpenCode prompt
      ctx.args = event.text;
      await executeOpenCode(ctx);
    }
  } catch (error) {
    logger.error('❌ Error handling message event:', error);
  }
}
