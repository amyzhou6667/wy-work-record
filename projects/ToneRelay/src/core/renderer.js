/**
 * ToneRelay - 调色渲染与质感合成引擎 (语义通道色彩直接复用增强版 - Direct Channel Palette Transfer)
 */
const { normalizeGradingOptions } = require('../types');
const { rgbToHsv } = require('./extractor');
const { MockImageData } = require('../../tests/helpers/image_mock');

/**
 * HSV 转 RGB
 */
function hsvToRgb(h, s, v) {
  h = ((h % 360) + 360) % 360;
  let r, g, b;
  const i = Math.floor(h / 60);
  const f = h / 60 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);

  switch (i) {
    case 0: r = v; g = t; b = p; break;
    case 1: r = q; g = v; b = p; break;
    case 2: r = p; g = v; b = t; break;
    case 3: r = p; g = q; b = v; break;
    case 4: r = t; g = p; b = v; break;
    default: r = v; g = p; b = q; break;
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

/**
 * 色相投影向量
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
    saturation = 1.15,
    temperature = 0,
    tint = 0,
    highlights,
    shadows,
    greenChannel,
    filmGrain = 0,
    vignette = 0
  } = recipe;

  const hiOffset = highlights ? hueToRgbOffset(highlights.hue) : [0, 0, 0];
  const shOffset = shadows ? hueToRgbOffset(shadows.hue) : [0, 0, 0];
  const hiWeight = highlights ? Math.max(0.2, highlights.saturation) * (highlights.weight || 0.6) * 110 : 0;
  const shWeight = shadows ? Math.max(0.2, shadows.saturation) * (shadows.weight || 0.6) * 110 : 0;

  const targetGreenHue = greenChannel ? greenChannel.targetHue : 140;
  const targetGreenSat = greenChannel ? greenChannel.targetSat : 0.28;
  const targetGreenVal = greenChannel ? (greenChannel.targetVal || 0.55) : 0.55;
  const targetGreenSh = greenChannel && greenChannel.shadowHue ? greenChannel.shadowHue : (targetGreenHue + 5);
  const targetGreenHi = greenChannel && greenChannel.highlightHue ? greenChannel.highlightHue : (targetGreenHue - 5);

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

    // 1. 语义色彩通道直接 1:1 复用 (Direct Channel Reuse: 换色不换光)
    const [h, s, v] = rgbToHsv(r, g, b);
    let plantWeight = 0;
    if (h >= 35 && h <= 175 && s >= 0.05) {
      // 核心植被区间 (60°~150°) 达到满归属度 1.0，边缘平滑衰减
      const dist = Math.abs(h - 105);
      if (dist <= 40) {
        plantWeight = 1.0;
      } else {
        plantWeight = Math.max(0, 1.0 - (dist - 40) / 30);
      }

      if (plantWeight > 0 && greenChannel && greenChannel.present) {
        // 色相直接复用：高光挂钩参考图高光绿，暗部挂钩参考图暗部绿
        let desiredH = targetGreenHue;
        if (v > 0.65) desiredH = targetGreenHi;
        else if (v < 0.35) desiredH = targetGreenSh;
        const newHue = h * (1 - plantWeight) + desiredH * plantWeight;

        // 饱和度直接 1:1 复用：完全复用参考图的真实低饱和灰度！
        const newSat = s * (1 - plantWeight) + targetGreenSat * plantWeight;

        // 明度质感微调：保持原图层次的同时向高级胶片感微调
        const newVal = v * (1 - plantWeight * 0.1) + targetGreenVal * (plantWeight * 0.1);

        const [gr, gg, gb] = hsvToRgb(newHue, newSat, newVal);
        r = r * (1 - plantWeight) + gr * plantWeight;
        g = g * (1 - plantWeight) + gg * plantWeight;
        b = b * (1 - plantWeight) + gb * plantWeight;
      }
    }

    // 2. 白平衡与色调倾向 (White Balance & Tint)
    r += temperature * 1.0;
    b -= temperature * 1.0;
    g += tint * 0.8;

    // 3. 对比度与立体感 (Contrast S-Curve)
    if (contrast !== 1.0) {
      const effContrast = 1.0 + (contrast - 1.0) * (1.0 - plantWeight * 0.5);
      r = (r - 128) * effContrast + 128;
      g = (g - 128) * effContrast + 128;
      b = (b - 128) * effContrast + 128;
    }

    // 4. 饱和度调整 (植被区域完全免疫全局过饱和拉爆，彻底锁定复用灰度)
    if (saturation !== 1.0) {
      const effectiveSat = 1.0 + (saturation - 1.0) * (1.0 - plantWeight);
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      r = gray + (r - gray) * effectiveSat;
      g = gray + (g - gray) * effectiveSat;
      b = gray + (b - gray) * effectiveSat;
    }

    // 5. 高光与暗部色调分离注入 (Split Toning，植被满权重处完全不被高光暗部染色污染)
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    const splitToneShield = 1.0 - plantWeight;
    if (lum > 110) {
      const w = Math.min(1.0, (lum - 110) / 120) * splitToneShield;
      r += hiOffset[0] * hiWeight * w;
      g += hiOffset[1] * hiWeight * w;
      b += hiOffset[2] * hiWeight * w;
    }
    if (lum < 150) {
      const w = Math.min(1.0, (150 - lum) / 120) * splitToneShield;
      r += shOffset[0] * shWeight * w;
      g += shOffset[1] * shWeight * w;
      b += shOffset[2] * shWeight * w;
    }

    // 6. 胶片颗粒与暗角质感
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

    // 7. 智能人像肤色保护 (保护人脸红润)
    if (protectSkin && skinMask && skinMask[p] > 0.1) {
      const skinW = skinMask[p];
      const origLum = 0.299 * origR + 0.587 * origG + 0.114 * origB;
      const curLum = Math.max(1, 0.299 * r + 0.587 * g + 0.114 * b);
      const lumRatio = curLum / (origLum || 1);
      const skinSafeR = Math.min(255, origR * lumRatio);
      const skinSafeG = Math.min(255, origG * lumRatio);
      const skinSafeB = Math.min(255, origB * lumRatio);

      r = r * (1 - skinW * 0.75) + skinSafeR * (skinW * 0.75);
      g = g * (1 - skinW * 0.75) + skinSafeG * (skinW * 0.75);
      b = b * (1 - skinW * 0.75) + skinSafeB * (skinW * 0.75);
    }

    // 8. 全局强度插值混合 (Intensity Lerp)
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
  renderGrading,
  hsvToRgb
};
