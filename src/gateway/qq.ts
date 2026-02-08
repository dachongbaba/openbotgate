/**
 * QQ 网关：使用官方 qq-guild-bot SDK（QQ 频道），长连接收消息、OpenAPI 发消息。
 * 无需公网 IP，本机连接腾讯网关即可。
 */
import { createOpenAPI, createWebsocket, type AvailableIntentsEventsEnum } from 'qq-guild-bot';
import logger from '../utils/logger';
import { config } from '../config/config';
import type { IGateway } from './types';

const MAX_CACHE = 5000;

type QqCache = { channelId: string; guildId: string; isDirect: boolean };

export class QqGateway implements IGateway {
  readonly id = 'qq';
  private client: ReturnType<typeof createOpenAPI> | null = null;
  private ws: ReturnType<typeof createWebsocket> | null = null;
  private messageToTarget = new Map<string, QqCache>();

  start(messageHandler: (data: unknown) => Promise<void>): void {
    const cfg = config.qqGuild;
    if (!cfg?.appID || !cfg?.token) {
      throw new Error('QQ 频道 appID 与 token 必填 (QQ_GUILD_APP_ID, QQ_GUILD_TOKEN)');
    }
    const intents: AvailableIntentsEventsEnum[] =
      (cfg.intents as AvailableIntentsEventsEnum[]) ?? (['PUBLIC_GUILD_MESSAGES', 'DIRECT_MESSAGE'] as const);
    const botConfig = {
      appID: cfg.appID,
      token: cfg.token,
      intents,
      sandbox: cfg.sandbox ?? false,
    };
    this.client = createOpenAPI(botConfig);
    this.ws = createWebsocket(botConfig);

    this.ws.on('PUBLIC_GUILD_MESSAGES', (data: { eventType?: string; eventId?: string; msg?: Record<string, unknown> }) => {
      if (data.eventType !== 'AT_MESSAGE_CREATE' || !data.msg) return;
      this.handleMessage(data.msg, false, messageHandler);
    });
    this.ws.on('DIRECT_MESSAGE', (data: { eventType?: string; eventId?: string; msg?: Record<string, unknown> }) => {
      if (data.eventType !== 'DIRECT_MESSAGE_CREATE' || !data.msg) return;
      this.handleMessage(data.msg, true, messageHandler);
    });
    this.ws.on('READY', () => {
      logger.info('🟢 QQ 频道 WebSocket 已连接');
    });
    this.ws.on('ERROR', (err: unknown) => {
      logger.warn('QQ WS 错误', err);
    });

    this.ws.connect(botConfig);
  }

  private handleMessage(
    msg: Record<string, unknown>,
    isDirect: boolean,
    messageHandler: (data: unknown) => Promise<void>
  ): void {
    const messageId = String(msg.id ?? '');
    const content = String(msg.content ?? '').trim();
    const author = msg.author as Record<string, unknown> | undefined;
    const authorId = author ? String(author.id ?? '') : '';
    const authorName = author ? String(author.username ?? '') : '';
    const channelId = String(msg.channel_id ?? '');
    const guildId = String(msg.guild_id ?? '');
    if (!messageId) return;
    if (this.messageToTarget.size >= MAX_CACHE) {
      const first = this.messageToTarget.keys().next().value;
      if (first) this.messageToTarget.delete(first);
    }
    this.messageToTarget.set(messageId, { channelId, guildId, isDirect });
    const chatId = isDirect ? guildId : channelId;
    messageHandler({
      messageId,
      chatId,
      senderId: authorId,
      senderName: authorName || undefined,
      text: content,
      chatType: isDirect ? 'p2p' : 'group',
    }).catch((err) => logger.error('QQ handler 错误', err));
  }

  private getClient(): NonNullable<typeof this.client> {
    if (!this.client) throw new Error('QQ client 未初始化');
    return this.client;
  }

  async reply(messageId: string, text: string): Promise<void> {
    const cached = this.messageToTarget.get(messageId);
    if (!cached) {
      logger.warn('QQ: 未知 messageId，无法回复');
      return;
    }
    const client = this.getClient();
    const body = { content: text, msg_id: messageId };
    if (cached.isDirect) {
      await client.directMessageApi.postDirectMessage(cached.guildId, body).catch((err) => {
        logger.warn('QQ 私信回复失败', err);
      });
    } else {
      await client.messageApi.postMessage(cached.channelId, body).catch((err) => {
        logger.warn('QQ 频道消息回复失败', err);
      });
    }
  }

  async send(chatId: string, chatIdType: string, title: string, content: string): Promise<void> {
    const text = title ? `${title}\n\n${content}` : content;
    const client = this.getClient();
    if (chatIdType === 'private' || chatIdType === 'p2p') {
      await client.directMessageApi.postDirectMessage(chatId, { content: text }).catch((err) => {
        logger.warn('QQ 私信发送失败', err);
      });
    } else {
      await client.messageApi.postMessage(chatId, { content: text }).catch((err) => {
        logger.warn('QQ 频道消息发送失败', err);
      });
    }
  }
}

export const qq = new QqGateway();
