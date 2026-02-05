import * as dotenv from 'dotenv';

dotenv.config();

/** 最大允许执行超时（毫秒），避免 OpenCode 等命令长时间挂起导致用户等待过久 */
export const MAX_EXECUTION_TIMEOUT_MS = 180000; // 3 minutes

export interface BotConfig {
  feishu: {
    appId: string;
    appSecret: string;
    verificationToken?: string;
    // Domain: "feishu" for China, "lark" for international
    domain: 'feishu' | 'lark';
  };
  server: {
    host: string;
    port: number;
  };
  opencode: {
    // URL of opencode serve (start with: opencode serve --port 14096)
    serverUrl: string;
  };
  execution: {
    timeout: number;
    opencodeTimeout?: number; // optional; overrides timeout for opencode only
    maxOutputLength: number;
  };
  supportedTools: {
    opencode: boolean;
    claudeCode: boolean;
    shell: boolean;
    git: boolean;
  };
}

export function loadConfig(): BotConfig {
  return {
    feishu: {
      appId: process.env.FEISHU_APP_ID || '',
      appSecret: process.env.FEISHU_APP_SECRET || '',
      verificationToken: process.env.FEISHU_VERIFICATION_TOKEN,
      domain: (process.env.FEISHU_DOMAIN as 'feishu' | 'lark') || 'feishu',
    },
    server: {
      host: process.env.SERVER_HOST || '0.0.0.0',
      port: parseInt(process.env.SERVER_PORT || '3000', 10),
    },
    opencode: {
      serverUrl: process.env.OPENCODE_SERVER_URL || 'http://127.0.0.1:14096',
    },
    execution: {
      timeout: Math.min(
        parseInt(process.env.EXECUTION_TIMEOUT || '120000', 10),
        MAX_EXECUTION_TIMEOUT_MS
      ),
      opencodeTimeout: process.env.OPENCODE_TIMEOUT
        ? Math.min(
            parseInt(process.env.OPENCODE_TIMEOUT, 10),
            MAX_EXECUTION_TIMEOUT_MS
          )
        : undefined,
      maxOutputLength: parseInt(process.env.MAX_OUTPUT_LENGTH || '10000', 10),
    },
    supportedTools: {
      opencode: process.env.TOOL_OPENCODE_ENABLED !== 'false',
      claudeCode: process.env.TOOL_CLAUDE_CODE_ENABLED !== 'false',
      shell: process.env.TOOL_SHELL_ENABLED === 'true',
      git: process.env.TOOL_GIT_ENABLED === 'true',
    },
  };
}

export const config = loadConfig();
