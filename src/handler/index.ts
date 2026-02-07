import logger from '../utils/logger';
import { parseFeishuEvent, parseCommand } from './parse';
import { getCommand } from './commands';
import { feishu } from '../gateway/feishu';
import type { CommandContext } from './types';

// Import default command for non-command messages
import { run as executeOpenCode } from './commands/opencode';

// Message deduplication: track processed message IDs with timestamps
const processedMessages = new Map<string, number>();
const DEDUP_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

/** Clean up old entries periodically */
function cleanupProcessedMessages(): void {
  const now = Date.now();
  for (const [id, timestamp] of processedMessages) {
    if (now - timestamp > DEDUP_WINDOW_MS) {
      processedMessages.delete(id);
    }
  }
}

/** Check if message was already processed (returns true if duplicate) */
function isDuplicateMessage(messageId: string): boolean {
  cleanupProcessedMessages();
  
  if (processedMessages.has(messageId)) {
    logger.debug(`🔄 Duplicate message ignored: ${messageId}`);
    return true;
  }
  
  processedMessages.set(messageId, Date.now());
  return false;
}

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
    
    // Format sender info: channel + name (or just channel if no name)
    const sender = event.senderName 
      ? `${event.channel}/${event.senderName}`
      : event.channel;
    logger.info(`👤 ${sender}: ${event.text}`);

    // Build command context (command name set later in processCommand)
    const ctx: CommandContext = {
      senderId: event.senderId,
      chatId: event.chatId,
      messageId: event.messageId,
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
      logger.info(`🔧 Command: ${cmd} ${args ? args.substring(0, 30) + (args.length > 30 ? '...' : '') : ''}`);
      ctx.reply = (text: string) => rawReply(`[${ctx.command}] ${text}`);
      await handler(ctx);
    } else {
      logger.warn(`❓ Unknown command: ${cmd}`);
      logger.info(`💬 Reply: Unknown command: ${cmd}`);
      await rawReply(`Unknown command: ${cmd}\nUse /help to see available commands.`);
    }
  } else {
    // Default: execute as OpenCode prompt
    ctx.command = 'opencode';
    ctx.args = text;
    ctx.reply = (text: string) => rawReply(`[${ctx.command}] ${text}`);
    await executeOpenCode(ctx);
  }
}
