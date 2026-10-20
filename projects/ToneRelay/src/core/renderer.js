/**
 * ToneRelay - 调色渲染与质感合成引擎 (专业多通道色相映射增强版 - 黄绿联动与灰绿深度压制)
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

    // 1. 植被与黄绿联动靶向调色 (覆盖植物黄、嫩绿、草绿、青绿与墨绿)
    const [h, s, v] = rgbToHsv(r, g, b);
    let plantWeight = 0;
    if (h >= 35 && h <= 175 && s >= 0.06) {
      // 距离植被中心 105° 的高斯平滑权重
      const dist = Math.abs(h - 105);
      plantWeight = Math.max(0, 1.0 - dist / 70);
      if (plantWeight > 0) {
        // 色相向目标绿（如莫兰迪青冷绿或复古橄榄绿）牵引
        const newHue = h * (1 - plantWeight * 0.85) + targetGreenHue * (plantWeight * 0.85);

        // 灰绿核心：深度自适应饱和度压制 (即使原图高达 0.9，也能精准压制到接近目标灰绿)
        const targetS = Math.min(s, Math.max(0.12, targetGreenSat * 1.15));
        const newSat = s * (1 - plantWeight * 0.85) + targetS * (plantWeight * 0.85);

        // 明度微调：赋予灰调质感
        const newV = v * (1 - plantWeight * 0.2) + targetGreenVal * (plantWeight * 0.2);

        const [gr, gg, gb] = hsvToRgb(newHue, newSat, newV);
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
    r = (r - 128) * contrast + 128;
    g = (g - 128) * contrast + 128;
    b = (b - 128) * contrast + 128;

    // 4. 饱和度调整 (引入植被保护，防止全局饱和度拉爆灰绿)
    if (saturation !== 1.0) {
      // 植被区域免受全局过度饱和拉高影响，锁定灰阶沉淀
      const effectiveSat = 1.0 + (saturation - 1.0) * (1.0 - plantWeight * 0.92);
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      r = gray + (r - gray) * effectiveSat;
      g = gray + (g - gray) * effectiveSat;
      b = gray + (b - gray) * effectiveSat;
    }

    // 5. 高光与暗部色调分离注入 (Split Toning)
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    if (lum > 110) {
      const w = Math.min(1.0, (lum - 110) / 120);
      r += hiOffset[0] * hiWeight * w;
      g += hiOffset[1] * hiWeight * w;
      b += hiOffset[2] * hiWeight * w;
    }
    if (lum < 150) {
      const w = Math.min(1.0, (150 - lum) / 120);
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

    // 7. 智能人像肤色保护 (保护人脸红润，不被绿色或冷调侵染)
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
