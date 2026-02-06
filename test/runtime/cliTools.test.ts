import { CLITools } from '../../src/runtime/cliTools';
import { executor } from '../../src/runtime/executor';
import { config } from '../../src/config/config';

jest.mock('../../src/runtime/executor');
jest.mock('../../src/utils/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

const mockExecute = executor.execute as jest.MockedFunction<typeof executor.execute>;

describe('CLITools', () => {
  let cliTools: CLITools;
  let savedConfig: typeof config.supportedTools;

  beforeEach(() => {
    cliTools = new CLITools();
    jest.clearAllMocks();
    savedConfig = { ...config.supportedTools };
  });

  afterEach(() => {
    Object.assign(config.supportedTools, savedConfig);
  });

  describe('executeOpenCode', () => {
    it('returns error when disabled', async () => {
      config.supportedTools.opencode = false;
      const result = await cliTools.executeOpenCode('test');

      expect(result.success).toBe(false);
      expect(result.error).toContain('not enabled');
      expect(mockExecute).not.toHaveBeenCalled();
    });

    it('returns success on successful execution', async () => {
      config.supportedTools.opencode = true;
      mockExecute.mockResolvedValue({
        success: true, exitCode: 0, stdout: 'output', stderr: '', duration: 100,
      });

      const result = await cliTools.executeOpenCode('test');

      expect(result.success).toBe(true);
      expect(result.output).toBe('output');
      expect(mockExecute).toHaveBeenCalledWith(expect.stringContaining('opencode run'), expect.any(Object));
    });

    it('returns failure on failed execution', async () => {
      config.supportedTools.opencode = true;
      mockExecute.mockResolvedValue({
        success: false, exitCode: 1, stdout: '', stderr: 'error', duration: 50,
      });

      const result = await cliTools.executeOpenCode('test');

      expect(result.success).toBe(false);
      expect(result.error).toBe('error');
    });

    it('handles exceptions', async () => {
      config.supportedTools.opencode = true;
      mockExecute.mockRejectedValue(new Error('Network error'));

      const result = await cliTools.executeOpenCode('test');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });

    it('escapes special characters', async () => {
      config.supportedTools.opencode = true;
      mockExecute.mockResolvedValue({
        success: true, exitCode: 0, stdout: 'ok', stderr: '', duration: 10,
      });

      await cliTools.executeOpenCode('test "quoted"');

      expect(mockExecute).toHaveBeenCalledWith(expect.stringContaining('test \\"quoted\\"'), expect.any(Object));
    });
  });

  describe('executeClaudeCode', () => {
    it('returns error when disabled', async () => {
      config.supportedTools.claudeCode = false;
      const result = await cliTools.executeClaudeCode('test');

      expect(result.success).toBe(false);
      expect(result.error).toContain('not enabled');
    });

    it('executes claude command', async () => {
      config.supportedTools.claudeCode = true;
      mockExecute.mockResolvedValue({
        success: true, exitCode: 0, stdout: 'output', stderr: '', duration: 100,
      });

      const result = await cliTools.executeClaudeCode('test');

      expect(result.success).toBe(true);
      expect(mockExecute).toHaveBeenCalledWith(expect.stringContaining('claude -p'), expect.any(Object));
    });
  });

  describe('executeShell', () => {
    it('returns error when disabled (security)', async () => {
      config.supportedTools.shell = false;
      const result = await cliTools.executeShell('echo hello');

      expect(result.success).toBe(false);
      expect(result.error).toContain('security');
    });

    it('executes shell command directly', async () => {
      config.supportedTools.shell = true;
      mockExecute.mockResolvedValue({
        success: true, exitCode: 0, stdout: 'hello', stderr: '', duration: 10,
      });

      const result = await cliTools.executeShell('echo hello');

      expect(result.success).toBe(true);
      expect(mockExecute).toHaveBeenCalledWith('echo hello', expect.any(Object));
    });
  });

  describe('executeGit', () => {
    it('returns error when disabled', async () => {
      config.supportedTools.git = false;
      const result = await cliTools.executeGit('status');

      expect(result.success).toBe(false);
      expect(result.error).toContain('not enabled');
    });

    it('prepends git to command', async () => {
      config.supportedTools.git = true;
      mockExecute.mockResolvedValue({
        success: true, exitCode: 0, stdout: 'On branch main', stderr: '', duration: 20,
      });

      const result = await cliTools.executeGit('status');

      expect(result.success).toBe(true);
      expect(mockExecute).toHaveBeenCalledWith('git status', expect.any(Object));
    });

    it('passes options through', async () => {
      config.supportedTools.git = true;
      mockExecute.mockResolvedValue({
        success: true, exitCode: 0, stdout: '', stderr: '', duration: 10,
      });

      await cliTools.executeGit('log', { workingDir: '/path' });

      expect(mockExecute).toHaveBeenCalledWith('git log', { workingDir: '/path' });
    });
  });
});
