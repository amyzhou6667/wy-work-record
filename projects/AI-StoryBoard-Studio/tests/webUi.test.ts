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

  test('TC-WEB-08: POST /api/v1/workflow/run-all 能够成功驱动多智能体工作流执行', async () => {
    const handler = createRequestHandler();
    const payload = {
      novelText: '顾北辰眼神如寒星，嘴角掠过一丝冷笑：“三年之期已到，江城该变天了。”\n苏清影脸色惨白。',
      aspectRatio: '9:16'
    };

    const res = await simulateRequest(handler, 'POST', '/api/v1/workflow/run-all', payload);
    assert.strictEqual(res.status, 200);
    const json = res.json();
    assert.strictEqual(json.code, 0);
    assert.strictEqual(json.data.stageStatuses.asset, 'ready');
    assert.strictEqual(json.data.stageStatuses.script, 'ready');
    assert.strictEqual(json.data.stageStatuses.shot, 'ready');
    assert.strictEqual(json.data.stageStatuses.prompt, 'ready');
    assert.ok(json.data.shots.length > 0);
    assert.ok(json.data.shots[0].prompts.midjourney);
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
    const createComponentMock = (name: string): any => {
      const comp: any = (props: any) => props?.children || null;
      return new Proxy(comp, {
        get(target, prop) {
          if (prop === 'TextArea' || prop === 'Option' || prop === 'Group') return createComponentMock(String(prop));
          return createComponentMock(String(prop));
        }
      });
    };
    const antdMock: any = new Proxy({}, {
      get(target, prop) {
        if (prop === 'theme') {
          return { darkAlgorithm: {}, defaultAlgorithm: {} };
        }
        if (prop === 'message') {
          return { success: () => {}, error: () => {}, warning: () => {}, info: () => {} };
        }
        return createComponentMock(String(prop));
      }
    });

    const sandbox: any = {
      antd: antdMock,
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

  test('TC-WEB-07: 验证删除右栏全面弹窗化展示 Prompt 视窗且样式杜绝白底白字', () => {
    const appPath = path.join(__dirname, '../src/ui/app.tsx');
    const cssPath = path.join(__dirname, '../src/ui/styles.css');
    const appCode = fs.readFileSync(appPath, 'utf-8');
    const cssCode = fs.readFileSync(cssPath, 'utf-8');

    // 1. 验证工作区为双栏聚焦布局 (删除旧三栏右侧常驻栏)，Prompt 功能全面转为弹窗 (Modal)
    assert.ok(appCode.includes('双栏聚焦工作区'), '必须为双栏工作区，去除第三栏');
    assert.ok(appCode.includes('w-1/4'), '左栏必须为四等分占一 (w-1/4, 25%)');
    assert.ok(appCode.includes('w-3/4'), '右栏必须为四等分占三 (w-3/4, 75%)');
    assert.ok(appCode.includes('showPromptModal'), '必须包含 Prompt 弹窗状态管理');
    assert.ok(appCode.includes('镜头生图 Prompt 视窗'), '弹窗中必须包含生图 Prompt 视窗与多模型切换');
    assert.ok(appCode.includes('activeModelTab'), '必须包含模型 Tab 切换状态');
    assert.ok(appCode.includes('一键复制 Prompt'), '必须包含一键复制 Prompt 功能');

    // 2. 验证 styles.css 与 app.tsx 中显式设定深黑背景 (#020617) 与高亮绿色文字 (#34d399)
    assert.ok(cssCode.includes('.prompt-textarea'), 'styles.css 必须包含 .prompt-textarea 专用样式');
    assert.ok(cssCode.includes('#020617 !important'), 'styles.css 必须包含深黑背景保底');
    assert.ok(cssCode.includes('#34d399 !important'), 'styles.css 必须包含高对比度文本色保底');
    assert.ok(appCode.includes('#020617') && appCode.includes('#34d399'), 'app.tsx 必须内联深色背景与文本色防止白底白字');
  });

  test('TC-WEB-09: 验证多智能体工作流流水线看板、阶段切换视图与 Agent 工坊配置弹窗', () => {
    const appPath = path.join(__dirname, '../src/ui/app.tsx');
    const appCode = fs.readFileSync(appPath, 'utf-8');

    // 1. 验证流水线 Pipeline Stepper 节点定义
    assert.ok(appCode.includes('资产提取 Agent'), '必须包含资产提取 Agent 节点');
    assert.ok(appCode.includes('剧本改编 Agent'), '必须包含剧本改编 Agent 节点');
    assert.ok(appCode.includes('镜头切分 Agent'), '必须包含镜头切分 Agent 节点');
    assert.ok(appCode.includes('生图 Prompt Agent'), '必须包含生图 Prompt Agent 节点');
    assert.ok(appCode.includes('启动全流水线'), '必须提供全流水线启动按钮');
    assert.ok(appCode.includes('增量更新 Prompt'), '必须提供脏标记感知的增量更新按钮');

    // 2. 验证阶段切换视图与状态响应
    assert.ok(appCode.includes('角色与场景资产管理'), '必须包含资产阶段可视化卡片');
    assert.ok(appCode.includes('影视短剧剧本'), '必须包含剧本阶段场次渲染');

    // 3. 验证多智能体工坊配置中心 (Agent Hub Modal)
    assert.ok(appCode.includes('showAgentHubModal'), '必须包含 Agent 工坊弹窗状态控制');
    assert.ok(appCode.includes('多智能体工坊配置中心'), '弹窗标题必须匹配工坊配置中心');
    assert.ok(appCode.includes('同步主模型至全部 Agent'), '必须支持一键同步主大模型到四大 Agent');
  });
});
