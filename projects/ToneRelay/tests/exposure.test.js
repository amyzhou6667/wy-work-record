const test = require('node:test');
const assert = require('node:assert/strict');
const { alignExposure, calculateMeanLuminance } = require('../src/core/exposure');
const { createSolidColorImage, createGradientImage } = require('./helpers/image_mock');

test('ExposureAligner: 能够准确计算平均亮度', () => {
  const darkImg = createSolidColorImage(20, 20, 40, 40, 40);
  const brightImg = createSolidColorImage(20, 20, 220, 220, 220);

  const darkLum = calculateMeanLuminance(darkImg);
  const brightLum = calculateMeanLuminance(brightImg);

  assert.ok(Math.abs(darkLum - 40) < 1);
  assert.ok(Math.abs(brightLum - 220) < 1);
});

test('ExposureAligner: 当亮暗差异巨大时，应自适应调节原图基准曝光', () => {
  // 原图：明亮烈日场景 (平均亮度约 210)
  const brightTarget = createSolidColorImage(30, 30, 210, 210, 210);
  // 参考图：暗调夜景 (平均亮度约 50)
  const darkRef = createSolidColorImage(30, 30, 50, 50, 50);

  const aligned = alignExposure(brightTarget, darkRef);
  const newLum = calculateMeanLuminance(aligned);

  // 应该被压暗，但保留必要暗部细节，避免死黑
  assert.ok(newLum < 210, `对齐后亮度应该被压暗，原亮度 210，新亮度: ${newLum}`);
  assert.ok(newLum > 60, `对齐后不应完全死黑，新亮度: ${newLum}`);
});

test('ExposureAligner: 当曝光接近时应基本保持原图不变', () => {
  const img1 = createGradientImage(20, 20);
  const img2 = createGradientImage(20, 20);

  const aligned = alignExposure(img1, img2);
  const lum1 = calculateMeanLuminance(img1);
  const lumAligned = calculateMeanLuminance(aligned);

  assert.ok(Math.abs(lum1 - lumAligned) < 5);
});
