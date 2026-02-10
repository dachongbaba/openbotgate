import type { CommandContext } from '../../../src/handler/types';
import { run as runTasks, cancel as runCancel } from '../../../src/handler/commands/tasks';
import { taskManager } from '../../../src/runtime/taskManager';

jest.mock('../../../src/utils/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

function mockCtx(overrides: Partial<CommandContext> = {}): CommandContext {
  return {
    senderId: 'user-1',
    chatId: 'chat-1',
    messageId: 'msg-1',
    chatType: 'p2p',
    command: 'tasks',
    args: '',
    reply: jest.fn().mockResolvedValue(undefined),
    send: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe('tasks command', () => {
  describe('run', () => {
    it('replies no running tasks when user has none', async () => {
      const ctx = mockCtx();
      await runTasks(ctx);
      expect(ctx.reply).toHaveBeenCalledWith('No running tasks.');
    });

    it('replies task list when user has running tasks', async () => {
      const ctx = mockCtx();
      const task = await taskManager.createTask(ctx.senderId, 'git status', 'shell');
      await runTasks(ctx);
      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringMatching(new RegExp(`(RUNNING|PENDING).*${task.id}`))
      );
      taskManager.cancelTask(task.id);
    });
  });

  describe('cancel', () => {
    it('replies usage when args empty', async () => {
      const ctx = mockCtx({ args: '' });
      await runCancel(ctx);
      expect(ctx.reply).toHaveBeenCalledWith('Usage: /cancel <task_id>');
    });

    it('replies task not found for nonexistent task id', async () => {
      const ctx = mockCtx({ args: 'nonexistent-id-12345' });
      await runCancel(ctx);
      expect(ctx.reply).toHaveBeenCalledWith('Task nonexistent-id-12345 not found.');
    });

    it('replies only cancel own tasks when task belongs to another user', async () => {
      const task = await taskManager.createTask('user-1', 'git status', 'shell');
      const ctx = mockCtx({ senderId: 'other-user', args: task.id });
      await runCancel(ctx);
      expect(ctx.reply).toHaveBeenCalledWith('You can only cancel your own tasks.');
      taskManager.cancelTask(task.id);
    });

    it('replies cancelled when cancel succeeds', async () => {
      const ctx = mockCtx();
      const task = await taskManager.createTask(ctx.senderId, 'pwd', 'shell');
      const cancelCtx = mockCtx({ args: task.id });
      cancelCtx.senderId = ctx.senderId;
      await runCancel(cancelCtx);
      expect(cancelCtx.reply).toHaveBeenCalledWith(`Task ${task.id} has been cancelled.`);
    });
  });
});
