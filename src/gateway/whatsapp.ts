import { Client, LocalAuth } from 'whatsapp-web.js';
import logger from '../utils/logger';
import { config } from '../config/config';
import type { IGateway } from './types';

const MAX_MESSAGE_CACHE = 5000;

type CachedReply = (text: string) => Promise<void>;

export class WhatsAppGateway implements IGateway {
  readonly id = 'whatsapp';
  private client: Client | null = null;
  private messageToReply = new Map<string, CachedReply>();

  private async getClient(): Promise<Client> {
    if (this.client) return this.client;
    const useLocalAuth = config.whatsapp?.sessionPath;
    this.client = new Client({
      authStrategy: useLocalAuth ? new LocalAuth({ dataPath: config.whatsapp!.sessionPath }) : undefined,
      puppeteer: { headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] },
    });
    return this.client;
  }

  start(messageHandler: (data: unknown) => Promise<void>): void {
    this.getClient().then((client) => {
      client.on('qr', (qr) => {
        logger.info('WhatsApp QR code received - scan with your phone');
        if (config.whatsapp?.logQr) logger.info(qr);
      });
      client.on('ready', () => logger.info('🟢 WhatsApp client ready'));
      client.on('message', async (msg) => {
        const messageId = msg.id._serialized;
        const replyFn: CachedReply = async (text: string) => {
          await msg.reply(text);
        };
        if (this.messageToReply.size >= MAX_MESSAGE_CACHE) {
          const first = this.messageToReply.keys().next().value;
          if (first) this.messageToReply.delete(first);
        }
        this.messageToReply.set(messageId, replyFn);
        let senderName: string | undefined;
        try {
          senderName = (await msg.getContact().then((c) => c.pushname).catch(() => undefined)) ?? undefined;
        } catch {
          senderName = undefined;
        }
        await messageHandler({
          messageId,
          chatId: msg.from,
          senderId: msg.author || msg.from,
          senderName,
          chatType: msg.from.endsWith('@g.us') ? 'group' : 'p2p',
          text: msg.body,
        });
      });
      client.initialize().catch((err) => logger.error('WhatsApp client initialize failed', err));
    });
  }

  async reply(messageId: string, text: string): Promise<void> {
    const replyFn = this.messageToReply.get(messageId);
    if (!replyFn) {
      logger.warn('WhatsApp: unknown messageId for reply');
      return;
    }
    await replyFn(text);
  }

  async send(chatId: string, _chatIdType: string, title: string, content: string): Promise<void> {
    const client = await this.getClient();
    const text = title ? `*${title}*\n\n${content}` : content;
    await client.sendMessage(chatId, text);
  }
}

export const whatsapp = new WhatsAppGateway();
