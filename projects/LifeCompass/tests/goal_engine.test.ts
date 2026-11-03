import { test, describe } from 'node:test';
import assert from 'node:assert';
import { GoalEngine } from '../src/services/goal_engine.ts';

describe('GoalEngine (Three-Tier Goal Decomposition)', () => {
  test('should generate three-tier goal system from recommended track', () => {
    const engine = new GoalEngine();
    const goal = engine.createGoalFromTrack({
      userId: 'user_100',
      trackName: '高杠杆内容知识微产品 (数字资产/自媒体)',
      customTarget: '3个月内建立自媒体矩阵并获得首批 10 个付费学员',
      estimatedMonths: 3
    });

    // Tier 1: Goal assertion
    assert.ok(goal.id);
    assert.strictEqual(goal.userId, 'user_100');
    assert.strictEqual(goal.status, 'active');
    assert.strictEqual(goal.estimatedMonths, 3);
    assert.ok(goal.milestones.length >= 3);

    // Tier 2: Milestones assertion
    const m1 = goal.milestones[0];
    assert.strictEqual(m1.sequence, 1);
    assert.strictEqual(m1.status, 'in_progress');
    assert.ok(m1.dailyActions.length >= 3);

    // Tier 3: Daily Action resistance control (<= 20 minutes)
    for (const action of m1.dailyActions) {
      assert.ok(action.maxMinutes <= 20, `Action ${action.title} exceeds 20 minutes!`);
      assert.strictEqual(action.isReducedLoad, false);
      assert.strictEqual(action.status, 'pending');
    }
  });
});
