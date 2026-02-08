# OpenBotGate

**AI 编程工具网关** — 通过飞书等聊天工具，在对话里直接唤起 OpenCode、Claude Code 等 AI 编程 CLI。  
**专为灵感涌现时的你而设计**：想法来了就发一条消息，不必切到终端、不必离开当前上下文。

## 功能特性

- ✅ **官方SDK集成**：使用飞书官方 `@larksuiteoapi/node-sdk`，确保稳定性和兼容性
- ✅ **长连接**：使用飞书官方 SDK 长连接接收事件，无需 Webhook 公网地址
- ✅ **多工具支持**：OpenCode、Claude Code、Git、Shell 命令执行
- ✅ **任务管理**：查看状态、取消任务、历史记录
- ✅ **简单配置**：仅需配置 App ID 和 App Secret 即可使用
- ✅ **安全控制**：Shell 执行默认禁用，可选择性开启
- ✅ **消息类型支持**：支持文本、富文本（Post）消息格式

## 快速开始

### 安装

**方式一：npx 直接运行（无需安装）**

```bash
npx openbotgate
```

**方式二：全局安装后使用 CLI**

```bash
npm install -g openbotgate
openbotgate
```

**方式三：克隆项目本地开发**

```bash
git clone https://github.com/dachongbaba/openbotgate.git
cd openbotgate
pnpm install
```

CLI 支持：
- `openbotgate` — 启动网关服务
- `openbotgate --help` / `openbotgate -h` — 显示帮助
- `openbotgate --version` / `openbotgate -v` — 显示版本

### 1. 配置环境变量

复制 `.env.example` 到 `.env`，填入你的飞书应用凭证：

```bash
cp .env.example .env
```

编辑 `.env` 文件：

```env
FEISHU_APP_ID=your_app_id_here
FEISHU_APP_SECRET=your_app_secret_here
FEISHU_VERIFICATION_TOKEN=your_verification_token_here
```

### 2. 启动服务

```bash
# 使用 CLI（已全局安装或 npx 时）
openbotgate

# 或本地开发
npm run dev          # 开发模式（热重载）
npm run build && npm start   # 生产模式
```

服务通过 **飞书官方 SDK 长连接** 接收消息，无需部署本地 HTTP 服务或公网地址。

### 3. 配置飞书机器人

