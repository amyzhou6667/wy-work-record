import test from 'node:test';
import assert from 'node:assert/strict';
import { CloudSyncClient } from '../src/client/sync.js';
import { TaskStatus, CommandType, CommandStatus } from '../src/types/index.js';

test('CloudSyncClient: 应当正确注册任务并上报心跳', async () => {
  const client = new CloudSyncClient({ mode: 'mock' });
  const task = await client.registerTask('task_001', 'claude-code');
  assert.equal(task.status, TaskStatus.RUNNING);
  assert.equal(task.command, 'claude-code');

  const heartbeatOk = await client.sendHeartbeat('task_001');
  assert.equal(heartbeatOk, true);
});

test('CloudSyncClient: 应当支持提问上报与指令消费闭环', async () => {
  const client = new CloudSyncClient({ mode: 'mock' });
  await client.registerTask('task_002', 'antigravity');

  // 上报提问阻断
  await client.reportPrompt('task_002', {
    question: 'Allow write? [Y/n]',
    recent_logs: ['log 1', 'Allow write? [Y/n]'],
    suggested_options: ['Y', 'N'],
    triggered_at: Date.now()
  });

  const currentTask = await client.getTask('task_002');
  assert.equal(currentTask.status, TaskStatus.WAITING_CONFIRMATION);

  // 模拟手机端下发确认
  await client.mockMobileAction('task_002', CommandType.INPUT, 'y');

  // PC 端轮询拉取指令
  const cmd = await client.pollCommand('task_002');
  assert.ok(cmd, '应当能拉取到待处理指令');
  assert.equal(cmd.payload, 'y');
  assert.equal(cmd.status, CommandStatus.PENDING);

  // PC 端确认消费
  await client.ackCommand(cmd._id);
  const rePolled = await client.pollCommand('task_002');
  assert.equal(rePolled, null, '已消费指令不应重复拉取');

  // 任务恢复 RUNNING
  await client.resumeTask('task_002');
  const resumedTask = await client.getTask('task_002');
  assert.equal(resumedTask.status, TaskStatus.RUNNING);
});
