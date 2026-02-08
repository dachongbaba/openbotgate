import {
  MatrixClient,
  SimpleFsStorageProvider,
  AutojoinRoomsMixin,
} from 'matrix-bot-sdk';
import * as path from 'path';
import logger from '../utils/logger';
import { config } from '../config/config';
import type { IGateway } from './types';

const MAX_MESSAGE_CACHE = 5000;

export class MatrixGateway implements IGateway {
  readonly id = 'matrix';
  private client: MatrixClient | null = null;
  private messageToRoom = new Map<string, string>();

  private getClient(): MatrixClient {
    if (!this.client) {
      const cfg = config.matrix;
      if (!cfg?.homeserverUrl || !cfg?.accessToken) {
        throw new Error('Matrix homeserver and access token required (MATRIX_HOMESERVER_URL, MATRIX_ACCESS_TOKEN)');
      }
      const storage = new SimpleFsStorageProvider(
        path.join(cfg.storagePath ?? './.matrix_storage', 'bot.json')
      );
      this.client = new MatrixClient(cfg.homeserverUrl, cfg.accessToken, storage);
      AutojoinRoomsMixin.setupOnClient(this.client);
    }
    return this.client;
  }

  start(messageHandler: (data: unknown) => Promise<void>): void {
    const client = this.getClient();
    client.on('room.message', async (roomId, event) => {
      const myId = await client.getUserId().catch(() => '');
      if (event.sender === myId) return;
      const content = event.content as { body?: string; msgtype?: string };
      if (content?.msgtype !== 'm.text' || !content?.body) return;
      const messageId = event.event_id ?? event.unsigned?.transaction_id ?? '';
      if (this.messageToRoom.size >= MAX_MESSAGE_CACHE) {
        const first = this.messageToRoom.keys().next().value;
        if (first) this.messageToRoom.delete(first);
      }
      this.messageToRoom.set(messageId, roomId);
      await messageHandler({
        messageId,
        chatId: roomId,
        senderId: event.sender ?? '',
        text: content.body,
        chatType: roomId.startsWith('!') ? 'group' : 'p2p',
      }).catch((err) => logger.error('Matrix handler error', err));
    });
    client
      .start()
      .then(() => logger.info('🟢 Matrix client started'))
      .catch((err: unknown) => logger.error('Matrix start failed', err));
  }

  async reply(messageId: string, text: string): Promise<void> {
    const roomId = this.messageToRoom.get(messageId);
    if (!roomId || !this.client) return;
    await this.client.sendMessage(roomId, { body: text, msgtype: 'm.text' });
  }

  async send(chatId: string, _chatIdType: string, title: string, content: string): Promise<void> {
    const text = title ? `${title}\n\n${content}` : content;
    await this.getClient().sendMessage(chatId, { body: text, msgtype: 'm.text' });
  }
}

export const matrix = new MatrixGateway();
