import test from 'node:test';
import assert from 'node:assert/strict';
import { PromptDetector } from '../src/detector/index.js';
import { CloudSyncClient } from '../src/client/sync.js';
import { TaskStatus, CommandType } from '../src/types/index.js';
import { RelaySession } from '../src/session.js';

test('E2E: 端到端闭环测试（提问拦截 -> 手机端确认 -> 恢复执行 -> 完成）', async () => {
  const syncClient = new CloudSyncClient({ mode: 'mock' });
  const detector = new PromptDetector({ silenceThresholdMs: 50 });
  const session = new RelaySession({
    taskId: 'sess_e2e_001',
    command: 'mock-agent',
    detector,
    syncClient
  });

  await session.start();
  assert.equal(session.status, TaskStatus.RUNNING);

  // 1. 模拟 Agent 运行并输出提问
  session.handleOutput('Processing background task...\n');
  session.handleOutput('Writing migration file...\n');
  session.handleOutput('Allow write to database? [Y/n] ');

  // 2. 模拟静止检测触发阻断
  const prompt = detector.evaluatePrompt();
  assert.ok(prompt, '必须捕获到阻断提问');
  await session.handlePromptDetected(prompt);

  assert.equal(session.status, TaskStatus.WAITING_CONFIRMATION);

  // 3. 模拟手机端在远程点击“同意(Y)”
  await syncClient.mockMobileAction('sess_e2e_001', CommandType.INPUT, 'y');

  // 4. Session 轮询消费指令
  const executedAction = await session.tick();
  assert.equal(executedAction, 'y', '应当消费并注入 y');
  assert.equal(session.status, TaskStatus.RUNNING, '任务应自动恢复为 RUNNING');

  // 5. 模拟任务执行完毕退出
  await session.handleExit(0);
  assert.equal(session.status, TaskStatus.COMPLETED);
});
