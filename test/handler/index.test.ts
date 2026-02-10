import type { IGateway } from '../../src/gateway/types';
import type { ParsedEvent } from '../../src/handler/types';
import { buildContextAndProcess, processCommand } from '../../src/handler/index';

jest.mock('../../src/utils/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

const mockReply = jest.fn().mockResolvedValue(undefined);
const mockSend = jest.fn().mockResolvedValue(undefined);

function mockGateway(id: string): IGateway {
  return {
    id,
    reply: mockReply,
    send: mockSend,
    start: jest.fn().mockResolvedValue(undefined),
  };
}

function parsedEvent(overrides: Partial<ParsedEvent> = {}): ParsedEvent {
  return {
    messageId: `msg-${Date.now()}-${Math.random()}`,
    chatId: 'chat-1',
    senderId: 'user-1',
    channel: 'feishu',
    text: '/help',
    messageType: 'text',
    chatType: 'p2p',
    ...overrides,
  };
}

describe('handler', () => {
  beforeEach(() => {
    mockReply.mockClear();
    mockSend.mockClear();
  });

  describe('processCommand', () => {
    it('sends help content for /help', async () => {
      const gateway = mockGateway('feishu');
      const ctx = {
        senderId: 'user-1',
        chatId: 'chat-1',
        messageId: 'msg-1',
        chatType: 'p2p' as const,
        command: '',
        args: '',
        reply: (text: string) => gateway.reply('msg-1', text),
        send: (title: string, content: string) => gateway.send('chat-1', 'chat_id', title, content),
      };
      await processCommand(ctx, '/help');
      expect(mockSend).toHaveBeenCalled();
      const [, , title, content] = mockSend.mock.calls[0];
      expect(title).toContain('Help');
      expect(content.toLowerCase()).toMatch(/help|command|available/);
    });

    it('replies Unknown command for unknown command', async () => {
      const gateway = mockGateway('feishu');
      const ctx = {
        senderId: 'user-1',
        chatId: 'chat-1',
        messageId: 'msg-1',
        chatType: 'p2p' as const,
        command: '',
        args: '',
        reply: (text: string) => gateway.reply('msg-1', text),
        send: (title: string, content: string) => gateway.send('chat-1', 'chat_id', title, content),
      };
      await processCommand(ctx, '/nonexistent');
      expect(mockReply).toHaveBeenCalledWith('msg-1', expect.stringContaining('Unknown command'));
      expect(mockReply.mock.calls[0][1]).toContain('/help');
    });
  });

  describe('buildContextAndProcess', () => {
    it('invokes processCommand and send for /help', async () => {
      const gateway = mockGateway('feishu');
      const event = parsedEvent({ text: '/help' });
      await buildContextAndProcess(gateway, event);
      await Promise.resolve();
      await Promise.resolve();
      expect(mockSend).toHaveBeenCalled();
    });

    it('skips processCommand on duplicate messageId (dedup)', async () => {
      const gateway = mockGateway('feishu');
      const messageId = `dedup-${Date.now()}`;
      const event = parsedEvent({ messageId, text: '/help' });

      await buildContextAndProcess(gateway, event);
      await Promise.resolve();
      await Promise.resolve();
      const countAfterFirst = mockSend.mock.calls.length;
      expect(countAfterFirst).toBeGreaterThan(0);

      await buildContextAndProcess(gateway, { ...event });
      await Promise.resolve();
      expect(mockSend.mock.calls.length).toBe(countAfterFirst);
    });
  });
});
