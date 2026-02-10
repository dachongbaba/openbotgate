# OpenBotGate

**AI 编程工具网关** — 通过飞书等聊天工具，在对话里直接唤起 OpenCode、Claude Code 等 AI 编程 CLI。  
**专为灵感涌现时的你而设计**：想法来了就发一条消息，不必切到终端、不必离开当前上下文。

## 功能特性

- ✅ **官方 SDK 集成**：使用飞书官方 `@larksuiteoapi/node-sdk`，确保稳定性和兼容性
- ✅ **长连接**：使用飞书官方 SDK 长连接接收事件，无需 Webhook 公网地址
- ✅ **多工具支持**：OpenCode、Claude Code、Cursor、Qwen、Kimi、Gemini、OpenClaw、Nanobot 等 Code 工具；Shell 命令（默认 git、pwd）
- ✅ **可定制可执行文件**：Code 工具与 Shell 命令均可配置为调用自定义脚本（如 `claude.ps1`、`git.ps1`）
- ✅ **任务管理**：查看状态、取消任务、历史记录
- ✅ **配置文件驱动**：使用 `openbotgate.yml` / `openbotgate.json` 统一配置，YAML 支持注释
- ✅ **安全控制**：Code 工具与 Shell 命令均通过白名单控制；执行超时与输出截断

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

### 1. 配置文件

所有配置通过 **配置文件** 加载，**不使用环境变量**。从当前工作目录读取 `openbotgate.yml`、`openbotgate.yaml` 或 `openbotgate.json`（按此顺序，找到即用）。

复制示例并编辑：

```bash
cp openbotgate.example.yml openbotgate.yml
```

编辑 `openbotgate.yml`，至少填写飞书应用信息：

```yaml
gateway:
  type: feishu

feishu:
  appId: "你的 App ID"
  appSecret: "你的 App Secret"
  verificationToken: ""   # 可选
  domain: feishu           # 国内用 feishu，国际用 lark
```

其他如执行超时、白名单、Code/Shell 命令覆盖等见下方「配置文件说明」及 `openbotgate.example.yml` 内注释。

### 2. 启动服务

```bash
# 使用 CLI（已全局安装或 npx 时）
openbotgate

# 或本地开发
npm run dev              # 开发模式（热重载）
npm run build && npm start   # 生产模式
```

服务通过 **飞书官方 SDK 长连接** 接收消息，无需部署本地 HTTP 服务或公网地址。

### 3. 配置飞书机器人

