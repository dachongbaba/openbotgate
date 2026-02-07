/**
 * Parsed event from Feishu message
 */
export interface ParsedEvent {
  messageId: string;
  chatId: string;
  senderId: string;
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
  command: string;
  args: string;
  reply: (text: string) => Promise<void>;
  send: (title: string, content: string) => Promise<void>;
}

/**
 * Command handler function type
 */
export type CommandHandler = (ctx: CommandContext) => Promise<void>;
