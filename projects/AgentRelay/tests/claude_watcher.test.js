import test from 'node:test';
import assert from 'node:assert/strict';
import { ClaudeWatcher } from '../src/watcher/claude_watcher.js';

test('ClaudeWatcher: 应当正确解析 AskUserQuestion 结构化选项并发出 prompt 事件', () => {
  const watcher = new ClaudeWatcher(process.cwd());

  let promptEmitted = null;
  watcher.on('prompt', (p) => {
    promptEmitted = p;
  });

  const sampleRecord = {
    type: 'assistant',
    timestamp: '2026-10-10T07:13:50.000Z',
    message: {
      content: [
        {
          type: 'tool_use',
          id: 'toolu_test_123',
          name: 'AskUserQuestion',
          input: {
            questions: [
              {
                header: '联调凭证',
                question: '如何向联调脚本提供测试环境登录态？',
                options: [
                  { label: '粘贴 Bearer Token（推荐）', description: '从控制台获取' },
                  { label: '提供测试账号手机号+密码', description: '自动获取' },
                  { label: '我自己跑脚本', description: '本地执行' }
                ]
              }
            ]
          }
        }
      ]
    }
  };

  watcher.handleRecord(sampleRecord);

  assert.ok(promptEmitted, '应当触发 prompt 事件');
  assert.equal(promptEmitted.question, '[联调凭证] 如何向联调脚本提供测试环境登录态？');
  assert.equal(promptEmitted.options.length, 3);
  assert.equal(promptEmitted.options[0].index, 1);
  assert.equal(promptEmitted.options[0].label, '粘贴 Bearer Token（推荐）');
  assert.equal(promptEmitted.options[0].description, '从控制台获取');
});
