/**
 * Gateway abstraction: receive messages and send replies.
 * Each channel (Feishu, Telegram, etc.) implements this interface.
 */
export interface IGateway {
  readonly id: string;
  /** Start connection and register message handler (WebSocket / webhook / poll) */
  start(messageHandler: (data: unknown) => Promise<void>): void;
  /** Reply to a specific message (e.g. by message_id) */
  reply(messageId: string, text: string): Promise<void>;
  /** Send rich/formatted message to a chat (e.g. by chat_id) */
  send(chatId: string, chatIdType: string, title: string, content: string): Promise<void>;
}

export interface GatewayCatalogEntry {
  id: string;
  label: string;
  selectionLabel: string;
  /** Whether this gateway has an implementation in this project */
  implemented: boolean;
}
