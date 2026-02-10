# 测试覆盖率报告

由 `pnpm test:coverage` 生成，本文件由 `scripts/coverage-to-markdown.js` 从 `coverage-summary.json` 生成。

## 汇总

| 指标 | 覆盖率 | 已覆盖 / 总数 |
|------|--------|----------------|
| 语句 (Statements) | 46.85% | 558 / 1191 |
| 分支 (Branches)   | 26.78% | 120 / 448 |
| 函数 (Functions)  | 40.95% | 86 / 210 |
| 行 (Lines)        | 48.82% | 538 / 1102 |

## config

| 文件 | 语句 | 分支 | 函数 | 行 |
|------|------|------|------|-----|
| config/config.ts | 93.33% | 81.81% | 100.00% | 97.61% |

## gateway

| 文件 | 语句 | 分支 | 函数 | 行 |
|------|------|------|------|-----|
| gateway/catalog.ts | 100.00% | 100.00% | 100.00% | 100.00% |
| gateway/feishu.ts | 11.42% | 0.00% | 4.54% | 13.33% |
| gateway/registry.ts | 79.31% | 100.00% | 44.44% | 76.92% |

## handler

| 文件 | 语句 | 分支 | 函数 | 行 |
|------|------|------|------|-----|
| handler/code/agent.ts | 11.76% | 0.00% | 0.00% | 11.76% |
| handler/code/model.ts | 11.76% | 0.00% | 0.00% | 11.76% |
| handler/code/new.ts | 35.71% | 0.00% | 0.00% | 35.71% |
| handler/code/session.ts | 13.79% | 0.00% | 0.00% | 13.79% |
| handler/code/workspace.ts | 16.66% | 0.00% | 0.00% | 16.66% |
| handler/commands/code.ts | 11.11% | 0.00% | 0.00% | 11.32% |
| handler/commands/help.ts | 100.00% | 50.00% | 100.00% | 100.00% |
| handler/commands/shell.ts | 29.03% | 8.33% | 28.57% | 30.50% |
| handler/commands/status.ts | 100.00% | 100.00% | 100.00% | 100.00% |
| handler/commands/tasks.ts | 11.76% | 0.00% | 0.00% | 11.76% |
| handler/dedup.ts | 92.85% | 50.00% | 100.00% | 92.85% |
| handler/parse.ts | 100.00% | 78.94% | 100.00% | 100.00% |

## runtime

| 文件 | 语句 | 分支 | 函数 | 行 |
|------|------|------|------|-----|
| runtime/cliTools.ts | 82.85% | 55.55% | 75.00% | 82.85% |
| runtime/executor.ts | 67.27% | 40.00% | 58.33% | 67.92% |
| runtime/sessionManager.ts | 63.63% | 66.66% | 63.63% | 64.06% |
| runtime/streamHandler.ts | 86.66% | 75.00% | 83.33% | 86.66% |
| runtime/taskManager.ts | 77.61% | 57.14% | 75.00% | 76.56% |
| runtime/tools/base.ts | 54.54% | 56.25% | 44.44% | 56.25% |
| runtime/tools/claudecode.ts | 73.68% | 40.00% | 50.00% | 82.35% |
| runtime/tools/cursorcode.ts | 19.04% | 0.00% | 12.50% | 21.05% |
| runtime/tools/geminicode.ts | 24.00% | 0.00% | 25.00% | 27.27% |
| runtime/tools/kimicode.ts | 46.15% | 0.00% | 50.00% | 46.15% |
| runtime/tools/nanobot.ts | 30.00% | 0.00% | 25.00% | 30.00% |
| runtime/tools/openaicodex.ts | 33.33% | 0.00% | 33.33% | 35.29% |
| runtime/tools/openclaw.ts | 14.63% | 0.00% | 9.09% | 18.75% |
| runtime/tools/opencode.ts | 35.89% | 13.33% | 22.22% | 46.66% |
| runtime/tools/qwencode.ts | 42.85% | 0.00% | 33.33% | 42.85% |
| runtime/tools/registry.ts | 69.23% | 100.00% | 42.85% | 75.00% |

## utils

| 文件 | 语句 | 分支 | 函数 | 行 |
|------|------|------|------|-----|
| utils/encoding.ts | 53.84% | 37.50% | 100.00% | 60.00% |
| utils/logger.ts | 65.11% | 43.90% | 29.16% | 73.52% |
