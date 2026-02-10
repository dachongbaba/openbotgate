import type { CommandContext } from '../../../src/handler/types';
import { run as runHelp } from '../../../src/handler/commands/help';
import { run as runStatus } from '../../../src/handler/commands/status';

jest.mock('../../../src/utils/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

function mockCtx(): CommandContext {
  return {
    senderId: 'user-1',
    chatId: 'chat-1',
    messageId: 'msg-1',
    chatType: 'p2p',
    command: 'help',
    args: '',
    reply: jest.fn().mockResolvedValue(undefined),
    send: jest.fn().mockResolvedValue(undefined),
  };
}

describe('commands run()', () => {
  describe('help', () => {
    it('calls send with help title and content', async () => {
      const ctx = mockCtx();
      await runHelp(ctx);
      expect(ctx.send).toHaveBeenCalledTimes(1);
      const [title, content] = (ctx.send as jest.Mock).mock.calls[0];
      expect(title).toContain('Help');
      expect(content).toMatch(/\/code|\/status|\/tasks|Tip/);
    });
  });

  describe('status', () => {
    it('calls send with status title and content', async () => {
      const ctx = mockCtx();
      await runStatus(ctx);
      expect(ctx.send).toHaveBeenCalledTimes(1);
      const [title, content] = (ctx.send as jest.Mock).mock.calls[0];
      expect(title).toContain('Status');
      expect(content).toMatch(/Gateway|running|tasks/);
    });
  });
});
