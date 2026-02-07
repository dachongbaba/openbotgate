/**
 * Parsed event from Feishu message
 */
export interface ParsedEvent {
  messageId: string;
  chatId: string;
  /** 用于会话标识，优先 open_id */
  senderId: string;
  /** open_id / user_id 分别用于 contact.user.get 不同 id_type */
  senderOpenId?: string;
  senderUserId?: string;
  senderName?: string;
  chatType?: string;  // p2p, group
  channel: string;    // feishu, lark
  text: string;
  messageType: string;
}

/**
 * Command execution context
 */
export interface CommandContext {
  senderId: string;
  chatId: string;
  messageId: string;
  /** p2p = 1-on-1, group = group chat (from Feishu chat_type) */
  chatType?: 'p2p' | 'group';
  command: string;
  args: string;
  reply: (text: string) => Promise<void>;
  send: (title: string, content: string) => Promise<void>;
}

/**
 * Command handler function type
 */
export type CommandHandler = (ctx: CommandContext) => Promise<void>;
