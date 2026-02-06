import logger from '../utils/logger';
import * as Lark from '@larksuiteoapi/node-sdk';
import { config } from '../config/config';

export class FeishuGateway {
  private client: Lark.Client;
  private eventDispatcher: Lark.EventDispatcher;

  constructor() {
    this.client = new Lark.Client({
      appId: config.feishu.appId,
      appSecret: config.feishu.appSecret,
      appType: Lark.AppType.SelfBuild,
      domain: config.feishu.domain === 'lark' ? Lark.Domain.Lark : Lark.Domain.Feishu,
    });

    this.eventDispatcher = new Lark.EventDispatcher({
      verificationToken: config.feishu.verificationToken || '',
    });
  }

  registerMessageHandler(handler: (data: any) => Promise<void>) {
    this.eventDispatcher.register({
      'im.message.receive_v1': async (data) => {
        await handler(data);
      },
    });
  }

  getEventDispatcher(): Lark.EventDispatcher {
    return this.eventDispatcher;
  }

  async sendTextMessage(receiveId: string, receiveIdType: string, text: string): Promise<void> {
    try {
      await this.client.im.message.create({
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

      await this.client.im.message.create({
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
      await this.client.im.message.reply({
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
      const response = await this.client.im.message.get({
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
    const wsClient = new Lark.WSClient({
      appId: config.feishu.appId,
      appSecret: config.feishu.appSecret,
      domain: config.feishu.domain === 'lark' ? Lark.Domain.Lark : Lark.Domain.Feishu,
      loggerLevel: Lark.LoggerLevel.info,
    });

    wsClient.start({
      eventDispatcher: new Lark.EventDispatcher({}).register({
        'im.message.receive_v1': async (data) => {
          await messageHandler(data);
        },
      }),
    });
  }
}

export const feishu = new FeishuGateway();
