import logger from '../utils/logger';
import { feishuServiceOfficial } from '../services/feishuServiceOfficial';
import { taskManagerSimple } from '../services/taskManagerSimple';

export async function handleFeishuMessageEvent(data: any): Promise<void> {
  try {
    const messageId = data.message.message_id;
    const chatId = data.message.chat_id;
    const senderId = data.sender.sender_id.open_id;
    const messageType = data.message.message_type;
    const content = data.message.content;

    // Parse message content
    let text = '';
    if (messageType === 'text') {
      const contentObj = JSON.parse(content);
      text = contentObj.text || '';
    } else if (messageType === 'post') {
      const contentObj = JSON.parse(content);
      text = extractTextFromPost(contentObj);
    }

    // Simple log like conversation flow
    logger.info(`👤 ${senderId}: ${text}`);

    // Process the message
    if (text.startsWith('/')) {
      await handleCommand(senderId, chatId, text, messageId);
    } else {
      // Handle general prompts - default to OpenCode
      await executeOpenCode(senderId, chatId, text, messageId);
    }
  } catch (error) {
    logger.error('❌ Error handling message event:', error);
    // We can't reply directly in WebSocket mode, so log the error
  }
}

function extractTextFromPost(postContent: any): string {
  let text = '';
  if (postContent && postContent.post) {
    for (const block of postContent.post.zh_cn.content) {
      for (const item of block) {
        if (item.tag === 'text') {
          text += item.text;
        }
      }
    }
  }
  return text;
}

async function handleCommand(
  senderId: string,
  chatId: string,
  command: string,
  messageId: string
): Promise<void> {
  console.log('🔧 Processing command:', command);
  
  const parts = command.split(' ');
  const cmd = parts[0].toLowerCase();
  const args = parts.slice(1).join(' ');

  switch (cmd) {
    case '/help':
      await showHelp(chatId, 'chat_id');
      break;
    case '/status':
      await showStatus(chatId, 'chat_id');
      break;
    case '/cancel':
      await cancelTask(senderId, chatId, args, messageId);
      break;
    case '/tasks':
      await listTasks(senderId, chatId, messageId);
      break;
    case '/sync':
      await executeSync(senderId, chatId, args, messageId);
      break;
    case '/async':
      await executeAsync(senderId, chatId, args, messageId);
      break;
    case '/opencode':
      await executeOpenCode(senderId, chatId, args, messageId);
      break;
    case '/claude':
      await executeClaudeCode(senderId, chatId, args, messageId);
      break;
    case '/git':
      await executeGit(senderId, chatId, args, messageId);
      break;
    case '/new':
      await startNewConversation(senderId, chatId, messageId);
      break;
    default:
      console.log('❓ Unknown command:', cmd);
      await feishuServiceOfficial.replyToMessage(
        messageId,
        `Unknown command: ${cmd}\nUse /help to see available commands.`
      );
  }
}

async function showHelp(chatId: string, chatIdType: string): Promise<void> {
  const helpText = `
*AI Code Gateway - Help*

Available Commands:

*Tool Execution:*
• \`/opencode <prompt>\` - Execute OpenCode with prompt
• \`/claude <prompt>\` - Execute Claude Code with prompt
• \`/git <command>\` - Execute Git command
• \`/shell <command>\` - Execute Shell command (if enabled)

*Execution Mode:*
• \`/sync <tool> <command>\` - Execute synchronously, wait for result
• \`/async <tool> <command>\` - Execute asynchronously, notify when done

*Task Management:*
• \`/status\` - Show system status
• \`/tasks\` - List your running tasks
• \`/cancel <task_id>\` - Cancel a running task
• \`/new\` - Start new conversation (clear history)

*Examples:*
• \`/opencode Write a function to calculate fibonacci\`
• \`/git status\`
• \`/sync opencode Summarize this code\`
• \`/async claude Generate unit tests for all files\`
`;

  await feishuServiceOfficial.sendRichTextMessage(chatId, chatIdType, 'AI Code Gateway Help', helpText);
}

async function showStatus(chatId: string, chatIdType: string): Promise<void> {
  const statusText = `
*AI Code Gateway - Status*

✅ Gateway is running
✅ Connected to Feishu
🟡 Task queue: Active

Use /tasks to see your running tasks.
`;

  await feishuServiceOfficial.sendRichTextMessage(chatId, chatIdType, 'System Status', statusText);
}

async function listTasks(
  senderId: string,
  chatId: string,
  messageId: string
): Promise<void> {
  const tasks = taskManagerSimple.getUserTasks(senderId);

  if (tasks.length === 0) {
    await feishuServiceOfficial.replyToMessage(messageId, 'No running tasks.');
    return;
  }

  const taskList = tasks
    .filter((t) => t.status === 'running' || t.status === 'pending')
    .map(
      (t) =>
        `• [${t.status.toUpperCase()}] ${t.tool}: ${t.command.substring(0, 50)}... (ID: ${t.id})`
    )
    .join('\n');

  await feishuServiceOfficial.replyToMessage(
    messageId,
    taskList || 'No active tasks.'
  );
}

async function cancelTask(
  senderId: string,
  chatId: string,
  taskId: string,
  messageId: string
): Promise<void> {
  const task = taskManagerSimple.getTask(taskId);

  if (!task) {
    await feishuServiceOfficial.replyToMessage(messageId, `Task ${taskId} not found.`);
    return;
  }

  if (task.userId !== senderId) {
    await feishuServiceOfficial.replyToMessage(messageId, 'You can only cancel your own tasks.');
    return;
  }

  const success = taskManagerSimple.cancelTask(taskId);

  if (success) {
    await feishuServiceOfficial.replyToMessage(messageId, `Task ${taskId} has been cancelled.`);
  } else {
    await feishuServiceOfficial.replyToMessage(messageId, `Failed to cancel task ${taskId}.`);
  }
}

