import type { CommandHandler } from '../types';
import { config } from '../../config/config';
import { run as help } from './help';
import { run as status } from './status';
import { run as tasks, cancel } from './tasks';
import { run as code } from './code';
import { createShellHandler } from './shell';
import { run as newConversation } from '../code/new';
import { run as model } from '../code/model';
import { run as session } from '../code/session';
import { run as agent } from '../code/agent';
import { run as workspace } from '../code/workspace';

/**
 * Command registry: maps command name to handler (static commands only; shell commands resolved in getCommand)
 */
export const commands: Record<string, CommandHandler> = {
  '/help': help,
  '/status': status,
  '/tasks': tasks,
  '/cancel': cancel,
  '/new': newConversation,
  '/code': code,
  '/model': model,
  '/session': session,
  '/agent': agent,
  '/workspace': workspace,
};

/**
 * Get command handler by name. If not in static map, checks config.allowedShellCommands and returns generic shell handler.
 */
export function getCommand(cmd: string): CommandHandler | undefined {
  const staticHandler = commands[cmd];
  if (staticHandler) return staticHandler;

  const name = cmd.replace(/^\//, '').toLowerCase();
  if (config.allowedShellCommands.includes(name)) return createShellHandler(name);

  return undefined;
}
