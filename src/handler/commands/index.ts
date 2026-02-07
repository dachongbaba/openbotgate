import type { CommandHandler } from '../types';
import { run as help } from './help';
import { run as status } from './status';
import { run as tasks, cancel } from './tasks';
import { run as sync } from './sync';
import { run as async } from './async';
import { run as opencode } from './opencode';
import { run as git } from './git';
import { run as newConversation } from './new';
import { run as code } from './code';
import { run as model } from './model';
import { run as session } from './session';
import { run as agent } from './agent';
import { run as workspace } from './workspace';

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
  '/git': git,
  '/new': newConversation,
  '/code': code,
  '/model': model,
  '/session': session,
  '/agent': agent,
  '/workspace': workspace,
};

/**
 * Get command handler by name
 */
export function getCommand(cmd: string): CommandHandler | undefined {
  return commands[cmd];
}
