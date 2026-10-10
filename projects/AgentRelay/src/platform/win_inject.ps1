param(
    [string]$Text = "",
    [string]$TargetHint = "Claude",
    [switch]$NoSendKeys
)

# 1. Set system clipboard
if ($Text -ne "") {
    Set-Clipboard -Value $Text
}

# 2. C# Win32 window activator and keystroke injector
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
    public static extern IntPtr SetFocus(IntPtr hWnd);

    [DllImport("user32.dll")]
    public static extern IntPtr SetActiveWindow(IntPtr hWnd);

    [DllImport("user32.dll")]
    public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);

    [DllImport("user32.dll")]
    public static extern uint MapVirtualKey(uint uCode, uint uMapType);

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

            // 1. Primary fuzzy match by title (e.g. "Claude")
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

            // 2. Secondary fallback: Look for Windows Terminal (CASCADIA_HOSTING_WINDOW_CLASS)
            if (targetHwnd == IntPtr.Zero && (string.IsNullOrEmpty(targetHint) || targetHint.IndexOf("Claude", StringComparison.OrdinalIgnoreCase) >= 0)) {
                EnumDesktopWindows(hDesk, (hWnd, lParam) => {
                    if (!IsWindowVisible(hWnd)) return true;
                    StringBuilder sbClass = new StringBuilder(512);
                    GetClassName(hWnd, sbClass, 512);
                    string cls = sbClass.ToString();

                    if (cls == "CASCADIA_HOSTING_WINDOW_CLASS" || cls == "ConsoleWindowClass") {
                        targetHwnd = hWnd;
                        StringBuilder sbTitle = new StringBuilder(512);
                        GetWindowText(hWnd, sbTitle, 512);
                        targetTitle = sbTitle.ToString();
                        targetClass = cls;
                        return false;
                    }
                    return true;
                }, IntPtr.Zero);
            }

            if (targetHwnd == IntPtr.Zero) {
                res.Success = false;
                res.Error = "Target window not found: " + targetHint;
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

            // 1. Bridge input queues between current thread, foreground, and target
            if (fgThread != 0 && fgThread != curThread) AttachThreadInput(curThread, fgThread, true);
            if (targetThread != 0 && targetThread != curThread) AttachThreadInput(curThread, targetThread, true);

            // 2. Simulate Alt keystroke to unlock Windows LockSetForegroundWindow
            keybd_event(0x12, 0x38, 0, UIntPtr.Zero); // ALT down
            keybd_event(0x12, 0x38, KEYEVENTF_KEYUP, UIntPtr.Zero); // ALT up

            // 3. Activate and bring target window to foreground
            if (IsIconic(targetHwnd)) {
                ShowWindow(targetHwnd, SW_RESTORE);
            } else {
                ShowWindow(targetHwnd, SW_SHOW);
            }

            BringWindowToTop(targetHwnd);
            SetForegroundWindow(targetHwnd);
            SetActiveWindow(targetHwnd);
            SetFocus(targetHwnd);
            SwitchToThisWindow(targetHwnd, true);

            // Wait for window message pump to process activation
            Thread.Sleep(250);

            // 4. Send keystrokes with scan codes while KEEPING AttachThreadInput active
            if (sendKeystrokes) {
                // Clear any lingering modifier states
                keybd_event(0x11, 0x1D, KEYEVENTF_KEYUP, UIntPtr.Zero); // Ctrl up
                keybd_event(0x12, 0x38, KEYEVENTF_KEYUP, UIntPtr.Zero); // Alt up
                keybd_event(0x10, 0x2A, KEYEVENTF_KEYUP, UIntPtr.Zero); // Shift up
                Thread.Sleep(60);

                byte scanCtrl = (byte)MapVirtualKey(0x11, 0); // 0x1D
                byte scanV = (byte)MapVirtualKey(0x56, 0);    // 0x2F
                byte scanEnter = (byte)MapVirtualKey(0x0D, 0);// 0x1C

                // Press and hold Ctrl
                keybd_event(0x11, scanCtrl, 0, UIntPtr.Zero);
                Thread.Sleep(100);

                // Press and release V
                keybd_event(0x56, scanV, 0, UIntPtr.Zero);
                Thread.Sleep(80);
                keybd_event(0x56, scanV, KEYEVENTF_KEYUP, UIntPtr.Zero);
                Thread.Sleep(80);

                // Release Ctrl
                keybd_event(0x11, scanCtrl, KEYEVENTF_KEYUP, UIntPtr.Zero);
                Thread.Sleep(200);

                // Press and release Enter
                keybd_event(0x0D, scanEnter, 0, UIntPtr.Zero);
                Thread.Sleep(80);
                keybd_event(0x0D, scanEnter, KEYEVENTF_KEYUP, UIntPtr.Zero);
                Thread.Sleep(100);
            }

            // 5. Detach input queues after keystrokes are completed
            if (fgThread != 0 && fgThread != curThread) AttachThreadInput(curThread, fgThread, false);
            if (targetThread != 0 && targetThread != curThread) AttachThreadInput(curThread, targetThread, false);

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
