import { test, describe } from 'node:test';
import assert from 'node:assert';
import { DocParserEngine } from '../src/engines/docParser.ts';

describe('DocParserEngine (电子书解析与分镜提取引擎)', () => {
  const sampleNovelText = `
第一章 龙王赘婿归来
顾家老宅内，狂风呼啸，冷雨敲打着落地窗。
苏清影站在客厅中央，满脸寒霜：“顾北辰，签了这份离婚协议，三年了，你一事无成，配不上我苏家！”
顾北辰目光如寒星，嘴角掠过一丝不易察觉的冷笑：“三年之期已到，江城该变天了。”
就在这时，数十辆黑色迈巴赫轰鸣停在门外。
数百名身穿黑衣的铁血保镖齐刷刷单膝跪地，声音震天动地：“恭迎龙王归位！”

第二章 千亿黑卡现世
苏清影倒退半步，面色煞白，眼中满是难以置信。
顾北辰从怀中摸出一张泛着暗金幽光的卡片，轻叩在茶几上。
“这张黑金卡，可买下整个苏氏集团。”
门外的保镖头领大步走入，恭敬奉上免死金牌。
`;

  test('TC-DOC-01: 应该准确解析章节标题与正文分割', () => {
    const engine = new DocParserEngine();
    const doc = engine.parseTextDocument('战神赘婿.txt', sampleNovelText);

    assert.strictEqual(doc.fileName, '战神赘婿.txt');
    assert.strictEqual(doc.chapters.length, 2);
    assert.strictEqual(doc.chapters[0].title, '第一章 龙王赘婿归来');
    assert.strictEqual(doc.chapters[1].title, '第二章 千亿黑卡现世');
    assert.ok(doc.totalWords > 100);
  });

  test('TC-DOC-02: 应该能从章节提炼黄金短剧大纲结构 (钩子/冲突/卡点)', () => {
    const engine = new DocParserEngine();
    const doc = engine.parseTextDocument('战神赘婿.txt', sampleNovelText);
    const outline = engine.extractEpisodeOutline(doc.chapters[0]);

    assert.strictEqual(outline.episodeNumber, 1);
    assert.ok(outline.hookOpening.length > 5, '应提炼前3秒钩子');
    assert.ok(outline.conflictEscalation.length > 5, '应提炼冲突升级');
    assert.ok(outline.cliffhangerEnding.length > 5, '应提炼结尾悬念');
  });

  test('TC-DOC-03: 应该自动将章节正文拆解为影视级分镜镜头流', () => {
    const engine = new DocParserEngine();
    const doc = engine.parseTextDocument('战神赘婿.txt', sampleNovelText);
    const shots = engine.decomposeToShots(doc.chapters[0]);

    assert.ok(shots.length >= 3, `Expected at least 3 shots, got ${shots.length}`);
    const firstShot = shots[0];
    assert.ok(firstShot.shotNumber === 1);
    assert.ok(firstShot.shotSize);
    assert.ok(firstShot.cameraMovement);
    assert.ok(firstShot.environmentLighting);
    assert.ok(firstShot.matchedSourceParagraph);

    // 检查是否有识别到台词
    const dialogueShot = shots.find(s => s.dialogue && s.dialogue.text.includes('三年之期已到'));
    assert.ok(dialogueShot, '应正确提取包含对白的镜头');
    assert.strictEqual(dialogueShot?.dialogue?.speaker, '顾北辰');
  });
});
