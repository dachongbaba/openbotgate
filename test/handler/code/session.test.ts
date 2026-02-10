import type { CommandContext } from '../../../src/handler/types';
import { run as runSession } from '../../../src/handler/code/session';
import type { ToolAdapter } from '../../../src/runtime/tools/base';

jest.mock('../../../src/utils/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

const mockGet = jest.fn();
const mockGetByCommand = jest.fn();
jest.mock('../../../src/runtime/tools/registry', () => ({
  toolRegistry: {
    get: (name: string) => mockGet(name),
    getByCommand: (cmd: string) => mockGetByCommand(cmd),
    list: () => [],
    getEnabled: () => [],
    register: () => {},
  },
}));

jest.mock('../../../src/runtime/sessionManager', () => ({
  sessionManager: {
    getSession: jest.fn(() => ({
      tool: 'stub',
      sessionId: null,
      model: null,
      agent: null,
      cwd: null,
      newSessionRequested: false,
    })),
    updateSession: jest.fn(),
    requestNewSession: jest.fn(),
    clearNewSessionRequest: jest.fn(),
  },
}));

function stubAdapter(overrides: Partial<ToolAdapter> = {}): ToolAdapter {
  return {
    name: 'stub',
    commandName: 'stub',
    displayName: 'Stub',
    capabilities: {
      session: true,
      model: false,
      agent: false,
      compact: false,
      listModels: false,
      listSessions: true,
      listAgents: false,
    },
    execute: jest.fn().mockResolvedValue({ tool: 'stub', success: true, output: '', duration: 0 }),
    listModels: jest.fn().mockResolvedValue([]),
    listSessions: jest.fn().mockResolvedValue([{ id: 's1', title: 'Session 1', updatedAt: '2020-01-01' }]),
    listAgents: jest.fn().mockResolvedValue([]),
    buildCommand: jest.fn().mockReturnValue('stub'),
    ...overrides,
  };
}

function mockCtx(overrides: Partial<CommandContext> = {}): CommandContext {
  return {
    senderId: 'user-1',
    chatId: 'chat-1',
    messageId: 'msg-1',
    chatType: 'p2p',
    command: 'session',
    args: '',
    reply: jest.fn().mockResolvedValue(undefined),
    send: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe('session command', () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockGetByCommand.mockReset();
    const { sessionManager } = require('../../../src/runtime/sessionManager');
    sessionManager.getSession.mockReturnValue({
      tool: 'stub',
      sessionId: null,
      model: null,
      agent: null,
      cwd: null,
      newSessionRequested: false,
    });
  });

  it('replies current tool not available when adapter missing', async () => {
    mockGet.mockReturnValue(undefined);
    const ctx = mockCtx();
    await runSession(ctx);
    expect(ctx.reply).toHaveBeenCalledWith(expect.stringContaining('not available'));
  });

  it('switches session when args provided and adapter supports session', async () => {
    const adapter = stubAdapter();
    mockGet.mockReturnValue(adapter);
    const ctx = mockCtx({ args: 'session-id-123' });
    await runSession(ctx);
    expect(ctx.reply).toHaveBeenCalledWith(expect.stringContaining('session-id-123'));
  });

  it('replies does not support session management when no capability', async () => {
    const adapter = stubAdapter({ capabilities: { ...stubAdapter().capabilities, session: false } });
    mockGet.mockReturnValue(adapter);
    const ctx = mockCtx({ args: 'sid' });
    await runSession(ctx);
    expect(ctx.reply).toHaveBeenCalledWith(expect.stringContaining('does not support session'));
  });

  it('replies current session when adapter does not list sessions', async () => {
    const adapter = stubAdapter({ capabilities: { ...stubAdapter().capabilities, listSessions: false } });
    mockGet.mockReturnValue(adapter);
    const ctx = mockCtx({ args: '' });
    await runSession(ctx);
    expect(ctx.reply).toHaveBeenCalledWith(expect.stringMatching(/current session|does not support listing/));
  });

  it('replies session list when adapter lists sessions', async () => {
    const adapter = stubAdapter();
    mockGet.mockReturnValue(adapter);
    const ctx = mockCtx({ args: '' });
    await runSession(ctx);
    expect(ctx.reply).toHaveBeenCalledWith(expect.stringContaining('s1'));
    expect(ctx.reply).toHaveBeenCalledWith(expect.stringContaining('Session 1'));
  });

  it('replies no sessions found when list empty', async () => {
    const adapter = stubAdapter({ listSessions: jest.fn().mockResolvedValue([]) });
    mockGet.mockReturnValue(adapter);
    const ctx = mockCtx({ args: '' });
    await runSession(ctx);
    expect(ctx.reply).toHaveBeenCalledWith(expect.stringMatching(/No sessions found|current/));
  });
});
