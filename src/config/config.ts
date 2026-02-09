import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import * as dotenv from 'dotenv';

dotenv.config();

/** 最大允许执行超时（毫秒） */
export const MAX_EXECUTION_TIMEOUT_MS = 180000;

const DEFAULT_ALLOWED_CODE_TOOLS = [
  'opencode', 'cursorcode', 'claudecode', 'openaicodex',
  'qwencode', 'kimicode', 'openclaw', 'nanobot',
];
const DEFAULT_ALLOWED_SHELL_COMMANDS = ['git', 'dir', 'ls', 'pwd'];

export interface BotConfig {
  gateway: { type: string };
  feishu: {
    appId: string;
    appSecret: string;
    verificationToken?: string;
    domain: 'feishu' | 'lark';
  };
  telegram?: { token: string };
  whatsapp?: { sessionPath?: string; logQr?: boolean };
  discord?: { token: string };
  qqGuild?: {
    appID: string;
    token: string;
    intents?: string[];
    sandbox?: boolean;
  };
  execution: {
    timeout: number;
    codeTimeout?: number;
    maxOutputLength: number;
    shellOutputEncoding?: string;
  };
  allowedCodeTools: string[];
  allowedShellCommands: string[];
  codeToolCommandOverrides: Record<string, string>;
}

/** 配置文件中的可选结构（部分字段可省略） */
type RawConfig = Partial<{
  gateway: Partial<{ type: string }>;
  feishu: Partial<BotConfig['feishu']>;
  telegram: Partial<BotConfig['telegram']>;
  whatsapp: Partial<NonNullable<BotConfig['whatsapp']>>;
  discord: Partial<BotConfig['discord']>;
  qqGuild: Partial<NonNullable<BotConfig['qqGuild']>>;
  execution: Partial<BotConfig['execution']>;
  allowedCodeTools: string[];
  allowedShellCommands: string[];
  codeToolCommandOverrides: Record<string, string>;
}>;

function defaultConfig(): BotConfig {
  return {
    gateway: { type: 'feishu' },
    feishu: {
      appId: '',
      appSecret: '',
      verificationToken: undefined,
      domain: 'feishu',
    },
    telegram: undefined,
    whatsapp: undefined,
    discord: undefined,
    qqGuild: undefined,
    execution: {
      timeout: 120000,
      codeTimeout: undefined,
      maxOutputLength: 10000,
      shellOutputEncoding: undefined,
    },
    allowedCodeTools: [...DEFAULT_ALLOWED_CODE_TOOLS],
    allowedShellCommands: [...DEFAULT_ALLOWED_SHELL_COMMANDS],
    codeToolCommandOverrides: {},
  };
}

const CONFIG_NAMES = ['openbotgate.yml', 'openbotgate.yaml', 'openbotgate.json'];

