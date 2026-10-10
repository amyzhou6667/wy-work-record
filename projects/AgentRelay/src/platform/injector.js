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
      
      // PowerShell 将指令写入系统剪贴板，激活终端窗口并发送回车
      const psScript = `
        Add-Type -AssemblyName System.Windows.Forms
        [System.Windows.Forms.Clipboard]::SetText("${safeText}")
        $wshell = New-Object -ComObject WScript.Shell
        
        # 依次尝试匹配 Windows Terminal / PowerShell / Claude 窗口
        $targets = @("管理员: Windows PowerShell", "Windows PowerShell", "Claude Code", "Claude", "wt", "CodeMaker")
        $activated = $false
        foreach ($t in $targets) {
          if ($wshell.AppActivate($t)) {
            $activated = $true
            break
          }
        }
        
        Start-Sleep -Milliseconds 200
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
