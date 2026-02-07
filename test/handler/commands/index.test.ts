import { commands, getCommand } from '../../../src/handler/commands';

describe('commands registry', () => {
  it('contains all expected static commands (no /git; shell commands resolved in getCommand)', () => {
    const expectedCommands = [
      '/help',
      '/status',
      '/tasks',
      '/cancel',
      '/code',
      '/new',
      '/model',
      '/session',
      '/agent',
      '/workspace',
    ];

    for (const cmd of expectedCommands) {
      expect(commands[cmd]).toBeDefined();
    }
  });

  it('getCommand returns handler for valid command', () => {
    const handler = getCommand('/help');

    expect(handler).toBeDefined();
    expect(typeof handler).toBe('function');
  });

  it('getCommand returns handler for allowed shell command (e.g. /git)', () => {
    const handler = getCommand('/git');

    expect(handler).toBeDefined();
    expect(typeof handler).toBe('function');
  });

  it('getCommand returns undefined for invalid command', () => {
    const handler = getCommand('/nonexistent');

    expect(handler).toBeUndefined();
  });
});
