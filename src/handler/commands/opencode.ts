import type { CommandContext } from '../types';
import { taskManager } from '../../runtime/taskManager';
import logger, { formatDuration } from '../../utils/logger';

/** Throttle interval for streaming output (ms) */
const STREAM_THROTTLE_MS = 1000;

/**
 * Creates a throttled stream handler that batches output and sends periodically
 */
function createStreamHandler(reply: (text: string) => Promise<void>) {
  let buffer = '';
  let lastSendTime = 0;
  let pendingTimeout: NodeJS.Timeout | null = null;

  const flush = async () => {
    if (buffer) {
      const content = buffer;
      buffer = '';
      lastSendTime = Date.now();
      await reply(content).catch(() => {}); // Ignore reply errors
    }
  };

  const onOutput = (chunk: string) => {
    buffer += (buffer ? '\n' : '') + chunk;
    
    const now = Date.now();
    const timeSinceLastSend = now - lastSendTime;
    
    // If enough time has passed, send immediately
    if (timeSinceLastSend >= STREAM_THROTTLE_MS) {
      if (pendingTimeout) {
        clearTimeout(pendingTimeout);
        pendingTimeout = null;
      }
      flush();
    } else if (!pendingTimeout) {
      // Schedule a send for when the throttle window expires
      pendingTimeout = setTimeout(() => {
        pendingTimeout = null;
        flush();
      }, STREAM_THROTTLE_MS - timeSinceLastSend);
    }
  };

  // Flush any remaining content
  const complete = async () => {
    if (pendingTimeout) {
      clearTimeout(pendingTimeout);
      pendingTimeout = null;
    }
    await flush();
  };

  return { onOutput, complete };
}

export async function run(ctx: CommandContext): Promise<void> {
  const prompt = ctx.args.trim();

  if (!prompt) {
    if (process.env.DEBUG === 'true') {
      logger.debug('Usage: /opencode <prompt>\nExample: /opencode Write a hello world function');
      return;
    }
    logger.info('💬 Reply: Usage: /opencode <prompt>');
    await ctx.reply('Usage: /opencode <prompt>\nExample: /opencode Write a hello world function');
    return;
  }

  // Step 1: Immediate acknowledgment
  if (process.env.DEBUG === 'true') {
    logger.debug('Running OpenCode...');
  } else {
    logger.info('🚀 Running OpenCode...');
    // await ctx.reply('🤖 Running OpenCode...');
  }

  // Step 2: Execute with streaming output
  const streamHandler = createStreamHandler(ctx.reply);
  const task = await taskManager.createTask(ctx.senderId, prompt, 'opencode');
  const result = await taskManager.executeTask(task.id, streamHandler.onOutput);

  // Step 3: Flush remaining output
  await streamHandler.complete();

  // Step 4: Send completion status
  if (result) {
    const duration = formatDuration(result.duration);
    if (result.success) {
      logger.info(`✅ OpenCode 完成 (${duration})`);
      // await ctx.reply(`✅ *OpenCode 完成* (${duration})`);
    } else {
      logger.info(`❌ OpenCode 失败 (${duration})`);
      // await ctx.reply(`❌ *OpenCode 失败* (${duration})\n${result.error || 'Unknown error'}`);
    }
  }
}
