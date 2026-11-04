import { test, describe } from 'node:test';
import assert from 'node:assert';
import { LLMStoryboardService } from '../src/engines/llmService.ts';
import type { CharacterAsset } from '../src/types/index.ts';

describe('LLMStoryboardService (大模型智能分镜服务引擎)', () => {
  const service = new LLMStoryboardService();

  const mockCharacters: CharacterAsset[] = [
    {
      id: 'char_xiao_yan',
      name: '萧炎',
      roleType: 'protagonist',
      gender: 'male',
      ageGroup: '18yo',
      appearancePrompt: 'a 18-year-old young martial artist with determined black eyes, wearing black robe, carrying giant heavy ruler on back'
    }
  ];

  test('TC-LLM-01: 未配置 LLM 或离线时，优雅降级为本地离线引擎', async () => {
    const novelText = '萧炎握紧玄重尺，冷声道：“三十年河东，三十年河西，莫欺少年穷！”';
    const result = await service.decompose({
      novelText,
      aspectRatio: '9:16',
      characters: mockCharacters
    });

    assert.strictEqual(result.isAIGenerated, false);
    assert.ok(result.shots.length > 0);
    const firstShot = result.shots[0];
    assert.strictEqual(firstShot.dialogue?.speaker, '萧炎');
    assert.strictEqual(firstShot.dialogue?.text, '三十年河东，三十年河西，莫欺少年穷！');
    assert.ok(!firstShot.characterAction.includes('顾北辰'));
    assert.ok(firstShot.characterIds.includes('char_xiao_yan'));
  });

  test('TC-LLM-02: extractJsonFromResponse 能够容错解析带有 Markdown 标记与杂质文本的 JSON', () => {
    const sampleRaw = `
这里是导演为您生成的短剧分镜方案：
\`\`\`json
[
  {
    "shotNumber": 1,
    "shotSize": "Close-up",
    "cameraMovement": "Low-angle Dolly In",
    "durationSec": 3.0,
    "characterAction": "萧炎眼神坚毅",
    "characterNames": ["萧炎"],
    "environmentLighting": "乌坦城演武场晨光",
    "dialogue": {
      "speaker": "萧炎",
      "text": "莫欺少年穷！"
    },
    "prompts": {
      "midjourney": "cinematic shot --ar 9:16",
      "flux": "35mm still",
      "jimeng": "9:16 电影质感"
    }
  }
]
\`\`\`
希望符合您的需求！`;

    const parsed = service.extractJsonFromResponse(sampleRaw);
    assert.strictEqual(parsed.length, 1);
    assert.strictEqual(parsed[0].shotNumber, 1);
    assert.strictEqual(parsed[0].dialogue.speaker, '萧炎');
  });

  test('TC-LLM-03: 单镜头 AI 润色在离线模式下正确融入指令', async () => {
    const baseShot = {
      id: 'shot_1',
      shotNumber: 1,
      durationSec: 3.0,
      shotSize: 'Medium Shot' as const,
      cameraMovement: 'Static Eye-level' as const,
      characterAction: '少年拔剑',
      characterIds: [],
      environmentLighting: '自然光',
      soundBgm: '风声',
      matchedSourceParagraph: '少年拔剑出鞘。',
      prompts: { midjourney: 'young swordsman', flux: 'swordsman film', jimeng: '少年剑客' }
    };

    const refined = await service.refineShot({
      shot: baseShot,
      userInstruction: '改为低角度仰拍，增加暴雨闪电压迫感',
      characters: [],
      aspectRatio: '9:16'
    });

    assert.ok(refined.characterAction.includes('润色指令: 改为低角度仰拍'));
    assert.ok(refined.prompts.midjourney.includes('instruction: 改为低角度仰拍'));
  });

  test('TC-LLM-04: 当大模型返回的分镜缺少 prompts 字段时，必须自动补齐完整三模型提示词', async () => {
    // 模拟大模型返回缺失 prompts 字段的原始分镜
    const rawShotMissingPrompts = [
      {
        shotNumber: 1,
        shotSize: 'Close-up',
        cameraMovement: 'Low-angle Dolly In',
        durationSec: 3.0,
        characterAction: '时不虞倚靠马车远眺',
        characterNames: ['时不虞'],
        environmentLighting: '夕阳西下金色余晖'
        // 刻意省略 prompts 字段
      }
    ];

    const formattedShots = service.formatRawShots(rawShotMissingPrompts, [], '9:16', '原著内容');
    assert.strictEqual(formattedShots.length, 1);
    const shot = formattedShots[0];

    // 断言必须自动补齐，绝对不可为空字符串
    assert.ok(shot.prompts.midjourney.length > 10, 'Midjourney 提示词必须自动补全且非空');
    assert.ok(shot.prompts.midjourney.includes('--ar 9:16'), 'MJ 提示词应包含正确的画幅参数');
    assert.ok(shot.prompts.flux.length > 10, 'Flux 提示词必须自动补全且非空');
    assert.ok(shot.prompts.jimeng.length > 5, '即梦提示词必须自动补全且非空');
  });

  test('TC-LLM-05: 面对他人提醒等复杂句式，说话人提取不能误将句首旁观主角当说话人', async () => {
    const text = '时不虞靠着马车抬头看了许久，直到身边的人提醒：“姑娘，他回来了。”';
    const result = await service.decompose({
      novelText: text,
      aspectRatio: '9:16',
      characters: [{ id: 'c1', name: '时不虞', roleType: 'protagonist', gender: 'female', ageGroup: '18yo', appearancePrompt: 'young lady' }]
    });

    assert.ok(result.shots.length > 0);
    const dialogueShot = result.shots.find(s => s.dialogue?.text.includes('他回来了'));
    assert.ok(dialogueShot, '应成功切出台词镜头');
    // 台词是“身边的人”提醒的，说话人绝不能是“时不虞”
    assert.notStrictEqual(dialogueShot?.dialogue?.speaker, '时不虞', '说话人绝不可被误识别为时不虞');
  });
});
