import { test, describe } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { createRequestHandler, simulateRequest } from '../src/server.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

  test('TC-WEB-04: POST /api/v1/ai-decompose 接口在离线降级时正常返回分镜', async () => {
    const payload = {
      novelText: '林动踏空而立，目光冷冽：“雷岩谷不是你们撒野的地方！”',
      aspectRatio: '9:16',
      characters: [
        {
          id: 'char_ld',
          name: '林动',
          roleType: 'protagonist',
          gender: 'male',
          ageGroup: '19yo',
          appearancePrompt: 'a 19-year-old young martial master with fierce eyes'
        }
      ]
    };

    const res = await simulateRequest(handler, 'POST', '/api/v1/ai-decompose', payload);
    assert.strictEqual(res.status, 200);
    const json = res.json();
    assert.strictEqual(json.code, 0);
    assert.ok(json.data.shots.length > 0);
    assert.strictEqual(json.data.shots[0].dialogue.speaker, '林动');
  });

  test('TC-WEB-05: POST /api/v1/ai-refine 接口支持单镜指令润色', async () => {
    const payload = {
      shot: {
        id: 's_test',
        shotNumber: 1,
        durationSec: 3.0,
        shotSize: 'Medium Shot',
        cameraMovement: 'Static Eye-level',
        characterAction: '角色站立',
        characterIds: [],
        environmentLighting: '平光',
        soundBgm: '无',
        matchedSourceParagraph: '林动站立。',
        prompts: { midjourney: 'standing', flux: 'standing still', jimeng: '站立' }
      },
      userInstruction: '改为特写，增加眼部杀气'
    };

    const res = await simulateRequest(handler, 'POST', '/api/v1/ai-refine', payload);
    assert.strictEqual(res.status, 200);
    const json = res.json();
    assert.strictEqual(json.code, 0);
    assert.ok(json.data.shot.characterAction.includes('润色指令: 改为特写'));
  });

  test('TC-WEB-06: 验证 app.tsx 前端运行时无未定义变量且首屏分镜生成成功', () => {
    const appPath = path.join(__dirname, '../src/ui/app.tsx');
    const babelPath = path.join(__dirname, '../src/ui/vendor/babel.min.js');
    const appCode = fs.readFileSync(appPath, 'utf-8');
    const babelCode = fs.readFileSync(babelPath, 'utf-8');

    // 1. 初始化 Babel 编译环境
    const babelCtx: any = { console };
    babelCtx.window = babelCtx;
    babelCtx.self = babelCtx;
    vm.createContext(babelCtx);
    vm.runInContext(babelCode, babelCtx);

    const compiledCode = babelCtx.Babel.transform(appCode, {
      filename: 'app.tsx',
      presets: ['react', 'typescript']
    }).code;

    // 2. 模拟前端浏览器环境与首屏挂载生命周期
    let renderedComponent: any = null;
    const sandbox: any = {
      React: {
        createElement: (type: any, props: any, ...children: any[]) => ({ type, props, children }),
        useState: (init: any) => [typeof init === 'function' ? init() : init, () => {}],
        useEffect: (fn: any) => fn(), // 执行首屏 useEffect
        useMemo: (fn: any) => fn(),
        useRef: () => ({ current: null })
      },
      ReactDOM: {
        createRoot: () => ({
          render: (el: any) => {
            renderedComponent = el;
            // 触发 App 组件函数执行，验证是否有未定义变量运行时抛错
            if (typeof el?.type === 'function') {
              el.type();
            }
          }
        })
      },
      localStorage: {
        getItem: () => null,
        setItem: () => {}
      },
      document: {
        getElementById: () => ({ id: 'root' })
      },
      console
    };
    sandbox.window = sandbox;

    const runtimeCtx = vm.createContext(sandbox);
    // 此处若存在未定义变量 (如 characterIds)，直接抛出 ReferenceError 确立红灯
    vm.runInContext(compiledCode, runtimeCtx);

    assert.ok(renderedComponent, 'React 根节点应成功触发 render 调用');
  });
});
