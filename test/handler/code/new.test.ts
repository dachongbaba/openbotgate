import type { CommandContext } from '../../../src/handler/types';
import { run as runNew } from '../../../src/handler/code/new';
import { sessionManager } from '../../../src/runtime/sessionManager';

jest.mock('../../../src/utils/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

function mockCtx(): CommandContext {
  return {
    senderId: 'user-new-' + Date.now(),
    chatId: 'chat-1',
    messageId: 'msg-1',
    chatType: 'p2p',
    command: 'new',
    args: '',
    reply: jest.fn().mockResolvedValue(undefined),
    send: jest.fn().mockResolvedValue(undefined),
  };
}

describe('new command', () => {
  it('requests new session and replies', async () => {
    const ctx = mockCtx();
    await runNew(ctx);
    expect(ctx.reply).toHaveBeenCalledWith(expect.stringMatching(/新会话|下次发送/));
    const session = sessionManager.getSession(ctx.senderId);
    expect(session.newSessionRequested).toBe(true);
  });
});
