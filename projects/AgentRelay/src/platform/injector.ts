import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface KeyInjectorResult {
  success: boolean;
  windowTitle?: string;
  className?: string;
  hwnd?: number;
  error?: string;
}

/**
 * Windows 终端按键注入器 (TypeScript)
 * 利用 Win32 API 穿透 Windows 前台焦点隔离机制，激活指定终端窗口并将剪贴板内容与回车按键注入
 */
export class WindowsKeyInjector {
  /**
   * 将文本和按键注入到目标窗口
   * @param text 要发送的字符 (如 "确认", "y", "当时进行到哪步了")
   * @param windowTitle 窗口标题模糊匹配 (如 "Claude", "Windows PowerShell")
   * @param sendKeystrokes 是否实际模拟敲击按键
   */
  static async sendKeys(text: string, windowTitle = 'Claude', sendKeystrokes = true): Promise<KeyInjectorResult> {
    return new Promise((resolve) => {
      // 非 Windows 平台降级跳过
      if (process.platform !== 'win32') {
        return resolve({ success: false, error: 'Not on win32 platform' });
      }

      const scriptPath = path.join(__dirname, 'win_inject.ps1');
      const args = [
        '-NoProfile',
        '-ExecutionPolicy',
        'Bypass',
        '-File',
        scriptPath,
        text,
        windowTitle
      ];
      if (!sendKeystrokes) {
        args.push('-NoSendKeys');
      }

      const ps = spawn('powershell.exe', args, {
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      ps.stdout?.on('data', (d) => {
        stdout += d.toString();
      });

      ps.stderr?.on('data', (d) => {
        stderr += d.toString();
      });

      ps.on('close', (code) => {
        try {
          const lines = stdout.trim().split('\n');
          const lastLine = lines[lines.length - 1];
          const data = JSON.parse(lastLine);
          resolve({
            success: Boolean(data.Success),
            windowTitle: data.WindowTitle || '',
            className: data.ClassName || '',
            hwnd: data.Hwnd || 0,
            error: data.Error || ''
          });
        } catch {
          if (code === 0) {
            resolve({ success: true, windowTitle, hwnd: 0 });
          } else {
            resolve({ success: false, error: stderr.trim() || `Exit code ${code}` });
          }
        }
      });

      ps.on('error', (err) => {
        resolve({ success: false, error: err.message });
      });
    });
  }
}
