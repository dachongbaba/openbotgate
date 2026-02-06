# OpenGate

通过飞书等聊天工具的机器人API，远程执行 OpenCode、Claude Code 等 AI 编程CLI工具。

## 功能特性

- ✅ **官方SDK集成**：使用飞书官方 `@larksuiteoapi/node-sdk`，确保稳定性和兼容性
- ✅ **多连接模式**：支持 Webhook 和 WebSocket 两种连接模式
- ✅ **多工具支持**：OpenCode、Claude Code、Git、Shell 命令执行
- ✅ **同步/异步执行**：支持同步等待结果和异步后台执行
- ✅ **任务管理**：查看状态、取消任务、历史记录
- ✅ **简单配置**：仅需配置 App ID 和 App Secret 即可使用
- ✅ **安全控制**：Shell 执行默认禁用，可选择性开启
- ✅ **消息类型支持**：支持文本、富文本（Post）消息格式

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

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

### 3. 启动服务

```bash
# 开发模式（TypeScript）
npm run dev

# 生产模式
npm run build
npm start
```

服务将在 `http://0.0.0.0:3000` 启动，使用 **官方飞书SDK** 提供的Webhook和WebSocket连接模式。

### 4. 配置飞书机器人

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
   - 设置 Webhook URL：`http://your-domain.com/webhook/feishu`
5. 发布应用

## 使用方法

在飞书聊天中，使用以下命令：

### 工具执行

```
/opencode <prompt>    # 执行 OpenCode
/claudecode <prompt> # 执行 Claude Code
/git <command>       # 执行 Git 命令
/shell <command>     # 执行 Shell 命令（需要启用）
```

### 执行模式

```
/sync <tool> <command>  # 同步执行，等待结果
/async <tool> <command> # 异步执行，完成后通知
```

### 任务管理

```
/help     # 显示帮助信息
/status   # 显示系统状态
/tasks    # 列出运行中的任务
/cancel <task_id>  # 取消任务
```

### 使用示例

```
/opencode 写一个计算斐波那契数列的函数

/git status

/claudecode 为这个项目生成单元测试

/sync opencode 总结这段代码的含义

/async claude 为整个项目生成API文档
```

## 配置文件说明

| 配置项 | 说明 | 默认值 |
|-------|------|-------|
| FEISHU_APP_ID | 飞书应用ID | 必填 |
| FEISHU_APP_SECRET | 飞书应用密钥 | 必填 |
| FEISHU_VERIFICATION_TOKEN | 飞书事件订阅验证令牌 | 可选 |
| FEISHU_DOMAIN | 飞书域名（"feishu"国内版，"lark"国际版） | feishu |
| SERVER_HOST | 服务绑定地址 | 0.0.0.0 |
| SERVER_PORT | 服务端口 | 3000 |
| EXECUTION_TIMEOUT | 命令执行超时时间(毫秒) | 120000 |
| MAX_OUTPUT_LENGTH | 最大输出长度 | 10000 |
| TOOL_OPENCODE_ENABLED | 启用 OpenCode | true |
| TOOL_CLAUDE_CODE_ENABLED | 启用 Claude Code | true |
| TOOL_SHELL_ENABLED | 启用 Shell 执行 | false |
| TOOL_GIT_ENABLED | 启用 Git | true |

## 项目结构

```
opengate/
├── src/
│   ├── config/           # 配置管理
│   │   └── config.ts
│   ├── gateway/          # 外部平台网关
│   │   └── feishu.ts     # 飞书API集成
│   ├── handler/          # 消息处理
│   │   ├── index.ts      # 路由入口
│   │   ├── parse.ts      # 消息解析
│   │   ├── types.ts      # 类型定义
│   │   └── commands/     # 命令处理器
│   │       ├── index.ts  # 命令注册
│   │       ├── utils.ts  # 共享工具
│   │       ├── opencode.ts
│   │       ├── claude.ts
│   │       ├── git.ts
│   │       ├── shell.ts
│   │       ├── sync.ts
│   │       ├── async.ts
│   │       ├── tasks.ts
│   │       ├── cancel.ts
│   │       ├── status.ts
│   │       └── help.ts
│   ├── runtime/          # 运行时服务
│   │   ├── executor.ts   # 命令执行器
│   │   ├── cliTools.ts   # CLI工具封装
│   │   └── taskManager.ts # 任务管理
│   ├── utils/            # 通用工具
│   │   └── logger.ts
│   └── index.ts          # 入口文件
├── test/                 # 测试文件
│   ├── handler/
│   └── runtime/
├── AGENTS.md             # AI编程指南
├── CONTRIBUTING.md       # 贡献指南
├── package.json
├── tsconfig.json
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

## License

MIT
