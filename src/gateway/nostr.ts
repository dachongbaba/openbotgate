/**
 * Nostr gateway: NIP-04 encrypted DMs.
 * Uses nostr-tools: connect to relays, subscribe to kind 4 (DM), decrypt and reply.
 */
import { SimplePool, nip04, finalizeEvent, getPublicKey } from 'nostr-tools';
import type { EventTemplate, Event } from 'nostr-tools';
import logger from '../utils/logger';
import { config } from '../config/config';
import type { IGateway } from './types';

const MAX_MESSAGE_CACHE = 5000;

function parseSecret(secret: string): Uint8Array {
  const s = secret.trim();
  if (s.length === 64 && /^[0-9a-fA-F]+$/.test(s)) {
    return new Uint8Array(Buffer.from(s, 'hex'));
  }
  throw new Error('NOSTR_PRIVATE_KEY must be 64-char hex string');
}

export class NostrGateway implements IGateway {
  readonly id = 'nostr';
  private pool: SimplePool | null = null;
  private secret: Uint8Array | null = null;
  private pubkey = '';
  private messageToPeer = new Map<string, string>();
  private sub: { close: (reason?: string) => void } | null = null;

  start(messageHandler: (data: unknown) => Promise<void>): void {
    const cfg = config.nostr;
    if (!cfg?.privateKey || !cfg?.relays?.length) {
      throw new Error('Nostr private key and relays required (NOSTR_PRIVATE_KEY, NOSTR_RELAYS)');
    }
    this.secret = parseSecret(cfg.privateKey);
    this.pubkey = getPublicKey(this.secret);
    this.pool = new SimplePool();
    const relays = cfg.relays;
    this.sub = this.pool.subscribe(
      relays,
      { kinds: [4], '#p': [this.pubkey] },
      {
        onevent: async (event: Event) => {
          if (event.pubkey === this.pubkey) return;
          let text = '';
          try {
            text = await nip04.decrypt(this.secret!, event.pubkey, event.content);
          } catch (e) {
            logger.warn('Nostr decrypt failed', e);
            return;
          }
          const messageId = event.id;
          const peer = event.pubkey;
          if (this.messageToPeer.size >= MAX_MESSAGE_CACHE) {
            const first = this.messageToPeer.keys().next().value;
            if (first) this.messageToPeer.delete(first);
          }
          this.messageToPeer.set(messageId, peer);
          await messageHandler({
            messageId,
            chatId: peer,
            senderId: peer,
            text,
            chatType: 'p2p',
          }).catch((err) => logger.error('Nostr handler error', err));
        },
      }
    );
    logger.info('🟢 Nostr subscribed to DMs');
  }

  private async createAndPublishDm(peerPubkey: string, text: string): Promise<void> {
    const cipher = await nip04.encrypt(this.secret!, peerPubkey, text);
    const template: EventTemplate = {
      kind: 4,
      content: cipher,
      tags: [['p', peerPubkey]],
      created_at: Math.floor(Date.now() / 1000),
    };
    const signed = finalizeEvent(template, this.secret!);
    await this.pool!.publish(config.nostr!.relays, signed);
  }

  async reply(messageId: string, text: string): Promise<void> {
    const peer = this.messageToPeer.get(messageId);
    if (!peer || !this.pool) return;
    await this.createAndPublishDm(peer, text);
  }

  async send(chatId: string, _chatIdType: string, title: string, content: string): Promise<void> {
    const text = title ? `${title}\n\n${content}` : content;
    await this.createAndPublishDm(chatId, text);
  }
}

export const nostr = new NostrGateway();
