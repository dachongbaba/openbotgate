import { Telegraf } from 'telegraf';
import logger from '../utils/logger';
import { config } from '../config/config';
import type { IGateway } from './types';

const MAX_MESSAGE_CACHE = 5000;

export class TelegramGateway implements IGateway {
  readonly id = 'telegram';
  private bot: Telegraf | null = null;
  private messageToChat = new Map<string, string>();

  private getBot(): Telegraf {
    if (!this.bot) {
      const token = config.telegram?.token;
      if (!token) {
        throw new Error('Telegram bot token not set (TELEGRAM_BOT_TOKEN)');
      }
      this.bot = new Telegraf(token);
    }
    return this.bot;
  }

  start(messageHandler: (data: unknown) => Promise<void>): void {
    const bot = this.getBot();
    bot.on('text', async (ctx) => {
      const chatId = String(ctx.chat.id);
      const messageId = String(ctx.message.message_id);
      if (this.messageToChat.size >= MAX_MESSAGE_CACHE) {
        const first = this.messageToChat.keys().next().value;
        if (first) this.messageToChat.delete(first);
      }
      this.messageToChat.set(messageId, chatId);
      await messageHandler(ctx.update);
    });
    bot.launch()
      .then(() => logger.info('🟢 Telegram bot polling started'))
      .catch((err: unknown) => logger.error('Telegram bot launch failed', err));
  }

  async reply(messageId: string, text: string): Promise<void> {
    const chatId = this.messageToChat.get(messageId);
    if (!chatId) {
      logger.warn('Telegram: unknown messageId for reply');
      return;
    }
    await this.getBot().telegram.sendMessage(chatId, text, {
      reply_parameters: { message_id: parseInt(messageId, 10) },
    } as any); // Telegraf 类型不全
  }

  async send(chatId: string, _chatIdType: string, title: string, content: string): Promise<void> {
    const text = title ? `**${title}**\n\n${content}` : content;
    await this.getBot().telegram.sendMessage(chatId, text, { parse_mode: 'Markdown' });
  }
}

export const telegram = new TelegramGateway();
