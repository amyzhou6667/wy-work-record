import { test, describe } from 'node:test';
import assert from 'node:assert';
import { ResilienceGuard } from '../src/services/resilience_guard.ts';
import type { DailyAction } from '../src/types/index.ts';

describe('ResilienceGuard (Anti-Drop System)', () => {
  const normalAction: DailyAction = {
    id: 'act_test_1',
    milestoneId: 'ms_1',
    title: '撰写 1 篇深度商业文案',
    instruction: '完成 800 字商业文案框架与正文',
    maxMinutes: 20,
    isReducedLoad: false,
    status: 'pending',
    scheduledDate: '2026-10-28'
  };

  test('should return normal encouragement when missed days < 2', () => {
    const guard = new ResilienceGuard();
    const result = guard.assessStatus({
      consecutiveMissedDays: 1,
      currentAction: normalAction
    });

    assert.strictEqual(result.shouldDowngrade, false);
    assert.strictEqual(result.reducedAction, undefined);
    assert.ok(result.empathyMessage.includes('继续') || result.empathyMessage.includes('稳步'));
  });

  test('should trigger dynamic load reduction when consecutive missed days >= 2', () => {
    const guard = new ResilienceGuard();
    const result = guard.assessStatus({
      consecutiveMissedDays: 2,
      currentAction: normalAction
    });

    assert.strictEqual(result.shouldDowngrade, true);
    assert.ok(result.reducedAction);
    assert.strictEqual(result.reducedAction.maxMinutes, 2);
    assert.ok(result.reducedAction.title.includes('2分钟降载微步'));
    assert.ok(result.empathyMessage.includes('生活') || result.empathyMessage.includes('停顿'));
  });

  test('should apply reduced load directly to an action', () => {
    const guard = new ResilienceGuard();
    const reduced = guard.applyReducedLoad(normalAction);

    assert.strictEqual(reduced.isReducedLoad, true);
    assert.strictEqual(reduced.maxMinutes, 2);
    assert.ok(reduced.title.includes('2分钟降载微步'));
    assert.strictEqual(reduced.status, 'reduced');
  });
});
