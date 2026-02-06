import logger, { formatDuration, truncateOutput } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';
import { cliTools, ToolResult } from './cliTools';

export interface Task {
  id: string;
  userId: string;
  command: string;
  tool: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: ToolResult;
  createdAt: Date;
  updatedAt: Date;
}

class TaskManager {
  private tasks: Map<string, Task> = new Map();
  private userTasks: Map<string, Set<string>> = new Map();
  private readonly MAX_TASKS_PER_USER = 10;
  private readonly TASK_TIMEOUT = 300000; // 5 minutes

  async createTask(userId: string, command: string, tool: string): Promise<Task> {
    const userTaskCount = this.userTasks.get(userId)?.size || 0;
    if (userTaskCount >= this.MAX_TASKS_PER_USER) {
      const oldestTask = this.userTasks.get(userId);
      if (oldestTask) {
        const firstTaskId = oldestTask.values().next().value as string;
        this.cancelTask(firstTaskId);
      }
    }

    const task: Task = {
      id: uuidv4(),
      userId,
      command,
      tool,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.tasks.set(task.id, task);

    if (!this.userTasks.has(userId)) {
      this.userTasks.set(userId, new Set());
    }
    this.userTasks.get(userId)!.add(task.id);

    // Auto cleanup after timeout
    setTimeout(() => {
      if (this.tasks.has(task.id) && this.tasks.get(task.id)!.status !== 'completed') {
        this.cancelTask(task.id);
      }
    }, this.TASK_TIMEOUT);

    return task;
  }

  async executeTask(taskId: string, onOutput?: (chunk: string) => void): Promise<ToolResult | null> {
    const task = this.tasks.get(taskId);
    if (!task) return null;

    task.status = 'running';
    task.updatedAt = new Date();

    let result: ToolResult;

    const cmdPreview = task.command.length > 50 
      ? task.command.substring(0, 50) + '...' 
      : task.command;
    logger.debug(`🚀 Executing ${task.tool}: ${cmdPreview}`);

    const streamOptions = { onOutput };

    switch (task.tool) {
      case 'opencode':
        result = await cliTools.executeOpenCode(task.command, streamOptions);
        break;
      case 'shell':
        result = await cliTools.executeShell(task.command, streamOptions);
        break;
      case 'git':
        result = await cliTools.executeGit(task.command, streamOptions);
        break;
      default:
        result = {
          tool: task.tool,
          success: false,
          output: '',
          error: `Unknown tool: ${task.tool}`,
          duration: 0,
        };
    }

    task.result = result;
    task.status = result.success ? 'completed' : 'failed';
    task.updatedAt = new Date();

    const duration = formatDuration(result.duration);
    if (result.success) {
      logger.debug(`✅ ${result.tool} completed in ${duration}`);
      logger.debug(`📤 Output: ${truncateOutput(result.output)}`);
    } else {
      logger.error(`❌ ${result.tool} failed in ${duration}: ${result.error}`);
      if (result.output) {
        logger.debug(`📤 Output: ${truncateOutput(result.output)}`);
      }
    }

    return result;
  }

  getTask(taskId: string): Task | undefined {
    return this.tasks.get(taskId);
  }

  getUserTasks(userId: string): Task[] {
    const taskIds = this.userTasks.get(userId);
    if (!taskIds) return [];

    return Array.from(taskIds)
      .map((id) => this.tasks.get(id))
      .filter((task): task is Task => task !== undefined)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  cancelTask(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task) return false;

    if (task.status === 'running') {
      task.status = 'failed';
      task.result = {
        tool: task.tool,
        success: false,
        output: '',
        error: 'Task was cancelled',
        duration: Date.now() - task.createdAt.getTime(),
      };
    } else {
      task.status = 'failed';
    }
    task.updatedAt = new Date();

    return true;
  }

  cleanup() {
    const now = Date.now();
    for (const [taskId, task] of this.tasks.entries()) {
      if (now - task.updatedAt.getTime() > this.TASK_TIMEOUT) {
        this.tasks.delete(taskId);
        this.userTasks.get(task.userId)?.delete(taskId);
      }
    }
  }
}

export const taskManager = new TaskManager();

// Periodic cleanup every minute
setInterval(() => {
  taskManager.cleanup();
}, 60000);
