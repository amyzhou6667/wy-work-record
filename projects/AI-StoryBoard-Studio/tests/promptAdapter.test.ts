import { test, describe } from 'node:test';
import assert from 'node:assert';
import { PromptAdapterEngine } from '../src/engines/promptAdapter.ts';
import type { StoryboardShot, CharacterAsset, AspectRatio } from '../src/types/index.ts';

describe('PromptAdapterEngine (多生图模型英文提示词适配引擎)', () => {
  const mockCharacters: CharacterAsset[] = [
    {
      id: 'char_1',
      name: '顾北辰',
      roleType: 'protagonist',
      gender: 'male',
      ageGroup: '28yo',
      appearancePrompt: 'a 28yo cold Asian male CEO with sharp jawline, short neat black hair, wearing bespoke charcoal tailored suit',
      crefUrl: 'https://cdn.example.com/cref/gu_beichen.png'
    },
    {
      id: 'char_2',
      name: '苏清影',
      roleType: 'antagonist',
      gender: 'female',
      ageGroup: '25yo',
      appearancePrompt: 'a 25yo elegant Asian heiress with wavy long brown hair, pearl earrings, silk emerald gown'
    }
  ];

  const baseShot: StoryboardShot = {
    id: 'shot_101',
    shotNumber: 1,
    durationSec: 3.5,
    shotSize: 'Extreme Close-up',
    cameraMovement: 'Low-angle Dolly In',
    characterAction: '冷峻低视，眼神如利刃，微扬下颌',
    characterIds: ['char_1'],
    environmentLighting: '豪门雨夜冷蓝顶光与微弱暖色台灯交错',
    dialogue: {
      speaker: '顾北辰',
      text: '三年之期已到。',
      isVoiceover: false
    },
    soundBgm: '雷雨交加',
    matchedSourceParagraph: '窗外雷声轰鸣，顾北辰站在阴影里。',
    prompts: { midjourney: '', flux: '', jimeng: '' }
  };

  test('TC-PROMPT-01: Midjourney 9:16 竖屏模式与 --cref 注入', () => {
    const engine = new PromptAdapterEngine();
    const prompts = engine.generateAllPrompts(baseShot, mockCharacters, '9:16');

    const mj = prompts.midjourney;
    assert.ok(mj.includes('Extreme close-up shot'), '应包含景别英文');
    assert.ok(mj.includes('Low-angle dolly in'), '应包含运镜英文');
    assert.ok(mj.includes('a 28yo cold Asian male CEO'), '应注入主角一致性英文特征');
    assert.ok(mj.includes('--ar 9:16'), '竖屏应包含 --ar 9:16');
    assert.ok(mj.includes('--v 6.1 --style raw'), '应包含 MJ v6.1 标准工业修饰参数');
    assert.ok(mj.includes('--cref https://cdn.example.com/cref/gu_beichen.png'), '有 cref 链接时应自动追加 --cref');
  });

  test('TC-PROMPT-02: Midjourney 16:9 横屏模式切换验证', () => {
    const engine = new PromptAdapterEngine();
    const prompts = engine.generateAllPrompts(baseShot, mockCharacters, '16:9');

    const mj = prompts.midjourney;
    assert.ok(mj.includes('--ar 16:9'), '横屏应包含 --ar 16:9');
    assert.ok(!mj.includes('--ar 9:16'), '横屏不应包含 --ar 9:16');
  });

  test('TC-PROMPT-03: Flux.1 自然语言长提示词与细腻光影构图', () => {
    const engine = new PromptAdapterEngine();
    const prompts = engine.generateAllPrompts(baseShot, mockCharacters, '9:16');

    const flux = prompts.flux;
    assert.ok(flux.includes('cinematic vertical 9:16'), 'Flux 应注入竖屏画幅修饰');
    assert.ok(flux.includes('a 28yo cold Asian male CEO'), 'Flux 应包含角色外貌描述');
    assert.ok(flux.includes('photorealistic') || flux.includes('film still'), 'Flux 应包含胶片与写实质感词');
  });

  test('TC-PROMPT-04: 即梦 (Dreamina) 双语混合词构造', () => {
    const engine = new PromptAdapterEngine();
    const prompts = engine.generateAllPrompts(baseShot, mockCharacters, '9:16');

    const jimeng = prompts.jimeng;
    assert.ok(jimeng.length > 20, '即梦提示词应不为空');
    assert.ok(jimeng.includes('9:16'), '即梦提示词应标注竖屏画幅');
  });

  test('TC-PROMPT-05: 无角色空镜头应使用通用氛围生成', () => {
    const emptyShot: StoryboardShot = {
      ...baseShot,
      characterIds: [],
      characterAction: '狂风骤雨席卷空荡的落地窗',
      environmentLighting: '闪电划破黑夜，蓝白色刺目冷光'
    };

    const engine = new PromptAdapterEngine();
    const prompts = engine.generateAllPrompts(emptyShot, mockCharacters, '9:16');

    assert.ok(!prompts.midjourney.includes('--cref'), '无角色时不应注入 --cref');
    assert.ok(prompts.midjourney.includes('cinematic lighting'), '应包含环境构图');
  });
});
