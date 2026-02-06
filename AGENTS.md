# OpenGate - Agent Guidelines

AI 编程代理（OpenCode、Claude Code、Cursor 等）的代码库操作指南。

## 项目概述

OpenGate 是一个通过飞书/Lark 机器人 API 远程执行 AI 编程 CLI 工具的网关服务。

- 仓库：本地开发
- 技术栈：TypeScript, Node.js, Feishu SDK, Winston
- 运行时：Node 20+

---

## 项目结构

```
opengate/
├── src/
│   ├── index.ts           # 入口：加载 config、启动 gateway
│   ├── config/            # 配置加载
│   ├── gateway/           # 飞书连接与收发
│   ├── handler/           # 消息解析、路由、命令
│   │   ├── parse.ts       # 解析飞书 payload
│   │   └── commands/      # 按命令拆分
│   ├── runtime/           # 执行与任务
│   │   ├── executor.ts    # 底层 spawn/超时
│   │   ├── cliTools.ts    # opencode/claude/git 封装
│   │   └── taskManager.ts # 任务队列与状态
│   └── utils/             # 日志等工具
├── test/                  # 测试（与 src 分离）
├── AGENTS.md              # 本文件
├── CONTRIBUTING.md        # 贡献指南
└── package.json
```

---

## 构建与开发

```bash
pnpm install          # 安装依赖
npm run dev           # 开发模式（热重载）
npm run build         # 构建
npm start             # 生产启动
npm test              # 运行测试
npx tsc --noEmit      # 类型检查
```

单文件测试：`npx jest test/path/to/file.test.ts --verbose`

---

## 代码风格

### 通用原则

- 单文件 ~500 LOC 内；超过则拆分
- 避免 `any`；依赖类型推断，必要时显式标注
- 优先 `const`；用三元或 early return 代替 `let` + 赋值
- 优先 early return；避免 `else`
- 少用 `try/catch`；仅在必要边界处理错误
- 函数内聚；仅在复用或组合时拆分

### 命名

- 变量/函数：camelCase，尽量单词简洁（`task` 优于 `taskItem`）
- 类/接口/类型：PascalCase
- 常量：UPPER_SNAKE_CASE
- 文件：camelCase 或 kebab-case

```typescript
// Good
const task = tasks.get(id)
function execute(cmd: string) { ... }

// Bad
const currentTaskItem = tasks.get(id)
function executeCommandWithOptions(cmd: string) { ... }
```

### 控制流

```typescript
// Good: early return
function process(data: Data) {
  if (!data.valid) return null
  return transform(data)
}

// Bad: else
function process(data: Data) {
  if (data.valid) {
    return transform(data)
  } else {
    return null
  }
}
```

### 错误处理

在边界处捕获错误，内部逻辑尽量让错误冒泡：

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

// 3. 类型（如需单独导入）
import type { Task, ToolResult } from './types'
```

---

## 模块职责

| 目录 | 职责 |
|------|------|
| `gateway/` | 飞书 WebSocket 连接、发消息、回复；不处理业务逻辑 |
| `handler/` | 解析 payload、路由命令；调用 runtime 执行 |
| `handler/commands/` | 每个命令一个文件，导出 `run(ctx)` |
| `runtime/` | CLI 工具封装、底层执行、任务队列 |
| `config/` | 加载环境变量、导出 `config` 对象 |
| `utils/` | 日志、通用工具函数 |

---

## 扩展指南

### 添加新命令

1. 在 `handler/commands/` 新建文件（如 `foo.ts`）
2. 导出 `run(ctx: CommandContext): Promise<void>`
3. 在 `handler/commands/index.ts` 注册

```typescript
// handler/commands/foo.ts
export async function run(ctx: CommandContext): Promise<void> {
  await ctx.reply('Hello from /foo')
}

// handler/commands/index.ts
import { run as foo } from './foo'
export const commands: Record<string, CommandHandler> = {
  '/foo': foo,
  // ...
}
```

### 添加新 CLI 工具

1. 在 `runtime/cliTools.ts` 添加执行方法
2. 在 `config/config.ts` 的 `supportedTools` 添加开关
3. 在 `runtime/taskManager.ts` 的 switch 添加 case

### 添加新平台

1. 在 `gateway/` 新建适配器（如 `slack.ts`）
2. 实现连接、收发消息接口
3. 在 `index.ts` 初始化并挂载 handler

---

## 安全注意事项

1. **Shell 执行**：默认禁用，仅在 `TOOL_SHELL_ENABLED=true` 时启用
2. **超时**：所有命令执行有超时限制（默认 120s，最大 180s）
3. **输出截断**：限制输出长度防止内存问题
4. **敏感信息**：使用 `.env` 存储凭证，不要提交
5. **输入验证**：验证用户输入和命令参数

---

## Agent 专用注意事项

### 多 Agent 安全

当多个 agent 可能同时操作仓库时：

- **不要**随意创建/应用/丢弃 `git stash`
- **不要**随意切换分支或创建 worktree
- **commit** 时只提交你的改动，不要 `git add .` 后盲目提交
- **push** 前先 `git pull --rebase`，有冲突则停止并报告

### 回复聚焦

- 回复聚焦于你的编辑内容，不要长篇大论
- 遇到未知文件时继续工作，仅在相关时简短提及
- 高置信度回答；不确定时先验证代码

### 文件操作

- 读取文件前确认路径存在
- 编辑前先读取（使用 Read tool）
- 不要编辑 `node_modules`

### 日志与调试

```bash
DEBUG=true npm run dev   # 启用详细日志
npm run build && ls dist # 检查编译输出
```

---

## Commit 与 PR

- 遵循 Conventional Commits：`feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`
- PR 小而聚焦，一个 PR 一件事
- 逻辑变更需说明如何验证
- 参考 [CONTRIBUTING.md](./CONTRIBUTING.md)

---

## 测试

- 框架：Jest
- 测试文件：`test/**/*.test.ts`
- 运行：`npm test`
- 单文件：`npx jest test/path.test.ts --verbose`

测试真实实现，避免过度 mock。

---

## 故障排除

| 问题 | 解决方案 |
|------|----------|
| 飞书连接失败 | 检查 `FEISHU_APP_ID`/`FEISHU_APP_SECRET` 和网络 |
| 命令执行超时 | 调整 `EXECUTION_TIMEOUT` 环境变量 |
| 内存不足 | 检查 `MAX_OUTPUT_LENGTH` 设置 |
| 类型错误 | 运行 `npx tsc --noEmit` |

---

**最后更新**: 2026-02-05
