import logger from '../utils/logger';

const processedMessages = new Map<string, number>();
const DEDUP_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

/** Clean up old entries periodically */
function cleanupProcessedMessages(): void {
  const now = Date.now();
  for (const [id, timestamp] of processedMessages) {
    if (now - timestamp > DEDUP_WINDOW_MS) {
      processedMessages.delete(id);
    }
  }
}

/** Check if message was already processed (returns true if duplicate) */
export function isDuplicateMessage(messageId: string): boolean {
  cleanupProcessedMessages();

  if (processedMessages.has(messageId)) {
    logger.debug(`🔄 Duplicate message ignored: ${messageId}`);
    return true;
  }

  processedMessages.set(messageId, Date.now());
  return false;
}
