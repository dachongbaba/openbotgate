import logger from '../utils/logger';
import { parseFeishuEvent, parseCommand } from './parse';
import { getCommand } from './commands';
import { feishu } from '../gateway/feishu';
import type { CommandContext } from './types';
import { isDuplicateMessage } from './dedup';
import { executePrompt } from './commands/code';
import { sessionManager } from '../runtime/sessionManager';

/**
 * Main message event handler - thin router
 * 
 * IMPORTANT: Feishu WebSocket requires event handling to complete within 3 seconds,
 * otherwise it triggers a timeout re-push mechanism. To avoid duplicate messages,
 * we use two strategies:
 * 1. Message deduplication based on message_id (first line of defense)
 * 2. Async processing: return quickly to acknowledge, execute commands in background
 */
export async function handleFeishuMessageEvent(data: any): Promise<void> {
  try {
    const event = parseFeishuEvent(data, 'feishu');
    
    // Deduplicate: skip if we've already processed this message
    if (isDuplicateMessage(event.messageId)) {
      return;
    }
    
    // Format sender info: channel [群/私聊] + name (or just channel if no name)
    const chatLabel = event.chatType === 'group' ? '[群]' : event.chatType === 'p2p' ? '[私聊]' : '';
    const sender = event.senderName
      ? `${event.channel} ${chatLabel}/${event.senderName}`.trim()
      : `${event.channel} ${chatLabel}`.trim();
    logger.info(`👤 ${sender}: ${event.text}`);

    // Build command context (command name set later in processCommand)
    const chatType = (event.chatType === 'p2p' || event.chatType === 'group')
      ? event.chatType
      : undefined;
    const ctx: CommandContext = {
      senderId: event.senderId,
      chatId: event.chatId,
      messageId: event.messageId,
      chatType,
      command: '',
      args: '',
      reply: (text: string) => feishu.replyToMessage(event.messageId, text),
      send: (title: string, content: string) =>
        feishu.sendRichTextMessage(event.chatId, 'chat_id', title, content),
    };

    // Execute command asynchronously (fire-and-forget) to return within 3s
    // This prevents Feishu from triggering timeout re-push
    processCommand(ctx, event.text).catch(error => {
      logger.error('❌ Error processing command:', error);
    });
  } catch (error) {
    logger.error('❌ Error handling message event:', error);
  }
}

/**
 * Process command asynchronously (runs in background)
 */
async function processCommand(ctx: CommandContext, text: string): Promise<void> {
  const rawReply = ctx.reply;

  if (text.startsWith('/')) {
    const { cmd, args } = parseCommand(text);
    ctx.command = cmd.replace('/', '');
    ctx.args = args;

    const handler = getCommand(cmd);
    if (handler) {
      logger.info(`🔧 Hit Command: ${cmd} ${args ? args.substring(0, 30) + (args.length > 30 ? '...' : '') : ''}`);
      ctx.reply = (text: string) => rawReply(`[${ctx.command}] ${text}`);
      await handler(ctx);
    } else {
      logger.warn(`❓ Unknown command: ${cmd}`);
      logger.info(`💬 Reply: Unknown command: ${cmd}`);
      await rawReply(`Unknown command: ${cmd}\nUse /help to see available commands.`);
    }
  } else {
    // Default: execute with user's current tool
    const session = sessionManager.getSession(ctx.senderId);
    ctx.command = session.tool;
    ctx.args = text;
    ctx.reply = (text: string) => rawReply(`[${ctx.command}] ${text}`);
    logger.info(`🔧 Hit Command: ${ctx.command} ${text ? text.substring(0, 30) + (text.length > 30 ? '...' : '') : ''}`);
    await executePrompt(ctx, text);
  }
}
