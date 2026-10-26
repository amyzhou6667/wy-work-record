import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SessionRouter } from '../src/engine/router.ts';
import type { RelaySession, DecisionCommand, IEngineAdapter, EnginePluginConfig } from '../src/types/engine.ts';

class DummyAdapter implements IEngineAdapter {
  id = 'dummy';
  name = 'Dummy';
  injected = false;

  async init(_c: EnginePluginConfig) {}
  async detect(_p: string) { return true; }
  startWatch() {}
  stopWatch() {}
  async injectDecision(_id: string, _cmd: DecisionCommand) {
    this.injected = true;
    return true;
  }
  async killTask() { return true; }
}

describe('SessionRouter - 多会话路由与双端防竞争裁决测试', () => {
  it('应当正确维护多引擎会话并支持按照 taskId 路由', () => {
    const router = new SessionRouter();
    const session1: RelaySession = {
      taskId: 'task-anti-1',
      engineId: 'antigravity',
      engineName: 'Antigravity',
      projectPath: '/proj/a',
      status: 'running',
      currentDecision: null,
      recentLogs: [],
      startTime: Date.now(),
      lastActiveTime: Date.now()
    };
    const session2: RelaySession = {
      taskId: 'task-dsh-1',
      engineId: 'dsh',
      engineName: 'DeepSeek Harness',
      projectPath: '/proj/b',
      status: 'pending',
      currentDecision: {
        taskId: 'task-dsh-1',
        engineId: 'dsh',
        engineName: 'DeepSeek Harness',
        title: 'Choice',
        question: 'Continue? [y/n]',
        isMultiSelect: false,
        timestamp: Date.now()
      },
      recentLogs: [],
      startTime: Date.now(),
      lastActiveTime: Date.now()
    };

    router.registerOrUpdateSession(session1);
    router.registerOrUpdateSession(session2);

    assert.equal(router.getAllSessions().length, 2);
    assert.equal(router.getSession('task-anti-1')?.engineId, 'antigravity');

    // 智能聚焦应当返回当前 pending 任务
    const activePending = router.getActivePendingDecision();
    assert.ok(activePending);
    assert.equal(activePending.taskId, 'task-dsh-1');
  });

  it('应当在收到决策下发时定向路由至对应适配器', async () => {
    const router = new SessionRouter();
    const adapter = new DummyAdapter();

    const session: RelaySession = {
      taskId: 'task-100',
      engineId: 'dummy',
      engineName: 'Dummy',
      projectPath: '/proj',
      status: 'pending',
      currentDecision: {
        taskId: 'task-100',
        engineId: 'dummy',
        engineName: 'Dummy',
        title: 'Approval',
        question: 'OK?',
        isMultiSelect: false,
        timestamp: Date.now()
      },
      recentLogs: [],
      startTime: Date.now(),
      lastActiveTime: Date.now()
    };
    router.registerOrUpdateSession(session);

    const result = await router.dispatchDecision(
      {
        taskId: 'task-100',
        engineId: 'dummy',
        action: 'confirm',
        timestamp: Date.now()
      },
      adapter
    );

    assert.equal(result.success, true);
    assert.equal(adapter.injected, true);
  });

  it('当任务已在本地解决时，手机端提交应当被防重拦截 (409 Conflict 防重)', async () => {
    const router = new SessionRouter();
    const adapter = new DummyAdapter();

    const session: RelaySession = {
      taskId: 'task-resolved',
      engineId: 'dummy',
      engineName: 'Dummy',
      projectPath: '/proj',
      status: 'running', // 本地已变为 running
      currentDecision: null, // 阻断已消除
      recentLogs: [],
      startTime: Date.now(),
      lastActiveTime: Date.now()
    };
    router.registerOrUpdateSession(session);

    const result = await router.dispatchDecision(
      {
        taskId: 'task-resolved',
        engineId: 'dummy',
        action: 'confirm',
        timestamp: Date.now()
      },
      adapter
    );

    assert.equal(result.success, false);
    assert.equal(result.reason, 'ALREADY_RESOLVED');
    assert.equal(adapter.injected, false, '不应向底层错误注入');
  });
});
