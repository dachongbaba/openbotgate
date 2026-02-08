/**
 * Zalo Personal Account gateway: uses Zalo Chat API for personal accounts (different from OA).
 * Typically requires OAuth and different endpoints; this implementation uses a REST bridge URL if provided.
 */
import logger from '../utils/logger';
import { config } from '../config/config';
import type { IGateway } from './types';

const MAX_MESSAGE_CACHE = 5000;

export class ZalouserGateway implements IGateway {
  readonly id = 'zalouser';
  private messageToChat = new Map<string, string>();
  private baseUrl = '';
  private token = '';

  start(messageHandler: (data: unknown) => Promise<void>): void {
    const cfg = config.zalouser;
    if (!cfg?.apiUrl || !cfg?.token) {
      throw new Error('Zalo Personal API URL and token required (ZALOUSER_API_URL, ZALOUSER_TOKEN)');
    }
    this.baseUrl = cfg.apiUrl.replace(/\/$/, '');
    this.token = cfg.token;
    const poll = async () => {
      try {
        const res = await fetch(`${this.baseUrl}/messages`, {
          headers: { Authorization: `Bearer ${this.token}` },
        });
        if (!res.ok) return;
        const data = (await res.json()) as { messages?: Array<{ id?: string; from?: string; chatId?: string; text?: string }> };
        const messages = data.messages ?? [];
        for (const m of messages) {
          const messageId = m.id ?? `${m.chatId}-${Date.now()}`;
          const chatId = m.chatId ?? m.from ?? '';
          if (this.messageToChat.size >= MAX_MESSAGE_CACHE) {
            const first = this.messageToChat.keys().next().value;
            if (first) this.messageToChat.delete(first);
          }
          this.messageToChat.set(messageId, chatId);
          await messageHandler({
            messageId,
            chatId,
            senderId: m.from ?? chatId,
            text: (m.text ?? '').trim(),
            chatType: 'p2p',
          }).catch((err) => logger.error('Zalo Personal handler error', err));
        }
      } catch (e) {
        logger.warn('Zalo Personal poll error', e);
      }
      setTimeout(poll, 3000);
    };
    poll();
    logger.info('🟢 Zalo Personal polling started');
  }

  async reply(messageId: string, text: string): Promise<void> {
    const chatId = this.messageToChat.get(messageId);
    if (!chatId) return;
    await this.send(chatId, 'chat_id', '', text);
  }

  async send(chatId: string, _chatIdType: string, title: string, content: string): Promise<void> {
    const text = title ? `${title}\n\n${content}` : content;
    const res = await fetch(`${this.baseUrl}/send`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ chatId, text }),
    });
    if (!res.ok) logger.error('Zalo Personal send failed', res.status, await res.text());
  }
}

export const zalouser = new ZalouserGateway();
