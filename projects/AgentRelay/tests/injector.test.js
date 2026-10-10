import test from 'node:test';
import assert from 'node:assert/strict';
import { WindowsKeyInjector } from '../src/platform/injector.js';

test('WindowsKeyInjector: 应当能正确调用并处理未找到窗口的情况', async () => {
  const result = await WindowsKeyInjector.sendKeys('test_keystroke', 'NonExistentWindow_99999');
  assert.equal(typeof result, 'object');
  assert.equal(result.success, false);
  assert.match(result.error, /not found|未找到|Not on win32/i);
});

test('WindowsKeyInjector: 应当能定位并激活 Claude 终端窗口 (无按键发送模式)', async () => {
  if (process.platform !== 'win32') return;
  const result = await WindowsKeyInjector.sendKeys('test_clipboard_only', 'Claude', false);
  assert.equal(typeof result, 'object');
  // 如果机器上开着 Claude 窗口，应成功匹配并返回窗口句柄
  if (result.success) {
    assert.ok(result.windowTitle.includes('Claude') || result.windowTitle.includes('CodeMaker') || result.className.includes('CASCADIA'));
    assert.ok(result.hwnd > 0);
  }
});
