import type { CommandContext } from '../../../src/handler/types';
import { run as runCode, executePrompt } from '../../../src/handler/commands/code';
import { sessionManager } from '../../../src/runtime/sessionManager';
import { toolRegistry } from '../../../src/runtime/tools/registry';

jest.mock('../../../src/utils/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    writeRawToFile: jest.fn(),
  },
  formatDuration: jest.fn(() => '0ms'),
}));

jest.mock('../../../src/runtime/streamHandler', () => ({
  createStreamHandler: jest.fn(() => ({ onOutput: jest.fn(), complete: jest.fn().mockResolvedValue(undefined) })),
}));

function mockCtx(overrides: Partial<CommandContext> = {}): CommandContext {
  return {
    senderId: 'user-1',
    chatId: 'chat-1',
    messageId: 'msg-1',
    chatType: 'p2p',
    command: 'code',
    args: '',
    reply: jest.fn().mockResolvedValue(undefined),
    send: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe('code command', () => {
  describe('run', () => {
    it('replies current tool and available list when no args', async () => {
      const ctx = mockCtx({ args: '' });
      await runCode(ctx);
      expect(ctx.reply).toHaveBeenCalledTimes(1);
      const msg = (ctx.reply as jest.Mock).mock.calls[0][0];
      expect(msg).toMatch(/Current tool|Available tools|Usage/);
    });

    it('replies unknown tool when tool name not found', async () => {
      const ctx = mockCtx({ args: 'unknown_tool_xyz' });
      await runCode(ctx);
      expect(ctx.reply).toHaveBeenCalledWith(expect.stringMatching(/Unknown tool.*unknown_tool_xyz/));
    });

    it('switches tool when args is tool name only', async () => {
      const adapter = toolRegistry.getByCommand('opencode');
      if (!adapter) {
        return;
      }
      const ctx = mockCtx({ args: 'opencode' });
      await runCode(ctx);
      expect(ctx.reply).toHaveBeenCalledWith(expect.stringContaining('Switched to'));
      const session = sessionManager.getSession(ctx.senderId);
      expect(session.tool).toBe(adapter.name);
    });

    it('one-shot executes when args has tool and prompt', async () => {
      const ctx = mockCtx({ args: 'opencode "hello world"' });
      await runCode(ctx);
      expect(ctx.reply).toHaveBeenCalled();
    });
  });

  describe('executePrompt', () => {
    it('replies usage when prompt empty', async () => {
      const ctx = mockCtx();
      await executePrompt(ctx, '');
      expect(ctx.reply).toHaveBeenCalledWith(expect.stringContaining('Send a message') || expect.stringContaining('one-shot'));
    });

    it('replies tool not available when current tool not in registry', async () => {
      sessionManager.updateSession('user-code-unavailable', { tool: 'nonexistent_tool_xyz' });
      const ctx = mockCtx({ senderId: 'user-code-unavailable' });
      await executePrompt(ctx, 'do something');
      expect(ctx.reply).toHaveBeenCalledWith(expect.stringMatching(/not available|switch tools/));
    });
  });
});
