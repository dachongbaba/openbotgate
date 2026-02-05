import { CLITools } from '../../src/services/cliTools';
import { commandExecutor } from '../../src/services/commandExecutor';
import { config } from '../../src/config/config';

// Mock dependencies
jest.mock('../../src/services/commandExecutor');
jest.mock('../../src/utils/logger', () => {
  const mockLogger = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  };
  return {
    __esModule: true,
    default: mockLogger,
  };
});

const mockExecute = commandExecutor.execute as jest.MockedFunction<
  typeof commandExecutor.execute
>;

describe('CLITools', () => {
  let cliTools: CLITools;
  let originalConfig: typeof config.supportedTools;

  beforeEach(() => {
    cliTools = new CLITools();
    jest.clearAllMocks();
    // Save original config
    originalConfig = { ...config.supportedTools };
  });

  afterEach(() => {
    // Restore original config
    Object.assign(config.supportedTools, originalConfig);
  });

  describe('executeOpenCode', () => {
    it('returns error when opencode is disabled in config', async () => {
      config.supportedTools.opencode = false;

      const result = await cliTools.executeOpenCode('test prompt');

      expect(result.success).toBe(false);
      expect(result.tool).toBe('opencode');
      expect(result.error).toBe('opencode tool is not enabled in configuration');
      expect(result.duration).toBe(0);
      expect(mockExecute).not.toHaveBeenCalled();
    });

    it('returns success when command executes successfully', async () => {
      config.supportedTools.opencode = true;
      mockExecute.mockResolvedValue({
        success: true,
        exitCode: 0,
        stdout: 'Hello from opencode',
        stderr: '',
        duration: 100,
      });

      const result = await cliTools.executeOpenCode('test prompt');

      expect(result.success).toBe(true);
      expect(result.tool).toBe('opencode');
      expect(result.output).toBe('Hello from opencode');
      expect(result.error).toBeUndefined();
      expect(mockExecute).toHaveBeenCalledWith(
        expect.stringContaining('opencode run'),
        expect.any(Object)
      );
    });

    it('returns failure when command fails', async () => {
      config.supportedTools.opencode = true;
      mockExecute.mockResolvedValue({
        success: false,
        exitCode: 1,
        stdout: 'partial output',
        stderr: 'error message',
        duration: 50,
      });

      const result = await cliTools.executeOpenCode('test prompt');

      expect(result.success).toBe(false);
      expect(result.tool).toBe('opencode');
      expect(result.output).toBe('partial output');
      expect(result.error).toBe('error message');
    });

    it('handles exceptions gracefully', async () => {
      config.supportedTools.opencode = true;
      mockExecute.mockRejectedValue(new Error('Network error'));

      const result = await cliTools.executeOpenCode('test prompt');

      expect(result.success).toBe(false);
      expect(result.tool).toBe('opencode');
      expect(result.error).toBe('Network error');
    });

    it('escapes special characters in prompt', async () => {
      config.supportedTools.opencode = true;
      mockExecute.mockResolvedValue({
        success: true,
        exitCode: 0,
        stdout: 'ok',
        stderr: '',
        duration: 10,
      });

      await cliTools.executeOpenCode('test "quoted" & special | chars');

      expect(mockExecute).toHaveBeenCalledWith(
        expect.stringContaining('test \\"quoted\\"'),
        expect.any(Object)
      );
    });
  });

  describe('executeClaudeCode', () => {
    it('returns error when claudeCode is disabled in config', async () => {
      config.supportedTools.claudeCode = false;

      const result = await cliTools.executeClaudeCode('test prompt');

      expect(result.success).toBe(false);
      expect(result.tool).toBe('claude-code');
      expect(result.error).toBe('claude-code tool is not enabled in configuration');
      expect(mockExecute).not.toHaveBeenCalled();
    });

    it('returns success when command executes successfully', async () => {
      config.supportedTools.claudeCode = true;
      mockExecute.mockResolvedValue({
        success: true,
        exitCode: 0,
        stdout: 'Hello from claude',
        stderr: '',
        duration: 100,
      });

      const result = await cliTools.executeClaudeCode('test prompt');

      expect(result.success).toBe(true);
      expect(result.tool).toBe('claude-code');
      expect(result.output).toBe('Hello from claude');
      expect(mockExecute).toHaveBeenCalledWith(
        expect.stringContaining('claude -p'),
        expect.any(Object)
      );
    });
  });

  describe('executeShell', () => {
    it('returns error when shell is disabled in config', async () => {
      config.supportedTools.shell = false;

      const result = await cliTools.executeShell('echo hello');

      expect(result.success).toBe(false);
      expect(result.tool).toBe('shell');
      expect(result.error).toBe(
        'Shell execution is not enabled in configuration (security risk)'
      );
      expect(mockExecute).not.toHaveBeenCalled();
    });

    it('returns success when command executes successfully', async () => {
      config.supportedTools.shell = true;
      mockExecute.mockResolvedValue({
        success: true,
        exitCode: 0,
        stdout: 'hello',
        stderr: '',
        duration: 10,
      });

      const result = await cliTools.executeShell('echo hello');

      expect(result.success).toBe(true);
      expect(result.tool).toBe('shell');
      expect(result.output).toBe('hello');
      expect(mockExecute).toHaveBeenCalledWith('echo hello', expect.any(Object));
    });

    it('returns failure with stderr when command fails', async () => {
      config.supportedTools.shell = true;
      mockExecute.mockResolvedValue({
        success: false,
        exitCode: 1,
        stdout: '',
        stderr: 'command not found',
        duration: 5,
      });

      const result = await cliTools.executeShell('invalid_command');

      expect(result.success).toBe(false);
      expect(result.error).toBe('command not found');
    });
  });

  describe('executeGit', () => {
    it('returns error when git is disabled in config', async () => {
      config.supportedTools.git = false;

      const result = await cliTools.executeGit('status');

      expect(result.success).toBe(false);
      expect(result.tool).toBe('git');
      expect(result.error).toBe('Git execution is not enabled in configuration');
      expect(mockExecute).not.toHaveBeenCalled();
    });

    it('returns success and prepends git to command', async () => {
      config.supportedTools.git = true;
      mockExecute.mockResolvedValue({
        success: true,
        exitCode: 0,
        stdout: 'On branch main',
        stderr: '',
        duration: 20,
      });

      const result = await cliTools.executeGit('status');

      expect(result.success).toBe(true);
      expect(result.tool).toBe('git');
      expect(result.output).toBe('On branch main');
      expect(mockExecute).toHaveBeenCalledWith('git status', expect.any(Object));
    });

    it('passes options to commandExecutor', async () => {
      config.supportedTools.git = true;
      mockExecute.mockResolvedValue({
        success: true,
        exitCode: 0,
        stdout: '',
        stderr: '',
        duration: 10,
      });

      await cliTools.executeGit('log', { workingDir: '/custom/path' });

      expect(mockExecute).toHaveBeenCalledWith('git log', {
        workingDir: '/custom/path',
      });
    });
  });
});
