import { CLITools } from '../../src/runtime/cliTools';
import { executor } from '../../src/runtime/executor';
import { config } from '../../src/config/config';
import { toolRegistry, registerAll } from '../../src/runtime/tools';

jest.mock('../../src/runtime/executor');
jest.mock('../../src/utils/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

const mockExecute = executor.execute as jest.MockedFunction<typeof executor.execute>;

describe('CLITools', () => {
  let cliTools: CLITools;
  let savedAllowedCodeTools: string[];
  let savedAllowedShellCommands: string[];

  beforeAll(() => {
    registerAll(toolRegistry);
  });

  beforeEach(() => {
    cliTools = new CLITools();
    jest.clearAllMocks();
    savedAllowedCodeTools = [...config.allowedCodeTools];
    savedAllowedShellCommands = [...config.allowedShellCommands];
  });

  afterEach(() => {
    config.allowedCodeTools.length = 0;
    config.allowedCodeTools.push(...savedAllowedCodeTools);
    config.allowedShellCommands.length = 0;
    config.allowedShellCommands.push(...savedAllowedShellCommands);
  });

  describe('runTool (opencode)', () => {
    it('returns error when not in allowed code tools', async () => {
      config.allowedCodeTools = config.allowedCodeTools.filter(x => x !== 'opencode');
      const result = await cliTools.runTool('opencode', 'test', {});

      expect(result.success).toBe(false);
      expect(result.error).toContain('not in allowed');
      expect(mockExecute).not.toHaveBeenCalled();
    });

    it('returns success on successful execution', async () => {
      config.allowedCodeTools = ['opencode'];
      mockExecute.mockResolvedValue({
        success: true, exitCode: 0, stdout: 'output', stderr: '', duration: 100,
      });

      const result = await cliTools.runTool('opencode', 'test', {});

      expect(result.success).toBe(true);
      expect(result.output).toBe('output');
      expect(mockExecute).toHaveBeenCalledWith(expect.stringContaining('opencode run'), expect.any(Object));
    });

    it('returns failure on failed execution', async () => {
      config.allowedCodeTools = ['opencode'];
      mockExecute.mockResolvedValue({
        success: false, exitCode: 1, stdout: '', stderr: 'error', duration: 50,
      });

      const result = await cliTools.runTool('opencode', 'test', {});

      expect(result.success).toBe(false);
      expect(result.error).toBe('error');
    });
  });

  describe('runTool (claudecode)', () => {
    it('returns error when not in allowed code tools', async () => {
      config.allowedCodeTools = config.allowedCodeTools.filter(x => x !== 'claudecode');
      const result = await cliTools.runTool('claudecode', 'test', {});

      expect(result.success).toBe(false);
      expect(result.error).toContain('not in allowed');
    });

    it('executes via adapter when allowed', async () => {
      config.allowedCodeTools = ['claudecode'];
      mockExecute.mockResolvedValue({
        success: true, exitCode: 0, stdout: 'output', stderr: '', duration: 100,
      });

      const result = await cliTools.runTool('claudecode', 'test', {});

      expect(result.success).toBe(true);
      expect(result.output).toBe('output');
    });
  });

  describe('runTool (shell)', () => {
    it('returns error when command not in allowed shell commands', async () => {
      config.allowedShellCommands = [];
      const result = await cliTools.runTool('shell', 'echo hello', {});

      expect(result.success).toBe(false);
      expect(result.error).toContain('not in allowed shell commands');
    });

    it('executes shell command when first word allowed', async () => {
      config.allowedShellCommands = ['echo', 'git'];
      mockExecute.mockResolvedValue({
        success: true, exitCode: 0, stdout: 'hello', stderr: '', duration: 10,
      });

      const result = await cliTools.runTool('shell', 'echo hello', {});

      expect(result.success).toBe(true);
      expect(mockExecute).toHaveBeenCalledWith('echo hello', expect.any(Object));
    });
  });

  describe('runTool (git)', () => {
    it('returns error when git not in allowed shell commands', async () => {
      config.allowedShellCommands = config.allowedShellCommands.filter(x => x !== 'git');
      const result = await cliTools.runTool('git', 'status', {});

      expect(result.success).toBe(false);
      expect(result.error).toContain('not in allowed shell commands');
    });

    it('prepends git to command', async () => {
      config.allowedShellCommands = ['git'];
      mockExecute.mockResolvedValue({
        success: true, exitCode: 0, stdout: 'On branch main', stderr: '', duration: 20,
      });

      const result = await cliTools.runTool('git', 'status', {});

      expect(result.success).toBe(true);
      expect(mockExecute).toHaveBeenCalledWith('git status', expect.any(Object));
    });

    it('passes options through', async () => {
      config.allowedShellCommands = ['git'];
      mockExecute.mockResolvedValue({
        success: true, exitCode: 0, stdout: '', stderr: '', duration: 10,
      });

      await cliTools.runTool('git', 'log', { workingDir: '/path' });

      expect(mockExecute).toHaveBeenCalledWith('git log', expect.objectContaining({ workingDir: '/path' }));
    });
  });
});
