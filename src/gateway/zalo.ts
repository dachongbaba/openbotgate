/**
 * Zalo gateway: Zalo Official Account (Bot) API. Webhook receives events, send via Open API.
 */
import express, { type Request, type Response } from 'express';
import logger from '../utils/logger';
import { config } from '../config/config';
import type { IGateway } from './types';

const MAX_MESSAGE_CACHE = 5000;

export class ZaloGateway implements IGateway {
  readonly id = 'zalo';
  private server: ReturnType<express.Express['listen']> | null = null;
  private messageToUser = new Map<string, string>();
  private accessToken = '';

  start(messageHandler: (data: unknown) => Promise<void>): void {
    const cfg = config.zalo;
    if (!cfg?.appId || !cfg?.appSecret || !cfg?.accessToken) {
      throw new Error('Zalo app id, secret and access token required (ZALO_APP_ID, ZALO_APP_SECRET, ZALO_ACCESS_TOKEN)');
    }
    this.accessToken = cfg.accessToken;
    const port = cfg.webhookPort ?? 3004;
    const app = express();
    app.use(express.json());
    app.get(cfg.webhookPath ?? '/webhook', (req: Request, res: Response) => {
      const challenge = (req.query as { 'hub.challenge'?: string })['hub.challenge'];
      if (challenge) {
        res.status(200).send(challenge);
        return;
      }
      res.status(200).end();
    });
    app.post(cfg.webhookPath ?? '/webhook', (req: Request, res: Response) => {
      const body = req.body as { event_name?: string; sender?: { id?: string }; message?: { text?: string }; timestamp?: string };
      res.status(200).end();
      if (body.event_name !== 'user_send_text') return;
      const userId = body.sender?.id ?? '';
      const text = (body.message?.text ?? '').trim();
      const messageId = `${userId}-${body.timestamp ?? Date.now()}`;
      if (this.messageToUser.size >= MAX_MESSAGE_CACHE) {
        const first = this.messageToUser.keys().next().value;
        if (first) this.messageToUser.delete(first);
      }
      this.messageToUser.set(messageId, userId);
      messageHandler({ messageId, chatId: userId, senderId: userId, text, chatType: 'p2p' }).catch((err) =>
        logger.error('Zalo handler error', err)
      );
    });
    this.server = app.listen(port, () => {
      logger.info(`🟢 Zalo webhook listening on port ${port}`);
    });
  }

  async reply(messageId: string, text: string): Promise<void> {
    const userId = this.messageToUser.get(messageId);
    if (!userId) return;
    await this.send(userId, 'user_id', '', text);
  }

  async send(chatId: string, _chatIdType: string, title: string, content: string): Promise<void> {
    const text = title ? `${title}\n\n${content}` : content;
    const res = await fetch(
      `https://graph.zalo.me/v2.0/me/message?access_token=${encodeURIComponent(this.accessToken)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipient: { user_id: chatId }, message: { text } }),
      }
    );
    if (!res.ok) logger.error('Zalo send failed', res.status, await res.text());
  }
}

export const zalo = new ZaloGateway();
