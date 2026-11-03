import { test, describe } from 'node:test';
import assert from 'node:assert';
import { OnboardingService } from '../src/services/onboarding.ts';

describe('OnboardingService (Socratic Discovery)', () => {
  test('should start onboarding session with initial provocative question', async () => {
    const service = new OnboardingService();
    const session = await service.startSession('user_100');

    assert.ok(session.sessionId);
    assert.strictEqual(typeof session.firstQuestion, 'string');
    assert.ok(session.firstQuestion.length > 10);
    assert.ok(session.options && session.options.length > 0);
  });

  test('should advance through stages and extract skills from answers', async () => {
    const service = new OnboardingService();
    const session = await service.startSession('user_100');

    // Step 1: User shares past high-impact experience
    const res1 = await service.respond(
      session.sessionId,
      '我之前做过电商文案策划，帮一家手作店写小红书文案，曾经有一篇笔记带来了几百个点赞和几千块销售。'
    );
    assert.strictEqual(res1.isFinished, false);
    assert.ok(res1.nextQuestion);

    // Step 2: Time and constraints
    const res2 = await service.respond(
      session.sessionId,
      '我目前平时工作比较忙，但下班后和周末每周大概能抽出来 12 个小时左右。'
    );
    assert.strictEqual(res2.isFinished, false);

    // Step 3: Monetization and ambition
    const res3 = await service.respond(
      session.sessionId,
      '我希望先做轻量知识变现或文案副业，目标是每个月多赚 3000~5000 元，稳步验证。'
    );
    assert.strictEqual(res3.isFinished, true);
    assert.ok(res3.extractedSkills);
    assert.ok(res3.extractedSkills.length >= 1);
    assert.ok(res3.profile);
    assert.strictEqual(res3.profile.userId, 'user_100');
  });
});
