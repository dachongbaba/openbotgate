/** Throttle interval for streaming output (ms) */
const STREAM_THROTTLE_MS = 1000;

/**
 * Creates a throttled stream handler that batches output and sends periodically.
 * Used when streaming tool output to a reply callback (e.g. Feishu reply).
 */
export function createStreamHandler(reply: (text: string) => Promise<void>) {
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
