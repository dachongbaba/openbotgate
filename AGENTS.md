# OpenBotGate - Agent Guidelines

AI 编程代理（OpenCode、Claude Code、Cursor 等）的代码库操作指南。

## 项目概述

OpenBotGate 是通过飞书/Lark 等聊天渠道远程执行 AI 编程 CLI（OpenCode、Claude Code、Cursor 等）的网关服务。飞书侧使用**官方 SDK 长连接**接收事件，无需本地 HTTP 服务或公网 Webhook 地址。

- 技术栈：TypeScript, Node.js, Feishu SDK, Winston
- 运行时：Node 20+
- 包管理器：pnpm

## 项目结构

```
openbotgate/
├── src/
│   ├── index.ts           # 入口：加载 config、注册 tools、启动 gateway
│   ├── config/            # 配置加载（config.ts）
│   ├── gateway/           # 多网关：catalog、registry、feishu/telegram/discord/whatsapp/qq、index 统一导出
│   ├── handler/           # 消息解析、路由、命令
│   │   ├── index.ts       # 路由入口
│   │   ├── parse.ts       # 解析飞书 payload
│   │   ├── dedup.ts       # 去重
│   │   ├── types.ts
│   │   ├── commands/      # help、status、tasks、code、shell
│   │   └── code/          # new、model、session、agent、workspace
│   ├── runtime/           # 执行与任务
│   │   ├── executor.ts    # 底层 spawn/超时
│   │   ├── cliTools.ts    # CLI 调用
│   │   ├── taskManager.ts # 任务队列与状态
│   │   ├── sessionManager.ts
│   │   ├── streamHandler.ts
│   │   └── tools/         # Code 工具适配器（ToolAdapter）
│   │       ├── base.ts, registry.ts, index.ts
│   │       └── opencode、claudecode、cursorcode、openaicodex、qwencode、kimicode、openclaw、nanobot
│   └── utils/             # logger、encoding
├── test/                  # 测试（handler、runtime、utils）
├── docs/                  # GATEWAYS.md、PUBLISHING.md
├── AGENTS.md              # 本文件
├── CONTRIBUTING.md
├── package.json
├── tsconfig.json
├── tsconfig.test.json
└── jest.config.js
```

## 构建与开发

```bash
pnpm install              # 安装依赖
npm run dev               # 开发模式（热重载）
npm run build             # 构建：tsc 编译到 dist/
npm run test              # 运行所有测试
npx tsc --noEmit          # 类型检查
npx jest test/path.test.ts --verbose  # 单文件测试
DEBUG=true npm run dev    # 启用详细日志
```

## 配置要点

- **配置文件**：从当前工作目录读取 `openbotgate.yml`、`openbotgate.yaml` 或 `openbotgate.json`（YAML 支持注释）。可复制 `openbotgate.example.yml` 为 `openbotgate.yml` 后修改。**不再通过环境变量加载配置**，所有配置写在配置文件中。
- **网关**：配置中 `gateway.type`（如 `feishu`）；飞书需 `feishu.appId`、`feishu.appSecret`、`feishu.verificationToken`、`feishu.domain`。
- **执行**：`execution.timeout`、`execution.codeTimeout`、`execution.maxOutputLength`；Windows 下可设 `execution.shellOutputEncoding`（如 `gbk`）。
- **白名单**：`allowedCodeTools`、`allowedShellCommands` 列表；未在文件中设置时使用默认列表。
- **Code 命令覆盖**：`codeToolCommandOverrides`（如 `claudecode: claude.ps1`），用于某适配器实际调用的命令/脚本。
- **Shell 命令覆盖**：`shellCommandOverrides`（如 `git: git.ps1`），用于某 shell 命令首词实际调用的命令/脚本。

## 代码风格

### 通用原则

- 单文件 ~500 LOC 内；超过则拆分
- 避免 `any`；依赖类型推断，必要时显式标注
- 优先 `const`；用三元或 early return 代替 `let` + 赋值
- 优先 early return；避免 `else`
- 少用 `try/catch`；仅在必要边界处理错误
- 函数内聚；仅在复用或组合时拆分

### 命名

- 变量/函数：camelCase，尽量简洁（`task` 优于 `taskItem`）
- 类/接口/类型：PascalCase
- 常量：UPPER_SNAKE_CASE
- 文件：camelCase 或 kebab-case

### 控制流

```typescript
// Good: early return
function process(data: Data) {
  if (!data.valid) return null
  return transform(data)
}
```

### 错误处理

在边界处捕获错误，内部逻辑让错误冒泡：

