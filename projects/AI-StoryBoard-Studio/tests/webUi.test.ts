import { test, describe } from 'node:test';
import assert from 'node:assert';
import { createRequestHandler, simulateRequest } from '../src/server.ts';

describe('AI-StoryBoard-Studio Web API & UI 集成测试', () => {
  const handler = createRequestHandler();

  test('TC-WEB-01: GET / 应该正常返回 React + TailwindCSS 页面 HTML 与静态资产', async () => {
    const res = await simulateRequest(handler, 'GET', '/');
    assert.strictEqual(res.status, 200);
    assert.ok(res.text.includes('AI-StoryBoard-Studio'));
    assert.ok(res.text.includes('styles.css'));
    assert.ok(res.text.includes('app.tsx'));
    assert.ok(res.text.includes('react.production.min.js'));

    const cssRes = await simulateRequest(handler, 'GET', '/styles.css');
    assert.strictEqual(cssRes.status, 200);
    assert.ok(cssRes.text.includes('Cinematic Dark Mode'));

    const appRes = await simulateRequest(handler, 'GET', '/app.tsx');
    assert.strictEqual(appRes.status, 200);
    assert.ok(appRes.text.includes('AI-StoryBoard-Studio'));
  });

  test('TC-WEB-02: POST /api/v1/parse 应该成功解析剧本并返回分镜', async () => {
    const payload = {
      fileName: '战神测试.txt',
      content: '第一章 战神归来\n顾北辰冷笑：“三年之期已到，江城变天了。”'
    };

    const res = await simulateRequest(handler, 'POST', '/api/v1/parse', payload);
    assert.strictEqual(res.status, 200);
    const json = res.json();
    assert.strictEqual(json.code, 0);
    assert.ok(json.data.doc.chapters.length > 0);
    assert.ok(json.data.shots.length > 0);
    assert.strictEqual(json.data.shots[0].dialogue.speaker, '顾北辰');
  });

  test('TC-WEB-03: POST /api/v1/srt 应该成功生成符合剪映标准的 SRT 字幕', async () => {
    const payload = {
      shots: [
        {
          id: 's1',
          shotNumber: 1,
          durationSec: 3.0,
          dialogue: {
            speaker: '顾北辰',
            text: '尔等安敢欺我！'
          }
        }
      ],
      config: {
        charactersPerSecond: 4.5,
        breathPauseSec: 0.35,
        maxCharactersPerLine: 18,
        includeSpeakerName: true
      }
    };

    const res = await simulateRequest(handler, 'POST', '/api/v1/srt', payload);
    assert.strictEqual(res.status, 200);
    const json = res.json();
    assert.strictEqual(json.code, 0);
    assert.ok(json.data.items.length === 1);
    assert.ok(json.data.items[0].text.includes('[顾北辰]:'));
    assert.ok(json.data.srtText.includes('-->'));
  });
});
