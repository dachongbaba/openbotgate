/**
 * Google Chat gateway: receives events via HTTP webhook, sends via Google Chat API.
 * Configure in Google Cloud: Chat API, create app with "HTTP endpoint" and set URL to our webhook.
 */
import express, { type Request, type Response } from 'express';
import logger from '../utils/logger';
import { config } from '../config/config';
import type { IGateway } from './types';

const MAX_MESSAGE_CACHE = 5000;

export class GoogleChatGateway implements IGateway {
  readonly id = 'googlechat';
  private server: ReturnType<express.Express['listen']> | null = null;
  private messageToSpace = new Map<string, { name: string; thread?: string }>();

  start(messageHandler: (data: unknown) => Promise<void>): void {
    const cfg = config.googlechat;
    if (!cfg?.webhookSecret || !cfg?.apiToken) {
      throw new Error('Google Chat webhook secret and API token required (GOOGLECHAT_WEBHOOK_SECRET, GOOGLECHAT_API_TOKEN)');
    }
    const port = cfg.webhookPort ?? 3002;
    const app = express();
    app.use(express.json());
    app.post(cfg.webhookPath ?? '/webhook', (req: Request, res: Response) => {
      const body = req.body as {
        message?: { name?: string; thread?: { name?: string }; sender?: { name?: string }; argumentText?: string };
        space?: { name?: string };
      };
      res.status(200).end();
      const spaceName = body.space?.name ?? body.message?.name?.split('/').slice(0, 2).join('/') ?? 'unknown';
      const threadName = body.message?.thread?.name;
      const text = (body.message?.argumentText ?? '').trim();
      const messageId = body.message?.name ?? `${spaceName}-${Date.now()}`;
      const senderName = body.message?.sender?.name ?? '';
      if (this.messageToSpace.size >= MAX_MESSAGE_CACHE) {
        const first = this.messageToSpace.keys().next().value;
        if (first) this.messageToSpace.delete(first);
      }
      this.messageToSpace.set(messageId, { name: spaceName, thread: threadName ?? undefined });
      messageHandler({
        messageId,
        chatId: spaceName,
        senderId: senderName,
        senderName: senderName || undefined,
        text,
        chatType: 'group',
      }).catch((err) => logger.error('Google Chat handler error', err));
    });
    this.server = app.listen(port, () => {
      logger.info(`🟢 Google Chat webhook listening on port ${port}`);
    });
  }

  async reply(messageId: string, text: string): Promise<void> {
    const cached = this.messageToSpace.get(messageId);
    if (!cached || !config.googlechat?.apiToken) return;
    const url = `https://chat.googleapis.com/v1/${cached.name}/messages`;
    const body: Record<string, string> = { text };
    if (cached.thread) body.thread = cached.thread;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.googlechat.apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) logger.error('Google Chat reply failed', res.status, await res.text());
  }

  async send(chatId: string, _chatIdType: string, title: string, content: string): Promise<void> {
    const text = title ? `${title}\n\n${content}` : content;
    const url = `https://chat.googleapis.com/v1/${chatId}/messages`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.googlechat!.apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) logger.error('Google Chat send failed', res.status, await res.text());
  }
}

export const googlechat = new GoogleChatGateway();
