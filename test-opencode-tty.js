/**
 * 测试 opencode run 在非 TTY 环境下的输出行为
 */
const { spawn } = require('child_process');
const pty = require('node-pty');

console.log('=== 测试 opencode run 在非 TTY 环境下的输出 ===\n');
console.log('process.stdout.isTTY:', process.stdout.isTTY);
console.log('');

// 默认使用 PTY，避免非 TTY 缓冲导致“只有超时才输出”
const usePty = process.env.USE_PTY === '1';

// 方案1: 直接用 cmd /c 执行完整命令（非 TTY）
const fullCommand = 'opencode run "你好，请用一句话介绍自己"';
const cmd = 'cmd';
const args = ['/c', fullCommand];

console.log('执行命令:', fullCommand);
console.log('是否使用 PTY:', usePty);
console.log('开始时间:', new Date().toISOString());
console.log('---');

if (usePty) {
  // 方案2: 使用 node-pty 创建伪终端，实时输出
  const ptyProcess = pty.spawn('cmd.exe', ['/c', fullCommand], {
    name: 'xterm-256color',
    cols: 120,
    rows: 30,
    cwd: process.cwd(),
    env: process.env,
  });

  let output = '';

  // 3分钟超时
  const timeoutId = setTimeout(() => {
    console.log('\n⏰ 3分钟超时，强制终止进程');
    ptyProcess.kill();
  }, 180000);

  ptyProcess.onData((data) => {
    output += data;
    process.stdout.write(data); // 实时输出
  });

  ptyProcess.onExit(({ exitCode, signal }) => {
    clearTimeout(timeoutId);
    console.log('---');
    console.log('结束时间:', new Date().toISOString());
    console.log('退出码:', exitCode);
    console.log('信号:', signal);
    console.log('stdout 总长度:', output.length);
  });
} else {
  const child = spawn(cmd, args, {
    stdio: ['pipe', 'pipe', 'pipe'],
    shell: false,
  });

  let stdout = '';
  let stderr = '';
  let outputCount = 0;

  child.stdout.on('data', (data) => {
    outputCount++;
    const chunk = data.toString();
    stdout += chunk;
    console.log(`[stdout #${outputCount}] 收到 ${chunk.length} 字节:`, chunk.substring(0, 200));
  });

  child.stderr.on('data', (data) => {
    const chunk = data.toString();
    stderr += chunk;
    console.log('[stderr]', chunk.substring(0, 200));
  });

  // 主动关闭 stdin，避免命令等待输入
  child.stdin.end();

  // 3分钟超时
  const timeoutId = setTimeout(() => {
    console.log('\n⏰ 3分钟超时，强制终止进程');
    child.kill('SIGTERM');
  }, 180000);

  child.on('close', (code) => {
    clearTimeout(timeoutId); // 清除超时，让进程可以退出

    console.log('---');
    console.log('结束时间:', new Date().toISOString());
    console.log('退出码:', code);
    console.log('stdout 总长度:', stdout.length);
    console.log('stderr 总长度:', stderr.length);
    console.log('stdout 输出次数:', outputCount);

    if (stdout.length > 0) {
      console.log('\n=== stdout 内容 ===');
      console.log(stdout.substring(0, 1000));
    } else {
      console.log('\n⚠️ stdout 为空 - 没有收到任何输出！');
    }
  });
}
