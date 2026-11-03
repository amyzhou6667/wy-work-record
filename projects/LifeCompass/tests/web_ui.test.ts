import { test, describe } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequestHandler, simulateRequest } from '../src/server.ts';

const TEST_DATA_DIR = path.resolve('projects/LifeCompass/data_web_test');

describe('LifeCompass Web Server & React TSX API End-to-End', () => {
  const handler = createRequestHandler({ dataDir: TEST_DATA_DIR });

  test('should serve index.html and static assets successfully', async () => {
    const res = await simulateRequest(handler, 'GET', '/');
    assert.strictEqual(res.status, 200);
    assert.ok(res.text.includes('LifeCompass'));
    assert.ok(res.text.includes('app.tsx'));

    const vendorRes = await simulateRequest(handler, 'GET', '/vendor/react.production.min.js');
    assert.strictEqual(vendorRes.status, 200);
    assert.ok(vendorRes.text.length > 500);

    const cssRes = await simulateRequest(handler, 'GET', '/styles.css');
    assert.strictEqual(cssRes.status, 200);
    assert.ok(cssRes.text.includes('app-container'));
  });

  test('should run full onboarding flow via REST API', async () => {
    // 1. Start onboarding
    const startRes = await simulateRequest(handler, 'POST', '/api/onboarding/start', {
      userId: 'test_user_ui'
    });
    assert.strictEqual(startRes.status, 200);
    const startData = startRes.json();
    assert.ok(startData.sessionId);
    assert.ok(startData.firstQuestion);

    // 2. Respond step 1
    const step1Res = await simulateRequest(handler, 'POST', '/api/onboarding/respond', {
      sessionId: startData.sessionId,
      reply: '我做过内容文案策划，帮朋友写过小红书图文引流'
    });
    const step1Data = step1Res.json();
    assert.strictEqual(step1Data.isFinished, false);

    // 3. Respond step 2
    const step2Res = await simulateRequest(handler, 'POST', '/api/onboarding/respond', {
      sessionId: startData.sessionId,
      reply: '每周有 15 小时'
    });
    const step2Data = step2Res.json();
    assert.strictEqual(step2Data.isFinished, false);

    // 4. Respond step 3 -> finished & profile generated
    const step3Res = await simulateRequest(handler, 'POST', '/api/onboarding/respond', {
      sessionId: startData.sessionId,
      reply: '希望1~3个月内验证副业收入'
    });
    const step3Data = step3Res.json();
    assert.strictEqual(step3Data.isFinished, true);
    assert.ok(step3Data.profile);
    assert.ok(step3Data.profile.recommendedTracks.length > 0);
  });

  test('should create goal and allow daily action checkin', async () => {
    // Create goal
    const goalRes = await simulateRequest(handler, 'POST', '/api/goals/create', {
      userId: 'test_user_ui',
      trackName: '高杠杆内容知识微产品',
      customTarget: '做小红书副业变现'
    });
    assert.strictEqual(goalRes.status, 200);
    const goalData = goalRes.json();
    assert.ok(goalData.goal.id);
    const actionId = goalData.goal.milestones[0].dailyActions[0].id;

    // Perform checkin
    const checkinRes = await simulateRequest(handler, 'POST', `/api/actions/${actionId}/checkin`, {
      goalId: goalData.goal.id,
      summary: '完成了3个账号调研并记录了要点',
      actualMinutes: 15
    });
    assert.strictEqual(checkinRes.status, 200);
    const checkinData = checkinRes.json();
    assert.strictEqual(checkinData.action.status, 'completed');
    assert.ok(checkinData.action.checkin.aiFeedback.encouragement);
  });

  test('should trigger dynamic load reduction on action', async () => {
    // Create goal
    const goalRes = await simulateRequest(handler, 'POST', '/api/goals/create', {
      userId: 'test_user_ui_2',
      trackName: '高杠杆内容知识微产品'
    });
    const goalData = goalRes.json();
    const action = goalData.goal.milestones[0].dailyActions[1];

    // Trigger reduce-load
    const reduceRes = await simulateRequest(handler, 'POST', `/api/actions/${action.id}/reduce-load`, {
      goalId: goalData.goal.id
    });
    assert.strictEqual(reduceRes.status, 200);
    const reduceData = reduceRes.json();
    assert.strictEqual(reduceData.action.isReducedLoad, true);
    assert.strictEqual(reduceData.action.maxMinutes, 2);
    assert.ok(reduceData.action.title.includes('2分钟降载微步'));
  });

  test('should ensure app.tsx compiles cleanly via Babel without SyntaxError', () => {
    const babelPath = path.resolve('projects/LifeCompass/src/ui/vendor/babel.min.js');
    const appTsxPath = path.resolve('projects/LifeCompass/src/ui/app.tsx');

    const babelCode = fs.readFileSync(babelPath, 'utf-8');
    const appTsxCode = fs.readFileSync(appTsxPath, 'utf-8');

    const sandbox: any = { window: {}, console };
    sandbox.window = sandbox;
    sandbox.self = sandbox;
    vm.createContext(sandbox);
    vm.runInContext(babelCode, sandbox);
    const Babel = sandbox.Babel || sandbox.window.Babel;

    const transpiled = Babel.transform(appTsxCode, {
      filename: 'app.tsx',
      presets: ['react', 'typescript']
    });

    assert.ok(transpiled.code.length > 500);
    // Must not contain 'export ' in non-module script
    assert.strictEqual(transpiled.code.includes('export '), false, 'Transpiled code must not contain unhandled export statements');
  });
});
