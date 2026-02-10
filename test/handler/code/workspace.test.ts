import * as path from 'path';
import type { CommandContext } from '../../../src/handler/types';
import { run as runWorkspace } from '../../../src/handler/code/workspace';
import { sessionManager } from '../../../src/runtime/sessionManager';

jest.mock('../../../src/utils/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

const mockExistsSync = jest.fn();
const mockStatSync = jest.fn();
jest.mock('fs', () => {
  const actual = jest.requireActual<typeof import('fs')>('fs');
  return {
    ...actual,
    existsSync: (p: Parameters<typeof actual.existsSync>[0]) => mockExistsSync(p),
    statSync: (p: Parameters<typeof actual.statSync>[0]) => mockStatSync(p),
  };
});

function mockCtx(overrides: Partial<CommandContext> = {}): CommandContext {
  return {
    senderId: 'user-ws-' + Date.now(),
    chatId: 'chat-1',
    messageId: 'msg-1',
    chatType: 'p2p',
    command: 'workspace',
    args: '',
    reply: jest.fn().mockResolvedValue(undefined),
    send: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe('workspace command', () => {
  beforeEach(() => {
    mockExistsSync.mockReset();
    mockStatSync.mockReset();
  });

  it('replies current workspace when no args', async () => {
    const ctx = mockCtx({ args: '' });
    await runWorkspace(ctx);
    expect(ctx.reply).toHaveBeenCalledWith(expect.stringMatching(/Current workspace|default/));
  });

  it('replies reset to default when args is reset', async () => {
    const ctx = mockCtx({ args: 'reset' });
    await runWorkspace(ctx);
    expect(ctx.reply).toHaveBeenCalledWith(expect.stringContaining('reset to default'));
  });

  it('replies path does not exist when path not found', async () => {
    mockExistsSync.mockReturnValue(false);
    const ctx = mockCtx({ args: 'C:\\nonexistent_path_xyz' });
    await runWorkspace(ctx);
    expect(ctx.reply).toHaveBeenCalledWith('Path does not exist: C:\\nonexistent_path_xyz');
  });

  it('replies not a directory when path is file', async () => {
    mockExistsSync.mockReturnValue(true);
    mockStatSync.mockReturnValue({ isDirectory: () => false });
    const ctx = mockCtx({ args: __filename });
    await runWorkspace(ctx);
    expect(ctx.reply).toHaveBeenCalledWith(expect.stringContaining('not a directory'));
  });

  it('sets workspace when path is valid directory', async () => {
    const dir = path.join(process.cwd(), 'test');
    mockExistsSync.mockReturnValue(true);
    mockStatSync.mockReturnValue({ isDirectory: () => true });
    const ctx = mockCtx({ args: dir });
    await runWorkspace(ctx);
    expect(ctx.reply).toHaveBeenCalledWith(expect.stringContaining(dir));
    expect(sessionManager.getSession(ctx.senderId).cwd).toBe(dir);
    sessionManager.updateSession(ctx.senderId, { cwd: null });
  });
});
