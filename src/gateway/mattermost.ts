/**
 * Mattermost gateway: uses Mattermost REST API + incoming webhook or outgoing webhook.
 * For real-time messages we need either WebSocket (mattermost-client) or HTTP webhook.
 * This implementation uses a local HTTP server to receive outgoing webhook from Mattermost
 * (Mattermost sends POST to our URL when messages match trigger words), or we use
 * mattermost-client WebSocket if MATTERMOST_USE_WS=1.
 */
import express, { type Request, type Response } from 'express';
import logger from '../utils/logger';
import { config } from '../config/config';
import type { IGateway } from './types';

const MAX_MESSAGE_CACHE = 5000;

export class MattermostGateway implements IGateway {
  readonly id = 'mattermost';
  private server: ReturnType<express.Express['listen']> | null = null;
  private messageToChannel = new Map<string, { channelId: string; teamId?: string }>();
  private baseUrl = '';
  private token = '';

  start(messageHandler: (data: unknown) => Promise<void>): void {
    const cfg = config.mattermost;
    if (!cfg?.serverUrl || !cfg?.token) {
      throw new Error('Mattermost server URL and token required (MATTERMOST_SERVER_URL, MATTERMOST_TOKEN)');
    }
    this.baseUrl = cfg.serverUrl.replace(/\/$/, '');
    this.token = cfg.token;
    const port = cfg.webhookPort ?? 3001;
    const app = express();
    app.use(express.json());
    app.post(cfg.webhookPath ?? '/webhook', (req: Request, res: Response) => {
      const body = req.body as {
        channel_id?: string;
        team_id?: string;
        user_id?: string;
        user_name?: string;
        post_id?: string;
        text?: string;
        trigger_word?: string;
      };
      res.status(200).end();
      const text = (body.text || '').trim();
      const channelId = body.channel_id ?? '';
      const messageId = body.post_id ?? `${channelId}-${Date.now()}`;
      const senderId = body.user_id ?? '';
      if (this.messageToChannel.size >= MAX_MESSAGE_CACHE) {
        const first = this.messageToChannel.keys().next().value;
        if (first) this.messageToChannel.delete(first);
      }
      this.messageToChannel.set(messageId, { channelId, teamId: body.team_id });
      messageHandler({
        messageId,
        chatId: channelId,
        senderId,
        senderName: body.user_name,
        text,
        chatType: 'group',
      }).catch((err) => logger.error('Mattermost handler error', err));
    });
    this.server = app.listen(port, () => {
      logger.info(`🟢 Mattermost webhook listening on port ${port}`);
    });
  }

  async reply(messageId: string, text: string): Promise<void> {
    const cached = this.messageToChannel.get(messageId);
    if (!cached) {
      logger.warn('Mattermost: unknown messageId for reply');
      return;
    }
    await this.postMessage(cached.channelId, text);
  }

  async send(chatId: string, _chatIdType: string, title: string, content: string): Promise<void> {
    const text = title ? `**${title}**\n\n${content}` : content;
    await this.postMessage(chatId, text);
  }

  private async postMessage(channelId: string, text: string): Promise<void> {
    const res = await fetch(`${this.baseUrl}/api/v4/posts`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ channel_id: channelId, message: text }),
    });
    if (!res.ok) {
      const err = await res.text();
      logger.error('Mattermost post failed', res.status, err);
      throw new Error(`Mattermost API: ${res.status}`);
    }
  }
}

export const mattermost = new MattermostGateway();
