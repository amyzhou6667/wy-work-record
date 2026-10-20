const test = require('node:test');
const assert = require('node:assert/strict');
const { generateSkinMask } = require('../src/core/skin_guard');
const { createPortraitImage, createSolidColorImage } = require('./helpers/image_mock');

test('SkinGuard: 输出蒙版应为匹配像素数量的 Float32Array', () => {
  const w = 40, h = 40;
  const img = createPortraitImage(w, h);
  const mask = generateSkinMask(img);

  assert.ok(mask instanceof Float32Array);
  assert.equal(mask.length, w * h);
});

test('SkinGuard: 人脸肤色中心区域权重应显著高于背景冷色区域', () => {
  const w = 50, h = 50;
  const img = createPortraitImage(w, h);
  const mask = generateSkinMask(img);

  // 中心点 (w/2, h/2) 是肤色
  const centerIdx = Math.floor(h / 2) * w + Math.floor(w / 2);
  const centerWeight = mask[centerIdx];

  // 角落点 (2, 2) 是冷色背景
  const cornerIdx = 2 * w + 2;
  const cornerWeight = mask[cornerIdx];

  assert.ok(centerWeight > 0.8, `人像中心肤色蒙版权重应 > 0.8，实际为: ${centerWeight}`);
  assert.ok(cornerWeight < 0.1, `背景区域蒙版权重应 < 0.1，实际为: ${cornerWeight}`);
});

test('SkinGuard: 纯冷色图片中肤色蒙版权重应全部接近于 0', () => {
  const img = createSolidColorImage(20, 20, 20, 80, 160);
  const mask = generateSkinMask(img);

  let maxWeight = 0;
  for (let i = 0; i < mask.length; i++) {
    if (mask[i] > maxWeight) maxWeight = mask[i];
  }
  assert.ok(maxWeight < 0.05, `纯冷色背景不应触发肤色权重，最大值为: ${maxWeight}`);
});