1. 登录[飞书开放平台](https://open.feishu.cn/)
2. 创建应用，获取 App ID 和 App Secret
3. 配置机器人能力，添加以下权限：
   - `im:message` (发送和接收消息)
   - `im:message.p2p_msg:readonly` (读取私聊消息)
   - `im:message.group_at_msg:readonly` (接收群内@消息)
   - `im:message:send_as_bot` (以机器人身份发送消息)
   - `im:resource` (上传/下载媒体文件)
4. **配置事件订阅**（重要！）：
   - 进入 **事件与回调** 页面
   - 选择 **使用长连接接收事件**（推荐）
   - 添加事件订阅：`im.message.receive_v1`（接收消息）
5. 发布应用

## 使用方法

在飞书聊天中，可直接发送**纯文本**（不带 `/`）作为提示词，使用当前选中的 Code 工具执行；或使用以下命令：

### Code 工具与会话

| 命令 | 说明 |
|------|------|
| `/code` | 显示当前工具及可用工具列表 |
| `/code <tool>` | 切换默认工具（如 opencode、claude、codex、qwen、kimi、openclaw、nanobot、cursor） |
| `/code <tool> "prompt"` | 使用指定工具一次性执行提示词 |
| `/new` | 新建会话（清空历史，取消当前任务） |
| `/session` | 列出会话；`/session <id>` 切换到指定会话 |
| `/model` | 列出当前工具可用模型；`/model <name>` 设置模型；`/model reset` 恢复默认 |
| `/agent` | 列出当前工具可用 Agent；`/agent <name>` 设置 Agent；`/agent reset` 恢复默认 |
| `/workspace` | 显示当前工作目录；`/workspace <path>` 设置工作目录；`/workspace reset` 恢复默认 |

### Shell 命令

在配置中启用的 Shell 命令可通过 `/<命令名> <参数>` 执行，例如：`/git status`。具体可用命令由 `ALLOWED_SHELL_COMMANDS` 配置决定。

### 任务与系统

| 命令 | 说明 |
|------|------|
| `/help` | 显示帮助信息 |
| `/status` | 显示系统状态 |
| `/tasks` | 列出当前用户运行中的任务 |
| `/cancel <task_id>` | 取消指定任务 |

### 使用示例

```
写一个计算斐波那契数列的函数          # 用当前工具执行

/code opencode                        # 切换到 OpenCode
/code claude "为这个项目生成单元测试"  # 用 Claude 一次性执行

/new                                  # 新建会话
/model                                # 查看可用模型
/workspace /path/to/project           # 设置工作目录

/tasks                                # 查看运行中的任务
/cancel abc-123                       # 取消任务
```

## 配置文件说明

| 配置项 | 说明 | 默认值 |
|-------|------|-------|
| FEISHU_APP_ID | 飞书应用 ID | 必填 |
| FEISHU_APP_SECRET | 飞书应用密钥 | 必填 |
| FEISHU_VERIFICATION_TOKEN | 飞书事件订阅验证令牌 | 可选 |
| FEISHU_DOMAIN | 飞书域名（"feishu" 国内版，"lark" 国际版） | feishu |
| GATEWAY_TYPE | 网关类型（当前仅实现 feishu / lark） | feishu |
| EXECUTION_TIMEOUT | 命令执行超时时间（毫秒，上限 180000） | 120000 |
| CODE_TIMEOUT | Code 工具单独超时（毫秒，可选） | — |
| MAX_OUTPUT_LENGTH | 单次输出最大长度 | 10000 |
| SHELL_OUTPUT_ENCODING | Shell 输出编码（如 gbk，可选） | 系统编码 |
| ALLOWED_CODE_TOOLS | 允许的 Code 工具，逗号分隔（如 opencode,claude,cursor） | opencode,cursorcode,claudecode,openaicodex,qwencode,kimicode,openclaw,nanobot |
| ALLOWED_SHELL_COMMANDS | 允许的 Shell 命令首词，逗号分隔（如 git,dir,ls,pwd） | git,dir,ls,pwd |

## 项目结构

```
openbotgate/
├── src/
│   ├── config/           # 配置管理
│   │   └── config.ts
│   ├── gateway/          # 外部平台网关
│   │   ├── index.ts      # 网关注册与分发
│   │   ├── catalog.ts    # 网关目录
│   │   ├── registry.ts   # 网关注册表
│   │   ├── types.ts
│   │   ├── feishu.ts     # 飞书 API 集成
│   │   ├── telegram.ts
│   │   ├── discord.ts
│   │   ├── whatsapp.ts
│   │   └── qq.ts
│   ├── handler/          # 消息处理
│   │   ├── index.ts      # 路由入口
│   │   ├── parse.ts      # 消息解析
│   │   ├── dedup.ts      # 去重
│   │   ├── types.ts
│   │   ├── commands/     # 命令处理器
│   │   │   ├── index.ts  # 命令注册
│   │   │   ├── code.ts   # /code 与默认执行
│   │   │   ├── help.ts
│   │   │   ├── shell.ts
│   │   │   ├── status.ts
│   │   │   └── tasks.ts  # /tasks、/cancel
│   │   └── code/         # Code 相关命令
│   │       ├── new.ts    # /new
│   │       ├── model.ts  # /model
│   │       ├── session.ts
│   │       ├── agent.ts
│   │       └── workspace.ts
│   ├── runtime/          # 运行时
│   │   ├── executor.ts   # 命令执行器
│   │   ├── cliTools.ts   # CLI 调用
│   │   ├── sessionManager.ts
│   │   ├── streamHandler.ts
│   │   ├── taskManager.ts
│   │   └── tools/        # Code 工具适配器
│   │       ├── registry.ts
│   │       ├── base.ts
│   │       ├── opencode.ts
│   │       ├── claudecode.ts
│   │       ├── cursorcode.ts
│   │       ├── openaicodex.ts
│   │       ├── qwencode.ts
│   │       ├── kimicode.ts
│   │       ├── openclaw.ts
│   │       └── nanobot.ts
│   ├── utils/
│   │   ├── logger.ts
│   │   └── encoding.ts
│   └── index.ts          # 入口
├── test/
│   ├── handler/
│   │   ├── parse.test.ts
│   │   └── commands/
│   ├── runtime/
│   └── utils/
├── docs/
│   ├── GATEWAYS.md
│   └── PUBLISHING.md
├── AGENTS.md
├── CONTRIBUTING.md
├── package.json
├── tsconfig.json
├── tsconfig.test.json
├── jest.config.js
├── nodemon.json
└── .env.example
```

## 架构设计

项目采用分层架构，职责清晰：

- **gateway/** - 外部平台集成层，隔离第三方API
- **handler/** - 消息处理层，解析路由命令
- **runtime/** - 运行时层，执行CLI工具和管理任务
- **config/** - 配置层，统一管理环境变量

## 扩展支持

### 添加新的聊天平台

1. 在 `src/gateway/` 下创建新平台适配器
2. 实现消息发送接口
3. 在 `src/index.ts` 中注册 webhook 端点

### 添加新的命令

在 `src/handler/commands/` 下创建新文件：

```typescript
// src/handler/commands/mycommand.ts
import type { CommandContext } from '../types';

export async function run(ctx: CommandContext): Promise<void> {
  // 实现逻辑
  await ctx.reply('Done');
}
```

然后在 `src/handler/commands/index.ts` 中注册：

```typescript
import { run as mycommand } from './mycommand';
commands.set('mycommand', mycommand);
```

### 添加新的 CLI 工具

在 `src/runtime/cliTools.ts` 中添加新方法：

```typescript
async executeNewTool(
  command: string,
  options: ExecutionOptions = {}
): Promise<ToolResult> {
  // 实现逻辑
}
```

## 安全考虑

- ⚠️ Shell 执行默认禁用，建议仅在受信任环境中启用
- 📝 命令执行有超时限制，防止长时间运行
- 🔒 建议使用环境变量存储敏感信息
- 🛡️ 可添加用户白名单机制控制访问

## 发布（GitHub / npm）

完整流程与 rebase 约定见 **[docs/PUBLISHING.md](docs/PUBLISHING.md)**。

### 发布前准备

1. **替换仓库地址**：在 `package.json` 中将 `dachongbaba` 改为你的 GitHub 用户名或组织名（若不同）。
2. **LICENSE**：已包含 MIT 许可证，可根据需要修改版权方。
3. **版本号**：按 [语义化版本](https://semver.org/) 更新 `package.json` 的 `version`。

### 发布到 GitHub

```bash
# 在 GitHub 创建仓库后
git remote add origin https://github.com/dachongbaba/openbotgate.git
git push -u origin main
```

### 发布到 npm

```bash
# 首次需要登录
npm login

# 确认将要发布的文件（可选）
npm pack --dry-run

# 发布（会先执行 prepublishOnly 即 npm run build）
npm publish
```

私有包使用 `npm publish --access restricted`；作用域包如 `@your-org/openbotgate` 首次发布需加 `--access public`。

## License

MIT
