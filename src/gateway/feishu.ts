import logger from '../utils/logger';
import * as Lark from '@larksuiteoapi/node-sdk';
import { config } from '../config/config';
import type { IGateway } from './types';

// Custom logger adapter for Feishu SDK (filter verbose messages)
let wsReady = false;
const sdkLogger = {
  debug: () => {},  // Suppress debug
  trace: () => {},  // Suppress trace
  info: (...args: any[]) => {
    const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ');
    // Mark ready when any "ready" message from SDK
    if (!wsReady && (msg.includes('ready') || msg.includes('connected'))) {
      wsReady = true;
      logger.info('🟢 Feishu WS ready');
    }
    // Filter out verbose/duplicate SDK messages
    if (msg.includes('event-dispatch')) return;
    if (msg.includes('client ready')) return;
    if (msg.includes('receive events')) return;
  },
  warn: (...args: any[]) => { logger.warn(`[feishu] ${args.join(' ')}`); },
  error: (...args: any[]) => { logger.error(`[feishu] ${args.join(' ')}`); },
};

const NAME_CACHE_MAX = 2000;

export class FeishuGateway implements IGateway {
  readonly id = 'feishu';
  private client?: Lark.Client;
  private eventDispatcher?: Lark.EventDispatcher;
  private userNames = new Map<string, string>();
  private chatNames = new Map<string, string>();

  start(messageHandler: (data: unknown) => Promise<void>): void {
    this.startWebSocketConnection(messageHandler as (data: any) => Promise<void>);
  }

  async reply(messageId: string, text: string): Promise<void> {
    return this.replyToMessage(messageId, text);
  }

  async send(chatId: string, chatIdType: string, title: string, content: string): Promise<void> {
    return this.sendRichTextMessage(chatId, chatIdType, title, content);
  }

  /** Lazy init client on first use */
  private getClient(): Lark.Client {
    if (!this.client) {
      this.client = new Lark.Client({
        appId: config.feishu.appId,
        appSecret: config.feishu.appSecret,
        appType: Lark.AppType.SelfBuild,
        domain: config.feishu.domain === 'lark' ? Lark.Domain.Lark : Lark.Domain.Feishu,
        logger: sdkLogger,
      });
    }
    return this.client;
  }

  registerMessageHandler(handler: (data: any) => Promise<void>) {
    if (!this.eventDispatcher) {
      this.eventDispatcher = new Lark.EventDispatcher({
        verificationToken: config.feishu.verificationToken || '',
        logger: sdkLogger,
      } as any);
    }
    this.eventDispatcher.register({
      'im.message.receive_v1': async (data) => {
        await handler(data);
      },
    });
  }

  getEventDispatcher(): Lark.EventDispatcher | undefined {
    return this.eventDispatcher;
  }

  async sendTextMessage(receiveId: string, receiveIdType: string, text: string): Promise<void> {
    try {
      await this.getClient().im.message.create({
        params: {
          receive_id_type: receiveIdType as any,
        },
        data: {
          receive_id: receiveId,
          msg_type: 'text',
          content: JSON.stringify({ text }),
        },
      });
    } catch (error) {
      logger.error('Failed to send text message:', error);
      throw error;
    }
  }

  async sendRichTextMessage(
    receiveId: string,
    receiveIdType: string,
    title: string,
    content: string
  ): Promise<void> {
    try {
      const postContent = {
        zh_cn: {
          title: title,
          content: [
            [
              {
                tag: 'text',
                text: content,
              },
            ],
          ],
        },
      };

      await this.getClient().im.message.create({
        params: {
          receive_id_type: receiveIdType as any,
        },
        data: {
          receive_id: receiveId,
          msg_type: 'post',
          content: JSON.stringify(postContent),
        },
      });
    } catch (error) {
      logger.error('Failed to send rich text message:', error);
      throw error;
    }
  }

