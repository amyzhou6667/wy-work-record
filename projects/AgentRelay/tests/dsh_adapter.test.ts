import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DshAdapter } from '../src/engine/adapters/dsh.ts';
import type { RelaySession } from '../src/types/engine.ts';

describe('DshAdapter - DeepSeek Harness 适配器测试', () => {
  it('应当正确去除 ANSI 并从终端流中捕获 [y/n] 阻断提问', () => {
    const adapter = new DshAdapter();
    let latestSession: RelaySession | null = null;

    adapter.initSession('dsh-task-1', 'D:\\hyper-v\\share\\proj\\demo', (session) => {
      latestSession = session;
    });

    assert.ok(latestSession);
    assert.equal(latestSession.status, 'running');

    // 模拟终端输出 ANSI 流
    const coloredOutput = '\u001b[32m[DSH]\u001b[39m Running plan validation...\nDo you want to proceed with code generation? [y/n]';
    adapter.processTerminalChunk(coloredOutput);

    assert.ok(latestSession);
    assert.equal(latestSession.status, 'pending');
    assert.ok(latestSession.currentDecision);
    assert.equal(latestSession.currentDecision.engineId, 'dsh');
    assert.ok(latestSession.currentDecision.question.includes('proceed with code generation'));
    assert.equal(latestSession.currentDecision.options?.length, 2);
    assert.equal(latestSession.currentDecision.options?.[0].label, '同意 (Y)');
    assert.equal(latestSession.currentDecision.options?.[1].label, '拒绝 (N)');
  });

  it('应当能识别多选数字提示并生成对应候选项', () => {
    const adapter = new DshAdapter();
    let latestSession: RelaySession | null = null;

    adapter.initSession('dsh-task-2', 'D:\\hyper-v\\share\\proj\\demo', (session) => {
      latestSession = session;
    });

    const choiceOutput = 'Please Select option [1-3]:\n1. DeepSeek-V3\n2. DeepSeek-R1\n3. DeepSeek-Coder';
    adapter.processTerminalChunk(choiceOutput);

    assert.ok(latestSession);
    assert.equal(latestSession.status, 'pending');
    assert.ok(latestSession.currentDecision);
    assert.equal(latestSession.currentDecision.options?.length, 3);
    assert.equal(latestSession.currentDecision.options?.[0].id, '1');
    assert.equal(latestSession.currentDecision.options?.[1].id, '2');
    assert.equal(latestSession.currentDecision.options?.[2].id, '3');
  });

  it('应当在收到决策下发时清空阻断并恢复 running 状态', async () => {
    const adapter = new DshAdapter();
    let latestSession: RelaySession | null = null;

    adapter.initSession('dsh-task-3', 'D:\\hyper-v\\share\\proj\\demo', (session) => {
      latestSession = session;
    });

    adapter.processTerminalChunk('Are you sure? [y/n]');
    assert.equal(latestSession?.status, 'pending');

    await adapter.injectDecision('dsh-task-3', {
      taskId: 'dsh-task-3',
      engineId: 'dsh',
      action: 'confirm',
      timestamp: Date.now()
    });

    assert.equal(latestSession?.status, 'running');
    assert.equal(latestSession?.currentDecision, null);
  });
});
