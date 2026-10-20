const test = require('node:test');
const assert = require('node:assert/strict');
const { renderGrading } = require('../src/core/renderer');
const { extractRecipe } = require('../src/core/extractor');
const { generateSkinMask } = require('../src/core/skin_guard');
const { createPortraitImage, createGradientImage } = require('./helpers/image_mock');

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
