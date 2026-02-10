import * as path from 'path';

const mockExistsSync = jest.fn();
const mockReadFileSync = jest.fn();

jest.mock('fs', () => {
  const actual = jest.requireActual<typeof import('fs')>('fs');
  return {
    ...actual,
    existsSync: (p: Parameters<typeof actual.existsSync>[0]) => mockExistsSync(p),
    readFileSync: (p: Parameters<typeof actual.readFileSync>[0], ...args: unknown[]) =>
      mockReadFileSync(p, ...args),
  };
});

describe('config', () => {
  beforeEach(() => {
    jest.resetModules();
    mockExistsSync.mockReset();
    mockReadFileSync.mockReset();
  });

  describe('loadConfig / config (module load)', () => {
    it('returns default config when no config file exists', () => {
      mockExistsSync.mockReturnValue(false);
      jest.isolateModules(() => {
        const mod = require('../../src/config/config');
        const c = mod.config;
        expect(c.gateway.type).toBe('feishu');
        expect(c.execution.timeout).toBe(120000);
        expect(c.execution.maxOutputLength).toBe(10000);
        expect(c.allowedCodeTools).toContain('opencode');
        expect(c.allowedShellCommands).toEqual(['git', 'pwd']);
        expect(c.codeToolOverrides).toEqual({});
        expect(c.shellCommandOverrides).toEqual({});
        expect(c.log).toEqual({ level: 'info', dir: 'logs', maxSize: '20m', maxFiles: '14d' });
      });
    });

    it('merges YAML config with defaults', () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue('gateway:\n  type: telegram\n');
      jest.isolateModules(() => {
        const mod = require('../../src/config/config');
        const c = mod.config;
        expect(c.gateway.type).toBe('telegram');
        expect(c.execution.timeout).toBe(120000);
      });
    });

    it('merges JSON config with defaults', () => {
      mockExistsSync.mockImplementation((p: unknown) => path.basename(String(p)) === 'openbotgate.json');
      mockReadFileSync.mockImplementation((p: unknown) => {
        if (String(p).endsWith('openbotgate.json')) return JSON.stringify({ gateway: { type: 'discord' } });
        return '';
      });
      jest.isolateModules(() => {
        const mod = require('../../src/config/config');
        const c = mod.config;
        expect(c.gateway.type).toBe('discord');
      });
    });

    it('caps execution.timeout at MAX_EXECUTION_TIMEOUT_MS', () => {
      const maxTimeout = 180000;
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(
        `execution:\n  timeout: ${maxTimeout + 10000}\n`
      );
      jest.isolateModules(() => {
        const mod = require('../../src/config/config');
        const c = mod.config;
        expect(c.execution.timeout).toBe(mod.MAX_EXECUTION_TIMEOUT_MS);
        expect(mod.MAX_EXECUTION_TIMEOUT_MS).toBe(180000);
      });
    });

    it('merges log config from YAML', () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue('log:\n  level: debug\n  dir: /var/log/obg\n');
      jest.isolateModules(() => {
        const mod = require('../../src/config/config');
        const c = mod.config;
        expect(c.log.level).toBe('debug');
        expect(c.log.dir).toBe('/var/log/obg');
        expect(c.log.maxSize).toBe('20m');
        expect(c.log.maxFiles).toBe('14d');
      });
    });

    it('respects config file order: openbotgate.yml first', () => {
      const calls: string[] = [];
      mockExistsSync.mockImplementation((p: unknown) => {
        const name = path.basename(String(p));
        calls.push(name);
        return name === 'openbotgate.yml';
      });
      mockReadFileSync.mockReturnValue('gateway:\n  type: feishu\n');
      jest.isolateModules(() => {
        require('../../src/config/config');
        expect(calls[0]).toBe('openbotgate.yml');
      });
    });

    it('uses openbotgate.yaml when yml does not exist', () => {
      mockExistsSync.mockImplementation((p: unknown) => path.basename(String(p)) === 'openbotgate.yaml');
      mockReadFileSync.mockReturnValue('gateway:\n  type: feishu\n');
      jest.isolateModules(() => {
        const mod = require('../../src/config/config');
        expect(mod.config.gateway.type).toBe('feishu');
      });
    });

    it('parses YAML with null load as empty merge', () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue('---\n');
      jest.isolateModules(() => {
        const mod = require('../../src/config/config');
        expect(mod.config.gateway.type).toBe('feishu');
      });
    });

    it('mergeDeep merges nested objects', () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(`
execution:
  timeout: 60000
  maxOutputLength: 5000
log:
  level: warn
`);
      jest.isolateModules(() => {
        const mod = require('../../src/config/config');
        expect(mod.config.execution.timeout).toBe(60000);
        expect(mod.config.execution.maxOutputLength).toBe(5000);
        expect(mod.config.log.level).toBe('warn');
        expect(mod.config.log.dir).toBe('logs');
      });
    });
  });

  describe('MAX_EXECUTION_TIMEOUT_MS', () => {
    it('is 180000', () => {
      jest.isolateModules(() => {
        const mod = require('../../src/config/config');
        expect(mod.MAX_EXECUTION_TIMEOUT_MS).toBe(180000);
      });
    });
  });
});
