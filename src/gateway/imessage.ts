/**
 * iMessage gateway: uses a REST bridge (e.g. imessage-rest, BlueBubbles, or similar) to poll/send.
 */
import logger from '../utils/logger';
import { config } from '../config/config';
import type { IGateway } from './types';

const MAX_MESSAGE_CACHE = 5000;

export class ImessageGateway implements IGateway {
  readonly id = 'imessage';
  private messageToChat = new Map<string, string>();
  private baseUrl = '';
  private token = '';

  start(messageHandler: (data: unknown) => Promise<void>): void {
    const cfg = config.imessage;
    if (!cfg?.bridgeUrl) {
      throw new Error('iMessage bridge URL required (IMESSAGE_BRIDGE_URL)');
    }
    this.baseUrl = cfg.bridgeUrl.replace(/\/$/, '');
    this.token = cfg.token ?? '';
    const poll = async () => {
      try {
        const url = `${this.baseUrl}/messages`;
        const opts: RequestInit = this.token ? { headers: { Authorization: `Bearer ${this.token}` } } : {};
        const res = await fetch(url, opts);
        if (!res.ok) return;
        const data = (await res.json()) as { messages?: Array<{ id?: string; chat?: string; from?: string; text?: string }> };
        const messages = data.messages ?? [];
        for (const m of messages) {
          const messageId = m.id ?? `${m.chat}-${Date.now()}`;
          const chatId = m.chat ?? m.from ?? '';
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
          }).catch((err) => logger.error('iMessage handler error', err));
        }
      } catch (e) {
        logger.warn('iMessage poll error', e);
      }
      setTimeout(poll, 3000);
    };
    poll();
    logger.info('🟢 iMessage bridge polling started');
  }

  async reply(messageId: string, text: string): Promise<void> {
    const chatId = this.messageToChat.get(messageId);
    if (!chatId) return;
    await this.send(chatId, 'chat_id', '', text);
  }

  async send(chatId: string, _chatIdType: string, title: string, content: string): Promise<void> {
    const text = title ? `${title}\n\n${content}` : content;
    const opts: RequestInit = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatId, text }),
    };
    if (this.token) (opts.headers as Record<string, string>)['Authorization'] = `Bearer ${this.token}`;
    const res = await fetch(`${this.baseUrl}/send`, opts);
    if (!res.ok) logger.error('iMessage send failed', res.status, await res.text());
  }
}

export const imessage = new ImessageGateway();