async function executeSync(
  senderId: string,
  chatId: string,
  args: string,
  messageId: string
): Promise<void> {
  const [tool, ...commandParts] = args.split(' ');
  const command = commandParts.join(' ');

  if (!tool || !command) {
    await feishuServiceOfficial.replyToMessage(
      messageId,
      'Usage: /sync <tool> <command>\nExample: /sync opencode Hello'
    );
    return;
  }

  await feishuServiceOfficial.replyToMessage(messageId, `Executing ${tool} synchronously...`);

  const result = await taskManagerSimple.createTask(senderId, command, tool.toLowerCase());
  const executionResult = await taskManagerSimple.executeTask(result.id);

  if (executionResult) {
    await sendResult(executionResult, messageId);
  }
}

async function executeAsync(
  senderId: string,
  chatId: string,
  args: string,
  messageId: string
): Promise<void> {
  const [tool, ...commandParts] = args.split(' ');
  const command = commandParts.join(' ');

  if (!tool || !command) {
    await feishuServiceOfficial.replyToMessage(
      messageId,
      'Usage: /async <tool> <command>\nExample: /async opencode Complex task'
    );
    return;
  }

  await feishuServiceOfficial.replyToMessage(messageId, `Executing ${tool} asynchronously...`);

  const task = await taskManagerSimple.createTask(senderId, command, tool.toLowerCase());

  // Execute in background and notify when done
  taskManagerSimple.executeTask(task.id).then(async (result: any) => {
    if (result) {
      await feishuServiceOfficial.sendTextMessage(
        chatId,
        'chat_id',
        `✅ Task completed! ID: ${task.id}\n\nUse /tasks to view results.`
      );
    }
  });

  await feishuServiceOfficial.replyToMessage(
    messageId,
    `Task started! ID: ${task.id}\nI'll notify you when it's complete.`
  );
}

async function executeOpenCode(
  senderId: string,
  chatId: string,
  prompt: string,
  messageId: string
): Promise<void> {
  if (!prompt.trim()) {
    // In debug mode, we can't reply to Feishu, so just log
    if (process.env.DEBUG === 'true') {
      console.log('ℹ️  Usage: /opencode <prompt>\nExample: /opencode Write a hello world function');
      return;
    }
    await feishuServiceOfficial.replyToMessage(
      messageId,
      'Usage: /opencode <prompt>\nExample: /opencode Write a hello world function'
    );
    return;
  }

  // In debug mode, just log the execution
  if (process.env.DEBUG === 'true') {
    console.log('🤖 Running OpenCode...');
  } else {
    await feishuServiceOfficial.replyToMessage(messageId, '🤖 Running OpenCode...');
  }

  const result = await taskManagerSimple.createTask(senderId, prompt, 'opencode');
  const executionResult = await taskManagerSimple.executeTask(result.id);

  if (executionResult) {
    await sendResult(executionResult, messageId);
  }
}

async function executeClaudeCode(
  senderId: string,
  chatId: string,
  prompt: string,
  messageId: string
): Promise<void> {
  if (!prompt.trim()) {
    await feishuServiceOfficial.replyToMessage(
      messageId,
      'Usage: /claude <prompt>\nExample: /claude Write a unit test'
    );
    return;
  }

  await feishuServiceOfficial.replyToMessage(messageId, '🤖 Running Claude Code...');

  const result = await taskManagerSimple.createTask(senderId, prompt, 'claude-code');
  const executionResult = await taskManagerSimple.executeTask(result.id);

  if (executionResult) {
    await sendResult(executionResult, messageId);
  }
}

async function executeGit(
  senderId: string,
  chatId: string,
  command: string,
  messageId: string
): Promise<void> {
  if (!command.trim()) {
    await feishuServiceOfficial.replyToMessage(
      messageId,
      'Usage: /git <command>\nExample: /git status'
    );
    return;
  }

  await feishuServiceOfficial.replyToMessage(messageId, '🔧 Running Git...');

  const result = await taskManagerSimple.createTask(senderId, command, 'git');
  const executionResult = await taskManagerSimple.executeTask(result.id);

  if (executionResult) {
    await sendResult(executionResult, messageId);
  }
}

async function startNewConversation(
  senderId: string,
  chatId: string,
  messageId: string
): Promise<void> {
  const tasks = taskManagerSimple.getUserTasks(senderId);
  for (const task of tasks) {
    taskManagerSimple.cancelTask(task.id);
  }

  await feishuServiceOfficial.replyToMessage(
    messageId,
    '🔄 New conversation started! All previous tasks have been cleared.'
  );
}

async function sendResult(result: any, originalMessageId: string): Promise<void> {
  const output = result.success ? result.output : result.error;

  if (!output || output.trim() === '') {
    // In debug mode, just log
    if (process.env.DEBUG === 'true') {
      console.log(`ℹ️  No output from ${result.tool}.`);
      return;
    }
    await feishuServiceOfficial.replyToMessage(
      originalMessageId,
      `No output from ${result.tool}.`
    );
    return;
  }

  // Send in chunks if too long
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
      await feishuServiceOfficial.replyToMessage(originalMessageId, messageContent);
    }

    // Rate limiting
    if (i < chunks.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
}

function splitString(str: string, maxLength: number): string[] {
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
