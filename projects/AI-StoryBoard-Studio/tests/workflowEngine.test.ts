import { test, describe } from 'node:test';
import assert from 'node:assert';
import { AssetExtractorAgent } from '../src/engines/agents/assetExtractor.ts';
import { ScriptwriterAgent } from '../src/engines/agents/scriptwriter.ts';
import { DirectorShotAgent } from '../src/engines/agents/directorShot.ts';
import { VisualPromptAgent } from '../src/engines/agents/visualPrompt.ts';
import { WorkflowEngine } from '../src/engines/workflowEngine.ts';
import type { AgentPluginConfig, WorkflowPipelineContext } from '../src/types/index.ts';

describe('Multi-Agent Pluggable Workflow Engine (多智能体可插拔工作流引擎)', () => {
  const sampleNovelText = `第一章 龙王赘婿归来
顾家老宅内，狂风呼啸，冷雨敲打着落地窗。
苏清影身着一袭白色雪纺长裙，站在客厅中央，满脸寒霜：“顾北辰，签了这份离婚协议，三年了，你一事无成，配不上我苏家！”
顾北辰一身黑色风衣，目光如寒星，嘴角掠过一丝冷笑：“三年之期已到，江城该变天了。”
就在这时，数十辆黑色迈巴赫轰鸣停在门外。
数百名身穿黑衣的铁血保镖齐刷刷单膝跪地，声音震天动地：“恭迎龙王归位！”`;

  const defaultAgentConfigs: Record<string, AgentPluginConfig> = {
    asset: {
      id: 'asset',
      name: '资产提取 Agent',
      enabled: true,
      llmConfig: { baseUrl: '', apiKey: '', model: 'mock', temperature: 0.7 }
    },
    script: {
      id: 'script',
      name: '剧本改编 Agent',
      enabled: true,
      llmConfig: { baseUrl: '', apiKey: '', model: 'mock', temperature: 0.7 }
    },
    shot: {
      id: 'shot',
      name: '镜头切分 Agent',
      enabled: true,
      llmConfig: { baseUrl: '', apiKey: '', model: 'mock', temperature: 0.7 }
    },
    prompt: {
      id: 'prompt',
      name: '生图 Prompt Agent',
      enabled: true,
      llmConfig: { baseUrl: '', apiKey: '', model: 'mock', temperature: 0.7 }
    }
  };

  test('TC-WF-01: AssetExtractorAgent 能够准确提取人物外貌、服装穿搭与场景光影 (离线自愈保底)', async () => {
    const agent = new AssetExtractorAgent();
    const result = await agent.execute(sampleNovelText, defaultAgentConfigs.asset, {} as any);

    assert.ok(result.data.characters.length >= 2, '应该识别出至少顾北辰与苏清影两个角色');
    const gu = result.data.characters.find(c => c.name.includes('顾北辰'));
    const su = result.data.characters.find(c => c.name.includes('苏清影'));

    assert.ok(gu, '应成功提取顾北辰');
    assert.ok(su, '应成功提取苏清影');
    assert.strictEqual(gu?.gender, 'male');
    assert.strictEqual(su?.gender, 'female');
    assert.ok(gu?.appearancePrompt && gu.appearancePrompt.length > 5, '角色应生成外貌提示词');
    assert.ok(result.data.scenes.length >= 1, '应提炼出至少一个核心场景');
  });

  test('TC-WF-02: ScriptwriterAgent 能够将叙述性小说重构为短剧标准场次与对白 (离线自愈保底)', async () => {
    const agent = new ScriptwriterAgent();
    const result = await agent.execute(sampleNovelText, defaultAgentConfigs.script, {} as any);

    assert.ok(result.data.length >= 1, '应该输出至少一个场次');
    const scene1 = result.data[0];
    assert.ok(scene1.sceneNumber >= 1, '场次序号有效');
    assert.ok(scene1.actionDescription && scene1.actionDescription.length > 0, '场次动作与环境正文描写必须非空');
    assert.ok(scene1.dialogues.length >= 2, '应该提取出苏清影与顾北辰的对白');
    assert.ok(scene1.dialogues.some(d => d.text.includes('离婚协议')), '对白应包含关键冲突文本');
  });

  test('TC-WF-03: DirectorShotAgent 能够按视听节奏切分镜头与运镜 (离线自愈保底)', async () => {
    const agent = new DirectorShotAgent();
    const scriptScenes = [
      {
        sceneNumber: 1,
        location: '内景 - 顾家老宅',
        timeOfDay: 'NIGHT' as const,
        atmosphere: '冷峻对峙',
        actionDescription: '狂风呼啸，冷雨敲打着落地窗',
        dialogues: [
          { speaker: '苏清影', emotion: '冷漠', text: '顾北辰，签了这份离婚协议！', isVoiceover: false },
          { speaker: '顾北辰', emotion: '冷笑', text: '三年之期已到，江城该变天了。', isVoiceover: false }
        ]
      }
    ];

    const result = await agent.execute({ novelText: sampleNovelText, scriptScenes, aspectRatio: '9:16' }, defaultAgentConfigs.shot, {} as any);
    assert.ok(result.data.length >= 2, '应该生成至少2个视听镜头');
    assert.ok(result.data[0].shotSize, '镜头应具备景别');
    assert.ok(result.data[0].cameraMovement, '镜头应具备运镜');
    assert.ok(result.data[0].durationSec > 0, '镜头时长应大于0');
  });

  test('TC-WF-04: VisualPromptAgent 能够深度融合角色资产与镜头构图，生成三模型提示词', async () => {
    const agent = new VisualPromptAgent();
    const mockShots = [
      {
        id: 'shot_1',
        shotNumber: 1,
        durationSec: 3.0,
        shotSize: 'Medium Shot' as const,
        cameraMovement: 'Static Eye-level' as const,
        characterAction: '顾北辰冷笑从容',
        characterIds: ['char_gu'],
        environmentLighting: '冷雨落地窗光影',
        dialogue: { speaker: '顾北辰', text: '江城该变天了' },
        prompts: { midjourney: '', flux: '', jimeng: '' }
      }
    ];

    const mockCharacters = [
      {
        id: 'char_gu',
        name: '顾北辰',
        roleType: 'protagonist' as const,
        gender: 'male' as const,
        ageGroup: '28yo',
        appearancePrompt: 'cold sharp eyes, handsome Asian male CEO',
        crefUrl: 'https://example.com/cref.png'
      }
    ];

    const result = await agent.execute({ shots: mockShots, characters: mockCharacters, aspectRatio: '9:16' }, defaultAgentConfigs.prompt, {} as any);
    assert.strictEqual(result.data.length, 1);
    const shot = result.data[0];

    assert.ok(shot.prompts.midjourney.includes('--ar 9:16'), 'MJ提示词应包含竖屏画幅');
    assert.ok(shot.prompts.midjourney.includes('--cref https://example.com/cref.png'), 'MJ提示词应注入角色cref一致性链接');
    assert.ok(shot.prompts.flux.includes('cold sharp eyes') || shot.prompts.flux.includes('cinematic'), 'Flux提示词应包含视觉细节');
    assert.ok(shot.prompts.jimeng.includes('顾北辰') || shot.prompts.jimeng.includes('9:16'), '即梦双语应包含中文指引');
  });

  test('TC-WF-05: WorkflowEngine 能够串联四大 Agent 完成全流程编排与直通跳过', async () => {
    const engine = new WorkflowEngine();
    const initCtx = engine.createInitialContext(sampleNovelText, '9:16');

    // 1. 全流水线串行运行
    const finalCtx = await engine.runAll(initCtx);

    assert.strictEqual(finalCtx.stageStatuses.asset, 'ready');
    assert.strictEqual(finalCtx.stageStatuses.script, 'ready');
    assert.strictEqual(finalCtx.stageStatuses.shot, 'ready');
    assert.strictEqual(finalCtx.stageStatuses.prompt, 'ready');
    assert.ok(finalCtx.characters.length > 0, '角色库应生成');
    assert.ok(finalCtx.scriptScenes.length > 0, '剧本场次应生成');
    assert.ok(finalCtx.shots.length > 0, '分镜流应生成');
    assert.ok(finalCtx.shots[0].prompts.midjourney, '提示词应生成');

    // 2. 直通测试：关闭剧本 Agent 时，剧本节点应被跳过但镜头流依然可自愈推进
    const skipCtx = engine.createInitialContext(sampleNovelText, '9:16');
    skipCtx.agentConfigs.script.enabled = false;

    const skipResult = await engine.runAll(skipCtx);
    assert.strictEqual(skipResult.stageStatuses.script, 'skipped', '剧本阶段状态应为 skipped');
    assert.strictEqual(skipResult.stageStatuses.shot, 'ready', '镜头阶段应通过直通输入正常推进');
    assert.ok(skipResult.shots.length > 0);
  });

  test('TC-WF-06: WorkflowEngine 能够感知上游修改，标记脏状态并支持增量重跑保护镜头', async () => {
    const engine = new WorkflowEngine();
    let ctx = await engine.runAll(engine.createInitialContext(sampleNovelText, '9:16'));

    const originalShotCount = ctx.shots.length;
    // 模拟人工深度定制了第 1 镜的动作与台词
    ctx.shots[0].characterAction = '人工精心润色：顾北辰霸气捏碎高脚杯，碎片漫天飞舞';

    // 模拟人工在第 1 阶修改了角色服装
    ctx.characters[0].appearancePrompt = 'wearing ultra-luxury customized gold embroidery suit';
    ctx = engine.markDirty(ctx, 'asset');

    assert.strictEqual(ctx.dirtyFlags.prompt, true, '下游 Prompt 阶段应被标记为脏状态');

    // 仅针对 Prompt 阶段触发增量更新 (Incremental Refresh)
    const refreshedCtx = await engine.runIncrementalPrompts(ctx);

    // 关键校验：人工精修的镜头动作绝不被抹除！
    assert.strictEqual(refreshedCtx.shots.length, originalShotCount);
    assert.strictEqual(refreshedCtx.shots[0].characterAction, '人工精心润色：顾北辰霸气捏碎高脚杯，碎片漫天飞舞');
    assert.strictEqual(refreshedCtx.dirtyFlags.prompt, false, 'Prompt 阶段脏标记应被清除');
    assert.ok(refreshedCtx.shots[0].prompts.flux.includes('gold embroidery') || refreshedCtx.shots[0].prompts.midjourney.includes('gold embroidery'), 'Prompt 应拉取最新角色服装');
  });

  test('TC-WF-07: ScriptwriterAgent 能够容错标准化解析异构字段并确保场景正文与对白非空', () => {
    const agent = new ScriptwriterAgent();
    const heterogeneousLLMOutput = [
      {
        scene: '外景 - 豪门跨海大桥',
        time: 'DUSK',
        mood: '风雨欲来',
        action: '狂风卷集着暴雨，黑色宾利如幽灵般疾驰而过，车轮溅起数米水花。',
        dialogue: [
          { character: '顾北辰', tone: '冰冷决绝', line: '回江城。', voiceover: false }
        ]
      }
    ];

    const normalized = (agent as any).normalizeScenes(heterogeneousLLMOutput);
    assert.strictEqual(normalized.length, 1);
    const scene = normalized[0];
    assert.strictEqual(scene.location, '外景 - 豪门跨海大桥');
    assert.strictEqual(scene.timeOfDay, 'DUSK');
    assert.strictEqual(scene.atmosphere, '风雨欲来');
    assert.strictEqual(scene.actionDescription, '狂风卷集着暴雨，黑色宾利如幽灵般疾驰而过，车轮溅起数米水花。');
    assert.strictEqual(scene.dialogues.length, 1);
    assert.strictEqual(scene.dialogues[0].speaker, '顾北辰');
    assert.strictEqual(scene.dialogues[0].text, '回江城。');
    assert.strictEqual(scene.dialogues[0].emotion, '冰冷决绝');
  });

  test('TC-WF-08: DirectorShotAgent 深度依据 scriptScenes 与角色库切分镜头并完成角色ID绑定', async () => {
    const agent = new DirectorShotAgent();
    const mockChars = [
      { id: 'c_xiaoyan', name: '萧炎', roleType: 'protagonist' as const, gender: 'male' as const, ageGroup: '18yo', appearancePrompt: 'young black robed warrior' }
    ];
    const scriptScenes = [
      {
        sceneNumber: 1,
        location: '外景 - 乌坦城演武场',
        timeOfDay: 'DAY' as const,
        atmosphere: '震撼万分',
        actionDescription: '玄重尺重重砸在青石板上，气浪翻滚。',
        dialogues: [
          { speaker: '萧炎', emotion: '眼神坚毅，下颌微扬', text: '三十年河东，莫欺少年穷！', isVoiceover: false }
        ]
      }
    ];

    const result = await agent.execute(
      { novelText: '萧炎踏步上前。', scriptScenes, aspectRatio: '9:16' },
      { id: 'shot', name: '镜头切分', enabled: true, llmConfig: { baseUrl: '', apiKey: '', model: '', temperature: 0.7 } },
      { characters: mockChars } as any
    );

    assert.ok(result.data.length >= 2, '应包含建立镜头与对白镜头');
    const dialogueShot = result.data.find(s => s.dialogue?.text.includes('莫欺少年穷'));
    assert.ok(dialogueShot, '必须生成台词镜头');
    assert.strictEqual(dialogueShot?.dialogue?.speaker, '萧炎');
    assert.ok(dialogueShot?.characterIds.includes('c_xiaoyan'), '台词镜头必须绑定角色ID c_xiaoyan');
    assert.ok(dialogueShot?.shotSize, '必须分配影视专业景别');
    assert.ok(dialogueShot?.cameraMovement, '必须分配影视专业机位运镜');
  });
});
