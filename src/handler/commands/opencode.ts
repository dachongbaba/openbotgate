import type { CommandContext } from '../types';
import { toolRegistry } from '../../runtime/tools/registry';
import { sessionManager } from '../../runtime/sessionManager';
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
      await reply(content).catch(() => {});
    }
  };

  const onOutput = (chunk: string) => {
    buffer += (buffer ? '\n' : '') + chunk;

    const now = Date.now();
    const timeSinceLastSend = now - lastSendTime;

    if (timeSinceLastSend >= STREAM_THROTTLE_MS) {
      if (pendingTimeout) {
        clearTimeout(pendingTimeout);
        pendingTimeout = null;
      }
      flush();
    } else if (!pendingTimeout) {
      pendingTimeout = setTimeout(() => {
        pendingTimeout = null;
        flush();
      }, STREAM_THROTTLE_MS - timeSinceLastSend);
    }
  };

  const complete = async () => {
    if (pendingTimeout) {
      clearTimeout(pendingTimeout);
      pendingTimeout = null;
    }
    await flush();
  };

  return { onOutput, complete };
}

/**
 * Generic prompt executor.
 * Uses the user's current tool from SessionManager, executes prompt with session/model/agent.
 * Called by /opencode, default message handler, and /code one-shot.
 */
export async function executePrompt(
  ctx: CommandContext,
  prompt: string,
  toolNameOverride?: string
): Promise<void> {
  if (!prompt) {
    logger.info('💬 Reply: Usage: send a prompt to execute');
    await ctx.reply('Usage: /opencode <prompt>\nOr just send a message directly.');
    return;
  }

  const session = sessionManager.getSession(ctx.senderId);
  const toolName = toolNameOverride || session.tool;
  const adapter = toolRegistry.get(toolName);

  if (!adapter) {
    await ctx.reply(`Tool "${toolName}" is not available. Use /code to switch tools.`);
    return;
  }

  logger.info(`🚀 Running ${adapter.displayName}...`);

  const streamHandler = createStreamHandler(ctx.reply);
  const result = await adapter.execute(prompt, {
    sessionId: session.sessionId ?? undefined,
    model: session.model ?? undefined,
    agent: session.agent ?? undefined,
    cwd: session.cwd ?? undefined,
    onOutput: streamHandler.onOutput,
  });

  await streamHandler.complete();

  // Capture session ID for future continuation
  if (result.sessionId) {
    sessionManager.updateSession(ctx.senderId, { sessionId: result.sessionId });
  }

  const duration = formatDuration(result.duration);
  if (result.success) {
    logger.info(`✅ ${adapter.displayName} 完成 (${duration})`);
  } else {
    logger.info(`❌ ${adapter.displayName} 失败 (${duration})`);
  }
}

/**
 * /opencode command handler - delegates to executePrompt
 */
export async function run(ctx: CommandContext): Promise<void> {
  await executePrompt(ctx, ctx.args.trim(), 'opencode');
}
