import { test, describe } from 'node:test';
import assert from 'node:assert';
import { CheckinService } from '../src/services/checkin.ts';
import type { DailyAction } from '../src/types/index.ts';

describe('CheckinService (Feedback & Streak Rewards)', () => {
  const sampleAction: DailyAction = {
    id: 'act_101',
    milestoneId: 'ms_1',
    title: '梳理 3 个竞品对标账号',
    instruction: '记录选题方向',
    maxMinutes: 15,
    isReducedLoad: false,
    status: 'pending',
    scheduledDate: '2026-10-28'
  };

  test('should complete checkin and generate empathetic, constructive AI feedback', () => {
    const service = new CheckinService();
    const result = service.executeCheckin({
      action: sampleAction,
      summary: '今天看了三个头部账号，发现他们都在做小红书爆款图文模板，我记录了 5 条高赞选题大纲。',
      actualMinutes: 18,
      attachmentUrl: 'https://example.com/screenshot.png'
    });

    assert.strictEqual(result.updatedAction.status, 'completed');
    assert.ok(result.updatedAction.checkin);
    assert.strictEqual(result.updatedAction.checkin.actualMinutes, 18);
    assert.ok(result.updatedAction.checkin.aiFeedback.encouragement);
    assert.ok(result.updatedAction.checkin.aiFeedback.highlight);
    assert.ok(result.updatedAction.checkin.aiFeedback.nextStepTip);
  });

  test('should give special resilience praise for reduced-load checkin', () => {
    const service = new CheckinService();
    const reducedAction: DailyAction = {
      ...sampleAction,
      isReducedLoad: true,
      status: 'reduced',
      title: '【2分钟降载微步】搜集并收藏 1 个对标案例链接'
    };

    const result = service.executeCheckin({
      action: reducedAction,
      summary: '今天很累，但我找到了一个非常契合的案例链接并收藏了！',
      actualMinutes: 2
    });

    assert.strictEqual(result.updatedAction.status, 'completed');
    assert.ok(result.updatedAction.checkin?.aiFeedback.encouragement.includes('火种') || 
              result.updatedAction.checkin?.aiFeedback.encouragement.includes('韧性') ||
              result.updatedAction.checkin?.aiFeedback.encouragement.includes('启动'));
  });
});
