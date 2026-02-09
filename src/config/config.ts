import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

/** 最大允许执行超时（毫秒） */
export const MAX_EXECUTION_TIMEOUT_MS = 180000;

const DEFAULT_ALLOWED_CODE_TOOLS = [
  'opencode', 'cursorcode', 'claudecode', 'openaicodex',
  'qwencode', 'kimicode', 'openclaw', 'nanobot',
];
const DEFAULT_ALLOWED_SHELL_COMMANDS = ['git', 'pwd'];

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
  codeToolOverrides: Record<string, string>;
  /** Shell 命令可执行文件覆盖（命令首词 -> 实际调用的命令/脚本），如 git -> git.ps1 */
  shellCommandOverrides: Record<string, string>;
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
  codeToolOverrides: Record<string, string>;
  shellCommandOverrides: Record<string, string>;
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
    codeToolOverrides: {},
    shellCommandOverrides: {},
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
  return configPath ? rawToConfig(parseConfigFile(configPath)) : def;
}

export const config = loadConfig();
