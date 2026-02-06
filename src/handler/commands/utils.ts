import type { ToolResult } from '../../runtime/cliTools';

/**
 * Format and send execution result
 */
export async function sendResult(
  result: ToolResult,
  reply: (text: string) => Promise<void>
): Promise<void> {
  const output = result.success ? result.output : result.error;

  if (!output || output.trim() === '') {
    if (process.env.DEBUG === 'true') {
      console.log(`ℹ️  No output from ${result.tool}.`);
      return;
    }
    await reply(`No output from ${result.tool}.`);
    return;
  }

  const maxLength = 8000;
  const chunks = splitString(output, maxLength);

  for (let i = 0; i < chunks.length; i++) {
    const prefix = i === 0
      ? `📦 *${result.tool} Output* (${result.duration}ms)\n\n`
      : '';

    const messageContent = prefix + chunks[i];

    if (process.env.DEBUG === 'true') {
      console.log(messageContent);
    } else {
      await reply(messageContent);
    }

    // Rate limiting
    if (i < chunks.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
}

/**
 * Split string into chunks at newline boundaries
 */
export function splitString(str: string, maxLength: number): string[] {
  const chunks: string[] = [];
  let remaining = str;

  while (remaining.length > 0) {
    if (remaining.length <= maxLength) {
      chunks.push(remaining);
      break;
    }

    let splitIndex = remaining.lastIndexOf('\n', maxLength);
    if (splitIndex === -1) {
      splitIndex = maxLength;
    }

    chunks.push(remaining.substring(0, splitIndex));
    remaining = remaining.substring(splitIndex + 1);
  }

  return chunks;
}
