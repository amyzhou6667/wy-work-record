import test from 'node:test';
import assert from 'node:assert/strict';
import { PromptDetector } from '../src/detector/index.js';

test('PromptDetector: 应当识别 [Y/n] 阻断提问', () => {
  const detector = new PromptDetector({ silenceThresholdMs: 100 });
  detector.feed('Building application...\n');
  detector.feed('Done.\n');
  detector.feed('Allow file write to src/index.ts? [Y/n] ');

  // 模拟静止判定
  const payload = detector.evaluatePrompt();
  assert.ok(payload, '应当检测到阻断状态');
  assert.equal(payload.question, 'Allow file write to src/index.ts? [Y/n]');
  assert.deepEqual(payload.suggested_options, ['Y', 'N']);
  assert.ok(payload.recent_logs.length > 0);
});

test('PromptDetector: 应当识别选择题 (Choice: 1/2/3)', () => {
  const detector = new PromptDetector({ silenceThresholdMs: 100 });
  detector.feed('1) Yes, continue\n');
  detector.feed('2) No, cancel\n');
  detector.feed('Please enter your choice (1-2): ');

  const payload = detector.evaluatePrompt();
  assert.ok(payload, '应当检测到选择题阻断状态');
  assert.ok(payload.question.includes('choice'));
});

test('PromptDetector: 正常持续输出时，不应误报阻断', () => {
  const detector = new PromptDetector({ silenceThresholdMs: 100 });
  detector.feed('Downloading package chunk 1...\n');
  detector.feed('Downloading package chunk 2...\n');

  const payload = detector.evaluatePrompt();
  assert.equal(payload, null, '普通流水日志不应判定为阻断');
});
