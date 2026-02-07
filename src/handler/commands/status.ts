import type { CommandContext } from '../types';
import logger from '../../utils/logger';

const STATUS_TEXT = `
*AI Code Gateway - Status*

✅ Gateway is running
✅ Connected to Feishu
🟡 Task queue: Active

Use /tasks to see your running tasks.
`;

export async function run(ctx: CommandContext): Promise<void> {
  logger.info('💬 Reply: System Status');
  await ctx.send('System Status', STATUS_TEXT);
}
