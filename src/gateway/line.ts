import express, { type Request, type Response } from 'express';
import { Client, middleware } from '@line/bot-sdk';
import logger from '../utils/logger';
import { config } from '../config/config';
import type { IGateway } from './types';

const MAX_CACHE = 5000;

export class LineGateway implements IGateway {
  readonly id = 'line';
  private client: Client | null = null;
  private server: ReturnType<express.Express['listen']> | null = null;
  private messageToChat = new Map<string, string>();

  private getClient(): Client {
    if (!this.client) {
      const cfg = config.line;
      if (!cfg?.channelAccessToken) {
        throw new Error('LINE channel access token not set (LINE_CHANNEL_ACCESS_TOKEN)');
      }
      this.client = new Client({ channelAccessToken: cfg.channelAccessToken });
    }
    return this.client;
  }

  start(messageHandler: (data: unknown) => Promise<void>): void {
    const cfg = config.line;
    if (!cfg?.channelSecret || !cfg?.channelAccessToken) {
      throw new Error('LINE channel secret and token required (LINE_CHANNEL_SECRET, LINE_CHANNEL_ACCESS_TOKEN)');
    }
    const port = cfg.webhookPort ?? 3000;
    const app = express();
    const path = cfg.webhookPath ?? '/webhook';
    app.post(path, middleware({ channelSecret: cfg.channelSecret }),
      (req: Request, res: Response) => {
        const events = (req as Request & { body?: { events?: any[] } }).body?.events ?? [];
        res.status(200).end();
        for (const ev of events) {
          if (ev.type !== 'message' || ev.message?.type !== 'text') continue;
          const messageId = String(ev.message?.id ?? ev.replyToken ?? Date.now());
          const chatId = String(ev.source?.userId ?? ev.source?.roomId ?? ev.source?.groupId ?? '');
          const senderId = String(ev.source?.userId ?? '');
          if (this.messageToChat.size >= MAX_CACHE) {
            const first = this.messageToChat.keys().next().value;
            if (first) this.messageToChat.delete(first);
          }
          this.messageToChat.set(messageId, chatId);
          messageHandler({
            messageId,
            chatId,
            senderId,
            text: ev.message?.text ?? '',
            chatType: ev.source?.type === 'user' ? 'p2p' : 'group',
          }).catch((err) => logger.error('LINE handler error', err));
        }
      }
    );
    this.server = app.listen(port, () => {
      logger.info(`🟢 LINE webhook listening on port ${port}`);
    });
  }

  async reply(messageId: string, text: string): Promise<void> {
    const chatId = this.messageToChat.get(messageId);
    if (!chatId) {
      logger.warn('LINE: unknown messageId for reply');
      return;
    }
    await this.getClient().pushMessage(chatId, { type: 'text', text });
  }

  async send(chatId: string, _chatIdType: string, title: string, content: string): Promise<void> {
    const text = title ? `${title}\n\n${content}` : content;
    await this.getClient().pushMessage(chatId, { type: 'text', text });
  }
}

export const line = new LineGateway();
