# OpenGate - Agent Guidelines

本文档为AI编程代理（如OpenCode）提供代码库的操作指南和规范。

## 项目概述

OpenGate是一个通过飞书/Lark机器人API远程执行AI编程CLI工具（OpenCode、Claude Code等）的网关服务。使用TypeScript开发，基于飞书官方SDK。

## 构建和开发命令

### 基本命令
```bash
# 安装依赖
pnpm install

# 开发模式（TypeScript热重载）
npm run dev

# 构建项目
npm run build

# 启动生产服务
npm start

# 调试模式
npm run debug

# 运行测试
npm test
```

### 单文件测试
项目使用Jest进行测试，测试文件位于 `test/` 目录。要运行单个测试文件：
```bash
# 如果package.json中有jest配置
npx jest test/services/commandExecutor.test.ts --verbose

# 或使用npm脚本（如果配置了）
npm test -- test/services/commandExecutor.test.ts
```

### 类型检查和编译
```bash
# TypeScript类型检查
npx tsc --noEmit

# 编译并生成声明文件
npx tsc
```

## 代码风格指南

### 文件结构
- 源代码位于 `src/` 目录
- 测试位于 `test/` 目录（与 src 分离）
- 编译输出位于 `dist/` 目录
- 配置文件在 `src/config/`
- 处理器在 `src/handlers/`
- 服务在 `src/services/`
- 工具类在 `src/utils/`

### 导入顺序
```typescript
// 1. 第三方库
import * as dotenv from 'dotenv';
import winston from 'winston';

// 2. 项目模块
import logger from '../utils/logger';
import { config } from '../config/config';

// 3. 类型定义
import { ToolResult, ExecutionOptions } from './types';
```

### 命名约定
- **类名**: PascalCase（如 `CLITools`, `TaskManager`）
- **变量/函数名**: camelCase（如 `executeCommand`, `maxRetries`）
- **常量**: UPPER_SNAKE_CASE（如 `MAX_TIMEOUT`, `DEFAULT_PORT`）
- **接口**: PascalCase（如 `BotConfig`, `ToolResult`）
- **类型别名**: PascalCase（如 `ExecutionCallback`, `MessageHandler`）
- **文件名**: camelCase或kebab-case（如 `cliTools.ts`, `message-handler.ts`）

### 类型注解
```typescript
// 显式类型注解
function calculateTotal(items: Item[]): number {
  return items.reduce((sum, item) => sum + item.price, 0);
}

// 接口定义
export interface ToolResult {
  tool: string;
  success: boolean;
  output: string;
  error?: string;  // 可选属性
  duration: number;
}

// 类型别名
export type ExecutionCallback = (result: ToolResult) => void;
```

### 错误处理
```typescript
// 使用try-catch处理异步错误
try {
  const result = await commandExecutor.execute(command, options);
  return {
    success: true,
    output: result.stdout,
    duration: Date.now() - startTime,
  };
} catch (error: any) {
  logger.error(`Command execution failed: ${error.message}`);
  return {
    success: false,
    output: '',
    error: error.message,
    duration: Date.now() - startTime,
  };
}

// 使用类型守卫
function isNetworkError(error: unknown): error is NetworkError {
  return (error as NetworkError).code !== undefined;
}
```

### 日志记录
```typescript
import logger from '../utils/logger';

// 不同级别的日志
logger.info('Service started successfully');
logger.warn('Configuration missing, using defaults');
logger.error('Failed to connect to Feishu API', { error: err });
logger.debug('Debug information', { data: someData });
```

### 异步编程
```typescript
// 使用async/await
async function processMessage(message: Message): Promise<Response> {
  const parsed = await parseMessage(message);
  const result = await executeTool(parsed.command);
  return formatResponse(result);
}

// 处理Promise链
function executeWithTimeout(
  promise: Promise<any>,
  timeout: number
): Promise<any> {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Timeout')), timeout)
    ),
  ]);
}
```

### 配置管理
- 使用 `src/config/config.ts` 中的 `loadConfig()` 函数
- 环境变量通过 `.env` 文件管理
- 配置类型通过 `BotConfig` 接口定义
- 所有配置应通过 `config` 对象访问

### 格式化规则
- 使用2个空格缩进
- 字符串使用单引号（`'`）
- 语句末尾加分号
- 对象和数组使用尾随逗号
- 最大行长度：80-100字符

## 项目特定约定

### 飞书集成
- 使用官方 `@larksuiteoapi/node-sdk`
- WebSocket连接用于实时事件
- 消息处理器在 `src/handlers/messageHandlerOfficial.ts`
- 服务层在 `src/services/feishuServiceOfficial.ts`

### CLI工具执行
- 工具执行器在 `src/services/cliTools.ts`
- 命令执行器在 `src/services/commandExecutor.ts`
- 支持的工具：OpenCode、Claude Code、Git、Shell
- Shell执行默认禁用（安全考虑）

### 任务管理
- 简化任务管理器在 `src/services/taskManagerSimple.ts`
- 支持同步/异步执行模式
- 任务状态跟踪和取消功能

## 安全注意事项

1. **Shell执行**: 默认禁用，仅在受信任环境中启用
2. **超时限制**: 所有命令执行都有超时限制
3. **输出限制**: 限制命令输出长度防止内存问题
4. **敏感信息**: 使用环境变量存储凭证
5. **输入验证**: 验证所有用户输入和命令

## 扩展指南

### 添加新工具
1. 在 `src/services/cliTools.ts` 中添加新的执行方法
2. 在 `BotConfig` 接口中添加配置项
3. 在 `loadConfig()` 函数中添加环境变量解析
4. 在消息处理器中注册新的命令

### 添加新平台
1. 在 `src/services/` 下创建平台适配器
2. 实现消息接收和发送接口
3. 在入口文件中注册webhook端点

## 故障排除

### 常见问题
1. **飞书连接失败**: 检查App ID/Secret和网络配置
2. **命令执行超时**: 调整 `EXECUTION_TIMEOUT` 环境变量
3. **内存不足**: 检查 `MAX_OUTPUT_LENGTH` 设置
4. **类型错误**: 运行 `npx tsc --noEmit` 检查类型

### 调试技巧
```bash
# 启用详细日志
DEBUG=true npm run dev

# 检查编译输出
npm run build && ls -la dist/

# 测试单个功能
npm run debug
```

## 最佳实践

1. **代码复用**: 使用现有工具和服务，避免重复代码
2. **错误处理**: 所有外部调用都应包含错误处理
3. **日志记录**: 关键操作和错误都应记录日志
4. **类型安全**: 充分利用TypeScript的类型系统
5. **配置驱动**: 将可变参数提取到配置中
6. **测试覆盖**: 为新功能添加单元测试

---

**最后更新**: 2026-02-04  
**项目版本**: 1.0.0  
**技术栈**: TypeScript, Node.js, Feishu SDK, Winston