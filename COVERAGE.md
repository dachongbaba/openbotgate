# 测试覆盖率报告

由 `pnpm test:coverage` 生成，本文件由 `scripts/coverage-to-markdown.js` 从 `coverage-summary.json` 生成。

## 汇总

| 指标 | 覆盖率 | 已覆盖 / 总数 |
|------|--------|----------------|
| 语句 (Statements) | 64.62% | 769 / 1190 |
| 分支 (Branches)   | 43.53% | 202 / 464 |
| 函数 (Functions)  | 52.09% | 112 / 215 |
| 行 (Lines)        | 67.63% | 742 / 1097 |

## config

| 文件 | 语句 | 分支 | 函数 | 行 |
|------|------|------|------|-----|
| config/config.ts | 93.33% | 90.90% | 100.00% | 97.61% |

## gateway

| 文件 | 语句 | 分支 | 函数 | 行 |
|------|------|------|------|-----|
| gateway/catalog.ts | 100.00% | 100.00% | 100.00% | 100.00% |
| gateway/feishu.ts | 11.21% | 0.00% | 4.16% | 13.33% |
| gateway/registry.ts | 79.31% | 100.00% | 44.44% | 76.92% |

## handler

| 文件 | 语句 | 分支 | 函数 | 行 |
|------|------|------|------|-----|
| handler/code/agent.ts | 100.00% | 100.00% | 100.00% | 100.00% |
| handler/code/model.ts | 100.00% | 100.00% | 100.00% | 100.00% |
| handler/code/new.ts | 92.85% | 100.00% | 100.00% | 92.85% |
| handler/code/session.ts | 100.00% | 100.00% | 100.00% | 100.00% |
| handler/code/workspace.ts | 100.00% | 87.50% | 100.00% | 100.00% |
| handler/commands/code.ts | 59.25% | 33.33% | 50.00% | 60.37% |
| handler/commands/help.ts | 100.00% | 50.00% | 100.00% | 100.00% |
| handler/commands/shell.ts | 79.36% | 51.85% | 85.71% | 80.00% |
| handler/commands/status.ts | 100.00% | 100.00% | 100.00% | 100.00% |
| handler/commands/tasks.ts | 94.11% | 75.00% | 100.00% | 94.11% |
| handler/dedup.ts | 100.00% | 100.00% | 100.00% | 100.00% |
| handler/parse.ts | 100.00% | 95.45% | 100.00% | 100.00% |

## runtime

| 文件 | 语句 | 分支 | 函数 | 行 |
|------|------|------|------|-----|
| runtime/cliTools.ts | 82.85% | 66.66% | 75.00% | 82.85% |
| runtime/executor.ts | 67.27% | 53.33% | 58.33% | 67.92% |
| runtime/sessionManager.ts | 76.47% | 60.00% | 72.72% | 75.75% |
| runtime/streamHandler.ts | 86.66% | 75.00% | 83.33% | 86.66% |
| runtime/taskManager.ts | 77.61% | 57.14% | 75.00% | 76.56% |
| runtime/tools/base.ts | 52.94% | 50.00% | 44.44% | 54.54% |
| runtime/tools/claudecode.ts | 73.68% | 40.00% | 50.00% | 82.35% |
| runtime/tools/cursorcode.ts | 19.04% | 0.00% | 12.50% | 21.05% |
| runtime/tools/geminicode.ts | 24.00% | 0.00% | 25.00% | 27.27% |
| runtime/tools/kimicode.ts | 46.15% | 0.00% | 50.00% | 46.15% |
| runtime/tools/nanobot.ts | 29.03% | 0.00% | 25.00% | 29.03% |
| runtime/tools/openaicodex.ts | 33.33% | 0.00% | 33.33% | 35.29% |
| runtime/tools/openclaw.ts | 14.63% | 0.00% | 9.09% | 18.75% |
| runtime/tools/opencode.ts | 35.89% | 13.33% | 22.22% | 46.66% |
| runtime/tools/qwencode.ts | 42.85% | 0.00% | 33.33% | 42.85% |
| runtime/tools/registry.ts | 100.00% | 100.00% | 100.00% | 100.00% |

## utils

| 文件 | 语句 | 分支 | 函数 | 行 |
|------|------|------|------|-----|
| utils/encoding.ts | 73.07% | 50.00% | 100.00% | 80.00% |
| utils/logger.ts | 65.11% | 43.90% | 29.16% | 73.52% |