1. 登录 [飞书开放平台](https://open.feishu.cn/)
2. 创建应用，获取 App ID 和 App Secret
3. 配置机器人能力，添加以下权限：
   - `im:message`（发送和接收消息）
   - `im:message.p2p_msg:readonly`（读取私聊消息）
   - `im:message.group_at_msg:readonly`（接收群内 @ 消息）
   - `im:message:send_as_bot`（以机器人身份发送消息）
   - `im:resource`（上传/下载媒体文件）
4. **配置事件订阅**（重要）：
   - 进入 **事件与回调** 页面
   - 选择 **使用长连接接收事件**（推荐）
   - 添加事件订阅：`im.message.receive_v1`（接收消息）
5. 发布应用

## 使用方法

在飞书聊天中，可直接发送**纯文本**（不带 `/`）作为提示词，使用当前选中的 Code 工具执行；或使用以下命令。

### Code 工具与会话

| 命令 | 说明 |
|------|------|
| `/code` | 显示当前工具及可用工具列表 |
| `/code <tool>` | 切换默认工具（如 opencode、claudecode、cursorcode、openaicodex、qwen、kimi、geminicode、openclaw、nanobot） |
| `/code <tool> "prompt"` | 使用指定工具一次性执行提示词 |
| `/new` | 新建会话（清空历史，取消当前任务） |
| `/session` | 列出会话；`/session <id>` 切换到指定会话 |
| `/model` | 列出当前工具可用模型；`/model <name>` 设置模型；`/model reset` 恢复默认 |
| `/agent` | 列出当前工具可用 Agent；`/agent <name>` 设置 Agent；`/agent reset` 恢复默认 |
| `/workspace` | 显示当前工作目录；`/workspace <path>` 设置工作目录；`/workspace reset` 恢复默认 |

### Shell 命令

在配置的 `allowedShellCommands` 中的命令可通过 `/<命令名> <参数>` 执行，例如 `/git status`、`/pwd`。默认仅允许 `git`、`pwd`；可在配置文件中增加或通过 `shellCommandOverrides` 指定实际调用的脚本（如 `git.ps1`）。

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

/git status                           # 执行 shell 命令
/tasks                                # 查看运行中的任务
/cancel abc-123                       # 取消任务
```

## 配置文件说明

配置**仅**从 `openbotgate.yml` / `openbotgate.yaml` / `openbotgate.json` 加载，不从环境变量读取。未提供配置文件时使用内置默认值。

| 配置块 / 字段 | 说明 | 默认 |
|---------------|------|------|
| **gateway** | | |
| `gateway.type` | 网关类型（当前仅实现 feishu / lark） | feishu |
| **feishu** | | |
| `feishu.appId` | 飞书应用 ID | 必填 |
| `feishu.appSecret` | 飞书应用密钥 | 必填 |
| `feishu.verificationToken` | 事件订阅验证令牌 | 可选 |
| `feishu.domain` | 飞书域名：feishu（国内）/ lark（国际） | feishu |
| **execution** | | |
| `execution.timeout` | 命令执行超时（毫秒，上限 180000） | 120000 |
| `execution.codeTimeout` | Code 工具单独超时（毫秒，可选） | 同 timeout |
| `execution.maxOutputLength` | 单次输出最大长度 | 10000 |
| `execution.shellOutputEncoding` | Shell 输出编码（如 Windows 下 gbk，可选） | 系统编码 |
| **白名单** | | |
| `allowedCodeTools` | 允许的 Code 工具（适配器名列表） | opencode, cursorcode, claudecode, openaicodex, qwencode, kimicode, geminicode, openclaw, nanobot |
| `allowedShellCommands` | 允许的 Shell 命令首词列表 | git, pwd |
| **覆盖** | | |
| `codeToolOverrides` | Code 适配器 → 实际可执行名（如 claudecode: claude.ps1） | {} |
| `shellCommandOverrides` | Shell 命令首词 → 实际可执行名（如 git: git.ps1） | {} |

完整示例见 **openbotgate.example.yml**。网关类型与多网关说明见 **[docs/GATEWAYS.md](docs/GATEWAYS.md)**。

## 项目结构

```
openbotgate/
├── src/
│   ├── config/           # 配置：从 openbotgate.yml/json 加载
│   │   └── config.ts
│   ├── gateway/          # 外部平台网关
│   │   ├── index.ts      # 网关注册与分发
│   │   ├── catalog.ts    # 网关目录
│   │   ├── registry.ts   # 网关注册表
│   │   ├── types.ts
│   │   ├── feishu.ts    # 飞书 API 集成
│   │   ├── telegram.ts
│   │   ├── discord.ts
│   │   ├── whatsapp.ts
│   │   └── qq.ts
│   ├── handler/          # 消息处理
│   │   ├── index.ts     # 路由入口
│   │   ├── parse.ts     # 消息解析
│   │   ├── dedup.ts     # 去重
│   │   ├── types.ts
│   │   ├── commands/    # 命令处理器
│   │   │   ├── index.ts # 命令注册
│   │   │   ├── code.ts  # /code 与默认执行
│   │   │   ├── help.ts
│   │   │   ├── shell.ts
│   │   │   ├── status.ts
│   │   │   └── tasks.ts # /tasks、/cancel
│   │   └── code/        # Code 相关命令
│   │       ├── new.ts   # /new
│   │       ├── model.ts # /model
│   │       ├── session.ts
│   │       ├── agent.ts
│   │       └── workspace.ts
│   ├── runtime/         # 运行时
│   │   ├── executor.ts  # 命令执行器
│   │   ├── cliTools.ts  # CLI 调用入口
│   │   ├── sessionManager.ts
│   │   ├── streamHandler.ts
│   │   ├── taskManager.ts
│   │   └── tools/       # Code 工具适配器
│   │       ├── registry.ts
│   │       ├── base.ts
│   │       ├── opencode.ts
│   │       ├── claudecode.ts
│   │       ├── cursorcode.ts
│   │       ├── openaicodex.ts
│   │       ├── qwencode.ts
│   │       ├── kimicode.ts
│   │       ├── geminicode.ts
│   │       ├── openclaw.ts
│   │       └── nanobot.ts
│   ├── utils/
│   │   ├── logger.ts
│   │   └── encoding.ts
│   └── index.ts         # 入口
├── test/
├── docs/                # GATEWAYS.md、PUBLISHING.md
├── AGENTS.md            # Agent 操作指南
├── CONTRIBUTING.md
├── openbotgate.example.yml  # 配置示例（复制为 openbotgate.yml 使用）
├── package.json
├── tsconfig.json
├── tsconfig.test.json
├── jest.config.js
├── nodemon.json
└── .env.example         # 仅说明：本产品不从环境变量加载配置
```

## 架构设计

- **gateway/** — 外部平台集成层，隔离第三方 API
- **handler/** — 消息处理层，解析并路由命令
- **runtime/** — 运行时层，执行 CLI 工具和管理任务
- **config/** — 配置层，从 `openbotgate.yml` / `openbotgate.json` 加载，统一导出 `config`

## 扩展支持

### 添加新的聊天平台

1. 在 `src/gateway/` 下创建新平台适配器，实现 `IGateway`
2. 在 `gateway/catalog.ts` 与 `gateway/registry.ts` 中注册
3. 在 `handler/index.ts` 中按 `gateway.id` 解析 payload

### 添加新命令

在 `src/handler/commands/` 下创建新文件，导出 `run(ctx: CommandContext): Promise<void>`，在 `src/handler/commands/index.ts` 的 `commands` 中注册。

### 启用更多 Shell 命令

在配置文件 `openbotgate.yml` 的 `allowedShellCommands` 中加入命令首词（如 `ls`、`dir`），即可通过 `/ls`、`/dir` 等调用。若需实际执行自定义脚本，可配置 `shellCommandOverrides`（如 `dir: dir.ps1`）。

### 添加新的 Code 工具（CLI 适配器）

1. 在 `src/runtime/tools/` 下新建适配器，实现 `ToolAdapter`（参见 `base.ts`）
2. 在 `src/runtime/tools/index.ts` 的 `ALL_ADAPTERS` 中注册
3. 在配置文件的 `allowedCodeTools` 中加入适配器名称；如需自定义可执行名，在 `codeToolOverrides` 中配置

## 安全考虑

- ⚠️ Shell 仅允许 `allowedShellCommands` 中的首词执行，默认仅 `git`、`pwd`
- 📝 命令执行有超时限制（默认 120s，最大 180s），防止长时间运行
- 🔒 敏感信息（appSecret、token 等）写在配置文件中；不要将 `openbotgate.yml` 提交到仓库（已列入 .gitignore），可提交 `openbotgate.example.yml` 作为模板
- 🛡️ Code 工具与 Shell 命令均通过白名单控制；可按需配合 `codeToolOverrides` / `shellCommandOverrides` 使用封装脚本

## 发布（GitHub / npm）

完整流程与 rebase 约定见 **[docs/PUBLISHING.md](docs/PUBLISHING.md)**。

## License

MIT
