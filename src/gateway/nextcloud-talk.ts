/**
 * Nextcloud Talk gateway: incoming webhook + Talk REST API to send messages.
 */
import express, { type Request, type Response } from 'express';
import logger from '../utils/logger';
import { config } from '../config/config';
import type { IGateway } from './types';

const MAX_MESSAGE_CACHE = 5000;

export class NextcloudTalkGateway implements IGateway {
  readonly id = 'nextcloud-talk';
  private server: ReturnType<express.Express['listen']> | null = null;
  private messageToRoom = new Map<string, { token: string; roomType: number }>();

  start(messageHandler: (data: unknown) => Promise<void>): void {
    const cfg = config.nextcloudTalk;
    if (!cfg?.baseUrl || !cfg?.appToken) {
      throw new Error('Nextcloud Talk base URL and app token required (NEXTCLOUD_TALK_BASE_URL, NEXTCLOUD_TALK_APP_TOKEN)');
    }
    const port = cfg.webhookPort ?? 3003;
    const app = express();
    app.use(express.json());
    app.post(cfg.webhookPath ?? '/webhook', (req: Request, res: Response) => {
      const body = req.body as {
        room?: { token?: string; type?: number };
        actor?: { id?: string; name?: string };
        message?: { id?: string; message?: string };
      };
      res.status(200).end();
      const token = body.room?.token ?? '';
      const roomType = body.room?.type ?? 2;
      const messageId = body.message?.id ?? `${token}-${Date.now()}`;
      const text = (body.message?.message ?? '').trim();
      const senderId = body.actor?.id ?? '';
      const senderName = body.actor?.name;
      if (this.messageToRoom.size >= MAX_MESSAGE_CACHE) {
        const first = this.messageToRoom.keys().next().value;
        if (first) this.messageToRoom.delete(first);
      }
      this.messageToRoom.set(messageId, { token, roomType });
      messageHandler({
        messageId,
        chatId: token,
        senderId,
        senderName,
        text,
        chatType: roomType === 1 ? 'p2p' : 'group',
      }).catch((err) => logger.error('Nextcloud Talk handler error', err));
    });
    this.server = app.listen(port, () => {
      logger.info(`🟢 Nextcloud Talk webhook listening on port ${port}`);
    });
  }

  async reply(messageId: string, text: string): Promise<void> {
    const cached = this.messageToRoom.get(messageId);
    if (!cached || !config.nextcloudTalk?.baseUrl) return;
    const base = config.nextcloudTalk.baseUrl.replace(/\/$/, '');
    const url = `${base}/ocs/v2.php/apps/spreed/api/v4/chat/${cached.token}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`app:${config.nextcloudTalk.appToken}`).toString('base64')}`,
        'OCS-APIRequest': 'true',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ message: text }),
    });
    if (!res.ok) logger.error('Nextcloud Talk reply failed', res.status, await res.text());
  }

  async send(chatId: string, _chatIdType: string, title: string, content: string): Promise<void> {
    const text = title ? `${title}\n\n${content}` : content;
    const base = config.nextcloudTalk!.baseUrl.replace(/\/$/, '');
    const url = `${base}/ocs/v2.php/apps/spreed/api/v4/chat/${chatId}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`app:${config.nextcloudTalk!.appToken}`).toString('base64')}`,
        'OCS-APIRequest': 'true',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ message: text }),
    });
    if (!res.ok) logger.error('Nextcloud Talk send failed', res.status, await res.text());
  }
}

export const nextcloudTalk = new NextcloudTalkGateway();
