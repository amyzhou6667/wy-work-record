import test from 'node:test';
import assert from 'node:assert/strict';
import { extractRecipe, rgbToHsv } from '../src/core/extractor.ts';
import { renderGrading } from '../src/core/renderer.ts';
import { createMockImageData } from './helpers/image_mock.ts';

test('GreenTuning: 针对低饱和灰绿/莫兰迪绿参考图，提取器应准确捕获其低饱和度与青冷灰绿倾向', () => {
  const refImg = createMockImageData(64, 64, (x, y, w, h) => {
    const ratioY = y / h;
    const ratioX = x / w;
    const r = Math.round(90 + 35 * ratioY + 10 * ratioX);
    const g = Math.round(120 + 30 * ratioY);
    const b = Math.round(105 + 30 * ratioY + 15 * ratioX);
    return [r, g, b, 255];
  });

  const recipe = extractRecipe(refImg);

  assert.ok(recipe.greenChannel, '应成功捕获植被/绿色通道特征');
  assert.equal(recipe.greenChannel.present, true);
  assert.ok(
    recipe.greenChannel.targetSat <= 0.35,
    `灰绿参考图的饱和度应低于0.35，实际为: ${recipe.greenChannel.targetSat}`
  );
  assert.ok(
    recipe.greenChannel.targetHue >= 120 && recipe.greenChannel.targetHue <= 165,
    `色相偏向冷青绿，实际为: ${recipe.greenChannel.targetHue}`
  );
});

test('GreenTuning: 针对带有黄绿嫩叶(Hue 40°~65°)的参考图，能联动捕获并识别植被色调', () => {
  const plantImg = createMockImageData(64, 64, (x, y, w, h) => {
    const ratioY = y / h;
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
  const targetImg = createMockImageData(32, 32, () => [80, 210, 40, 255]);

  const grayGreenRecipe: any = {
    id: 'test_gray_green',
    createdAt: Date.now(),
    exposureOffset: 0,
    contrast: 1.2,
    saturation: 1.25,
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

  assert.ok(
    outS <= 0.45,
    `修后绿色的饱和度应深度降为灰绿(<= 0.45)，实际为: ${outS.toFixed(2)}`
  );

  assert.ok(
    outH >= 120 && outH <= 155,
    `修后绿色的色效应向冷青绿牵引(120°~155°)，实际为: ${outH.toFixed(1)}°`
  );

  assert.ok(outV >= 0.35 && outV <= 0.85, `明度正常，实际为: ${outV.toFixed(2)}`);
});

test('DirectReuse: 待修图绿色区域应直接 1:1 复用参考图绿色的色相与饱和度，并完整保留原图明暗光影层次', () => {
  const shadowGreen: [number, number, number, number] = [35, 97, 12, 255];
  const brightGreen: [number, number, number, number] = [80, 219, 26, 255];
  const targetImg = createMockImageData(2, 1, (x) => (x === 0 ? shadowGreen : brightGreen));

  const recipeWithDirectGreen: any = {
    id: 'test_direct_reuse',
    createdAt: Date.now(),
    exposureOffset: 0,
    contrast: 1.0,
    saturation: 1.0,
    temperature: 0,
    tint: 0,
    highlights: { hue: 35, saturation: 0.3, weight: 0.5 },
    shadows: { hue: 210, saturation: 0.3, weight: 0.5 },
    greenChannel: {
      present: true,
      directReuse: true,
      targetHue: 145,
      targetSat: 0.18,
      shadowHue: 150,
      highlightHue: 140,
      targetVal: 0.50,
      styleName: '莫兰迪青冷灰绿'
    },
    filmGrain: 0,
    vignette: 0,
    tags: ['莫兰迪灰绿直接复用'],
    dominantPalette: ['#758a7e', '#4f6358', '#2d3b34']
  };

  const rendered = renderGrading(targetImg, recipeWithDirectGreen, { intensity: 1.0, protectSkin: true });

  const [sR, sG, sB] = [rendered.data[0], rendered.data[1], rendered.data[2]];
  const [bR, bG, bB] = [rendered.data[4], rendered.data[5], rendered.data[6]];

  const [shH, shS, shV] = rgbToHsv(sR, sG, sB);
  const [brH, brS, brV] = rgbToHsv(bR, bG, bB);

  assert.ok(
    Math.abs(shS - 0.18) <= 0.06,
    `暗部绿色饱和度应精准复用参考图(≈0.18)，实际为: ${shS.toFixed(2)}`
  );
  assert.ok(
    Math.abs(brS - 0.18) <= 0.06,
    `高光绿色饱和度应精准复用参考图(≈0.18)，实际为: ${brS.toFixed(2)}`
  );

  assert.ok(
    shH >= 138 && shH <= 155,
    `暗部色相应直接复用为青墨绿(138°~155°)，实际为: ${shH.toFixed(1)}°`
  );
  assert.ok(
    brH >= 135 && brH <= 150,
    `高光色相应直接复用为薄荷灰绿(135°~150°)，实际为: ${brH.toFixed(1)}°`
  );

  assert.ok(
    brV - shV >= 0.40,
    `原图的光影梯度必须完整保留 (高光与阴影差值应 >= 0.40)，实际为: ${(brV - shV).toFixed(2)}`
  );
});
