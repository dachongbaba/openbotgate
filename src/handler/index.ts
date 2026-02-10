import logger from '../utils/logger';
import { parseFeishuEvent, parseCommand } from './parse';
import { getCommand } from './commands';
import { isDuplicateMessage } from './dedup';
import { executePrompt } from './commands/code';
import { sessionManager } from '../runtime/sessionManager';
import type { IGateway } from '../gateway/types';
import type { CommandContext, ParsedEvent } from './types';

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
    if (gateway.id === 'telegram') {
      await handleTelegramPayload(gateway, data);
      return;
    }
    if (gateway.id === 'whatsapp') {
      await handleWhatsAppPayload(gateway, data);
      return;
    }
    if (gateway.id === 'discord') {
      await handleDiscordPayload(gateway, data);
      return;
    }
    if (gateway.id === 'qq') {
      await handleGenericPayload(gateway, data, 'qq');
      return;
    }
    logger.warn(`No handler for gateway: ${gateway.id}`);
  } catch (error) {
    logger.error('❌ Error handling message event:', error);
  }
}

/** Build ctx from ParsedEvent and run processCommand (shared by all gateways). */
export async function buildContextAndProcess(gateway: IGateway, event: ParsedEvent): Promise<void> {
  if (isDuplicateMessage(event.messageId)) return;
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
  const who = senderName || 'null';
  const sender =
    event.chatType === 'group'
      ? [event.channel, chatName || 'null', who].join(':') + ':'
      : event.chatType === 'p2p'
        ? `${event.channel}:${who}:`
        : `${event.channel}:`;
  logger.info(`👤 ${sender} ${event.text}`);
  const chatType = event.chatType === 'p2p' || event.chatType === 'group' ? event.chatType : undefined;
  const ctx: CommandContext = {
    senderId: event.senderId,
    chatId: event.chatId,
    messageId: event.messageId,
    chatType,
    command: '',
    args: '',
    reply: (text: string) => gateway.reply(event.messageId, text),
    send: (title: string, content: string) => gateway.send(event.chatId, 'chat_id', title, content),
  };
  processCommand(ctx, event.text).catch((error) => logger.error('❌ Error processing command:', error));
}

async function handleFeishuPayload(gateway: IGateway, data: unknown): Promise<void> {
  await buildContextAndProcess(gateway, parseFeishuEvent(data, 'feishu'));
}

async function handleTelegramPayload(gateway: IGateway, data: unknown): Promise<void> {
  const event = parseTelegramUpdate(data);
  if (!event.text.trim()) return;
  await buildContextAndProcess(gateway, event);
}

interface TelegramUpdate {
  message?: {
    message_id: number;
    chat: { id: number; type?: string };
    from?: { id: number; username?: string; first_name?: string };
    text?: string;
  };
}

function parseTelegramUpdate(data: unknown): ParsedEvent {
  const update = data as TelegramUpdate;
  const msg = update.message;
  if (!msg?.text) {
    return {
      messageId: String(msg?.message_id ?? ''),
      chatId: String(msg?.chat?.id ?? ''),
      senderId: String(msg?.from?.id ?? ''),
      channel: 'telegram',
      text: '',
      messageType: 'text',
    };
  }
  const chatType = msg.chat?.type === 'private' ? 'p2p' : 'group';
  const senderName = [msg.from?.first_name, msg.from?.username].filter(Boolean).join(' ').trim();
  return {
    messageId: String(msg.message_id),
    chatId: String(msg.chat.id),
    senderId: String(msg.from?.id ?? ''),
    senderName: senderName || undefined,
    chatType,
    channel: 'telegram',
    text: msg.text,
    messageType: 'text',
  };
}

async function handleWhatsAppPayload(gateway: IGateway, data: unknown): Promise<void> {
  const event = parseWhatsAppPayload(data as WhatsAppPayload);
  if (!event.text.trim()) return;
  await buildContextAndProcess(gateway, event);
}

interface WhatsAppPayload {
  messageId: string;
  chatId: string;
  senderId: string;
  senderName?: string;
  chatType: string;
  text: string;
}

function parseWhatsAppPayload(data: WhatsAppPayload): ParsedEvent {
  return { ...data, channel: 'whatsapp', messageType: 'text' };
}

async function handleDiscordPayload(gateway: IGateway, data: unknown): Promise<void> {
  const event = parseDiscordPayload(data as DiscordPayload);
  if (!event.text.trim()) return;
  await buildContextAndProcess(gateway, event);
}

interface DiscordPayload {
  messageId: string;
  chatId: string;
  senderId: string;
  senderName?: string;
  chatType: string;
  text: string;
}

function parseDiscordPayload(data: DiscordPayload): ParsedEvent {
  return { ...data, channel: 'discord', messageType: 'text' };
}

type GenericPayload = {
  messageId: string;
  chatId: string;
  senderId: string;
  senderName?: string;
  text: string;
  chatType?: string;
};

async function handleGenericPayload(gateway: IGateway, data: unknown, channel: string): Promise<void> {
  const event = parseGenericPayload(data as GenericPayload, channel);
  if (!event.text.trim()) return;
  await buildContextAndProcess(gateway, event);
}

function parseGenericPayload(data: GenericPayload, channel: string): ParsedEvent {
  return {
    messageId: data.messageId,
    chatId: data.chatId,
    senderId: data.senderId,
    senderName: data.senderName,
    channel,
    text: data.text,
    messageType: 'text',
    chatType: data.chatType ?? 'p2p',
  };
}

/**
 * Process command asynchronously (runs in background).
 * Exported for tests.
 */
export async function processCommand(ctx: CommandContext, text: string): Promise<void> {
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
