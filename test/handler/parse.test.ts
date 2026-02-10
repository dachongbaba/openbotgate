import { parseFeishuEvent, parseCommand } from '../../src/handler/parse';

describe('parseFeishuEvent', () => {
  it('parses text message correctly', () => {
    const data = {
      message: {
        message_id: 'msg_123',
        chat_id: 'chat_456',
        chat_type: 'p2p',
        message_type: 'text',
        content: JSON.stringify({ text: 'hello world' }),
      },
      sender: {
        sender_id: { open_id: 'user_789', name: '张三' },
      },
    };

    const result = parseFeishuEvent(data);

    expect(result.messageId).toBe('msg_123');
    expect(result.chatId).toBe('chat_456');
    expect(result.senderId).toBe('user_789');
    expect(result.senderName).toBe('张三');
    expect(result.chatType).toBe('p2p');
    expect(result.channel).toBe('feishu');
    expect(result.text).toBe('hello world');
    expect(result.messageType).toBe('text');
  });

  it('uses custom channel name', () => {
    const data = {
      message: {
        message_id: 'msg_123',
        chat_id: 'chat_456',
        message_type: 'text',
        content: JSON.stringify({ text: 'test' }),
      },
      sender: {
        sender_id: { open_id: 'user_789' },
      },
    };

    const result = parseFeishuEvent(data, 'lark');

    expect(result.channel).toBe('lark');
  });

  it('parses post message and extracts text', () => {
    const data = {
      message: {
        message_id: 'msg_123',
        chat_id: 'chat_456',
        message_type: 'post',
        content: JSON.stringify({
          post: {
            zh_cn: {
              content: [
                [{ tag: 'text', text: 'first ' }, { tag: 'text', text: 'second' }],
                [{ tag: 'text', text: ' third' }],
              ],
            },
          },
        }),
      },
      sender: {
        sender_id: { open_id: 'user_789' },
      },
    };

    const result = parseFeishuEvent(data);

    expect(result.text).toBe('first second third');
  });

  it('returns empty text for unsupported message type', () => {
    const data = {
      message: {
        message_id: 'msg_123',
        chat_id: 'chat_456',
        message_type: 'image',
        content: '{}',
      },
      sender: {
        sender_id: { open_id: 'user_789' },
      },
    };

    const result = parseFeishuEvent(data);

    expect(result.text).toBe('');
  });

  it('handles empty post content', () => {
    const data = {
      message: {
        message_id: 'msg_123',
        chat_id: 'chat_456',
        message_type: 'post',
        content: JSON.stringify({}),
      },
      sender: {
        sender_id: { open_id: 'user_789' },
      },
    };

    const result = parseFeishuEvent(data);

    expect(result.text).toBe('');
  });

  it('uses sender_id.user_id when open_id is empty', () => {
    const data = {
      message: {
        message_id: 'msg_123',
        chat_id: 'chat_456',
        message_type: 'text',
        content: JSON.stringify({ text: 'hi' }),
      },
      sender: {
        sender_id: { user_id: 'uid_999' },
      },
    };
    const result = parseFeishuEvent(data);
    expect(result.senderId).toBe('uid_999');
    expect(result.senderUserId).toBe('uid_999');
  });

  it('post with no zh_cn content returns empty text', () => {
    const data = {
      message: {
        message_id: 'msg_123',
        chat_id: 'chat_456',
        message_type: 'post',
        content: JSON.stringify({ post: {} }),
      },
      sender: { sender_id: { open_id: 'u1' } },
    };
    const result = parseFeishuEvent(data);
    expect(result.text).toBe('');
  });

  it('post with empty content array returns empty text', () => {
    const data = {
      message: {
        message_id: 'msg_123',
        chat_id: 'chat_456',
        message_type: 'post',
        content: JSON.stringify({ post: { zh_cn: { content: [] } } }),
      },
      sender: { sender_id: { open_id: 'u1' } },
    };
    const result = parseFeishuEvent(data);
    expect(result.text).toBe('');
  });

  it('post block item without tag text is skipped', () => {
    const data = {
      message: {
        message_id: 'msg_123',
        chat_id: 'chat_456',
        message_type: 'post',
        content: JSON.stringify({
          post: {
            zh_cn: {
              content: [[{ tag: 'at', user_id: 'x' }, { tag: 'text', text: 'hello' }]],
            },
          },
        }),
      },
      sender: { sender_id: { open_id: 'u1' } },
    };
    const result = parseFeishuEvent(data);
    expect(result.text).toBe('hello');
  });

  it('text message with empty contentObj.text returns empty', () => {
    const data = {
      message: {
        message_id: 'msg_123',
        chat_id: 'chat_456',
        message_type: 'text',
        content: JSON.stringify({}),
      },
      sender: { sender_id: { open_id: 'u1' } },
    };
    const result = parseFeishuEvent(data);
    expect(result.text).toBe('');
  });

  it('sender without sender_id.name leaves senderName empty', () => {
    const data = {
      message: {
        message_id: 'msg_123',
        chat_id: 'chat_456',
        message_type: 'text',
        content: JSON.stringify({ text: 'x' }),
      },
      sender: { sender_id: { open_id: 'u1' } },
    };
    const result = parseFeishuEvent(data);
    expect(result.senderName).toBe('');
  });
});

describe('parseCommand', () => {
  it('parses command with args', () => {
    const result = parseCommand('/opencode write hello world');

    expect(result.cmd).toBe('/opencode');
    expect(result.args).toBe('write hello world');
  });

  it('parses command without args', () => {
    const result = parseCommand('/help');

    expect(result.cmd).toBe('/help');
    expect(result.args).toBe('');
  });

  it('converts command to lowercase', () => {
    const result = parseCommand('/HELP');

    expect(result.cmd).toBe('/help');
  });

  it('handles multiple spaces in args', () => {
    const result = parseCommand('/opencode   multiple   spaces');

    expect(result.cmd).toBe('/opencode');
    expect(result.args).toBe('  multiple   spaces');
  });
});
