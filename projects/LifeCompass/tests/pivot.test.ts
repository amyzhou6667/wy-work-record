import { test, describe } from 'node:test';
import assert from 'node:assert';
import { PivotService } from '../src/services/pivot.ts';
import type { Goal } from '../src/types/index.ts';

describe('PivotService (Goal Pivot & Experience Asset Archive)', () => {
  const existingGoal: Goal = {
    id: 'goal_orig_1',
    userId: 'user_100',
    title: '自媒体电商文案变现计划',
    type: 'monetization',
    status: 'active',
    targetMetric: '首月变现1000元',
    estimatedMonths: 3,
    startDate: '2026-10-01',
    targetEndDate: '2027-01-01',
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-28T00:00:00.000Z',
    milestones: [
      {
        id: 'ms_1',
        goalId: 'goal_orig_1',
        sequence: 1,
        title: '定位探索',
        keyDeliverable: '对标梳理',
        status: 'achieved',
        estimatedWeeks: 2,
        dailyActions: [
          {
            id: 'act_1',
            milestoneId: 'ms_1',
            title: '竞品调研',
            instruction: '收集3个账号',
            maxMinutes: 15,
            isReducedLoad: false,
            status: 'completed',
            scheduledDate: '2026-10-02',
            checkin: {
              checkinTime: '2026-10-02T10:00:00.000Z',
              summary: '收集了三个小红书爆款账号',
              actualMinutes: 15,
              aiFeedback: {
                encouragement: '棒！',
                highlight: '调研很细致',
                nextStepTip: '下一步'
              }
            }
          }
        ]
      }
    ]
  };

  test('should archive old goal into ExperienceAsset without losing history and generate pivoted goal', () => {
    const service = new PivotService();
    const result = service.executePivot({
      currentGoal: existingGoal,
      request: {
        goalId: existingGoal.id,
        reason: '主业工作变动，无法每天花大把时间做视频剪辑',
        lessonLearned: '虽然剪辑耗时，但我发现自己的文字梳理和提炼逻辑非常快',
        newDirection: '轻量图文知识卡片与职场咨询微服务'
      }
    });

    // 1. Check old goal archiving
    assert.strictEqual(result.archivedGoal.status, 'archived');

    // 2. Check ExperienceAsset creation
    assert.ok(result.experienceAsset.id);
    assert.strictEqual(result.experienceAsset.sourceGoalId, existingGoal.id);
    assert.strictEqual(result.experienceAsset.totalCheckins, 1);
    assert.ok(result.experienceAsset.acquiredSkills.length > 0);
    assert.ok(result.experienceAsset.keyOutputs.length > 0);

    // 3. Check new pivoted goal
    assert.ok(result.newGoal.id);
    assert.notStrictEqual(result.newGoal.id, existingGoal.id);
    assert.strictEqual(result.newGoal.status, 'active');
    assert.ok(result.newGoal.title.includes('轻量图文知识卡片'));
    assert.ok(result.newGoal.milestones.length >= 2);
  });
});
