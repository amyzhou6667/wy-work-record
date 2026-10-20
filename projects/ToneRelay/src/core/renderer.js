/**
 * ToneRelay - 调色渲染与质感合成引擎
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
 * 执行调色渲染
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
    contrast = 1.0,
    temperature = 0,
    tint = 0,
    highlights,
    shadows,
    filmGrain = 0,
    vignette = 0
  } = recipe;

  const hiOffset = highlights ? hueToRgbOffset(highlights.hue) : [0, 0, 0];
  const shOffset = shadows ? hueToRgbOffset(shadows.hue) : [0, 0, 0];
  const hiWeight = highlights ? highlights.saturation * highlights.weight * 40 : 0;
  const shWeight = shadows ? shadows.saturation * shadows.weight * 40 : 0;

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

    // 1. 色温与色调 (White Balance)
    r += temperature * 0.4;
    b -= temperature * 0.4;
    g += tint * 0.3;

    // 2. 对比度 (Contrast)
    r = (r - 128) * contrast + 128;
    g = (g - 128) * contrast + 128;
    b = (b - 128) * contrast + 128;

    // 3. 高光与暗部色调分离 (Split Toning)
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    if (lum > 128) {
      const w = (lum - 128) / 127;
      r += hiOffset[0] * hiWeight * w;
      g += hiOffset[1] * hiWeight * w;
      b += hiOffset[2] * hiWeight * w;
    } else {
      const w = (128 - lum) / 128;
      r += shOffset[0] * shWeight * w;
      g += shOffset[1] * shWeight * w;
      b += shOffset[2] * shWeight * w;
    }

    // 4. 胶片颗粒与暗角
    if (filmGrain > 0) {
      const noise = (Math.sin(p * 997) * 43758.5453 % 1) * filmGrain * 20;
      r += noise;
      g += noise;
      b += noise;
    }
    if (vignette > 0) {
      const px = p % width;
      const py = Math.floor(p / width);
      const dist = Math.hypot(px - cx, py - cy) / maxDist;
      const vigFactor = 1.0 - Math.pow(dist, 2) * vignette * 0.5;
      r *= vigFactor;
      g *= vigFactor;
      b *= vigFactor;
    }

    // 5. 智能肤色保护软蒙版融合
    if (protectSkin && skinMask && skinMask[p] > 0) {
      const skinW = skinMask[p] * 0.85; // 保护强度
      // 保持原肤色色相，仅叠加 15% 调色对比
      r = r * (1 - skinW) + origR * skinW;
      g = g * (1 - skinW) + origG * skinW;
      b = b * (1 - skinW) + origB * skinW;
    }

    // 6. 全局强度插值混合 (Intensity Lerp)
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
