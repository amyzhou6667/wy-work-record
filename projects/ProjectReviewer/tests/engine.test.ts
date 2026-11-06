import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { InterviewEngine } from '../src/services/engine.ts';
import type { ProjectMetadata } from '../src/types/index.ts';

describe('InterviewEngine 单步自适应面试引擎测试', () => {
  let engine: InterviewEngine;
  const mockMetadata: ProjectMetadata = {
    projectName: 'high-concurrency-pay',
    sourceType: 'local',
    sourcePath: '/path/to/project',
    languages: ['TypeScript', 'Node.js'],
    frameworks: ['Express', 'Redis'],
    dependencies: {
      'ioredis': '^5.0.0',
      'express': '^4.18.0'
    },
    fileCount: 25,
    keyFiles: ['src/order/payService.ts', 'src/redis/lock.ts', 'README.md'],
    summary: '高并发支付与延迟对账系统',
    architectureHighlights: ['分布式缓存与高性能数据读写', '强类型工程规范']
  };

  beforeEach(() => {
    engine = new InterviewEngine();
  });

  it('应当根据项目元数据规划恰好 5 个核心技术考点', async () => {
    const topics = await engine.initSession(mockMetadata);
    assert.strictEqual(topics.length, 5);
    assert.ok(topics.some(t => t.category === 'architecture'));
    assert.ok(topics.some(t => t.category === 'concurrency_perf'));
    assert.ok(topics.some(t => t.category === 'edge_cases'));
  });

  it('应当实现严格的单步（一来一回）流转', async () => {
    await engine.initSession(mockMetadata);
    const prompt1 = engine.getCurrentPrompt();
    assert.strictEqual(prompt1.isFollowUp, false);
    assert.ok(prompt1.progress.includes('1/5'));
    assert.ok(prompt1.question.length > 10);
  });

  it('当回答中提及关键技术但未交代并发/容灾时，应触发自适应深度追问 (Follow-up)', async () => {
    await engine.initSession(mockMetadata);
    
    // 候选人提到使用 Redis 做缓存，但没交代极端情况
    const result = await engine.submitAnswer('我们在订单结算时使用了 Redis 做分布式锁和缓存，减少数据库压力。');
    
    assert.strictEqual(result.nextAction, 'FOLLOW_UP');
    assert.ok(result.followUpQuestion);
    
    const prompt = engine.getCurrentPrompt();
    assert.strictEqual(prompt.isFollowUp, true);
    assert.strictEqual(prompt.question, result.followUpQuestion);
  });

  it('单考点追问达到上限后，应当平滑过渡到下一个主考点', async () => {
    await engine.initSession(mockMetadata);
    
    // 第一次作答 -> 追问 1
    const res1 = await engine.submitAnswer('使用 Redis 缓存');
    assert.strictEqual(res1.nextAction, 'FOLLOW_UP');

    // 第二次作答 -> 追问 2 (已达最大追问深度)
    const res2 = await engine.submitAnswer('如果 Redis 宕机，我们有降级开关走 DB');
    
    // 第三次作答追问 2 的问题后 -> 应切入下一个主考点
    const res3 = await engine.submitAnswer('降级时对 DB 限流并熔断非核心业务');
    assert.strictEqual(res3.nextAction, 'NEXT_TOPIC');

    const prompt2 = engine.getCurrentPrompt();
    assert.ok(prompt2.progress.includes('2/5'));
  });

  it('当候选人主动选择跳过时，应记录弃权并平滑推进下一题', async () => {
    await engine.initSession(mockMetadata);
    const skipRes = engine.skipCurrentTopic();
    assert.strictEqual(skipRes.nextAction, 'NEXT_TOPIC');

    const prompt = engine.getCurrentPrompt();
    assert.ok(prompt.progress.includes('2/5'));
  });

  it('中途退出 (/exit) 机制：少于 2 题不生成报告，达到 2 题可生成阶段报告', async () => {
    await engine.initSession(mockMetadata);
    
    // 未作答直接退出
    let exitCheck = engine.requestEarlyExit();
    assert.strictEqual(exitCheck.canGenerateReport, false);

    // 完成第 1 题与第 2 题
    engine.skipCurrentTopic();
    engine.skipCurrentTopic();

    exitCheck = engine.requestEarlyExit();
    assert.strictEqual(exitCheck.canGenerateReport, true);
    assert.strictEqual(exitCheck.answeredCount, 2);
  });
});
