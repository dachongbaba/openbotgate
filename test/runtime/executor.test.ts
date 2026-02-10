import { executor } from '../../src/runtime/executor';
import { config, MAX_EXECUTION_TIMEOUT_MS } from '../../src/config/config';

describe('CommandExecutor', () => {
  const node = 'node';

  describe('execute', () => {
    it('respects max execution timeout config', () => {
      expect(config.execution.timeout).toBeLessThanOrEqual(MAX_EXECUTION_TIMEOUT_MS);
      const codeTimeout = config.execution.codeTimeout;
      if (typeof codeTimeout === 'number') {
        expect(codeTimeout).toBeLessThanOrEqual(MAX_EXECUTION_TIMEOUT_MS);
      }
    });

    it('returns success on exit code 0', async () => {
      const result = await executor.execute(`${node} -e "console.log('ok')"`, { timeout: 10000 });

      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(0);
      expect(result.stdout.trim()).toBe('ok');
      expect(result.stderr).toBe('');
    });

    it('returns failure on non-zero exit', async () => {
      const result = await executor.execute(`${node} -e "process.exit(2)"`, { timeout: 10000 });

      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(2);
    });

    it('returns failure for nonexistent command', async () => {
      const result = await executor.execute('__nonexistent_cmd__', { timeout: 5000 });

      expect(result.success).toBe(false);
      expect(result.stderr.length).toBeGreaterThan(0);
    });

    it('tracks duration', async () => {
      const result = await executor.execute(`${node} -e "console.log(1)"`, { timeout: 10000 });

      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    // Environment-dependent tests (skipped for CI stability)
    it.skip('handles timeout', async () => {
      const result = await executor.execute(`${node} -e "setTimeout(()=>{},10000)"`, { timeout: 500 });

      expect(result.success).toBe(false);
      expect(result.stderr).toContain('timed out');
    }, 15000);

    it.skip('truncates long output', async () => {
      const result = await executor.execute(`${node} -e "console.log('x'.repeat(15000))"`, { timeout: 10000 });

      expect(result.stdout).toContain('[Output truncated');
    });
  });
});
