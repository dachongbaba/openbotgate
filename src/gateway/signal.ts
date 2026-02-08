/**
 * Signal gateway: uses signal-cli REST API (e.g. https://github.com/bbernhard/signal-cli-rest-api).
 * Run signal-cli-rest-api separately, then set SIGNAL_CLI_REST_URL and register number/link.
 */
import logger from '../utils/logger';
import { config } from '../config/config';
import type { IGateway } from './types';

const MAX_MESSAGE_CACHE = 5000;

export class SignalGateway implements IGateway {
  readonly id = 'signal';
  private messageToRecipient = new Map<string, string>();
  private baseUrl = '';
  private number = '';

  start(messageHandler: (data: unknown) => Promise<void>): void {
    const cfg = config.signal;
    if (!cfg?.restUrl || !cfg?.number) {
      throw new Error('Signal REST URL and number required (SIGNAL_CLI_REST_URL, SIGNAL_NUMBER)');
    }
    this.baseUrl = cfg.restUrl.replace(/\/$/, '');
    this.number = cfg.number;
    const poll = async () => {
      try {
        const res = await fetch(`${this.baseUrl}/v1/receive/${encodeURIComponent(this.number)}`);
        if (!res.ok) return;
        const data = (await res.json()) as { envelope?: { source?: string; sourceNumber?: string; dataMessage?: { message?: string }; timestamp?: string } };
        const env = data.envelope;
        if (!env?.dataMessage?.message) return;
        const messageId = `${env.sourceNumber}-${env.timestamp}`;
        const chatId = env.sourceNumber ?? env.source ?? '';
        const senderId = chatId;
        const text = env.dataMessage.message ?? '';
        if (this.messageToRecipient.size >= MAX_MESSAGE_CACHE) {
          const first = this.messageToRecipient.keys().next().value;
          if (first) this.messageToRecipient.delete(first);
        }
        this.messageToRecipient.set(messageId, chatId);
        await messageHandler({ messageId, chatId, senderId, text, chatType: 'p2p' });
      } catch (e) {
        logger.warn('Signal receive poll error', e);
      }
      setTimeout(poll, 2000);
    };
    poll();
    logger.info('🟢 Signal polling started');
  }

  async reply(messageId: string, text: string): Promise<void> {
    const recipient = this.messageToRecipient.get(messageId);
    if (!recipient) return;
    await this.send(recipient, 'chat_id', '', text);
  }

  async send(chatId: string, _chatIdType: string, title: string, content: string): Promise<void> {
    const text = title ? `${title}\n\n${content}` : content;
    const res = await fetch(`${this.baseUrl}/v2/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        number: this.number,
        recipients: [chatId],
        message: text,
      }),
    });
    if (!res.ok) logger.error('Signal send failed', res.status, await res.text());
  }
}

export const signal = new SignalGateway();
