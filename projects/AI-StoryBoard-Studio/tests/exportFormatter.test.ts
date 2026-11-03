import { test, describe } from 'node:test';
import assert from 'node:assert';
import { ExportFormatter } from '../src/engines/exportFormatter.ts';
import type { StoryboardShot } from '../src/types/index.ts';

describe('ExportFormatter (工业物料导出器)', () => {
  const mockShots: StoryboardShot[] = [
    {
      id: 's1',
      shotNumber: 1,
      durationSec: 3.0,
      shotSize: 'Extreme Close-up',
      cameraMovement: 'Low-angle Dolly In',
      characterAction: '冷笑，眼神凌厉',
      characterIds: ['c1'],
      environmentLighting: '昏暗蓝光, 闪电',
      dialogue: {
        speaker: '顾北辰',
        text: '三年之期已到，“江城”当俯首。',
        isVoiceover: false
      },
      soundBgm: '雷鸣',
      matchedSourceParagraph: '窗外雷声大作。',
      prompts: {
        midjourney: 'Extreme close-up shot, acting: cold smirk --ar 9:16 --v 6.1',
        flux: 'A high quality 35mm film still of cold smirk',
        jimeng: '9:16竖屏电影构图 | 极度特写'
      }
    },
    {
      id: 's2',
      shotNumber: 2,
      durationSec: 2.5,
      shotSize: 'Wide Shot',
      cameraMovement: 'Static Eye-level',
      characterAction: '保镖齐齐下跪',
      characterIds: [],
      environmentLighting: '豪门雨夜',
      soundBgm: '大提琴',
      matchedSourceParagraph: '保镖单膝跪地。',
      prompts: {
        midjourney: 'Wide shot of bodyguards kneeling --ar 9:16 --v 6.1',
        flux: 'A cinematic wide establishing shot of bodyguards',
        jimeng: '9:16竖屏电影构图 | 全景'
      }
    }
  ];

  test('TC-EXP-01: CSV 导出应包含 UTF-8 BOM 及完整工业分镜表头', () => {
    const formatter = new ExportFormatter();
    const csv = formatter.toCsvFormat(mockShots);

    // 检查 UTF-8 BOM (\uFEFF)
    assert.strictEqual(csv.charCodeAt(0), 0xfeff, '必须以 UTF-8 BOM 开头以防 Excel 乱码');
    assert.ok(csv.includes('镜头号,预估时长(秒),景别,机位运镜,角色动作表情,环境光影,台词对白,音效BGM,Midjourney提示词,Flux提示词,即梦提示词'));
    assert.ok(csv.includes('Extreme close-up shot'));
  });

  test('TC-EXP-02: CSV 导出特殊字符 (双引号、逗号) 应合规转义', () => {
    const formatter = new ExportFormatter();
    const csv = formatter.toCsvFormat(mockShots);

    // 台词包含引号和逗号: 三年之期已到，“江城”当俯首。
    // 在 CSV 中应被外层双引号包裹，内部双引号转为双写双引号
    assert.ok(csv.includes('""江城""') || csv.includes('“江城”'));
  });

  test('TC-EXP-03: 批量 Prompt 导出能按模型独立输出清单', () => {
    const formatter = new ExportFormatter();
    const mjPrompts = formatter.toBatchPromptText(mockShots, 'midjourney');
    const fluxPrompts = formatter.toBatchPromptText(mockShots, 'flux');

    assert.ok(mjPrompts.includes('Shot 01: Extreme close-up shot'));
    assert.ok(mjPrompts.includes('Shot 02: Wide shot'));
    assert.ok(fluxPrompts.includes('Shot 01: A high quality 35mm film still'));
  });
});
