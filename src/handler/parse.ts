import type { ParsedEvent } from './types';

/**
 * Parse Feishu event payload to extract message info.
 */
export function parseFeishuEvent(data: any): ParsedEvent {
  const messageId = data.message.message_id;
  const chatId = data.message.chat_id;
  const senderId = data.sender.sender_id.open_id;
  const messageType = data.message.message_type;
  const content = data.message.content;

  let text = '';
  if (messageType === 'text') {
    const contentObj = JSON.parse(content);
    text = contentObj.text || '';
  } else if (messageType === 'post') {
    const contentObj = JSON.parse(content);
    text = extractTextFromPost(contentObj);
  }

  return { messageId, chatId, senderId, text, messageType };
}

/**
 * Extract text content from Feishu post message format.
 */
function extractTextFromPost(postContent: any): string {
  let text = '';
  if (!postContent?.post?.zh_cn?.content) return text;

  for (const block of postContent.post.zh_cn.content) {
    for (const item of block) {
      if (item.tag === 'text') {
        text += item.text;
      }
    }
  }
  return text;
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
