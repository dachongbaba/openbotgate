import type { CommandContext } from '../../../src/handler/types';
import { createShellHandler } from '../../../src/handler/commands/shell';
import { config } from '../../../src/config/config';
import { taskManager } from '../../../src/runtime/taskManager';

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

function mockCtx(): CommandContext {
  return {
    senderId: 'user-1',
    chatId: 'chat-1',
    messageId: 'msg-1',
    chatType: 'p2p',
    command: 'shell',
    args: 'status',
    reply: jest.fn().mockResolvedValue(undefined),
    send: jest.fn().mockResolvedValue(undefined),
  };
}

describe('shell runShell via createShellHandler', () => {
  it('replies not in allowed when command not in config', async () => {
    const handler = createShellHandler('not_allowed_cmd_xyz');
    const ctx = mockCtx();
    await handler(ctx);
    expect(ctx.reply).toHaveBeenCalledWith(
      'Command "not_allowed_cmd_xyz" is not in allowed shell commands.'
    );
  });

  it('runs allowed command and sends result', async () => {
    if (!config.allowedShellCommands.includes('pwd')) {
      return;
    }
    const handler = createShellHandler('pwd');
    const ctx = mockCtx();
    ctx.args = '';
    await handler(ctx);
    expect(ctx.reply).toHaveBeenCalled();
    const replyArg = (ctx.reply as jest.Mock).mock.calls[0][0];
    expect(replyArg).toMatch(/pwd|Output|workspace/);
  });
});
