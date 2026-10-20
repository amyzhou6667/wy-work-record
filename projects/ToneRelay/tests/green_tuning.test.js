const test = require('node:test');
const assert = require('node:assert/strict');
const { extractRecipe, rgbToHsv } = require('../src/core/extractor');
const { renderGrading, hsvToRgb } = require('../src/core/renderer');
const { createMockImageData } = require('./helpers/image_mock');

test('GreenTuning: 针对低饱和灰绿/莫兰迪绿参考图，提取器应准确捕获其低饱和度与青冷灰绿倾向', () => {
  // 构造莫兰迪灰绿/鼠尾草绿渐变图: 色相约 130°~150°，饱和度约 0.15~0.25 (典型灰绿)
  const refImg = createMockImageData(64, 64, (x, y, w, h) => {
    const ratioY = y / h;
    const ratioX = x / w;
    // 灰绿 RGB: 如 (115, 135, 125) 偏青灰绿
    const r = Math.round(90 + 35 * ratioY + 10 * ratioX);
    const g = Math.round(120 + 30 * ratioY);
    const b = Math.round(105 + 30 * ratioY + 15 * ratioX);
    return [r, g, b, 255];
  });

  const recipe = extractRecipe(refImg);

  assert.ok(recipe.greenChannel, '应成功捕获植被/绿色通道特征');
  assert.equal(recipe.greenChannel.present, true);
  // 目标饱和度应当是低饱和灰绿 (<= 0.35)，不应虚高被误判为艳绿
  assert.ok(
    recipe.greenChannel.targetSat <= 0.35,
    `灰绿参考图的饱和度应低于0.35，实际为: ${recipe.greenChannel.targetSat}`
  );
  // 色相应当在高级青绿/莫兰迪冷绿区间 (120°~165°)
  assert.ok(
    recipe.greenChannel.targetHue >= 120 && recipe.greenChannel.targetHue <= 165,
    `色相偏向冷青绿，实际为: ${recipe.greenChannel.targetHue}`
  );
});

test('GreenTuning: 针对带有黄绿嫩叶(Hue 40°~65°)的参考图，能联动捕获并识别植被色调', () => {
  // 构造带有草木黄绿嫩叶的参考图
  const plantImg = createMockImageData(64, 64, (x, y, w, h) => {
    const ratioY = y / h;
    // 上部暖黄光，下部偏黄绿树叶 (r:120, g:140, b:60, 色相约 75°)
    const r = Math.round(140 * (1 - ratioY) + 110 * ratioY);
    const g = Math.round(130 * (1 - ratioY) + 135 * ratioY);
    const b = Math.round(70 * (1 - ratioY) + 65 * ratioY);
    return [r, g, b, 255];
  });

  const recipe = extractRecipe(plantImg);
  assert.ok(recipe.greenChannel, '黄绿植物图像应能被植被通道识别');
  assert.equal(recipe.greenChannel.present, true);
});

test('GreenTuning: 渲染引擎应将原图高饱和刺眼鲜绿深度压制为高级低饱和灰绿，不受全局饱和度暴拉影响', () => {
  // 原图：鲜艳的草地直出 (高饱和亮黄绿: r=80, g:210, b:40 => HSV: H=99°, S=0.81, V=0.82)
  const targetImg = createMockImageData(32, 32, () => [80, 210, 40, 255]);

  // 配方：具有低饱和高级灰绿属性 (目标色相 140°, 目标饱和度 0.22, 目标明度 0.55)
  const grayGreenRecipe = {
    id: 'test_gray_green',
    createdAt: Date.now(),
    exposureOffset: 0,
    contrast: 1.2,
    saturation: 1.25, // 全局饱和度故意设为强力增强 1.25
    temperature: 0,
    tint: 0,
    highlights: { hue: 40, saturation: 0.3, weight: 0.5 },
    shadows: { hue: 200, saturation: 0.3, weight: 0.5 },
    greenChannel: {
      present: true,
      targetHue: 140,
      targetSat: 0.22,
      targetVal: 0.55,
      styleName: '莫兰迪冷杉灰绿'
    },
    filmGrain: 0,
    vignette: 0,
    tags: ['莫兰迪灰绿'],
    dominantPalette: ['#758a7e', '#4f6358', '#2d3b34']
  };

  const rendered = renderGrading(targetImg, grayGreenRecipe, { intensity: 1.0, protectSkin: true });
  const [outR, outG, outB] = [rendered.data[0], rendered.data[1], rendered.data[2]];
  const [outH, outS, outV] = rgbToHsv(outR, outG, outB);

  // 1. 饱和度必须被深度压制 (降至 <= 0.45，甚至接近 0.25~0.38)
  assert.ok(
    outS <= 0.45,
    `修后绿色的饱和度应深度降为灰绿(<= 0.45)，实际为: ${outS.toFixed(2)}`
  );

  // 2. 色效应成功从原始 99° 黄绿牵引向 120°~150° 范围
  assert.ok(
    outH >= 120 && outH <= 155,
    `修后绿色的色效应向冷青绿牵引(120°~155°)，实际为: ${outH.toFixed(1)}°`
  );

  // 3. 不应死黑或发白，明度保持在自然范围内
  assert.ok(outV >= 0.35 && outV <= 0.85, `明度正常，实际为: ${outV.toFixed(2)}`);
});
