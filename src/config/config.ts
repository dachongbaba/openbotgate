import * as dotenv from 'dotenv';

dotenv.config();

/** 最大允许执行超时（毫秒），避免 OpenCode 等命令长时间挂起导致用户等待过久 */
export const MAX_EXECUTION_TIMEOUT_MS = 180000; // 3 minutes

/** 默认允许的 Code 类工具（adapter name） */
const DEFAULT_ALLOWED_CODE_TOOLS = [
  'opencode',
  'cursorcode',
  'claudecode',
  'openaicodex',
  'qwencode',
  'kimicode',
  'openclaw',
  'nanobot',
];

/** 默认允许的 Shell 命令首词 */
const DEFAULT_ALLOWED_SHELL_COMMANDS = ['git', 'dir', 'ls', 'pwd'];

export interface BotConfig {
  /** Active gateway type (feishu, lark, telegram, etc.). Only feishu is implemented. */
  gateway: {
    type: string;
  };
  feishu: {
    appId: string;
    appSecret: string;
    verificationToken?: string;
    domain: 'feishu' | 'lark';
  };
  execution: {
    timeout: number;
    codeTimeout?: number;
    maxOutputLength: number;
    /** Override shell stdout/stderr encoding (e.g. gbk). When set, used instead of chcp/LANG. */
    shellOutputEncoding?: string;
  };
  /** 允许执行的 Code 类工具（adapter name 白名单） */
  allowedCodeTools: string[];
  /** 允许在 Shell 中执行的命令首词白名单 */
  allowedShellCommands: string[];
}

function parseStringList(envValue: string | undefined, defaultList: string[]): string[] {
  if (envValue == null || envValue === '') return defaultList;
  return envValue.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
}

function normalizeGatewayType(raw: string | undefined): string {
  const v = (raw ?? '').trim().toLowerCase();
  if (v === 'lark') return 'feishu';
  return v || 'feishu';
}

export function loadConfig(): BotConfig {
  return {
    gateway: {
      type: normalizeGatewayType(process.env.GATEWAY_TYPE),
    },
    feishu: {
      appId: process.env.FEISHU_APP_ID || '',
      appSecret: process.env.FEISHU_APP_SECRET || '',
      verificationToken: process.env.FEISHU_VERIFICATION_TOKEN,
      domain: (process.env.FEISHU_DOMAIN as 'feishu' | 'lark') || 'feishu',
    },
    execution: {
      timeout: Math.min(
        parseInt(process.env.EXECUTION_TIMEOUT || '120000', 10),
        MAX_EXECUTION_TIMEOUT_MS
      ),
      codeTimeout: process.env.CODE_TIMEOUT
        ? Math.min(
            parseInt(process.env.CODE_TIMEOUT, 10),
            MAX_EXECUTION_TIMEOUT_MS
          )
        : undefined,
      maxOutputLength: parseInt(process.env.MAX_OUTPUT_LENGTH || '10000', 10),
      shellOutputEncoding: process.env.SHELL_OUTPUT_ENCODING?.trim() || undefined,
    },
    allowedCodeTools: parseStringList(
      process.env.ALLOWED_CODE_TOOLS,
      DEFAULT_ALLOWED_CODE_TOOLS
    ),
    allowedShellCommands: parseStringList(
      process.env.ALLOWED_SHELL_COMMANDS,
      DEFAULT_ALLOWED_SHELL_COMMANDS
    ),
  };
}

export const config = loadConfig();
