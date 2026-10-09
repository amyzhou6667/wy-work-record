import { spawn } from 'node:child_process';

/**
 * Windows 终端按键注入器
 * 利用 Windows Script Host (WScript.Shell) 将按键发送给最前端或指定标题的终端窗口
 */
export class WindowsKeyInjector {
  /**
   * 将文本和按键注入到目标窗口
   * @param {string} text 要发送的字符 (如 "确认", "y")
   * @param {string} [windowTitle] 窗口标题模糊匹配 (如 "Claude", "Windows PowerShell")
   */
  static async sendKeys(text, windowTitle = 'Claude') {
    return new Promise((resolve) => {
      // 转义双引号
      const safeText = text.replace(/"/g, '""');
      
      // PowerShell 将指令写入系统剪贴板，并向当前活动窗口发送粘贴与回车
      const psScript = `
        Add-Type -AssemblyName System.Windows.Forms
        [System.Windows.Forms.Clipboard]::SetText("${safeText}")
        $wshell = New-Object -ComObject WScript.Shell
        # 尝试激活包含 Claude 或 WindowsTerminal 的窗口
        $activated = $wshell.AppActivate("Claude Code")
        if (-not $activated) {
          $activated = $wshell.AppActivate("Claude")
        }
        if (-not $activated) {
          $activated = $wshell.AppActivate("wt")
        }
        Start-Sleep -Milliseconds 150
        $wshell.SendKeys("^v")
        Start-Sleep -Milliseconds 100
        $wshell.SendKeys("{ENTER}")
      `.trim();

      const ps = spawn('powershell.exe', ['-NoProfile', '-Command', psScript], {
        windowsHide: true,
        stdio: 'ignore'
      });

      ps.on('close', () => {
        resolve(true);
      });

      ps.on('error', () => {
        resolve(false);
      });
    });
  }
}