  async replyToMessage(messageId: string, text: string): Promise<void> {
    try {
      await this.getClient().im.message.reply({
        path: {
          message_id: messageId,
        },
        data: {
          msg_type: 'text',
          content: JSON.stringify({ text }),
        },
      });
    } catch (error) {
      logger.error('Failed to reply to message:', error);
      throw error;
    }
  }

  async getMessage(messageId: string): Promise<any> {
    try {
      const response = await this.getClient().im.message.get({
        path: {
          message_id: messageId,
        },
      });
      return response.data;
    } catch (error) {
      logger.error('Failed to get message:', error);
      throw error;
    }
  }

  /**
   * 根据 open_id 或 user_id 获取用户名称，带内存缓存。
   * 先试 open_id 再试 user_id，任一命中即返回；结果会同时写入两个 id 的缓存。
   */
  /** 用户名为空时返回的占位符 */
  private static readonly EMPTY_USER_NAME = 'null';

  async getUserName(ids: { openId?: string; userId?: string }): Promise<string> {
    const { openId, userId } = ids;
    if (!openId && !userId) return '';
    if (openId && this.userNames.get(openId) !== undefined) return this.userNames.get(openId)!;
    if (userId && this.userNames.get(userId) !== undefined) return this.userNames.get(userId)!;

    let name = '';
    if (openId) {
      try {
        const res = await this.getClient().contact.user.get({
          params: { user_id_type: 'open_id' },
          path: { user_id: openId },
        });
        name = typeof res?.data?.user?.name === 'string' ? res.data.user.name : '';
      } catch {
        name = '';
      }
      const out = name || FeishuGateway.EMPTY_USER_NAME;
      if (this.userNames.size >= NAME_CACHE_MAX) this.userNames.clear();
      this.userNames.set(openId, out);
      if (userId && userId !== openId) this.userNames.set(userId, out);
      if (name) return name;
    }
    if (userId) {
      try {
        const res = await this.getClient().contact.user.get({
          params: { user_id_type: 'user_id' },
          path: { user_id: userId },
        });
        name = typeof res?.data?.user?.name === 'string' ? res.data.user.name : '';
      } catch {
        name = '';
      }
      const out = name || FeishuGateway.EMPTY_USER_NAME;
      if (this.userNames.size >= NAME_CACHE_MAX) this.userNames.clear();
      this.userNames.set(userId, out);
      if (openId && openId !== userId) this.userNames.set(openId, out);
    }
    return name || FeishuGateway.EMPTY_USER_NAME;
  }

  /** 根据 chat_id 获取群名称，带内存缓存，失败返回空字符串 */
  async getChatName(chatId: string): Promise<string> {
    if (!chatId) return '';
    const cached = this.chatNames.get(chatId);
    if (cached !== undefined) return cached;
    try {
      const res = await this.getClient().im.chat.get({
        path: { chat_id: chatId },
      });
      const name = typeof res?.data?.name === 'string' ? res.data.name : '';
      if (this.chatNames.size >= NAME_CACHE_MAX) this.chatNames.clear();
      this.chatNames.set(chatId, name);
      return name;
    } catch {
      this.chatNames.set(chatId, '');
      return '';
    }
  }

  startWebSocketConnection(messageHandler: (data: any) => Promise<void>): void {
    logger.info('🔌 Connecting to Feishu WebSocket...');
    
    const wsClient = new Lark.WSClient({
      appId: config.feishu.appId,
      appSecret: config.feishu.appSecret,
      domain: config.feishu.domain === 'lark' ? Lark.Domain.Lark : Lark.Domain.Feishu,
      loggerLevel: Lark.LoggerLevel.info,
      logger: sdkLogger,
    });

    wsClient.start({
      eventDispatcher: new Lark.EventDispatcher({ logger: sdkLogger } as any).register({
        'im.message.receive_v1': async (data) => {
          await messageHandler(data);
        },
      }),
    });
  }
}

export const feishu = new FeishuGateway();
