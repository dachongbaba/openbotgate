import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { SessionManager } from '../../src/runtime/sessionManager';

jest.mock('../../src/utils/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

describe('SessionManager', () => {
  let tmpDir: string;
  let manager: SessionManager;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'obg-session-test-'));
    manager = new SessionManager(path.join(tmpDir, 'sessions.json'));
  });

  afterEach(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true });
    } catch {
      // ignore
    }
  });

  describe('getSession', () => {
    it('returns default session for new user', () => {
      const session = manager.getSession('user-1');
      expect(session.tool).toBe('opencode');
      expect(session.sessionId).toBeNull();
      expect(session.model).toBeNull();
      expect(session.agent).toBeNull();
      expect(session.cwd).toBeNull();
      expect(session.newSessionRequested).toBe(false);
    });

    it('returns same reference for same userId', () => {
      const a = manager.getSession('user-1');
      const b = manager.getSession('user-1');
      expect(a).toBe(b);
    });
  });

  describe('updateSession', () => {
    it('updates session fields', () => {
      manager.updateSession('user-1', { tool: 'claudecode', model: 'claude-3' });
      const session = manager.getSession('user-1');
      expect(session.tool).toBe('claudecode');
      expect(session.model).toBe('claude-3');
    });
  });

  describe('persistence', () => {
    it('saves and loads sessions from file', async () => {
      jest.useFakeTimers();
      manager.updateSession('user-1', { tool: 'claudecode' });
      jest.advanceTimersByTime(600);
      jest.useRealTimers();

      const filePath = path.join(tmpDir, 'sessions.json');
      expect(fs.existsSync(filePath)).toBe(true);
      const raw = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(raw) as Record<string, unknown>;
      expect(data['user-1']).toBeDefined();
      expect((data['user-1'] as { tool: string }).tool).toBe('claudecode');

      const manager2 = new SessionManager(filePath);
      const session = manager2.getSession('user-1');
      expect(session.tool).toBe('claudecode');
    });
  });
});
