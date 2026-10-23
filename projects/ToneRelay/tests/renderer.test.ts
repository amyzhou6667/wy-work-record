import test from 'node:test';
import assert from 'node:assert/strict';
import { renderGrading } from '../src/core/renderer.ts';
import { extractRecipe } from '../src/core/extractor.ts';
import { generateSkinMask } from '../src/core/skin_guard.ts';
import { createPortraitImage, createGradientImage, createMockImageData } from './helpers/image_mock.ts';

test('GradingRenderer: intensity = 0.0 时输出应与原图完全一致', () => {
  const target = createGradientImage(20, 20);
  const recipe = extractRecipe(createGradientImage(30, 30));
  
  const output = renderGrading(target, recipe, { intensity: 0.0, protectSkin: true });
  
  for (let i = 0; i < target.data.length; i++) {
    assert.equal(output.data[i], target.data[i]);
  }
});

test('GradingRenderer: intensity = 1.0 时应有效应用调色变换', () => {
  const target = createGradientImage(20, 20);
  const recipe = extractRecipe(createGradientImage(30, 30));
  
  const output = renderGrading(target, recipe, { intensity: 1.0, protectSkin: false });
  
  let diffCount = 0;
  for (let i = 0; i < target.data.length; i += 4) {
    if (Math.abs(output.data[i] - target.data[i]) > 3) {
      diffCount++;
    }
  }
  assert.ok(diffCount > 10, '应用 100% 强度后像素应发生调色改动');
});

test('GradingRenderer: 开启肤色保护时，人脸区域不应产生剧烈青冷偏色', () => {
  const portrait = createPortraitImage(40, 40);
  const skinMask = generateSkinMask(portrait);

  // 构造一个高光偏青蓝、阴影偏绿的极端冷色调配方
  const coldRecipe = {
    id: 'cold_test',
    exposureOffset: 0,
    contrast: 1.0,
    saturation: 1.0,
    temperature: -50, // 极冷
    tint: -30,       // 偏绿
    highlights: { hue: 200, saturation: 0.6, weight: 0.8 },
    shadows: { hue: 160, saturation: 0.6, weight: 0.8 },
    filmGrain: 0,
    vignette: 0,
    tags: ['极冷青调'],
    dominantPalette: ['#205080', '#103050', '#051020']
  };

  // 1. 关闭肤色保护
  const outputNoProtect = renderGrading(portrait, coldRecipe, { intensity: 1.0, protectSkin: false }, skinMask);
  // 2. 开启肤色保护
  const outputWithProtect = renderGrading(portrait, coldRecipe, { intensity: 1.0, protectSkin: true }, skinMask);

  // 中心肤色像素 (20, 20)
  const centerIdx = (20 * 40 + 20) * 4;
  const rOriginal = portrait.data[centerIdx];
  const rProtected = outputWithProtect.data[centerIdx];
  const rUnprotected = outputNoProtect.data[centerIdx];

  // 开启保护后，红色分量 R 应与原肤色更加接近，未保护则 R 被冷调大幅削弱
  const diffProtected = Math.abs(rProtected - rOriginal);
  const diffUnprotected = Math.abs(rUnprotected - rOriginal);

  assert.ok(
    diffProtected < diffUnprotected,
    `肤色保护下 R 分量差异(${diffProtected})应小于未保护(${diffUnprotected})`
  );
});

test('GradingRenderer: 提供 referenceImageData 时应成功集成 Pitié 3D 传输与导向滤波', () => {
  const target = createGradientImage(24, 24);
  const ref = createPortraitImage(24, 24); // 人像带有暖色面部
  const recipe = extractRecipe(ref);

  const outputWithPitie = renderGrading(target, recipe, {
    intensity: 1.0,
    protectSkin: false,
    referenceImageData: ref,
    usePitieTransfer: true
  });

  // 验证输出图像已成功获取到参考图的色阶分布
  let validPixelChanges = 0;
  for (let i = 0; i < target.data.length; i += 4) {
    if (Math.abs(outputWithPitie.data[i] - target.data[i]) > 5) {
      validPixelChanges++;
    }
  }

  assert.ok(
    validPixelChanges > target.data.length / 8,
    'Pitié 3D 色彩传输后图像像素色彩应显著融合参考图分布'
  );
});

test('GradingRenderer: 原图中的纯白/高光中性区域应受到严密保护，不受浓绿参考图染色或泛绿', () => {
  const mixedImg = createMockImageData(2, 1, (x) => {
    return x === 0 ? [250, 250, 250, 255] : [50, 210, 30, 255];
  });

  const strongGreenRecipe: any = {
    id: 'strong_green',
    exposureOffset: 0,
    contrast: 1.1,
    saturation: 1.1,
    temperature: 0,
    tint: 25,
    highlights: { hue: 140, saturation: 0.5, weight: 0.8 },
    shadows: { hue: 150, saturation: 0.6, weight: 0.8 },
    greenChannel: {
      present: true,
      directReuse: true,
      targetHue: 135,
      targetSat: 0.25,
      shadowHue: 140,
      highlightHue: 130,
      targetVal: 0.55,
      styleName: '胶片复古绿'
    },
    toneCurve: { p0: 0, p25: 64, p50: 128, p75: 192, p100: 255, fadeBlack: 0, isHighKey: false },
    filmGrain: 0,
    vignette: 0,
    tags: ['浓郁绿'],
    dominantPalette: ['#104020', '#206030', '#0a2010']
  };

  const rendered = renderGrading(mixedImg, strongGreenRecipe, { intensity: 1.0, protectSkin: true });

  const whitePixelR = rendered.data[0];
  const whitePixelG = rendered.data[1];
  const whitePixelB = rendered.data[2];

  assert.ok(whitePixelR >= 240, `白区域红色分量应保持高位，实际: ${whitePixelR}`);
  assert.ok(whitePixelG >= 240, `白区域绿色分量应保持高位，实际: ${whitePixelG}`);
  assert.ok(whitePixelB >= 240, `白区域蓝色分量应保持高位，实际: ${whitePixelB}`);
  assert.ok(
    Math.abs(whitePixelG - whitePixelR) <= 3,
    `白区域严禁被染绿：G (${whitePixelG}) 与 R (${whitePixelR}) 差异应 <= 3`
  );
});


