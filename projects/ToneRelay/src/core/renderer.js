/**
 * ToneRelay - 调色渲染与质感合成引擎 (专业影调增强版)
 */
const { normalizeGradingOptions } = require('../types');
const { MockImageData } = require('../../tests/helpers/image_mock');

/**
 * 色相转 RGB 偏移分量
 */
function hueToRgbOffset(hue) {
  const rad = (hue * Math.PI) / 180;
  return [
    Math.cos(rad),
    Math.cos(rad - (2 * Math.PI) / 3),
    Math.cos(rad - (4 * Math.PI) / 3)
  ];
}

/**
 * 执行专业影调渲染
 * @param {ImageData} targetImageData 
 * @param {import('../types').StyleRecipe} recipe 
 * @param {import('../types').GradingOptions} options 
 * @param {Float32Array} [skinMask] 
 * @returns {ImageData}
 */
function renderGrading(targetImageData, recipe, options, skinMask) {
  const { intensity, protectSkin } = normalizeGradingOptions(options);
  const { width, height, data: src } = targetImageData;

  const result = new (targetImageData.constructor || MockImageData)(width, height);
  const dst = result.data;

  // 若强度为 0，直接复制原图返回
  if (intensity === 0.0) {
    dst.set(src);
    return result;
  }

  const {
    contrast = 1.15,
    saturation = 1.1,
    temperature = 0,
    tint = 0,
    highlights,
    shadows,
    filmGrain = 0,
    vignette = 0
  } = recipe;

  const hiOffset = highlights ? hueToRgbOffset(highlights.hue) : [0, 0, 0];
  const shOffset = shadows ? hueToRgbOffset(shadows.hue) : [0, 0, 0];
  // 增强着色能量系数 (由 40 提升至 110，让色彩氛围鲜明可辨)
  const hiWeight = highlights ? Math.max(0.2, highlights.saturation) * (highlights.weight || 0.6) * 110 : 0;
  const shWeight = shadows ? Math.max(0.2, shadows.saturation) * (shadows.weight || 0.6) * 110 : 0;

  const cx = width / 2;
  const cy = height / 2;
  const maxDist = Math.hypot(cx, cy);
  const totalPixels = width * height;

  for (let p = 0; p < totalPixels; p++) {
    const idx = p * 4;
    const origR = src[idx];
    const origG = src[idx + 1];
    const origB = src[idx + 2];
    const origA = src[idx + 3];

    let r = origR;
    let g = origG;
    let b = origB;

    // 1. 白平衡与色温偏移 (White Balance: 增强灵敏度)
    r += temperature * 1.0;
    b -= temperature * 1.0;
    g += tint * 0.8;

    // 2. 对比度与 S 曲线 (Contrast)
    r = (r - 128) * contrast + 128;
    g = (g - 128) * contrast + 128;
    b = (b - 128) * contrast + 128;

    // 3. 饱和度增强 (Saturation Vibrance)
    if (saturation !== 1.0) {
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      r = gray + (r - gray) * saturation;
      g = gray + (g - gray) * saturation;
      b = gray + (b - gray) * saturation;
    }

    // 4. 高光与暗部色调分离注入 (Split Toning: 全色阶平滑羽化)
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    // 高光区间着色 (亮度 > 110 逐步增强)
    if (lum > 110) {
      const w = Math.min(1.0, (lum - 110) / 120);
      r += hiOffset[0] * hiWeight * w;
      g += hiOffset[1] * hiWeight * w;
      b += hiOffset[2] * hiWeight * w;
    }
    // 阴影区间着色 (亮度 < 150 逐步增强)
    if (lum < 150) {
      const w = Math.min(1.0, (150 - lum) / 120);
      r += shOffset[0] * shWeight * w;
      g += shOffset[1] * shWeight * w;
      b += shOffset[2] * shWeight * w;
    }

    // 5. 胶片颗粒与暗角质感
    if (filmGrain > 0) {
      const noise = ((Math.sin(p * 997.13) * 43758.5453) % 1) * filmGrain * 28;
      r += noise;
      g += noise;
      b += noise;
    }
    if (vignette > 0) {
      const px = p % width;
      const py = Math.floor(p / width);
      const dist = Math.hypot(px - cx, py - cy) / maxDist;
      const vigFactor = 1.0 - Math.pow(dist, 1.8) * vignette * 0.6;
      r *= vigFactor;
      g *= vigFactor;
      b *= vigFactor;
    }

    // 6. 智能人像肤色保护 (保护色相红润通透，同时融入高光暗影氛围)
    if (protectSkin && skinMask && skinMask[p] > 0.1) {
      const skinW = skinMask[p];
      // 保持原始肤色的 R/G/B 色彩比例，限制异色偏移
      const origLum = 0.299 * origR + 0.587 * origG + 0.114 * origB;
      const curLum = Math.max(1, 0.299 * r + 0.587 * g + 0.114 * b);
      const lumRatio = curLum / (origLum || 1);
      // 仅保留原肤色的自然色彩倾向并适度受光影影响
      const skinSafeR = Math.min(255, origR * lumRatio);
      const skinSafeG = Math.min(255, origG * lumRatio);
      const skinSafeB = Math.min(255, origB * lumRatio);

      r = r * (1 - skinW * 0.75) + skinSafeR * (skinW * 0.75);
      g = g * (1 - skinW * 0.75) + skinSafeG * (skinW * 0.75);
      b = b * (1 - skinW * 0.75) + skinSafeB * (skinW * 0.75);
    }

    // 7. 全局强度插值混合 (Intensity Lerp)
    const finalR = origR * (1 - intensity) + r * intensity;
    const finalG = origG * (1 - intensity) + g * intensity;
    const finalB = origB * (1 - intensity) + b * intensity;

    dst[idx] = Math.max(0, Math.min(255, Math.round(finalR)));
    dst[idx + 1] = Math.max(0, Math.min(255, Math.round(finalG)));
    dst[idx + 2] = Math.max(0, Math.min(255, Math.round(finalB)));
    dst[idx + 3] = origA;
  }

  return result;
}

module.exports = {
  renderGrading
};
