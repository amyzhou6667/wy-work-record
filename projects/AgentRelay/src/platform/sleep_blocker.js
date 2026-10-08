import { spawn } from 'node:child_process';
import os from 'node:os';

/**
 * 跨平台系统防休眠保活器 (SleepBlocker)
 * 在长耗时任务执行期间，阻止操作系统进入睡眠/休眠状态
 */
export class SleepBlocker {
  constructor() {
    this.process = null;
    this.active = false;
  }

  /**
   * 激活防休眠锁
   */
  enable() {
    if (this.active) return;
    this.active = true;

    const platform = os.platform();

    try {
      if (platform === 'win32') {
        // Windows: 调用 SetThreadExecutionState(ES_CONTINUOUS | ES_SYSTEM_REQUIRED)
        const psScript = `
          $def = '[DllImport("kernel32.dll")] public static extern uint SetThreadExecutionState(uint esFlags);';
          $w = Add-Type -MemberDefinition $def -Name 'SleepAPI' -Namespace 'Win32' -PassThru;
          $w::SetThreadExecutionState(0x80000001);
          while($true) { Start-Sleep -Seconds 3600 }
        `.replace(/\n\s+/g, ' ');

        this.process = spawn('powershell.exe', ['-NoProfile', '-Command', psScript], {
          windowsHide: true,
          stdio: 'ignore'
        });
      } else if (platform === 'darwin') {
        // macOS: 使用系统自带的 caffeinate 命令
        this.process = spawn('caffeinate', ['-dims'], { stdio: 'ignore' });
      } else if (platform === 'linux') {
        // Linux: 若有 systemd-inhibit 则尝试调用
        this.process = spawn('systemd-inhibit', ['--what=sleep:idle', '--why="AgentRelay Task Running"', 'sleep', 'infinity'], { stdio: 'ignore' });
      }
    } catch (e) {
      // 降级：若系统不支持外部命令，不影响核心业务运行
    }
  }

  /**
   * 释放防休眠锁
   */
  disable() {
    if (!this.active) return;
    this.active = false;

    if (this.process) {
      try {
        this.process.kill();
      } catch (e) {}
      this.process = null;
    }
  }

  /**
   * 查询当前保活状态
   */
  isActive() {
    return this.active;
  }
}
