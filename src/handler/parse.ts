import type { ParsedEvent } from './types';

/** Feishu im.message.receive_v1 event payload (minimal shape used by parse). */
export interface FeishuMessageEvent {
  message: {
    message_id: string;
    chat_id: string;
    chat_type: string;
    message_type: string;
    content: string;
  };
  sender: {
    sender_id?: {
      open_id?: string;
      user_id?: string;
      name?: string;
    };
  };
}

/** Feishu post content structure (post.zh_cn.content blocks). */
interface FeishuPostContent {
  post?: {
    zh_cn?: {
      content?: Array<Array<{ tag?: string; text?: string }>>;
    };
  };
}

/**
 * Parse Feishu event payload to extract message info.
 */
export function parseFeishuEvent(data: unknown, channel = 'feishu'): ParsedEvent {
  const d = data as FeishuMessageEvent;
  const messageId = d.message.message_id;
  const chatId = d.message.chat_id;
  const senderOpenId = d.sender.sender_id?.open_id || '';
  const senderUserId = d.sender.sender_id?.user_id || '';
  const senderId = senderOpenId || senderUserId;
  const chatType = d.message.chat_type; // p2p, group
  const messageType = d.message.message_type;
  const content = d.message.content;

  const senderName = d.sender.sender_id?.name ?? '';

  const text =
    messageType === 'text'
      ? ((JSON.parse(content) as { text?: string }).text ?? '')
      : messageType === 'post'
        ? extractTextFromPost(JSON.parse(content) as FeishuPostContent)
        : '';

  return {
    messageId,
    chatId,
    senderId,
    senderOpenId: senderOpenId || undefined,
    senderUserId: senderUserId || undefined,
    senderName,
    chatType,
    channel,
    text,
    messageType,
  };
}

/**
 * Extract text content from Feishu post message format.
 */
function extractTextFromPost(postContent: FeishuPostContent): string {
  const content = postContent?.post?.zh_cn?.content;
  if (!content) return '';
  return content
    .flatMap((block) => block.filter((item) => item.tag === 'text').map((item) => item.text ?? ''))
    .join('');
}

/**
 * Parse command string into command name and arguments.
 */
export function parseCommand(text: string): { cmd: string; args: string } {
  const parts = text.split(' ');
  const cmd = parts[0].toLowerCase();
  const args = parts.slice(1).join(' ');
  return { cmd, args };
}
