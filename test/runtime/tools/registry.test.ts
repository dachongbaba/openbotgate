import { toolRegistry, registerAll } from '../../../src/runtime/tools';
import { config } from '../../../src/config/config';

jest.mock('../../../src/utils/logger', () => ({
  __esModule: true,
  default: { debug: jest.fn(), info: jest.fn(), error: jest.fn(), warn: jest.fn(), writeRawToFile: jest.fn() },
}));

describe('ToolRegistry', () => {
  let savedAllowed: string[];

  beforeAll(() => {
    registerAll(toolRegistry);
    savedAllowed = [...config.allowedCodeTools];
  });

  afterAll(() => {
    config.allowedCodeTools.length = 0;
    config.allowedCodeTools.push(...savedAllowed);
  });

  it('get returns adapter by internal name', () => {
    const a = toolRegistry.get('opencode');
    expect(a).toBeDefined();
    expect(a?.name).toBe('opencode');
  });

  it('get returns undefined for unknown name', () => {
    expect(toolRegistry.get('unknown_xyz')).toBeUndefined();
  });

  it('getByCommand returns adapter by command name', () => {
    const a = toolRegistry.getByCommand('opencode');
    expect(a).toBeDefined();
    expect(a?.commandName).toBe('opencode');
  });

  it('getByCommand returns adapter for claude (claudecode)', () => {
    const a = toolRegistry.getByCommand('claude');
    expect(a).toBeDefined();
    expect(a?.name).toBe('claudecode');
  });

  it('list returns all registered adapters', () => {
    const list = toolRegistry.list();
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBeGreaterThan(0);
    expect(list.some((t) => t.name === 'opencode')).toBe(true);
  });

  it('getEnabled filters by config.allowedCodeTools', () => {
    const prev = [...config.allowedCodeTools];
    config.allowedCodeTools = ['opencode'];
    const enabled = toolRegistry.getEnabled();
    expect(enabled.length).toBeGreaterThanOrEqual(1);
    expect(enabled.every((t) => t.name === 'opencode')).toBe(true);
    config.allowedCodeTools.length = 0;
    config.allowedCodeTools.push(...prev);
  });
});
