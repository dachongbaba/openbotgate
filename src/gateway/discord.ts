import { Client, Events, GatewayIntentBits, Message, TextChannel } from 'discord.js';
import logger from '../utils/logger';
import { config } from '../config/config';
import type { IGateway } from './types';

const MAX_MESSAGE_CACHE = 5000;

export class DiscordGateway implements IGateway {
  readonly id = 'discord';
  private client: Client | null = null;
  private messageToChannel = new Map<string, { channelId: string }>();

  private getClient(): Client {
    if (!this.client) {
      const token = config.discord?.token;
      if (!token) throw new Error('Discord bot token not set (DISCORD_BOT_TOKEN)');
      this.client = new Client({
        intents: [
          GatewayIntentBits.Guilds,
          GatewayIntentBits.GuildMessages,
          GatewayIntentBits.DirectMessages,
          GatewayIntentBits.MessageContent,
        ],
      });
    }
    return this.client;
  }

  start(messageHandler: (data: unknown) => Promise<void>): void {
    const client = this.getClient();
    client.once(Events.ClientReady, () => logger.info('🟢 Discord bot ready'));
    client.on(Events.MessageCreate, async (message: Message) => {
      if (message.author.bot) return;
      const messageId = message.id;
      const channelId = message.channelId;
      if (this.messageToChannel.size >= MAX_MESSAGE_CACHE) {
        const first = this.messageToChannel.keys().next().value;
        if (first) this.messageToChannel.delete(first);
      }
      this.messageToChannel.set(messageId, { channelId });
      await messageHandler({
        messageId,
        chatId: channelId,
        senderId: message.author.id,
        senderName: message.author.username || undefined,
        chatType: message.guildId ? 'group' : 'p2p',
        text: message.content,
      });
    });
    const token = config.discord?.token;
    if (!token) throw new Error('Discord bot token not set (DISCORD_BOT_TOKEN)');
    client.login(token).catch((err: unknown) => logger.error('Discord login failed', err));
  }

  async reply(messageId: string, text: string): Promise<void> {
    const cached = this.messageToChannel.get(messageId);
    if (!cached || !this.client) return;
    const channel = await this.client.channels.fetch(cached.channelId);
    if (!channel?.isTextBased()) return;
    await (channel as TextChannel).send({
      content: text,
      reply: { messageReference: { messageId } } as any,
    });
  }

  async send(chatId: string, _chatIdType: string, title: string, content: string): Promise<void> {
    const text = title ? `**${title}**\n\n${content}` : content;
    const channel = await this.getClient().channels.fetch(chatId);
    if (!channel?.isTextBased()) return;
    await (channel as TextChannel).send({ content: text });
  }
}

export const discord = new DiscordGateway();
