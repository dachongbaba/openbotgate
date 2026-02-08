/**
 * Tlon (Urbit) gateway: uses Urbit HTTP API to subscribe and send messages.
 */
import logger from '../utils/logger';
import { config } from '../config/config';
import type { IGateway } from './types';

const MAX_MESSAGE_CACHE = 5000;

export class TlonGateway implements IGateway {
  readonly id = 'tlon';
  private messageToChat = new Map<string, string>();
  private baseUrl = '';
  private token = '';

  start(messageHandler: (data: unknown) => Promise<void>): void {
    const cfg = config.tlon;
    if (!cfg?.shipUrl || !cfg?.code) {
      throw new Error('Tlon ship URL and auth code required (TLON_SHIP_URL, TLON_CODE)');
    }
    this.baseUrl = cfg.shipUrl.replace(/\/$/, '');
    this.token = cfg.code;
    const poll = async () => {
      try {
        const res = await fetch(`${this.baseUrl}/~/channel/${Date.now()}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Cookie: `urbauth=~${this.token}`,
          },
          body: JSON.stringify([
            {
              id: Date.now(),
              action: 'subscribe',
              app: 'chat',
              path: '/updates',
            },
          ]),
        });
        if (!res.ok) return;
        const data = (await res.json()) as { updates?: Array<{ chat?: string; message?: { text?: string; author?: string }; id?: string }> };
        const updates = data.updates ?? [];
        for (const u of updates) {
          const messageId = u.id ?? `${u.chat}-${Date.now()}`;
          const chatId = u.chat ?? '';
          const text = (u.message?.text ?? '').trim();
          const senderId = u.message?.author ?? '';
          if (this.messageToChat.size >= MAX_MESSAGE_CACHE) {
            const first = this.messageToChat.keys().next().value;
            if (first) this.messageToChat.delete(first);
          }
          this.messageToChat.set(messageId, chatId);
          await messageHandler({
            messageId,
            chatId,
            senderId,
            text,
            chatType: 'group',
          }).catch((err) => logger.error('Tlon handler error', err));
        }
      } catch (e) {
        logger.warn('Tlon poll error', e);
      }
      setTimeout(poll, 5000);
    };
    poll();
    logger.info('🟢 Tlon polling started');
  }

  async reply(messageId: string, text: string): Promise<void> {
    const chatId = this.messageToChat.get(messageId);
    if (!chatId) return;
    await this.send(chatId, 'chat_id', '', text);
  }

  async send(chatId: string, _chatIdType: string, title: string, content: string): Promise<void> {
    const text = title ? `${title}\n\n${content}` : content;
    const res = await fetch(`${this.baseUrl}/~/channel`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `urbauth=~${this.token}`,
      },
      body: JSON.stringify([
        {
          id: Date.now(),
          action: 'chat-hook-action',
          app: 'chat',
          data: { path: chatId, message: { text } },
        },
      ]),
    });
    if (!res.ok) logger.error('Tlon send failed', res.status, await res.text());
  }
}

export const tlon = new TlonGateway();
