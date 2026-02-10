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

### 发布前：npm 账号要求

官方 npm 要求发布包时满足以下**其一**，否则会报 `403 Forbidden - Two-factor authentication or granular access token with bypass 2fa enabled is required`：

1. **为账号开启双因素认证（2FA）**  
   登录 [npmjs.com](https://www.npmjs.com) → Account → **Add two-factor authentication**，按页面提示完成。发布时 `npm login` 会要求输入一次性验证码。

2. **使用 Granular Access Token（细粒度令牌）并勾选“Bypass 2FA”**  
   [npmjs.com](https://www.npmjs.com) → Account → **Access Tokens** → **Generate New Token** → 选择 **Granular Access Token**，权限勾选 **Packages: Read and write**，并勾选 **Bypass 2FA for publish**。

**已有 token 时如何使用：**

- **本地发布（推荐）**：执行 `npm login --registry=https://registry.npmjs.org/`，Username 填 npm 用户名，**Password 填 token**（不是账号密码），Email 填账号邮箱。登录成功后直接执行 `npm publish --registry=https://registry.npmjs.org/` 即可。
- **CI/脚本**：在 `.npmrc` 中写 `//registry.npmjs.org/:_authToken=${NPM_TOKEN}`，在 CI 或本机设置环境变量 `NPM_TOKEN` 为 token 后再执行 `npm publish`；勿将 token 明文提交到仓库。

完成其一后再执行下面的登录与发布命令。

---

若本机 npm 使用了镜像（如 npmmirror），登录和发布会走镜像站。要发布到 **官方 npm**，请在命令中临时指定官方仓库地址：

```bash
# 登录官方 npm
npm login --registry=https://registry.npmjs.org/

# 发布到官方 npm
npm publish --registry=https://registry.npmjs.org/
```

以下流程均以发布到官方 npm 为例；若使用镜像或私有源，可去掉 `--registry` 或改为对应地址。

### 首次发布

1. 登录 npm（若未登录），使用官方仓库：

```bash
npm login --registry=https://registry.npmjs.org/
```

2. 可选：确认将要打包的文件，避免误发：

```bash
npm pack --dry-run
```

3. 发布。会先执行 `prepublishOnly`（即 `npm run build`），再打包上传：

```bash
npm publish --registry=https://registry.npmjs.org/
```

- 私有包：`npm publish --registry=https://registry.npmjs.org/ --access restricted`
- 作用域包（如 `@your-org/openbotgate`）首次发布：`npm publish --registry=https://registry.npmjs.org/ --access public`

### 日常更新

1. 更新 `package.json` 的 `version`（如 `npm version patch`）。
2. 执行（使用官方仓库时）：

```bash
npm publish --registry=https://registry.npmjs.org/
```

---

## 安装端已知问题（用户执行 `npm install -g openbotgate` 时）

- **Windows EBUSY**：卸载或覆盖安装时可能出现 `EBUSY`（如 `@matrix-org/matrix-sdk-crypto-nodejs`），多为文件被占用，建议用户关闭占用进程后重试。

---

## 简要速查

| 场景           | 命令 |
|----------------|------|
| 首次推送到 GitHub | `git remote add origin <repo-url>` → `git push -u origin main` |
| 日常推送到 GitHub | `git pull --rebase origin main` → `git push origin main` |
| 首次发布到 npm（官方） | `npm login --registry=https://registry.npmjs.org/` → `npm publish --registry=https://registry.npmjs.org/` |
| 日常发布到 npm（官方） | 改 version → `npm publish --registry=https://registry.npmjs.org/` |
