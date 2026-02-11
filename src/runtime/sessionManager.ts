import * as fs from 'fs';
import * as path from 'path';
import logger from '../utils/logger';
import { config } from '../config/config';

/**
 * Per-user session state
 */
export interface UserSession {
  tool: string;
  sessionId: string | null;
  model: string | null;
  agent: string | null;
  cwd: string | null;
  /** When true, next code run should start a new session (no resume/continue); cleared after that run */
  newSessionRequested: boolean;
}

/**
 * Get default tool from config (first in allowedCodeTools).
 * Falls back to 'opencode' if config is empty.
 */
function getDefaultTool(): string {
  return config.allowedCodeTools[0] || 'opencode';
}

function createDefaultSession(): UserSession {
  return {
    tool: getDefaultTool(),
    sessionId: null,
    model: null,
    agent: null,
    cwd: null,
    newSessionRequested: false,
  };
}

/**
 * Manages per-user session state with JSON file persistence.
 * - In-memory Map for fast access
 * - Debounced write to data/sessions.json
 * - Loads from file on startup
 */
export class SessionManager {
  private sessions = new Map<string, UserSession>();
  private filePath: string;
  private saveTimer: NodeJS.Timeout | null = null;
  private readonly SAVE_DEBOUNCE_MS = 500;

  constructor(filePath?: string) {
    this.filePath = filePath || path.join(process.cwd(), 'data', 'sessions.json');
    this.load();
  }

  /** Get session for user, creating default if not exists */
  getSession(userId: string): UserSession {
    const existing = this.sessions.get(userId);
    if (existing) return existing;

    const session = createDefaultSession();
    this.sessions.set(userId, session);
    return session;
  }

  /** Update partial session fields */
  updateSession(userId: string, partial: Partial<UserSession>): void {
    const session = this.getSession(userId);
    Object.assign(session, partial);
    this.sessions.set(userId, session);
    this.scheduleSave();
  }

  /** Reset session to defaults (keeps tool and cwd) */
  resetSession(userId: string): void {
    const session = this.getSession(userId);
    session.sessionId = null;
    session.model = null;
    session.agent = null;
    session.newSessionRequested = false;
    this.sessions.set(userId, session);
    this.scheduleSave();
  }

  /** Mark that next code run should start a new session; clears sessionId. Does not call code tool. */
  requestNewSession(userId: string): void {
    const session = this.getSession(userId);
    session.newSessionRequested = true;
    session.sessionId = null;
    session.model = null;
    session.agent = null;
    this.sessions.set(userId, session);
    this.scheduleSave();
  }

  /** Clear the new-session mark after running code with new session. */
  clearNewSessionRequest(userId: string): void {
    const session = this.getSession(userId);
    session.newSessionRequested = false;
    this.sessions.set(userId, session);
    this.scheduleSave();
  }

  /** Full reset including tool and cwd */
  fullReset(userId: string): void {
    this.sessions.set(userId, createDefaultSession());
    this.scheduleSave();
  }

  private load(): void {
    try {
      if (!fs.existsSync(this.filePath)) {
        logger.debug('📁 No sessions file found, starting fresh');
        return;
      }

      const raw = fs.readFileSync(this.filePath, 'utf-8');
      const data = JSON.parse(raw) as Record<string, UserSession>;

      for (const [userId, session] of Object.entries(data)) {
        // Merge with defaults to handle schema changes
        this.sessions.set(userId, { ...createDefaultSession(), ...session });
      }

      logger.info(`📁 Loaded ${this.sessions.size} user sessions from ${this.filePath}`);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.warn(`⚠️ Failed to load sessions: ${msg}`);
    }
  }

  private scheduleSave(): void {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      this.save();
    }, this.SAVE_DEBOUNCE_MS);
  }

  private save(): void {
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const data: Record<string, UserSession> = {};
      for (const [userId, session] of this.sessions) {
        data[userId] = session;
      }

      fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2), 'utf-8');
      logger.debug(`💾 Saved ${this.sessions.size} user sessions`);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.error(`❌ Failed to save sessions: ${msg}`);
    }
  }
}

export const sessionManager = new SessionManager();
