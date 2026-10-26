import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { AntigravityAdapter } from '../src/engine/adapters/antigravity.ts';
import type { RelaySession } from '../src/types/engine.ts';

describe('AntigravityAdapter - Antigravity 专有适配器测试', () => {
  it('应当能识别项目包含 .gemini 特征目录', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ag-detect-'));
    fs.mkdirSync(path.join(tmpDir, '.gemini'));

    const adapter = new AntigravityAdapter();
    const isDetected = await adapter.detect(tmpDir);
    assert.equal(isDetected, true);

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('应当正确解析 transcript.jsonl 中的 ask_question 工具调用并触发 Pending 决策', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ag-transcript-'));
    const logDir = path.join(tmpDir, '.system_generated', 'logs');
    fs.mkdirSync(logDir, { recursive: true });
    const logFile = path.join(logDir, 'transcript.jsonl');

    const sampleStep1 = {
      step_index: 1,
      source: 'USER_EXPLICIT',
      type: 'USER_INPUT',
      content: '请为我做需求分析'
    };
    fs.writeFileSync(logFile, JSON.stringify(sampleStep1) + '\n', 'utf-8');

    const adapter = new AntigravityAdapter();
    let latestSession: RelaySession | null = null;

    adapter.watchTranscriptFile(logFile, (session) => {
      latestSession = session;
    });

    assert.ok(latestSession);
    assert.equal(latestSession.status, 'running');

    // 写入 ask_question 阻断步骤
    const sampleAskStep = {
      step_index: 2,
      source: 'MODEL',
      type: 'PLANNER_RESPONSE',
      content: '请选择首选方案',
      tool_calls: [
        {
          name: 'ask_question',
          parameters: {
            questions: [
              {
                question: '您期望采用哪种发布模式？',
                is_multi_select: false,
                options: ['(Recommended) 方案 A: 自动分发', '方案 B: 手工审核']
              }
            ]
          }
        }
      ]
    };
    fs.appendFileSync(logFile, JSON.stringify(sampleAskStep) + '\n', 'utf-8');

    // 触发检查
    adapter.checkFileUpdates();

    assert.ok(latestSession);
    assert.equal(latestSession.status, 'pending');
    assert.ok(latestSession.currentDecision);
    assert.equal(latestSession.currentDecision.question, '您期望采用哪种发布模式？');
    assert.equal(latestSession.currentDecision.isMultiSelect, false);
    assert.equal(latestSession.currentDecision.options?.length, 2);
    assert.equal(latestSession.currentDecision.options?.[0].label, '(Recommended) 方案 A: 自动分发');
    assert.equal(latestSession.currentDecision.options?.[0].isRecommended, true);

    // 写入用户回答步骤，阻断应当自动撤回/解决
    const sampleAnswerStep = {
      step_index: 3,
      source: 'USER_EXPLICIT',
      type: 'USER_INPUT',
      content: '我选方案 A'
    };
    fs.appendFileSync(logFile, JSON.stringify(sampleAnswerStep) + '\n', 'utf-8');

    adapter.checkFileUpdates();

    assert.equal(latestSession.status, 'running');
    assert.equal(latestSession.currentDecision, null);

    adapter.stopWatch();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});
