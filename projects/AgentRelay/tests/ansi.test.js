import test from 'node:test';
import assert from 'node:assert/strict';
import { stripAnsi, desensitize } from '../src/detector/ansi.js';

test('stripAnsi: 应当移除终端颜色和光标控制字符', () => {
  const colored = '\u001b[31mError:\u001b[39m \u001b[1mSomething failed\u001b[22m';
  assert.equal(stripAnsi(colored), 'Error: Something failed');

  const cursorMove = 'Progress: 10%\u001b[2K\rProgress: 50%';
  assert.equal(stripAnsi(cursorMove), 'Progress: 10%\rProgress: 50%');
});

test('desensitize: 应当脱敏常见的敏感凭证与邮箱', () => {
  const textWithEmail = 'Sent alert to admin@corp.example.com for task 123';
  assert.equal(desensitize(textWithEmail), 'Sent alert to [REDACTED_EMAIL] for task 123');

  const textWithToken = 'Authorization failed for sk-1234567890abcdef1234567890abcdef';
  assert.equal(desensitize(textWithToken), 'Authorization failed for [REDACTED_SECRET]');
});
