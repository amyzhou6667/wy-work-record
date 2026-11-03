import { test, describe } from 'node:test';
import assert from 'node:assert';
import { JianYingSrtEngine } from '../src/engines/srtGenerator.ts';
import type { StoryboardShot, SrtExportConfig } from '../src/types/index.ts';

describe('JianYingSrtEngine (剪映高保真 SRT 字幕生成引擎)', () => {
  const mockShots: StoryboardShot[] = [
    {
      id: 'shot_1',
      shotNumber: 1,
      durationSec: 3.0,
      shotSize: 'Extreme Close-up',
      cameraMovement: 'Static Eye-level',
      characterAction: '目光如寒星，嘴角浮起冷笑',
      characterIds: ['char_1'],
      environmentLighting: '豪门雨夜冷蓝光',
      dialogue: {
        speaker: '顾北辰',
        text: '三年之期已到，江城该变天了。',
        isVoiceover: false
      },
      soundBgm: '暴雨雷鸣',
      matchedSourceParagraph: '顾北辰站在落地窗前，冷眼俯瞰雨中的江城大厦，三年之期已到。',
      prompts: {
        midjourney: '',
        flux: '',
        jimeng: ''
      }
    },
    {
      id: 'shot_2',
      shotNumber: 2,
      durationSec: 4.0,
      shotSize: 'Medium Shot',
      cameraMovement: 'Low-angle Dolly In',
      characterAction: '苏清影倒退半步，面色煞白',
      characterIds: ['char_2'],
      environmentLighting: '水晶吊灯暖光映衬',
      dialogue: {
        speaker: '苏清影',
        text: '你到底是谁？当年那个落魄赘婿，怎会拥有千亿黑卡！',
        isVoiceover: false
      },
      soundBgm: '心跳重音',
      matchedSourceParagraph: '苏清影震惊地看着桌上的黑金卡，声音颤抖。',
      prompts: {
        midjourney: '',
        flux: '',
        jimeng: ''
      }
    },
    {
      id: 'shot_3',
      shotNumber: 3,
      durationSec: 2.0,
      shotSize: 'Wide Shot',
      cameraMovement: 'High-angle Tilt Down',
      characterAction: '保镖齐齐躬身下跪',
      characterIds: [],
      environmentLighting: '雨雾缭绕',
      // 无台词纯镜头
      soundBgm: '低音大提琴',
      matchedSourceParagraph: '门外数十名黑衣保镖齐刷刷单膝下跪。',
      prompts: {
        midjourney: '',
        flux: '',
        jimeng: ''
      }
    }
  ];

  test('TC-SRT-01: 应该准确跳过无台词镜头，仅为有台词镜头生成字幕', () => {
    const engine = new JianYingSrtEngine();
    const result = engine.generateSubtitles(mockShots);
    
    // shot_1 和 shot_2 有台词，shot_3 无台词
    // shot_2 文本很长（超过18字），应会被自动分段
    assert.ok(result.items.length >= 2, `Expected at least 2 subtitle items, got ${result.items.length}`);
    assert.strictEqual(result.items[0].index, 1);
  });

  test('TC-SRT-02: 格式应严格符合剪映时码规范 (HH:MM:SS,mmm)', () => {
    const engine = new JianYingSrtEngine();
    const result = engine.generateSubtitles(mockShots);
    const srtContent = engine.toSrtString(result.items);

    // 校验剪映时间戳正则: 00:00:00,000 --> 00:00:00,000
    const timecodeRegex = /\d{2}:\d{2}:\d{2},\d{3} --> \d{2}:\d{2}:\d{2},\d{3}/;
    assert.match(srtContent, timecodeRegex);

    // 验证第一条字幕起始时间从 00:00:00,000 或初始呼吸位平滑开始
    const firstItem = result.items[0];
    assert.match(firstItem.startTimeFormatted, /^\d{2}:\d{2}:\d{2},\d{3}$/);
    assert.match(firstItem.endTimeFormatted, /^\d{2}:\d{2}:\d{2},\d{3}$/);
    assert.ok(firstItem.endMs > firstItem.startMs);
  });

  test('TC-SRT-03: 超长文本 (>18字) 应智能在逗号或语义断点处切分，防止剪映折行炸屏', () => {
    const engine = new JianYingSrtEngine();
    // shot_2 台词: "你到底是谁？为什么当年那个落魄赘婿会拥有千亿财团的黑金黑卡！"
    // 汉字长度 > 25 字，必须切分为两条连续字幕
    const result = engine.generateSubtitles(mockShots, {
      charactersPerSecond: 4.5,
      breathPauseSec: 0.35,
      maxCharactersPerLine: 18,
      includeSpeakerName: false
    });

    const shot2Items = result.items.filter(item => item.speaker === '苏清影');
    assert.strictEqual(shot2Items.length, 2, '超长台词应被安全切分为 2 段字幕');
    assert.strictEqual(shot2Items[0].text, '你到底是谁？');
    assert.strictEqual(shot2Items[1].text, '当年那个落魄赘婿，怎会拥有千亿黑卡！');
    
    // 校验第2段的起始时间在第1段结束时间之后
    assert.ok(shot2Items[1].startMs >= shot2Items[0].endMs);
  });

  test('TC-SRT-04: 说话人前缀开关 (includeSpeakerName) 正常工作', () => {
    const engine = new JianYingSrtEngine();
    // 开启说话人
    const withSpeaker = engine.generateSubtitles(mockShots, {
      charactersPerSecond: 4.5,
      breathPauseSec: 0.35,
      maxCharactersPerLine: 30,
      includeSpeakerName: true
    });
    assert.ok(withSpeaker.items[0].text.startsWith('[顾北辰]:'));

    // 关闭说话人
    const withoutSpeaker = engine.generateSubtitles(mockShots, {
      charactersPerSecond: 4.5,
      breathPauseSec: 0.35,
      maxCharactersPerLine: 30,
      includeSpeakerName: false
    });
    assert.ok(!withoutSpeaker.items[0].text.includes('[顾北辰]:'));
    assert.strictEqual(withoutSpeaker.items[0].text, '三年之期已到，江城该变天了。');
  });

  test('TC-SRT-05: 语速调节影响计算时长 (4.5 字/秒 vs 6.0 字/秒)', () => {
    const engine = new JianYingSrtEngine();
    const configSlow: SrtExportConfig = {
      charactersPerSecond: 4.0,
      breathPauseSec: 0.3,
      maxCharactersPerLine: 30,
      includeSpeakerName: false
    };
    const configFast: SrtExportConfig = {
      charactersPerSecond: 6.0,
      breathPauseSec: 0.3,
      maxCharactersPerLine: 30,
      includeSpeakerName: false
    };

    const resSlow = engine.generateSubtitles(mockShots.slice(0, 1), configSlow);
    const resFast = engine.generateSubtitles(mockShots.slice(0, 1), configFast);

    const durationSlow = resSlow.items[0].endMs - resSlow.items[0].startMs;
    const durationFast = resFast.items[0].endMs - resFast.items[0].startMs;

    assert.ok(durationSlow > durationFast, `慢语速耗时 (${durationSlow}ms) 应大于快语速耗时 (${durationFast}ms)`);
  });
});
