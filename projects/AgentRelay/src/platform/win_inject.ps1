param(
    [string]$Text = "",
    [string]$TargetHint = "Claude",
    [switch]$NoSendKeys
)

if ($Text -ne "") {
    Set-Clipboard -Value $Text
}

# 2. C# Win32 原生激活与按键注入
Add-Type @'
using System;
using System.Text;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.Threading;

public class Win32KeyInjector {
    [DllImport("user32.dll", SetLastError = true)]
    public static extern IntPtr OpenDesktop(string lpszDesktop, uint dwFlags, bool fInherit, uint dwDesiredAccess);

    [DllImport("user32.dll", SetLastError = true)]
    public static extern bool SetThreadDesktop(IntPtr hDesktop);

    [DllImport("user32.dll", SetLastError = true)]
    public static extern bool CloseDesktop(IntPtr hDesktop);

    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
    [DllImport("user32.dll", SetLastError = true)]
    public static extern bool EnumDesktopWindows(IntPtr hDesktop, EnumWindowsProc lpfn, IntPtr lParam);

    [DllImport("user32.dll")]
    public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);

    [DllImport("user32.dll", CharSet = CharSet.Auto)]
    public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);

    [DllImport("user32.dll", CharSet = CharSet.Auto)]
    public static extern int GetClassName(IntPtr hWnd, StringBuilder lpClassName, int nMaxCount);

    [DllImport("user32.dll")]
    public static extern bool IsWindowVisible(IntPtr hWnd);

    [DllImport("user32.dll")]
    public static extern bool IsIconic(IntPtr hWnd);

    [DllImport("user32.dll")]
    public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);

    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr hWnd);

    [DllImport("user32.dll")]
    public static extern void SwitchToThisWindow(IntPtr hWnd, bool fAltTab);

    [DllImport("user32.dll")]
    public static extern IntPtr GetForegroundWindow();

    [DllImport("user32.dll")]
    public static extern bool AttachThreadInput(uint idAttach, uint idAttachTo, bool fAttach);

    [DllImport("kernel32.dll")]
    public static extern uint GetCurrentThreadId();

    [DllImport("user32.dll")]
    public static extern bool BringWindowToTop(IntPtr hWnd);

    [DllImport("user32.dll")]
    public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);

    const int SW_RESTORE = 9;
    const int SW_SHOW = 5;
    const uint KEYEVENTF_KEYUP = 0x0002;

    public class InjectResult {
        public bool Success;
        public string WindowTitle = "";
        public string ClassName = "";
        public long Hwnd = 0;
        public string Error = "";
    }

    public static InjectResult Inject(string targetHint, bool sendKeystrokes) {
        InjectResult res = new InjectResult();
        IntPtr hDesk = OpenDesktop("Default", 0, false, 0x01FF);
        if (hDesk == IntPtr.Zero) {
            res.Success = false;
            res.Error = "OpenDesktop Default failed: " + Marshal.GetLastWin32Error();
            return res;
        }

        Thread t = new Thread(() => {
            SetThreadDesktop(hDesk);

            IntPtr targetHwnd = IntPtr.Zero;
            string targetTitle = "";
            string targetClass = "";

            // 1. 优先通过标题包含 targetHint (如 "Claude") 模糊查找
            EnumDesktopWindows(hDesk, (hWnd, lParam) => {
                if (!IsWindowVisible(hWnd)) return true;

                StringBuilder sbTitle = new StringBuilder(512);
                GetWindowText(hWnd, sbTitle, 512);
                string title = sbTitle.ToString();

                StringBuilder sbClass = new StringBuilder(512);
                GetClassName(hWnd, sbClass, 512);
                string cls = sbClass.ToString();

                if (!string.IsNullOrEmpty(targetHint) && title.IndexOf(targetHint, StringComparison.OrdinalIgnoreCase) >= 0) {
                    targetHwnd = hWnd;
                    targetTitle = title;
                    targetClass = cls;
                    return false;
                }
                return true;
            }, IntPtr.Zero);

            // 2. 次级后备查找：仅当目标为 Claude 或通用终端时，后备匹配 Windows Terminal / CodeMaker / PowerShell
            if (targetHwnd == IntPtr.Zero && (string.IsNullOrEmpty(targetHint) || targetHint.IndexOf("Claude", StringComparison.OrdinalIgnoreCase) >= 0)) {
                EnumDesktopWindows(hDesk, (hWnd, lParam) => {
                    if (!IsWindowVisible(hWnd)) return true;
                    StringBuilder sbClass = new StringBuilder(512);
                    GetClassName(hWnd, sbClass, 512);
                    string cls = sbClass.ToString();

                    StringBuilder sbTitle = new StringBuilder(512);
                    GetWindowText(hWnd, sbTitle, 512);
                    string title = sbTitle.ToString();

                    if (cls == "CASCADIA_HOSTING_WINDOW_CLASS" || 
                        title.IndexOf("CodeMaker", StringComparison.OrdinalIgnoreCase) >= 0 ||
                        title.IndexOf("PowerShell", StringComparison.OrdinalIgnoreCase) >= 0) {
                        targetHwnd = hWnd;
                        targetTitle = title;
                        targetClass = cls;
                        return false;
                    }
                    return true;
                }, IntPtr.Zero);
            }

            if (targetHwnd == IntPtr.Zero) {
                res.Success = false;
                res.Error = "未找到匹配的目标窗口: " + targetHint;
                return;
            }

            res.Hwnd = targetHwnd.ToInt64();
            res.WindowTitle = targetTitle;
            res.ClassName = targetClass;

            uint curThread = GetCurrentThreadId();
            IntPtr fgHwnd = GetForegroundWindow();
            uint dummyPid;
            uint fgThread = fgHwnd != IntPtr.Zero ? GetWindowThreadProcessId(fgHwnd, out dummyPid) : 0;
            uint targetThread = GetWindowThreadProcessId(targetHwnd, out dummyPid);

            // 桥接当前线程与前台、目标窗口的输入队列，绕过 Windows 前台焦点防劫持保护
            if (fgThread != 0 && fgThread != curThread) AttachThreadInput(curThread, fgThread, true);
            if (targetThread != 0 && targetThread != curThread) AttachThreadInput(curThread, targetThread, true);

            if (IsIconic(targetHwnd)) {
                ShowWindow(targetHwnd, SW_RESTORE);
            } else {
                ShowWindow(targetHwnd, SW_SHOW);
            }

            BringWindowToTop(targetHwnd);
            SetForegroundWindow(targetHwnd);
            SwitchToThisWindow(targetHwnd, true);

            if (fgThread != 0 && fgThread != curThread) AttachThreadInput(curThread, fgThread, false);
            if (targetThread != 0 && targetThread != curThread) AttachThreadInput(curThread, targetThread, false);

            if (sendKeystrokes) {
                Thread.Sleep(200);

                // 释放可能残留的控制键修饰状态
                keybd_event(0x11, 0, KEYEVENTF_KEYUP, UIntPtr.Zero); // Ctrl
                keybd_event(0x12, 0, KEYEVENTF_KEYUP, UIntPtr.Zero); // Alt
                keybd_event(0x10, 0, KEYEVENTF_KEYUP, UIntPtr.Zero); // Shift
                Thread.Sleep(50);

                // 发送 Ctrl+V 粘贴剪贴板内容
                keybd_event(0x11, 0, 0, UIntPtr.Zero); // Ctrl down
                Thread.Sleep(30);
                keybd_event(0x56, 0, 0, UIntPtr.Zero); // V down
                Thread.Sleep(50);
                keybd_event(0x56, 0, KEYEVENTF_KEYUP, UIntPtr.Zero); // V up
                Thread.Sleep(30);
                keybd_event(0x11, 0, KEYEVENTF_KEYUP, UIntPtr.Zero); // Ctrl up

                Thread.Sleep(150);

                // 发送 回车 (Enter) 确认
                keybd_event(0x0D, 0, 0, UIntPtr.Zero); // Enter down
                Thread.Sleep(50);
                keybd_event(0x0D, 0, KEYEVENTF_KEYUP, UIntPtr.Zero); // Enter up
            }

            res.Success = true;
        });

        t.Start();
        t.Join();

        CloseDesktop(hDesk);
        return res;
    }
}
'@

$doSend = -not $NoSendKeys
$res = [Win32KeyInjector]::Inject($TargetHint, $doSend)
Write-Output ($res | ConvertTo-Json -Compress)
