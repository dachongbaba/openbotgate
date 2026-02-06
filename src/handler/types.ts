/**
 * Parsed event from Feishu message
 */
export interface ParsedEvent {
  messageId: string;
  chatId: string;
  senderId: string;
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
  args: string;
  reply: (text: string) => Promise<void>;
  send: (title: string, content: string) => Promise<void>;
}

/**
 * Command handler function type
 */
export type CommandHandler = (ctx: CommandContext) => Promise<void>;
