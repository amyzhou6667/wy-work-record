import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { ReportStorage } from '../src/services/storage.ts';
import type { ReviewReport } from '../src/types/index.ts';

describe('ReportStorage 复盘文件持久化与终端格式化测试', () => {
  const storage = new ReportStorage();

  const mockReport: ReviewReport = {
    projectName: 'test-gateway-core',
    interviewDate: '2026-11-03 18:00:00',
    mode: 'architect',
    totalScore: 84,
    grade: 'A',
    dimensions: {
      technicalDepth: 85,
      architecturalDesign: 88,
      engineeringRobustness: 78,
      communicationLogic: 82
    },
    topicRecords: [
      {
        topic: {
          id: 'T1',
          category: 'architecture',
          title: '网关架构分层与选型',
          mainQuestion: '网关选型原因？',
          expectedKeyPoints: []
        },
        records: [{
          question: '网关选型原因？',
          isFollowUp: false,
          followUpDepth: 0,
          answer: '选用了 Node 原生 HTTP2 支持并结合 TypeScript 进行接口签名。',
          isSkipped: false,
          answeredAt: Date.now()
        }],
        score: 85,
        strengths: ['选型清晰'],
        weaknesses: ['未展开熔断'],
        bestPracticeAnswer: '标杆范例回答...',
        improvementAdvice: '提分建议...'
      }
    ],
    overallSummary: '候选人具备扎实的网关设计与开发经验，但在极端容灾方面仍有提升空间。',
    resumeAdvices: [
      '建议在简历中量化压测 QPS 表现',
      '突出故障自愈与链路追踪的具体贡献'
    ],
    markdownFilePath: ''
  };

  it('应当将完整复盘写入指定统一归档目录并包含标杆回答', async () => {
    const tempOutputDir = path.join(os.tmpdir(), `test-reviews-${Date.now()}`);
    
    try {
      const savedPath = await storage.saveReport(mockReport, tempOutputDir);
      
      assert.ok(fs.existsSync(savedPath));
      assert.ok(savedPath.includes('test-gateway-core'));
      
      const content = fs.readFileSync(savedPath, 'utf-8');
      assert.ok(content.includes('# 【面试复盘诊断报告】test-gateway-core'));
      assert.ok(content.includes('84 分'));
      assert.ok(content.includes('【大厂标杆范例参考回答】'));
      assert.ok(content.includes('标杆范例回答...'));
      assert.ok(content.includes('简历与项目描述优化建议'));
    } finally {
      fs.rmSync(tempOutputDir, { recursive: true, force: true });
    }
  });

  it('应当能够渲染美观的控制台摘要卡片', () => {
    const summaryCard = storage.formatConsoleSummary(mockReport);
    assert.ok(summaryCard.includes('84 分'));
    assert.ok(summaryCard.includes('[A 级: 建议通过 / Offer]'));
    assert.ok(summaryCard.includes('技术深度与底层原理: 85'));
  });

  it('应当在了解项目情况后正确生成供简历使用的项目经验总览 (project-profile.md)', async () => {
    const tempOutputDir = path.join(os.tmpdir(), `test-profile-${Date.now()}`);
    
    try {
      const mockMeta = {
        projectName: 'mock-agent-hub',
        sourceType: 'local' as const,
        sourcePath: '/path/mock',
        languages: ['TypeScript', 'Node.js'],
        frameworks: ['Express', 'Redis'],
        dependencies: { 'ioredis': '^5.0.0' },
        fileCount: 20,
        keyFiles: ['src/hub.ts', 'src/redis.ts'],
        summary: '智能体任务调度中心',
        architectureHighlights: ['分布式缓存与调度', '强类型工程规范']
      };

      const savedProfile = await storage.saveProjectProfile(mockMeta, tempOutputDir);

      assert.ok(fs.existsSync(savedProfile));
      assert.ok(savedProfile.endsWith('project-profile.md'));

      const content = fs.readFileSync(savedProfile, 'utf-8');
      assert.ok(content.includes('# 【项目经验总览与简历提炼】mock-agent-hub'));
      assert.ok(content.includes('【简历黄金模板】STAR 原则项目经验描述范例'));
      assert.ok(content.includes('版本 A：资深开发 / 技术骨干视角'));
      assert.ok(content.includes('版本 B：架构师 / 性能调优视角'));
      assert.ok(content.includes('智能体任务调度中心'));
    } finally {
      fs.rmSync(tempOutputDir, { recursive: true, force: true });
    }
  });
});
