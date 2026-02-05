import { commandExecutor } from '../../src/services/commandExecutor';
import { config, MAX_EXECUTION_TIMEOUT_MS } from '../../src/config/config';

describe('CommandExecutor', () => {
  const nodeCmd = 'node';

  describe('execute', () => {
    it('config execution timeout shall not exceed max (3 min) to avoid long opencode waits', () => {
      expect(config.execution.timeout).toBeLessThanOrEqual(MAX_EXECUTION_TIMEOUT_MS);
      if (config.execution.opencodeTimeout !== undefined) {
        expect(config.execution.opencodeTimeout).toBeLessThanOrEqual(MAX_EXECUTION_TIMEOUT_MS);
      }
    });
    it('returns success and stdout when command succeeds', async () => {
      const result = await commandExecutor.execute(
        `${nodeCmd} -e "console.log('hello')"`,
        { timeout: 10000 }
      );

      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(0);
      expect(result.stdout.trim()).toBe('hello');
      expect(result.stderr).toBe('');
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    it('returns failure and stderr when command exits non-zero', async () => {
      const result = await commandExecutor.execute(
        `${nodeCmd} -e "process.exit(2)"`,
        { timeout: 10000 }
      );

      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(2);
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    it('returns failure when command does not exist', async () => {
      const result = await commandExecutor.execute('__nonexistent_cmd_xyz__', {
        timeout: 5000,
      });

      expect(result.success).toBe(false);
      expect(result.exitCode).not.toBe(0);
      expect(result.stderr.length).toBeGreaterThan(0);
    });

    it('returns timeout message when process is killed by timeout', async () => {
      const timeoutMs = 300;
      const result = await commandExecutor.execute(
        `${nodeCmd} -e "setTimeout(function(){}, 10000);"`,
        { timeout: timeoutMs }
      );

      expect(result.success).toBe(false);
      expect(result.stderr).toContain(`Execution timed out after ${timeoutMs}ms`);
      expect(result.duration).toBeGreaterThanOrEqual(timeoutMs - 50);
    });

    it('uses options.timeout over config default', async () => {
      const result = await commandExecutor.execute(
        `${nodeCmd} -e "console.log('ok')"`,
        { timeout: 60000 }
      );
      expect(result.success).toBe(true);
    });

    it('truncates stdout when exceeding maxOutputLength', async () => {
      const result = await commandExecutor.execute(
        `${nodeCmd} -e "console.log(Array(50001).join('x'))"`,
        { timeout: 10000 }
      );

      expect(result.success).toBe(true);
      expect(result.stdout).toContain('[Output truncated - too long to display]');
    });
  });
});
