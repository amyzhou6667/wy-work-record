const test = require('node:test');
const assert = require('node:assert/strict');
const { validateReferenceImage } = require('../src/core/validator');
const { createSolidColorImage, createGradientImage } = require('./helpers/image_mock');

test('FeatureValidator: 应该拦截空或非法尺寸图像', () => {
  assert.equal(validateReferenceImage(null).valid, false);
  assert.equal(validateReferenceImage({ width: 0, height: 0 }).valid, false);
});

test('FeatureValidator: 应该拦截纯黑图像 (方差为0)', () => {
  const blackImg = createSolidColorImage(64, 64, 0, 0, 0);
  const result = validateReferenceImage(blackImg);
  assert.equal(result.valid, false);
  assert.match(result.reason, /色彩过于单一|光影丰富/);
});

test('FeatureValidator: 应该拦截纯白和单色纯色图', () => {
  const whiteImg = createSolidColorImage(64, 64, 255, 255, 255);
  assert.equal(validateReferenceImage(whiteImg).valid, false);

  const pureRedImg = createSolidColorImage(64, 64, 200, 20, 20);
  assert.equal(validateReferenceImage(pureRedImg).valid, false);
});

test('FeatureValidator: 正常摄影渐变图像应该顺利通过验证', () => {
  const gradImg = createGradientImage(64, 64);
  const result = validateReferenceImage(gradImg);
  assert.equal(result.valid, true);
  assert.equal(result.reason, undefined);
});
