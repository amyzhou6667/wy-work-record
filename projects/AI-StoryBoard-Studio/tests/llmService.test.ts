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
    // 绝不可出现写死的顾北辰
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
});
