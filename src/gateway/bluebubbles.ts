/**
 * BlueBubbles gateway: REST API to BlueBubbles server (macOS iMessage bridge).
 */
import logger from '../utils/logger';
import { config } from '../config/config';
import type { IGateway } from './types';

const MAX_MESSAGE_CACHE = 5000;

export class BlueBubblesGateway implements IGateway {
  readonly id = 'bluebubbles';
  private messageToChat = new Map<string, string>();
  private baseUrl = '';
  private password = '';

  start(messageHandler: (data: unknown) => Promise<void>): void {
    const cfg = config.bluebubbles;
    if (!cfg?.serverUrl || !cfg?.password) {
      throw new Error('BlueBubbles server URL and password required (BLUEBUBBLES_SERVER_URL, BLUEBUBBLES_PASSWORD)');
    }
    this.baseUrl = cfg.serverUrl.replace(/\/$/, '');
    this.password = cfg.password;
    const poll = async () => {
      try {
        const res = await fetch(`${this.baseUrl}/api/v1/server/poll`, {
          headers: { Authorization: `Bearer ${this.password}` },
        });
        if (!res.ok) return;
        const data = (await res.json()) as { messages?: Array<{ guid?: string; chat?: string; text?: string; handle?: { address?: string } }> };
        const messages = data.messages ?? [];
        for (const m of messages) {
          const messageId = m.guid ?? `${m.chat}-${Date.now()}`;
          const chatId = m.chat ?? m.handle?.address ?? '';
          const senderId = m.handle?.address ?? '';
          const text = (m.text ?? '').trim();
          if (this.messageToChat.size >= MAX_MESSAGE_CACHE) {
            const first = this.messageToChat.keys().next().value;
            if (first) this.messageToChat.delete(first);
          }
          this.messageToChat.set(messageId, chatId);
          await messageHandler({ messageId, chatId, senderId, text, chatType: 'p2p' }).catch((err) =>
            logger.error('BlueBubbles handler error', err)
          );
        }
      } catch (e) {
        logger.warn('BlueBubbles poll error', e);
      }
      setTimeout(poll, 3000);
    };
    poll();
    logger.info('🟢 BlueBubbles polling started');
  }

  async reply(messageId: string, text: string): Promise<void> {
    const chatId = this.messageToChat.get(messageId);
    if (!chatId) return;
    await this.send(chatId, 'chat_id', '', text);
  }

  async send(chatId: string, _chatIdType: string, title: string, content: string): Promise<void> {
    const text = title ? `${title}\n\n${content}` : content;
    const res = await fetch(`${this.baseUrl}/api/v1/message/text`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.password}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ chatGuid: chatId, message: text }),
    });
    if (!res.ok) logger.error('BlueBubbles send failed', res.status, await res.text());
  }
}

export const bluebubbles = new BlueBubblesGateway();
