import { taskManager } from '../../src/runtime/taskManager';

// Mock cliTools to avoid actual command execution
jest.mock('../../src/runtime/cliTools', () => ({
  cliTools: {
    runTool: jest.fn().mockImplementation((tool: string) => {
      if (tool === 'opencode' || tool === 'shell' || tool === 'git') {
        return Promise.resolve({ tool, success: true, output: 'mocked', duration: 100 });
      }
      return Promise.resolve({
        tool,
        success: false,
        output: '',
        error: `Unknown or disallowed tool: ${tool}`,
        duration: 0,
      });
    }),
  },
}));

jest.mock('../../src/utils/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
  formatDuration: (ms: number) => `${ms}ms`,
  truncateOutput: (output: string) => output,
}));

// Helper to wait a bit between operations (50ms to ensure different timestamps)
const tick = () => new Promise(r => setTimeout(r, 50));

describe('TaskManager', () => {
  // Use unique userId per test to avoid interference
  let userId: string;

  beforeEach(() => {
    userId = `test-user-${Date.now()}-${Math.random()}`;
  });

  describe('createTask', () => {
    it('creates task with pending status', async () => {
      const task = await taskManager.createTask(userId, 'test command', 'opencode');

      expect(task.id).toBeDefined();
      expect(task.userId).toBe(userId);
      expect(task.command).toBe('test command');
      expect(task.tool).toBe('opencode');
      expect(task.status).toBe('pending');
    });

    it('tracks task in user tasks', async () => {
      const task = await taskManager.createTask(userId, 'test', 'opencode');
      const userTasks = taskManager.getUserTasks(userId);

      expect(userTasks.find(t => t.id === task.id)).toBeDefined();
    });
  });

  describe('executeTask', () => {
    it('executes task and updates status', async () => {
      const task = await taskManager.createTask(userId, 'test', 'opencode');
      const result = await taskManager.executeTask(task.id);

      expect(result).toBeDefined();
      expect(result?.success).toBe(true);
      expect(taskManager.getTask(task.id)?.status).toBe('completed');
    });

    it('returns null for nonexistent task', async () => {
      const result = await taskManager.executeTask('nonexistent-id');

      expect(result).toBeNull();
    });

    it('handles unknown tool', async () => {
      const task = await taskManager.createTask(userId, 'test', 'unknown-tool');
      const result = await taskManager.executeTask(task.id);

      expect(result?.success).toBe(false);
      expect(result?.error).toContain('Unknown or disallowed tool');
    });
  });

  describe('getTask', () => {
    it('returns task by id', async () => {
      const created = await taskManager.createTask(userId, 'test', 'opencode');
      const found = taskManager.getTask(created.id);

      expect(found?.id).toBe(created.id);
    });

    it('returns undefined for nonexistent id', () => {
      const found = taskManager.getTask('nonexistent');

      expect(found).toBeUndefined();
    });
  });

  describe('getUserTasks', () => {
    it('returns tasks sorted by creation time (newest first)', async () => {
      const first = await taskManager.createTask(userId, 'first', 'opencode');
      await tick(); // ensure different timestamps
      const second = await taskManager.createTask(userId, 'second', 'opencode');

      const tasks = taskManager.getUserTasks(userId);

      expect(tasks[0].id).toBe(second.id);
      expect(tasks[1].id).toBe(first.id);
    });

    it('returns empty array for user with no tasks', () => {
      const tasks = taskManager.getUserTasks('unknown-user');

      expect(tasks).toEqual([]);
    });
  });

  describe('cancelTask', () => {
    it('marks task as failed', async () => {
      const task = await taskManager.createTask(userId, 'test', 'opencode');
      const success = taskManager.cancelTask(task.id);

      expect(success).toBe(true);
      expect(taskManager.getTask(task.id)?.status).toBe('failed');
    });

    it('returns false for nonexistent task', () => {
      const success = taskManager.cancelTask('nonexistent');

      expect(success).toBe(false);
    });
  });
});
