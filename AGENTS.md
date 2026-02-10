# OpenBotGate - Agent Guidelines

AI 编程代理（OpenCode、Claude Code、Cursor 等）的代码库操作指南。

## 快速命令

```bash
pnpm install              # 安装依赖
npm run dev               # 开发模式（热重载）
npm run build             # 构建：tsc 编译到 dist/
npm run test              # 运行所有测试
npx tsc --noEmit          # 类型检查
npx jest test/path.test.ts --verbose  # 单文件测试
npm run test:coverage     # 测试覆盖率
DEBUG=true npm run dev    # 启用详细日志
```

## 技术栈

- **运行时**：Node.js 20+
- **语言**：TypeScript (strict 模式)
- **包管理器**：pnpm
- **测试**：Jest + ts-jest
- **配置**：仅从 `openbotgate.yml/json` 加载，不使用环境变量

## 代码风格

### 核心原则
**简洁高效，易读易扩展** — 能少写就少写、逻辑清晰、便于扩展；不堆砌抽象。

### 通用规则
- 单文件 ~500 LOC 内；超过则拆分
- 避免 `any`；依赖类型推断，必要时显式标注
- 优先 `const`；用三元或 early return 代替 `let` + 赋值
- 优先 early return；避免 `else`
- 少用 `try/catch`；仅在必要边界处理错误
- 函数内聚；仅在复用或组合时拆分

### 命名约定
| 类型 | 风格 | 示例 |
|------|------|------|
| 变量/函数 | camelCase | `taskManager`, `getUser()` |
| 类/接口/类型 | PascalCase | `TaskManager`, `BotConfig` |
| 常量 | UPPER_SNAKE_CASE | `MAX_TIMEOUT_MS` |
| 文件 | camelCase 或 kebab-case | `config.ts`, `task-manager.ts` |

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

## 项目结构

```
openbotgate/
├── src/
│   ├── index.ts           # 入口
│   ├── config/            # 配置加载
│   ├── gateway/           # 多网关抽象
│   ├── handler/           # 消息解析、路由、命令
│   │   ├── commands/      # 静态命令 (help, status, tasks, code, shell)
│   │   └── code/          # Code 相关命令 (new, model, session, agent, workspace)
│   ├── runtime/            # 执行与任务
│   │   ├── executor.ts    # 底层 spawn/超时
│   │   ├── cliTools.ts    # CLI 调用入口
│   │   ├── taskManager.ts # 任务队列
│   │   ├── sessionManager.ts
│   │   └── tools/         # Code 工具适配器
│   └── utils/             # logger、encoding
├── test/                  # 测试文件
└── docs/
```

## 模块职责

| 目录 | 职责 |
|------|------|
| `gateway/` | 多网关抽象，Feishu/Telegram/Discord/WhatsApp/QQ 实现 |
| `handler/` | 消息解析、去重、路由命令 |
| `runtime/` | CLI 执行、任务队列、ToolAdapter |
| `config/` | 从配置文件加载并导出 `config` |
| `utils/` | 日志、编码等通用工具 |

## Git 规范

- **不要**随意创建/应用/丢弃 `git stash`
- **不要**随意切换分支或创建 worktree
- commit 时**只提交**你的改动，**不要** `git add .`
- push 前先 `git pull --rebase`，有冲突则**停止并报告**
- 遵循 Conventional Commits：`feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`

## 测试

- 框架：**Jest**
- 测试文件：`test/**/*.test.ts`
- 避免过度 mock，测试真实实现

---

**最后更新**：2026-02-10
