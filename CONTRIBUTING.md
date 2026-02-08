# Contributing to OpenBotGate

欢迎为 OpenBotGate 贡献代码！

---

## 贡献类型

以下类型的贡献通常会被接受：

- Bug 修复
- 新 CLI 工具支持
- 新消息平台适配
- 性能优化
- 文档改进

大功能或架构变更请先开 Issue 讨论。

---

## 开发流程

### 环境准备

```bash
# 克隆仓库
git clone <repo-url>
cd openbotgate

# 安装依赖
pnpm install

# 开发模式
npm run dev
```

### 开发命令

```bash
npm run dev       # 开发模式（热重载）
npm run build     # 构建
npm test          # 运行测试
npx tsc --noEmit  # 类型检查
```

---

## PR 规范

### Issue 先行

**所有 PR 必须关联已有 Issue**。在开 PR 前，先开 Issue 描述问题或功能。

- 使用 `Fixes #123` 或 `Closes #123` 链接 Issue
- 小修复可以简短描述

### 基本要求

- PR 小而聚焦，一个 PR 一件事
- 说明问题和为什么你的改动能解决它
- 新功能前确认现有代码中没有类似实现

### PR 标题

遵循 Conventional Commits：

- `feat:` 新功能
- `fix:` Bug 修复
- `docs:` 文档变更
- `chore:` 维护性工作（依赖更新等）
- `refactor:` 重构（不改变行为）
- `test:` 添加或更新测试

示例：

- `feat: add slack gateway support`
- `fix: resolve timeout issue in opencode execution`
- `docs: update AGENTS.md with new structure`

### 逻辑变更

对于非 UI 变更（Bug 修复、新功能、重构），说明**如何验证**：

- 测试了什么？
- 如何复现/确认修复？

---

## AI 辅助 PR

使用 AI 工具（Codex、Claude、Cursor 等）辅助的 PR？**非常欢迎！**

请在 PR 中：

- [ ] 在标题或描述中标注为 AI 辅助
- [ ] 说明测试程度（未测试 / 简单测试 / 完整测试）
- [ ] 可选：附上 prompts 或 session 日志
- [ ] 确认你理解代码做了什么

AI PR 是一等公民。我们只需要透明度以便 reviewer 知道关注什么。

### 禁止大段 AI 废话

冗长的 AI 生成描述不被接受。请：

- 简短、聚焦的描述
- 用自己的话说明改了什么、为什么
- 如果无法简短说明，PR 可能太大了

---

## 代码风格

参考 [AGENTS.md](./AGENTS.md) 中的代码风格部分。

简要提示：

- 函数内聚，除非复用/组合才拆分
- 避免不必要的解构
- 避免 `else`，使用 early return
- 优先 `.catch()` 而非 `try/catch`（可行时）
- 避免 `any`，使用精确类型
- 优先 `const`，避免 `let`
- 简洁命名，单词够用时不用多词

---

## 提交规范

- 遵循 Conventional Commits
- 提交信息简洁，说明「为什么」而非「什么」
- 相关变更合并为一个提交
- 不要混入无关重构

---

## 测试

- 为新功能添加测试
- 确保现有测试通过：`npm test`
- 类型检查：`npx tsc --noEmit`

---

感谢你的贡献！
