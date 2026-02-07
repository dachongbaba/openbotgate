import type { IGateway } from '../gateway/types';
import logger from '../utils/logger';
import { parseFeishuEvent, parseCommand } from './parse';
import { getCommand } from './commands';
import type { CommandContext } from './types';
import { isDuplicateMessage } from './dedup';
import { executePrompt } from './commands/code';
import { sessionManager } from '../runtime/sessionManager';

/**
 * Main message event handler - gateway-agnostic router.
 * Dispatches by gateway.id (feishu: parse Feishu payload and run commands).
 *
 * IMPORTANT: Feishu WebSocket requires event handling to complete within 3 seconds,
 * otherwise it triggers a timeout re-push mechanism. To avoid duplicate messages,
 * we use two strategies:
 * 1. Message deduplication based on message_id (first line of defense)
 * 2. Async processing: return quickly to acknowledge, execute commands in background
 */
export async function handleMessageEvent(gateway: IGateway, data: unknown): Promise<void> {
  try {
    if (gateway.id === 'feishu') {
      await handleFeishuPayload(gateway, data);
      return;
    }
    logger.warn(`No handler for gateway: ${gateway.id}`);
  } catch (error) {
    logger.error('❌ Error handling message event:', error);
  }
}

async function handleFeishuPayload(gateway: IGateway, data: unknown): Promise<void> {
  const event = parseFeishuEvent(data as any, 'feishu');

  if (isDuplicateMessage(event.messageId)) {
    return;
  }

  let senderName = event.senderName || '';
  let chatName = '';
  const gw = gateway as {
    getUserName?: (ids: { openId?: string; userId?: string }) => Promise<string>;
    getChatName?: (chatId: string) => Promise<string>;
  };
  if (typeof gw.getUserName === 'function' && !senderName && (event.senderOpenId || event.senderUserId)) {
    senderName = (await gw.getUserName({ openId: event.senderOpenId, userId: event.senderUserId })) || '';
  }
  if (event.chatType === 'group' && typeof gw.getChatName === 'function' && event.chatId) {
    chatName = (await gw.getChatName(event.chatId)) || '';
  }

  // 私聊: feishu:senderName:  群聊: feishu:chatName:senderName:
  const who = senderName || 'null';
  const sender =
    event.chatType === 'group'
      ? [event.channel, chatName || 'null', who].join(':') + ':'
      : event.chatType === 'p2p'
        ? `${event.channel}:${who}:`
        : `${event.channel}:`;
  logger.info(`👤 ${sender} ${event.text}`);

  const chatType =
    event.chatType === 'p2p' || event.chatType === 'group' ? event.chatType : undefined;
  const ctx: CommandContext = {
    senderId: event.senderId,
    chatId: event.chatId,
    messageId: event.messageId,
    chatType,
    command: '',
    args: '',
    reply: (text: string) => gateway.reply(event.messageId, text),
    send: (title: string, content: string) =>
      gateway.send(event.chatId, 'chat_id', title, content),
  };

  processCommand(ctx, event.text).catch((error) => {
    logger.error('❌ Error processing command:', error);
  });
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
