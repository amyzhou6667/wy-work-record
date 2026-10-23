import test from 'node:test';
import assert from 'node:assert/strict';
import { extractRecipe } from '../src/core/extractor.ts';
import { isValidStyleRecipe } from '../src/types/index.ts';
import { createGradientImage } from './helpers/image_mock.ts';

test('FeatureExtractor: 应该成功提取合法且完整的 StyleRecipe 实体', () => {
  const img = createGradientImage(64, 64);
  const recipe = extractRecipe(img);

  assert.equal(isValidStyleRecipe(recipe), true);
  assert.ok(recipe.id.length > 0);
  assert.ok(recipe.tags.length >= 2);
  assert.ok(recipe.dominantPalette.length >= 3);
});

test('FeatureExtractor: 针对暖阳青蓝渐变图应准确分离高光暖调与阴影青冷调', () => {
  const img = createGradientImage(64, 64);
  const recipe = extractRecipe(img);

  // 高光主要采样于图像上方暖黄橙区 (色相 15°~65°)
  assert.ok(
    recipe.highlights.hue >= 15 && recipe.highlights.hue <= 65,
    `高光色相应为暖色调，实际为: ${recipe.highlights.hue}`
  );

  // 阴影主要采样于图像下方深青蓝色区 (色相 170°~250°)
  assert.ok(
    recipe.shadows.hue >= 170 && recipe.shadows.hue <= 250,
    `暗部色相应为冷青/蓝色调，实际为: ${recipe.shadows.hue}`
  );
});

test('FeatureExtractor: dominantPalette 应输出有效的 HEX 颜色值', () => {
  const img = createGradientImage(64, 64);
  const recipe = extractRecipe(img);

  const hexRegex = /^#[0-9A-Fa-f]{6}$/;
  for (const hex of recipe.dominantPalette) {
    assert.match(hex, hexRegex);
  }
});
