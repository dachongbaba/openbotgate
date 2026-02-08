# OpenBotGate 发布方式

本文档记录将 OpenBotGate 发布到 GitHub 与 npm 的流程及约定。

## 发布前检查

- **仓库地址**：`package.json`、README、`bin/openbotgate.js` 中的 GitHub 用户名/组织名与实际情况一致（当前为 `dachongbaba/openbotgate`）。
- **版本号**：按 [语义化版本](https://semver.org/) 更新 `package.json` 的 `version`。
- **LICENSE**：根目录已包含 MIT 许可证，可按需修改版权方。

---

## 发布到 GitHub

### 首次发布（新仓库）

1. 在 GitHub 创建仓库（如 `dachongbaba/openbotgate`）。
2. 本地添加远程并推送：

```bash
git remote add origin https://github.com/dachongbaba/openbotgate.git
git push -u origin main
```

若主分支名为 `master`，将上述 `main` 改为 `master`。若远程已存在但 URL 不对：

```bash
git remote set-url origin https://github.com/dachongbaba/openbotgate.git
```

### 日常更新（推荐 rebase 方式）

与 [AGENTS.md](../AGENTS.md) 约定一致：**push 前先 `git pull --rebase`**，保持线性历史；有冲突则解决后继续，无法解决则停止并报告。

```bash
# 拉取远程并 rebase 到当前分支顶端
git pull --rebase origin main

# 若有冲突：解决后执行
# git add .
# git rebase --continue

# 推送到 GitHub
git push origin main
```

**为何用 rebase**：提交历史为一条直线，便于回溯与 code review；与项目 Agent 指南一致。

**若选择 merge 方式**（保留合并提交）：

```bash
git pull origin main
git push origin main
```

---

## 发布到 npm

### 首次发布

1. 登录 npm（若未登录）：

```bash
npm login
```

2. 可选：确认将要打包的文件，避免误发：

```bash
npm pack --dry-run
```

3. 发布。会先执行 `prepublishOnly`（即 `npm run build`），再打包上传：

```bash
npm publish
```

- 私有包：`npm publish --access restricted`
- 作用域包（如 `@your-org/openbotgate`）首次发布：`npm publish --access public`

### 日常更新

1. 更新 `package.json` 的 `version`（如 `npm version patch`）。
2. 执行：

```bash
npm publish
```

---

## 简要速查

| 场景           | 命令 |
|----------------|------|
| 首次推送到 GitHub | `git remote add origin <repo-url>` → `git push -u origin main` |
| 日常推送到 GitHub | `git pull --rebase origin main` → `git push origin main` |
| 首次发布到 npm   | `npm login` → `npm publish` |
| 日常发布到 npm   | 改 version → `npm publish` |
