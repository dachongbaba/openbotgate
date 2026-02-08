# OpenBotGate 网关与依赖说明

本文档整理项目支持的网关列表、对应 npm 依赖及环境变量配置。

## 一、网关列表

| 序号 | id | 名称 | 说明 | 实现状态 |
|------|-----|------|------|----------|
| 1 | `telegram` | Telegram | Bot API，轮询收消息 | ✅ 完整实现 |
| 2 | `whatsapp` | WhatsApp | QR 扫码登录（whatsapp-web.js） | ✅ 完整实现 |
| 3 | `discord` | Discord | Bot API（discord.js） | ✅ 完整实现 |
| 4 | `feishu` | Feishu/Lark | 飞书 / Lark WebSocket | ✅ 完整实现 |
| 5 | `qq` | QQ 频道 | qq-guild-bot 官方 SDK，WebSocket 长连接 | ✅ 完整实现 |

通过环境变量 `GATEWAY_TYPE` 选择当前使用的网关（如 `feishu`、`telegram`、`discord`、`qq` 等）。所有网关均已完整实现并可接入 handler。

---

## 二、npm 依赖与网关对应关系

| npm 包 | 版本 | 用途网关 |
|--------|------|----------|
| `@larksuiteoapi/node-sdk` | ^1.58.0 | Feishu/Lark |
| `telegraf` | ^4.16.3 | Telegram |
| `whatsapp-web.js` | ^1.26.0 | WhatsApp |
| `discord.js` | ^14.16.0 | Discord |
| `qq-guild-bot` | ^2.9.5 | QQ 频道 |

---

## 三、各网关配置说明

### 3.1 Feishu/Lark（飞书）

- **实现文件**：`src/gateway/feishu.ts`
- **环境变量**：
  - `FEISHU_APP_ID`：应用 ID
  - `FEISHU_APP_SECRET`：应用密钥
  - `FEISHU_VERIFICATION_TOKEN`：（可选）事件校验
  - `FEISHU_DOMAIN`：`feishu`（国内）或 `lark`（国际）

### 3.2 Telegram

- **实现文件**：`src/gateway/telegram.ts`
- **环境变量**：
  - `TELEGRAM_BOT_TOKEN`：Bot Token（从 @BotFather 获取）

### 3.3 WhatsApp

- **实现文件**：`src/gateway/whatsapp.ts`
- **环境变量**：
  - `WHATSAPP_SESSION_PATH`：（可选）会话持久化目录，如 `./.wwebjs_auth`
  - `WHATSAPP_LOG_QR`：（可选）`true` 时在日志中输出 QR 内容

### 3.4 Discord

- **实现文件**：`src/gateway/discord.ts`
- **环境变量**：
  - `DISCORD_BOT_TOKEN`：Bot Token（在 Discord 开发者门户创建应用后获取）

### 3.5 QQ 频道

- **实现文件**：`src/gateway/qq.ts`
- **环境变量**：
  - `QQ_GUILD_APP_ID`：机器人应用 ID（在 [QQ 机器人平台](https://bot.qq.com/) 创建应用后获取）
  - `QQ_GUILD_TOKEN`：机器人 Token
  - `QQ_GUILD_SANDBOX`：（可选）`true` 使用沙箱环境，`false` 使用正式环境；默认 `false`。若 gateway/bot 返回 500，多为环境与机器人创建环境不一致，可切换试

---

## 四、各网关如何测试（凭证一览）

**运行方式**：同一时间只启用一个网关。通过环境变量 `GATEWAY_TYPE` 指定当前网关（如 `feishu`、`telegram`），并**只配置该网关**所需的环境变量即可。

| 网关 id | 必填环境变量（Key/凭证） | 获取方式简述 |
|---------|--------------------------|--------------|
| `feishu` | `FEISHU_APP_ID`、`FEISHU_APP_SECRET` | 飞书开放平台创建应用 |
| `telegram` | `TELEGRAM_BOT_TOKEN` | [@BotFather](https://t.me/BotFather) 创建 Bot |
| `whatsapp` | 无（首次会打 QR 码） | 可选：`WHATSAPP_SESSION_PATH`、`WHATSAPP_LOG_QR=true` |
| `discord` | `DISCORD_BOT_TOKEN` | Discord 开发者门户创建应用 → Bot → Token |
| `qq` | `QQ_GUILD_APP_ID`、`QQ_GUILD_TOKEN` | QQ 机器人平台创建应用获取；可选 `QQ_GUILD_INTENTS`、`QQ_GUILD_SANDBOX=true` |

**测试步骤**（以 Telegram 为例）：

1. 在 [@BotFather](https://t.me/BotFather) 创建 Bot，拿到 `TELEGRAM_BOT_TOKEN`。
2. 在项目根目录创建或编辑 `.env`，例如：
   ```bash
   GATEWAY_TYPE=telegram
   TELEGRAM_BOT_TOKEN=你的 token
   ```
3. 启动：`pnpm run dev` 或 `node bin/openbotgate.js`。
4. 在 Telegram 里给该 Bot 发消息（如 `/code 1+1`），验证回复。

其他网关同理：把 `GATEWAY_TYPE` 设为对应 id，并只配置上表中该行的环境变量即可。

---

## 五、代码结构速查

| 路径 | 说明 |
|------|------|
| `src/gateway/types.ts` | `IGateway`、`GatewayCatalogEntry` 类型定义 |
| `src/gateway/catalog.ts` | 网关目录列表（GATEWAY_CATALOG） |
| `src/gateway/registry.ts` | `getGateway(type)` 根据类型返回网关实例 |
| `src/gateway/feishu.ts` | 飞书网关 |
| `src/gateway/telegram.ts` | Telegram 网关 |
| `src/gateway/whatsapp.ts` | WhatsApp 网关 |
| `src/gateway/discord.ts` | Discord 网关 |
| `src/gateway/qq.ts` | QQ 频道网关 |
| `src/config/config.ts` | 各网关的 config 字段（feishu、telegram、whatsapp、discord、qqGuild） |
| `src/handler/index.ts` | 按 `gateway.id` 分发，调用各 `handleXPayload` / `parseXPayload` |

---

## 六、添加新网关（或实现占位网关）步骤

1. 在 **`src/gateway/catalog.ts`** 的 `GATEWAY_CATALOG` 中确认该网关条目（`implemented: true` 表示已有实例）。
2. 若为**全新实现**：
   - 在 `src/gateway/` 下新增实现文件（如 `xxx.ts`），实现 `IGateway`（`id`、`start`、`reply`、`send`）。
   - 如需新依赖，在 **`package.json`** 的 `dependencies` 中添加对应 npm 包。
   - 在 **`src/config/config.ts`** 中增加该网关的配置字段及环境变量读取。
   - 在 **`src/gateway/registry.ts`** 的 `GATEWAY_MAP` 中注册该网关实例。
   - 在 **`src/handler/index.ts`** 中增加 `gateway.id === 'xxx'` 分支及 `handleXxxPayload`、`parseXxxPayload`。
3. 新网关需直接实现 `IGateway` 并在 `registry.ts` 中注册；无占位网关。

---

*最后更新：2026-02-07*
