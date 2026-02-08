import { App } from '@slack/bolt';
import logger from '../utils/logger';
import { config } from '../config/config';
import type { IGateway } from './types';

const MAX_MESSAGE_CACHE = 5000;

export class SlackGateway implements IGateway {
  readonly id = 'slack';
  private app: App | null = null;
  private messageToChannel = new Map<string, { channelId: string; ts: string }>();

  private getApp(): App {
    if (!this.app) {
      const token = config.slack?.botToken;
      const appToken = config.slack?.appToken;
      if (!token || !appToken) {
        throw new Error('Slack tokens not set (SLACK_BOT_TOKEN, SLACK_APP_TOKEN for Socket Mode)');
      }
      this.app = new App({ token, socketMode: true, appToken });
    }
    return this.app;
  }

  start(messageHandler: (data: unknown) => Promise<void>): void {
    const app = this.getApp();
    app.message(async ({ message, client }: { message: any; say: any; client: any }) => {
      if (message.subtype === 'bot_message') return;
      const text = 'text' in message ? message.text : '';
      const channelId = message.channel;
      const ts = message.ts;
      const messageId = `${channelId}-${ts}`;
      const userId = message.user ?? '';
      if (this.messageToChannel.size >= MAX_MESSAGE_CACHE) {
        const first = this.messageToChannel.keys().next().value;
        if (first) this.messageToChannel.delete(first);
      }
      this.messageToChannel.set(messageId, { channelId, ts });
      let senderName: string | undefined;
      try {
        const u = await client.users.info({ user: userId });
        senderName = u.user?.real_name ?? u.user?.name;
      } catch {
        senderName = undefined;
      }
      await messageHandler({
        messageId,
        chatId: channelId,
        senderId: userId,
        senderName,
        chatType: message.channel?.startsWith('D') ? 'p2p' : 'group',
        text: text ?? '',
      });
    });
    app
      .start()
      .then(() => logger.info('🟢 Slack Socket Mode started'))
      .catch((err: unknown) => logger.error('Slack start failed', err));
  }

  async reply(messageId: string, text: string): Promise<void> {
    const cached = this.messageToChannel.get(messageId);
    if (!cached || !this.app) return;
    await this.app.client.chat.postMessage({
      channel: cached.channelId,
      text,
      thread_ts: cached.ts,
    });
  }

  async send(chatId: string, _chatIdType: string, title: string, content: string): Promise<void> {
    const text = title ? `*${title}*\n\n${content}` : content;
    await this.getApp().client.chat.postMessage({ channel: chatId, text });
  }
}

export const slack = new SlackGateway();