function findConfigPath(): string | null {
  const cwd = process.cwd();
  for (const name of CONFIG_NAMES) {
    const p = path.join(cwd, name);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function parseConfigFile(filePath: string): RawConfig {
  const raw = fs.readFileSync(filePath, 'utf8');
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.json') {
    return JSON.parse(raw) as RawConfig;
  }
  if (ext === '.yml' || ext === '.yaml') {
    return (yaml.load(raw) as RawConfig) ?? {};
  }
  return {};
}

function mergeDeep<T extends object>(target: T, source: Partial<T> | undefined): T {
  if (source == null) return target;
  const out = { ...target } as T;
  for (const key of Object.keys(source) as (keyof T)[]) {
    const s = source[key];
    if (s === undefined) continue;
    const t = (out as Record<string, unknown>)[key as string];
    if (Array.isArray(s)) {
      (out as Record<string, unknown>)[key as string] = s;
    } else if (t != null && typeof t === 'object' && !Array.isArray(t) && typeof s === 'object' && s !== null && !Array.isArray(s)) {
      (out as Record<string, unknown>)[key as string] = mergeDeep(
        t as object,
        s as object
      );
    } else {
      (out as Record<string, unknown>)[key as string] = s;
    }
  }
  return out;
}

function applyEnvOverrides(cfg: BotConfig): BotConfig {
  const env = process.env;
  const gatewayType = (env.GATEWAY_TYPE ?? cfg.gateway.type).trim().toLowerCase();
  return {
    ...cfg,
    gateway: { type: gatewayType === 'lark' ? 'feishu' : gatewayType || 'feishu' },
    feishu: {
      appId: env.FEISHU_APP_ID ?? cfg.feishu.appId,
      appSecret: env.FEISHU_APP_SECRET ?? cfg.feishu.appSecret,
      verificationToken: env.FEISHU_VERIFICATION_TOKEN ?? cfg.feishu.verificationToken,
      domain: (env.FEISHU_DOMAIN as 'feishu' | 'lark') || cfg.feishu.domain || 'feishu',
    },
    telegram: env.TELEGRAM_BOT_TOKEN ? { token: env.TELEGRAM_BOT_TOKEN } : cfg.telegram,
    whatsapp:
      env.WHATSAPP_SESSION_PATH || env.WHATSAPP_LOG_QR
        ? {
            sessionPath: env.WHATSAPP_SESSION_PATH?.trim() || cfg.whatsapp?.sessionPath,
            logQr: env.WHATSAPP_LOG_QR === 'true',
          }
        : cfg.whatsapp,
    discord: env.DISCORD_BOT_TOKEN ? { token: env.DISCORD_BOT_TOKEN } : cfg.discord,
    qqGuild:
      env.QQ_GUILD_APP_ID && env.QQ_GUILD_TOKEN
        ? {
            appID: env.QQ_GUILD_APP_ID,
            token: env.QQ_GUILD_TOKEN,
            intents: env.QQ_GUILD_INTENTS
              ? env.QQ_GUILD_INTENTS.split(',').map((s) => s.trim()).filter(Boolean)
              : cfg.qqGuild?.intents ?? ['PUBLIC_GUILD_MESSAGES', 'DIRECT_MESSAGE'],
            sandbox: env.QQ_GUILD_SANDBOX === 'true',
          }
        : cfg.qqGuild,
    execution: {
      timeout: Math.min(
        parseInt(env.EXECUTION_TIMEOUT ?? String(cfg.execution.timeout), 10) || 120000,
        MAX_EXECUTION_TIMEOUT_MS
      ),
      codeTimeout: env.CODE_TIMEOUT
        ? Math.min(parseInt(env.CODE_TIMEOUT, 10), MAX_EXECUTION_TIMEOUT_MS)
        : cfg.execution.codeTimeout,
      maxOutputLength: parseInt(env.MAX_OUTPUT_LENGTH ?? String(cfg.execution.maxOutputLength), 10) || 10000,
      shellOutputEncoding: env.SHELL_OUTPUT_ENCODING?.trim() ?? cfg.execution.shellOutputEncoding,
    },
    allowedCodeTools: env.ALLOWED_CODE_TOOLS
      ? env.ALLOWED_CODE_TOOLS.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)
      : cfg.allowedCodeTools,
    allowedShellCommands: env.ALLOWED_SHELL_COMMANDS
      ? env.ALLOWED_SHELL_COMMANDS.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)
      : cfg.allowedShellCommands,
    codeToolCommandOverrides: (() => {
      if (env.CODE_TOOL_COMMANDS) {
        const out: Record<string, string> = {};
        for (const pair of env.CODE_TOOL_COMMANDS.split(',').map((s) => s.trim()).filter(Boolean)) {
          const idx = pair.indexOf(':');
          if (idx > 0) {
            const k = pair.slice(0, idx).trim().toLowerCase();
            const v = pair.slice(idx + 1).trim();
            if (k && v) out[k] = v;
          }
        }
        return out;
      }
      return cfg.codeToolCommandOverrides;
    })(),
  };
}

function rawToConfig(raw: RawConfig): BotConfig {
  const def = defaultConfig();
  const merged = mergeDeep(def, raw as Partial<BotConfig>);
  if (merged.execution.timeout > MAX_EXECUTION_TIMEOUT_MS) {
    merged.execution.timeout = MAX_EXECUTION_TIMEOUT_MS;
  }
  return merged;
}

export function loadConfig(): BotConfig {
  const def = defaultConfig();
  const configPath = findConfigPath();
  const fileConfig = configPath ? rawToConfig(parseConfigFile(configPath)) : def;
  return applyEnvOverrides(fileConfig);
}

export const config = loadConfig();