```typescript
// 边界：handler 入口
async function handleEvent(data: any): Promise<void> {
  try {
    const parsed = parseEvent(data)
    await routeCommand(parsed)
  } catch (error) {
    logger.error('Event handling failed', { error })
  }
}

// 内部：让错误冒泡
function parseEvent(data: any): ParsedEvent {
  const content = JSON.parse(data.message.content)
  return { messageId: data.message.message_id, text: content.text }
}
```

### 导入顺序

```typescript
// 1. Node/第三方
import { spawn } from 'child_process'
import * as Lark from '@larksuiteoapi/node-sdk'

// 2. 项目模块
import { config } from '../config/config'
import logger from '../utils/logger'

// 3. 类型
import type { Task, ToolResult } from './types'
```

## 模块职责

| 目录 | 职责 |
|------|------|
| `gateway/` | 多网关抽象(IGateway)、目录(catalog)、注册表(registry)、Feishu 实现；`index.ts` 统一导出；按 `GATEWAY_TYPE` 启动 |
| `handler/` | 解析 payload、去重、路由命令；调用 runtime 执行 |
| `handler/commands/` | 静态命令：每命令一文件，导出 `run(ctx)`；shell 由 `createShellHandler(name)` 按白名单动态创建 |
| `handler/code/` | Code 相关命令：`/new`、`/model`、`/session`、`/agent`、`/workspace` 等 |
| `runtime/` | 底层执行(executor)、任务队列(taskManager)、CLI 调用(cliTools)；`runtime/tools/` 为各 CLI 的 ToolAdapter 及注册表 |
| `config/` | 加载环境变量、导出 `config`（含 `allowedCodeTools`、`allowedShellCommands` 白名单） |
| `utils/` | 日志、编码等通用工具 |

## 扩展指南

### 添加新命令

1. **静态命令**：在 `handler/commands/` 或 `handler/code/` 新建文件（如 `foo.ts`），导出 `run(ctx: CommandContext): Promise<void>`，在 `handler/commands/index.ts` 的 `commands` 中注册。
2. **Shell 白名单命令**：在 `config` 的 `allowedShellCommands`（或环境变量 `ALLOWED_SHELL_COMMANDS`）中加入首词，即可通过 `/首词 ...` 调用，无需新文件。

### 添加新 CLI 工具（Code 类适配器）

1. 在 `runtime/tools/` 新建适配器文件，实现 `ToolAdapter`（继承或实现 `runtime/tools/base.ts` 的接口）。
2. 在 `runtime/tools/index.ts` 的 `ALL_ADAPTERS` 中加入该适配器实例，由 `registerAll(toolRegistry)` 统一注册。
3. 在 `config/config.ts` 的 `DEFAULT_ALLOWED_CODE_TOOLS`（或环境变量 `ALLOWED_CODE_TOOLS`）中加入适配器内部名称，以加入白名单。

### 添加新网关

1. 在 `gateway/catalog.ts` 的 `GATEWAY_CATALOG` 添加条目（`implemented: true` 待实现后改为 true）
2. 在 `gateway/` 新建实现文件，实现 `IGateway`（`id`、`start`、`reply`、`send`）
3. 在 `gateway/registry.ts` 的 `getGateway()` 中增加分支返回该网关实例
4. 在 `handler/index.ts` 的 `handleMessageEvent` 中按 `gateway.id` 解析 payload 并组 ctx

## 安全注意事项

1. **Shell 执行**：通过 `allowedShellCommands` 白名单控制（环境变量 `ALLOWED_SHELL_COMMANDS`），仅列表内首词可执行；默认含 `git`、`dir`、`ls`、`pwd`。
2. **Code 工具**：通过 `allowedCodeTools` 白名单控制（环境变量 `ALLOWED_CODE_TOOLS`），仅列表内适配器可被调用。
3. **超时**：所有命令执行有超时限制（默认 120s，最大 180s，见 `MAX_EXECUTION_TIMEOUT_MS`）。
4. **输出截断**：`config.execution.maxOutputLength` 限制输出长度，防止内存问题。
5. **敏感信息**：使用 `.env` 存储凭证，不要提交。
6. **输入验证**：验证用户输入和命令参数。

## Agent 专用注意事项

### Git 操作

- 不要随意创建/应用/丢弃 `git stash`
- 不要随意切换分支或创建 worktree
- commit 时只提交你的改动，不要 `git add .` 后盲目提交
- push 前先 `git pull --rebase`，有冲突则停止并报告

### 文件操作

- 编辑前先读取文件
- 不要编辑 `node_modules`

### 测试

- 框架：Jest
- 测试文件：`test/**/*.test.ts`
- 避免过度 mock，测试真实实现

## Commit 与 PR

- 遵循 Conventional Commits：`feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`
- PR 小而聚焦，一个 PR 一件事

---

**最后更新**: 2025-02-08