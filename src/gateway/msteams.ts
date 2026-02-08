/**
 * Microsoft Teams gateway: receives Bot Framework activities via HTTP, replies via Connector API.
 * Configure Bot in Azure, set messaging endpoint to https://your-host/api/teams.
 */
import express, { type Request, type Response } from 'express';
import logger from '../utils/logger';
import { config } from '../config/config';
import type { IGateway } from './types';

const MAX_MESSAGE_CACHE = 5000;

export class MsteamsGateway implements IGateway {
  readonly id = 'msteams';
  private server: ReturnType<express.Express['listen']> | null = null;
  private messageToConversation = new Map<string, { serviceUrl: string; conversationId: string }>();

  start(messageHandler: (data: unknown) => Promise<void>): void {
    const cfg = config.msteams;
    if (!cfg?.appId || !cfg?.appPassword) {
      throw new Error('MS Teams app id and password required (MSTEAMS_APP_ID, MSTEAMS_APP_PASSWORD)');
    }
    const port = cfg.port ?? 3005;
    const app = express();
    app.use(express.json());
    app.post(cfg.path ?? '/api/messages', (req: Request, res: Response) => {
      const body = req.body as {
        type?: string;
        serviceUrl?: string;
        conversation?: { id?: string };
        from?: { id?: string; name?: string };
        text?: string;
        id?: string;
      };
      res.status(200).end();
      if (body.type !== 'message' || !body.text) return;
      const messageId = body.id ?? `${body.conversation?.id}-${Date.now()}`;
      const serviceUrl = body.serviceUrl ?? '';
      const conversationId = body.conversation?.id ?? '';
      if (this.messageToConversation.size >= MAX_MESSAGE_CACHE) {
        const first = this.messageToConversation.keys().next().value;
        if (first) this.messageToConversation.delete(first);
      }
      this.messageToConversation.set(messageId, { serviceUrl, conversationId });
      messageHandler({
        messageId,
        chatId: conversationId,
        senderId: body.from?.id ?? '',
        senderName: body.from?.name,
        text: body.text,
        chatType: 'group',
      }).catch((err) => logger.error('MS Teams handler error', err));
    });
    this.server = app.listen(port, () => {
      logger.info(`🟢 MS Teams bot listening on port ${port}`);
    });
  }

  async reply(messageId: string, text: string): Promise<void> {
    const cached = this.messageToConversation.get(messageId);
    if (!cached || !config.msteams?.appId) return;
    const token = await this.getToken();
    if (!token) return;
    const url = `${cached.serviceUrl}/v3/conversations/${encodeURIComponent(cached.conversationId)}/activities`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ type: 'message', text }),
    });
    if (!res.ok) logger.error('MS Teams reply failed', res.status, await res.text());
  }

  async send(chatId: string, _chatIdType: string, title: string, content: string): Promise<void> {
    const text = title ? `${title}\n\n${content}` : content;
    const cached = this.messageToConversation.get(chatId);
    const convId = cached?.conversationId ?? chatId;
    const serviceUrl = cached?.serviceUrl ?? config.msteams?.serviceUrl ?? '';
    if (!serviceUrl) return;
    const token = await this.getToken();
    if (!token) return;
    const url = `${serviceUrl}/v3/conversations/${encodeURIComponent(convId)}/activities`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ type: 'message', text }),
    });
    if (!res.ok) logger.error('MS Teams send failed', res.status, await res.text());
  }

  private async getToken(): Promise<string | null> {
    const cfg = config.msteams;
    if (!cfg?.appId || !cfg?.appPassword) return null;
    const res = await fetch('https://login.microsoftonline.com/botframework.com/oauth2/v2.0/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: cfg.appId,
        client_secret: cfg.appPassword,
        scope: 'https://api.botframework.com/.default',
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { access_token?: string };
    return data.access_token ?? null;
  }
}

export const msteams = new MsteamsGateway();
