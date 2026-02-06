import { commands, getCommand } from '../../../src/handler/commands';

describe('commands registry', () => {
  it('contains all expected commands', () => {
    const expectedCommands = [
      '/help',
      '/status',
      '/tasks',
      '/cancel',
      '/sync',
      '/async',
      '/opencode',
      '/claudecode',
      '/git',
      '/new',
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

  it('getCommand returns undefined for invalid command', () => {
    const handler = getCommand('/nonexistent');

    expect(handler).toBeUndefined();
  });
});
