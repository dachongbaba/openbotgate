import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import * as fs from 'fs';
import * as path from 'path';
import { config } from '../config/config';

const logDir = path.isAbsolute(config.log.dir)
  ? config.log.dir
  : path.join(process.cwd(), config.log.dir);
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

/**
 * Get caller location from stack trace with relative path
 * @param skipFrames - Number of stack frames to skip (default 3)
 */
function getCallerLocation(skipFrames = 3): string {
  const stack = new Error().stack || '';
  const lines = stack.split('\n');
  
  for (let i = skipFrames; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('node_modules')) continue;
    if (line.includes('logger.ts') || line.includes('logger.js')) continue;
    
    // Extract path with src/ or dist/ prefix and line number
    // Matches: src/handler/index.ts:16 or dist/handler/index.js:16
    const match = line.match(/[/\\](src|dist)[/\\](.+?\.[tj]s):(\d+):\d+/);
    if (match) {
      const dir = match[1] === 'dist' ? 'src' : match[1]; // Always show as src/
      const filePath = match[2]
        .replace(/\\/g, '/')  // Normalize path separators
        .replace(/\.js$/, '.ts'); // Show .ts instead of .js
      return `${dir}/${filePath}:${match[3]}`;
    }
  }
  return '';
}

/**
 * Format time as HH:mm:ss
 */
function formatTime(): string {
  return new Date().toTimeString().slice(0, 8);
}

const winstonLogger = winston.createLogger({
  level: config.log.level,
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.printf(({ timestamp, level, message }) => {
      return `${timestamp} [${level.toUpperCase()}] ${message}`;
    })
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ level, message }) => {
          return `${formatTime()} [${level}] ${message}`;
        })
      )
    }),
    new DailyRotateFile({
      filename: path.join(logDir, 'openbotgate-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: config.log.maxSize,
      maxFiles: config.log.maxFiles,
    }),
  ],
});

/** 当前日期对应的日志文件名，与 DailyRotateFile 的 %DATE% 一致 */
function getCurrentLogPath(): string {
  const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  return path.join(logDir, `openbotgate-${date}.log`);
}

// Custom logger wrapper that captures caller location at call time
const logger = {
  info: (message: string, ...args: any[]) => {
    const loc = getCallerLocation();
    const suffix = loc ? ` (${loc})` : '';
    winstonLogger.info(`${message}${suffix}`, ...args);
  },
  warn: (message: string, ...args: any[]) => {
    const loc = getCallerLocation();
    const suffix = loc ? ` (${loc})` : '';
    winstonLogger.warn(`${message}${suffix}`, ...args);
  },
  error: (message: string, ...args: any[]) => {
    const loc = getCallerLocation();
    const suffix = loc ? ` (${loc})` : '';
    winstonLogger.error(`${message}${suffix}`, ...args);
  },
  debug: (message: string, ...args: any[]) => {
    const loc = getCallerLocation();
    const suffix = loc ? ` (${loc})` : '';
    winstonLogger.debug(`${message}${suffix}`, ...args);
  },
  /** 原样追加到当日日志文件，无时间戳/级别，与控制台 print 一致。用于 code 工具输出。 */
  writeRawToFile: (content: string) => {
    try {
      fs.appendFileSync(getCurrentLogPath(), content + '\n', 'utf8');
    } catch (_) {}
  },
};

// Handle unhandled errors
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

export default logger;

// Redirect console.* to logger for unified format (catches SDK internal logs)
const originalConsole = {
  log: console.log,
  info: console.info,
  warn: console.warn,
  error: console.error,
  debug: console.debug,
};

console.log = (...args: any[]) => { logger.info(`[console] ${args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ')}`); };
console.info = (...args: any[]) => { logger.info(`[console] ${args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ')}`); };
console.warn = (...args: any[]) => { logger.warn(`[console] ${args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ')}`); };
console.error = (...args: any[]) => { logger.error(`[console] ${args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ')}`); };
console.debug = (...args: any[]) => { logger.debug(`[console] ${args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ')}`); };

/**
 * Format duration to human-readable string
 * Examples: 10ms, 1.3s, 2m, 1.1h, 1.2d
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3600000) return `${(ms / 60000).toFixed(1)}m`;
  if (ms < 86400000) return `${(ms / 3600000).toFixed(1)}h`;
  return `${(ms / 86400000).toFixed(1)}d`;
}

/**
 * Truncate output for logging (first few lines)
 */
export function truncateOutput(output: string, maxLines = 5, maxChars = 500): string {
  if (!output) return '(empty)';
  
  const lines = output.split('\n');
  let result = lines.slice(0, maxLines).join('\n');
  
  if (result.length > maxChars) {
    result = result.substring(0, maxChars) + '...';
  } else if (lines.length > maxLines) {
    result += `\n... (${lines.length - maxLines} more lines)`;
  }
  
  return result;
}