import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ReviewEvaluator } from '../src/services/evaluator.ts';
import type { ProjectMetadata, TopicSessionRecord } from '../src/types/index.ts';

describe('ReviewEvaluator 四维加权评分模块测试', () => {
  const evaluator = new ReviewEvaluator();

  const mockMetadata: ProjectMetadata = {
    projectName: 'cloud-storage-agent',
    sourceType: 'local',
    sourcePath: '/mock/path',
    languages: ['TypeScript'],
    frameworks: ['React', 'Node.js'],
    dependencies: {},
    fileCount: 30,
    keyFiles: ['src/index.ts'],
    summary: '云存储调度智能体',
    architectureHighlights: ['强类型工程规范']
  };

  const mockRecords: TopicSessionRecord[] = [
    {
      topic: {
        id: 'T1',
        category: 'architecture',
        title: '技术选型与分层架构',
        mainQuestion: '架构选型理由？',
        expectedKeyPoints: []
      },
      records: [{
        question: '架构选型理由？',
        isFollowUp: false,
        followUpDepth: 0,
        answer: '我们选用了 TypeScript 和 React，因为强类型约束可以避免大量运行期低级错误，同时基于原子设计规范划分组件。',
        isSkipped: false,
        answeredAt: Date.now()
      }],
      score: 88,
      strengths: ['选型理由清晰'],
      weaknesses: ['未展开极端扩展性'],
      bestPracticeAnswer: '标杆回答...',
      improvementAdvice: '提分建议...'
    },
    {
      topic: {
        id: 'T2',
        category: 'concurrency_perf',
        title: '并发与容灾',
        mainQuestion: '如何保证并发安全？',
        expectedKeyPoints: []
      },
      records: [{
        question: '如何保证并发安全？',
        isFollowUp: false,
        followUpDepth: 0,
        answer: '跳过',
        isSkipped: true,
        answeredAt: Date.now()
      }],
      score: 20,
      strengths: ['知己所短'],
      weaknesses: ['核心知识盲区'],
      bestPracticeAnswer: '标杆回答...',
      improvementAdvice: '提分建议...'
    }
  ];

  it('应当正确计算四维得分，并按权重加权得出总分与评级', async () => {
    const report = await evaluator.evaluate(mockMetadata, mockRecords);

    assert.strictEqual(report.projectName, 'cloud-storage-agent');
    assert.ok(report.totalScore >= 0 && report.totalScore <= 100);
    assert.ok(['S', 'A', 'B', 'C'].includes(report.grade));
    assert.ok(report.dimensions.technicalDepth >= 0);
    assert.ok(report.dimensions.architecturalDesign >= 0);
    assert.ok(report.dimensions.engineeringRobustness >= 0);
    assert.ok(report.dimensions.communicationLogic >= 0);
    assert.ok(report.overallSummary.length > 20);
    assert.ok(report.resumeAdvices.length > 0);
  });
});
