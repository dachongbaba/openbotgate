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
  telegram?: { token: string };
  whatsapp?: { sessionPath?: string; logQr?: boolean };
  discord?: { token: string };
  slack?: { botToken: string; appToken: string };
  line?: {
    channelSecret: string;
    channelAccessToken: string;
    webhookPort?: number;
    webhookPath?: string;
  };
  matrix?: {
    homeserverUrl: string;
    accessToken: string;
    storagePath?: string;
  };
  mattermost?: {
    serverUrl: string;
    token: string;
    webhookPort?: number;
    webhookPath?: string;
  };
  nostr?: {
    privateKey: string;
    relays: string[];
  };
  googlechat?: {
    webhookSecret?: string;
    apiToken: string;
    webhookPort?: number;
    webhookPath?: string;
  };
  nextcloudTalk?: {
    baseUrl: string;
    appToken: string;
    webhookPort?: number;
    webhookPath?: string;
  };
  signal?: {
    restUrl: string;
    number: string;
  };
  bluebubbles?: {
    serverUrl: string;
    password: string;
  };
  zalo?: {
    appId?: string;
    appSecret?: string;
    accessToken: string;
    webhookPort?: number;
    webhookPath?: string;
  };
  msteams?: {
    appId: string;
    appPassword: string;
    serviceUrl?: string;
    port?: number;
    path?: string;
  };
  zalouser?: {
    apiUrl: string;
    token: string;
  };
  tlon?: {
    shipUrl: string;
    code: string;
  };
  imessage?: {
    bridgeUrl: string;
    token?: string;
  };
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
    telegram: process.env.TELEGRAM_BOT_TOKEN ? { token: process.env.TELEGRAM_BOT_TOKEN } : undefined,
    whatsapp:
      process.env.WHATSAPP_SESSION_PATH || process.env.WHATSAPP_LOG_QR
        ? {
            sessionPath: process.env.WHATSAPP_SESSION_PATH?.trim() || undefined,
            logQr: process.env.WHATSAPP_LOG_QR === 'true',
          }
        : undefined,
    discord: process.env.DISCORD_BOT_TOKEN ? { token: process.env.DISCORD_BOT_TOKEN } : undefined,
    slack:
      process.env.SLACK_BOT_TOKEN && process.env.SLACK_APP_TOKEN
        ? { botToken: process.env.SLACK_BOT_TOKEN, appToken: process.env.SLACK_APP_TOKEN }
        : undefined,
    line:
      process.env.LINE_CHANNEL_SECRET && process.env.LINE_CHANNEL_ACCESS_TOKEN
        ? {
            channelSecret: process.env.LINE_CHANNEL_SECRET,
            channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
            webhookPort: process.env.LINE_WEBHOOK_PORT ? parseInt(process.env.LINE_WEBHOOK_PORT, 10) : undefined,
            webhookPath: process.env.LINE_WEBHOOK_PATH?.trim() || undefined,
          }
        : undefined,
    matrix:
      process.env.MATRIX_HOMESERVER_URL && process.env.MATRIX_ACCESS_TOKEN
        ? {
            homeserverUrl: process.env.MATRIX_HOMESERVER_URL.replace(/\/$/, ''),
            accessToken: process.env.MATRIX_ACCESS_TOKEN,
            storagePath: process.env.MATRIX_STORAGE_PATH?.trim() || undefined,
          }
        : undefined,
    mattermost:
      process.env.MATTERMOST_SERVER_URL && process.env.MATTERMOST_TOKEN
        ? {
            serverUrl: process.env.MATTERMOST_SERVER_URL.replace(/\/$/, ''),
            token: process.env.MATTERMOST_TOKEN,
            webhookPort: process.env.MATTERMOST_WEBHOOK_PORT ? parseInt(process.env.MATTERMOST_WEBHOOK_PORT, 10) : undefined,
            webhookPath: process.env.MATTERMOST_WEBHOOK_PATH?.trim() || undefined,
          }
        : undefined,
    nostr:
      process.env.NOSTR_PRIVATE_KEY && process.env.NOSTR_RELAYS
        ? {
            privateKey: process.env.NOSTR_PRIVATE_KEY,
            relays: process.env.NOSTR_RELAYS.split(',').map((r) => r.trim()).filter(Boolean),
          }
        : undefined,
    googlechat:
      process.env.GOOGLECHAT_API_TOKEN
        ? {
            webhookSecret: process.env.GOOGLECHAT_WEBHOOK_SECRET?.trim(),
            apiToken: process.env.GOOGLECHAT_API_TOKEN,
            webhookPort: process.env.GOOGLECHAT_WEBHOOK_PORT ? parseInt(process.env.GOOGLECHAT_WEBHOOK_PORT, 10) : undefined,
            webhookPath: process.env.GOOGLECHAT_WEBHOOK_PATH?.trim() || undefined,
          }
        : undefined,
    nextcloudTalk:
      process.env.NEXTCLOUD_TALK_BASE_URL && process.env.NEXTCLOUD_TALK_APP_TOKEN
        ? {
            baseUrl: process.env.NEXTCLOUD_TALK_BASE_URL.replace(/\/$/, ''),
            appToken: process.env.NEXTCLOUD_TALK_APP_TOKEN,
            webhookPort: process.env.NEXTCLOUD_TALK_WEBHOOK_PORT ? parseInt(process.env.NEXTCLOUD_TALK_WEBHOOK_PORT, 10) : undefined,
            webhookPath: process.env.NEXTCLOUD_TALK_WEBHOOK_PATH?.trim() || undefined,
          }
        : undefined,
    signal:
      process.env.SIGNAL_CLI_REST_URL && process.env.SIGNAL_NUMBER
        ? { restUrl: process.env.SIGNAL_CLI_REST_URL.replace(/\/$/, ''), number: process.env.SIGNAL_NUMBER }
        : undefined,
    bluebubbles:
      process.env.BLUEBUBBLES_SERVER_URL && process.env.BLUEBUBBLES_PASSWORD
        ? {
            serverUrl: process.env.BLUEBUBBLES_SERVER_URL.replace(/\/$/, ''),
            password: process.env.BLUEBUBBLES_PASSWORD,
          }
        : undefined,
    zalo:
      process.env.ZALO_ACCESS_TOKEN
        ? {
            appId: process.env.ZALO_APP_ID?.trim(),
            appSecret: process.env.ZALO_APP_SECRET?.trim(),
            accessToken: process.env.ZALO_ACCESS_TOKEN,
            webhookPort: process.env.ZALO_WEBHOOK_PORT ? parseInt(process.env.ZALO_WEBHOOK_PORT, 10) : undefined,
            webhookPath: process.env.ZALO_WEBHOOK_PATH?.trim() || undefined,
          }
        : undefined,
    msteams:
      process.env.MSTEAMS_APP_ID && process.env.MSTEAMS_APP_PASSWORD
        ? {
            appId: process.env.MSTEAMS_APP_ID,
            appPassword: process.env.MSTEAMS_APP_PASSWORD,
            serviceUrl: process.env.MSTEAMS_SERVICE_URL?.trim() || undefined,
            port: process.env.MSTEAMS_PORT ? parseInt(process.env.MSTEAMS_PORT, 10) : undefined,
            path: process.env.MSTEAMS_PATH?.trim() || undefined,
          }
        : undefined,
    zalouser:
      process.env.ZALOUSER_API_URL && process.env.ZALOUSER_TOKEN
        ? { apiUrl: process.env.ZALOUSER_API_URL.replace(/\/$/, ''), token: process.env.ZALOUSER_TOKEN }
        : undefined,
    tlon:
      process.env.TLON_SHIP_URL && process.env.TLON_CODE
        ? { shipUrl: process.env.TLON_SHIP_URL.replace(/\/$/, ''), code: process.env.TLON_CODE }
        : undefined,
    imessage:
      process.env.IMESSAGE_BRIDGE_URL
        ? {
            bridgeUrl: process.env.IMESSAGE_BRIDGE_URL.replace(/\/$/, ''),
            token: process.env.IMESSAGE_TOKEN?.trim() || undefined,
          }
        : undefined,
    qqGuild:
      process.env.QQ_GUILD_APP_ID && process.env.QQ_GUILD_TOKEN
        ? {
            appID: process.env.QQ_GUILD_APP_ID,
            token: process.env.QQ_GUILD_TOKEN,
            intents: process.env.QQ_GUILD_INTENTS
              ? process.env.QQ_GUILD_INTENTS.split(',').map((s) => s.trim()).filter(Boolean)
              : ['PUBLIC_GUILD_MESSAGES', 'DIRECT_MESSAGE'],
            sandbox: process.env.QQ_GUILD_SANDBOX === 'true',
          }
        : undefined,
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
