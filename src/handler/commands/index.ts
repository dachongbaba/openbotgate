import type { CommandHandler } from '../types';
import { run as help } from './help';
import { run as status } from './status';
import { run as tasks, cancel } from './tasks';
import { run as sync } from './sync';
import { run as async } from './async';
import { run as opencode } from './opencode';
import { run as claude } from './claude';
import { run as git } from './git';
import { run as newConversation } from './new';

/**
 * Command registry: maps command name to handler
 */
export const commands: Record<string, CommandHandler> = {
  '/help': help,
  '/status': status,
  '/tasks': tasks,
  '/cancel': cancel,
  '/sync': sync,
  '/async': async,
  '/opencode': opencode,
  '/claudecode': claude,
  '/git': git,
  '/new': newConversation,
};

/**
 * Get command handler by name
 */
export function getCommand(cmd: string): CommandHandler | undefined {
  return commands[cmd];
}
