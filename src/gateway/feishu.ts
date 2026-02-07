import logger from '../utils/logger';
import * as Lark from '@larksuiteoapi/node-sdk';
import { config } from '../config/config';

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

export class FeishuGateway {
  private client?: Lark.Client;
  private eventDispatcher?: Lark.EventDispatcher;

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
