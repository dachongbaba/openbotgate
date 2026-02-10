import type { CommandContext } from '../../../src/handler/types';
import { run as runModel } from '../../../src/handler/code/model';
import type { ToolAdapter } from '../../../src/runtime/tools/base';

jest.mock('../../../src/utils/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

const mockGet = jest.fn();
jest.mock('../../../src/runtime/tools/registry', () => ({
  toolRegistry: {
    get: (name: string) => mockGet(name),
    getByCommand: () => undefined,
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
  },
}));

function stubAdapter(overrides: Partial<ToolAdapter> = {}): ToolAdapter {
  return {
    name: 'stub',
    commandName: 'stub',
    displayName: 'Stub',
    capabilities: {
      session: false,
      model: true,
      agent: false,
      compact: false,
      listModels: true,
      listSessions: false,
      listAgents: false,
    },
    execute: jest.fn().mockResolvedValue({ tool: 'stub', success: true, output: '', duration: 0 }),
    listModels: jest.fn().mockResolvedValue(['gpt-4', 'gpt-3.5']),
    listSessions: jest.fn().mockResolvedValue([]),
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
    command: 'model',
    args: '',
    reply: jest.fn().mockResolvedValue(undefined),
    send: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe('model command', () => {
  beforeEach(() => {
    mockGet.mockReset();
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

  it('replies not available when adapter missing', async () => {
    mockGet.mockReturnValue(undefined);
    const ctx = mockCtx();
    await runModel(ctx);
    expect(ctx.reply).toHaveBeenCalledWith(expect.stringContaining('not available'));
  });

  it('resets model when args is reset', async () => {
    const adapter = stubAdapter();
    mockGet.mockReturnValue(adapter);
    const ctx = mockCtx({ args: 'reset' });
    await runModel(ctx);
    expect(ctx.reply).toHaveBeenCalledWith(expect.stringContaining('reset to default'));
  });

  it('sets model when args provided and adapter supports model', async () => {
    const adapter = stubAdapter();
    mockGet.mockReturnValue(adapter);
    const ctx = mockCtx({ args: 'gpt-4' });
    await runModel(ctx);
    expect(ctx.reply).toHaveBeenCalledWith(expect.stringContaining('gpt-4'));
  });

  it('replies does not support model when no capability', async () => {
    const adapter = stubAdapter({ capabilities: { ...stubAdapter().capabilities, model: false } });
    mockGet.mockReturnValue(adapter);
    const ctx = mockCtx({ args: 'gpt-4' });
    await runModel(ctx);
    expect(ctx.reply).toHaveBeenCalledWith(expect.stringContaining('does not support model'));
  });

  it('replies current model when adapter does not list models', async () => {
    const adapter = stubAdapter({ capabilities: { ...stubAdapter().capabilities, listModels: false } });
    mockGet.mockReturnValue(adapter);
    const ctx = mockCtx({ args: '' });
    await runModel(ctx);
    expect(ctx.reply).toHaveBeenCalledWith(expect.stringMatching(/current model|does not support listing/));
  });

  it('replies model list when adapter lists models', async () => {
    const adapter = stubAdapter();
    mockGet.mockReturnValue(adapter);
    const ctx = mockCtx({ args: '' });
    await runModel(ctx);
    expect(ctx.reply).toHaveBeenCalledWith(expect.stringContaining('gpt-4'));
  });

  it('replies no models found when list empty', async () => {
    const adapter = stubAdapter({ listModels: jest.fn().mockResolvedValue([]) });
    mockGet.mockReturnValue(adapter);
    const ctx = mockCtx({ args: '' });
    await runModel(ctx);
    expect(ctx.reply).toHaveBeenCalledWith(expect.stringMatching(/No models found/));
  });
});
