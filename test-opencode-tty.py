"""
测试 opencode run 在子进程中的输出行为
"""
import subprocess
import sys
import time
import signal

print("=== 测试 opencode run 在子进程中的输出 ===\n")
print(f"sys.stdout.isatty(): {sys.stdout.isatty()}")
print(f"Python 版本: {sys.version}")
print()

cmd = ['opencode', 'run', '你好，请用一句话介绍自己', '--format', 'json']
print(f"执行命令: {' '.join(cmd)}")
print(f"开始时间: {time.strftime('%Y-%m-%d %H:%M:%S')}")
print("---")

start_time = time.time()
stdout_chunks = []
stderr_chunks = []

try:
    # 使用 Popen 来实时读取输出
    process = subprocess.Popen(
        cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        shell=True,  # Windows 需要
        text=True,
        bufsize=1,  # 行缓冲
    )
    
    # 设置3分钟超时
    timeout_seconds = 180
    
    import threading
    import queue
    
    def read_stdout(proc, q):
        """读取 stdout 的线程"""
        try:
            for line in iter(proc.stdout.readline, ''):
                if line:
                    q.put(('stdout', line))
            proc.stdout.close()
        except Exception as e:
            q.put(('error', str(e)))
    
    def read_stderr(proc, q):
        """读取 stderr 的线程"""
        try:
            for line in iter(proc.stderr.readline, ''):
                if line:
                    q.put(('stderr', line))
            proc.stderr.close()
        except Exception as e:
            q.put(('error', str(e)))
    
    output_queue = queue.Queue()
    
    stdout_thread = threading.Thread(target=read_stdout, args=(process, output_queue))
    stderr_thread = threading.Thread(target=read_stderr, args=(process, output_queue))
    
    stdout_thread.daemon = True
    stderr_thread.daemon = True
    
    stdout_thread.start()
    stderr_thread.start()
    
    output_count = 0
    
    # 等待进程完成或超时
    while True:
        elapsed = time.time() - start_time
        
        # 检查是否超时
        if elapsed > timeout_seconds:
            print(f"\n⏰ {timeout_seconds}秒超时，强制终止进程")
            process.kill()
            break
        
        # 检查进程是否已结束
        ret = process.poll()
        if ret is not None:
            # 进程已结束，读取剩余输出
            time.sleep(0.1)
            while not output_queue.empty():
                try:
                    msg_type, content = output_queue.get_nowait()
                    if msg_type == 'stdout':
                        output_count += 1
                        stdout_chunks.append(content)
                        preview = content[:100].replace('\n', '\\n')
                        print(f"[stdout #{output_count}] 收到 {len(content)} 字节: {preview}")
                    elif msg_type == 'stderr':
                        stderr_chunks.append(content)
                        print(f"[stderr] {content[:100]}")
                except queue.Empty:
                    break
            break
        
        # 读取输出
        try:
            msg_type, content = output_queue.get(timeout=0.5)
            if msg_type == 'stdout':
                output_count += 1
                stdout_chunks.append(content)
                preview = content[:100].replace('\n', '\\n')
                print(f"[stdout #{output_count}] 收到 {len(content)} 字节: {preview}")
            elif msg_type == 'stderr':
                stderr_chunks.append(content)
                print(f"[stderr] {content[:100]}")
        except queue.Empty:
            pass
    
    duration = time.time() - start_time
    exit_code = process.returncode
    
except Exception as e:
    duration = time.time() - start_time
    exit_code = None
    print(f"异常: {e}")

print("---")
print(f"结束时间: {time.strftime('%Y-%m-%d %H:%M:%S')}")
print(f"耗时: {duration:.2f} 秒")
print(f"退出码: {exit_code}")

stdout_total = ''.join(stdout_chunks)
stderr_total = ''.join(stderr_chunks)

print(f"stdout 总长度: {len(stdout_total)}")
print(f"stderr 总长度: {len(stderr_total)}")
print(f"stdout 输出次数: {len(stdout_chunks)}")

if stdout_total:
    print("\n=== stdout 内容 ===")
    print(stdout_total[:1500])
else:
    print("\n⚠️ stdout 为空 - 没有收到任何输出！")

if stderr_total:
    print("\n=== stderr 内容 ===")
    print(stderr_total[:500])
