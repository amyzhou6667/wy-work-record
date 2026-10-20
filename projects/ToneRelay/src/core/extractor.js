/**
 * ToneRelay - 色彩与影调配方解构提取器
 */
const crypto = require('crypto');

/**
 * RGB 转 HSV
 * @returns {[number, number, number]} [H: 0~360, S: 0~1, V: 0~1]
 */
function rgbToHsv(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  const s = max === 0 ? 0 : d / max;
  const v = max;

  if (max !== min) {
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h *= 60;
  }
  return [h, s, v];
}

/**
 * RGB 转 Hex
 */
function rgbToHex(r, g, b) {
  const toHex = (n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * 计算角度平均值 (处理色相在 360 度和 0 度的闭环)
 */
function averageHue(hueList, weightList) {
  if (hueList.length === 0) return 0;
  let sumX = 0;
  let sumY = 0;
  let totalW = 0;

  for (let i = 0; i < hueList.length; i++) {
    const rad = (hueList[i] * Math.PI) / 180;
    const w = weightList ? weightList[i] : 1;
    sumX += Math.cos(rad) * w;
    sumY += Math.sin(rad) * w;
    totalW += w;
  }

  if (totalW === 0) return 0;
  let avgRad = Math.atan2(sumY / totalW, sumX / totalW);
  let deg = (avgRad * 180) / Math.PI;
  if (deg < 0) deg += 360;
  return Math.round(deg);
}

/**
 * 解构参考图，输出 StyleRecipe
 * @param {ImageData} imageData 
 * @returns {import('../types').StyleRecipe}
 */
function extractRecipe(imageData) {
  const { width, height, data } = imageData;
  const totalPixels = width * height;
  const step = Math.max(1, Math.floor(totalPixels / 3000));

  const highlightHues = [];
  const highlightWeights = [];
  let sumHighlightSat = 0;

  const shadowHues = [];
  const shadowWeights = [];
  let sumShadowSat = 0;

  let totalL = 0;
  let totalR = 0, totalG = 0, totalB = 0;
  let sampleCount = 0;

  const colorSamples = [];

  for (let i = 0; i < data.length; i += 4 * step) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const l = 0.299 * r + 0.587 * g + 0.114 * b;
    const [h, s, v] = rgbToHsv(r, g, b);

    totalL += l;
    totalR += r;
    totalG += g;
    totalB += b;
    sampleCount++;

    if (sampleCount <= 100) {
      colorSamples.push([r, g, b, l]);
    }

    // 高光区 (L > 140)
    if (l > 140 && s > 0.05) {
      highlightHues.push(h);
      highlightWeights.push(s * (l / 255));
      sumHighlightSat += s;
    }

    // 阴影区 (L < 110)
    if (l < 110 && s > 0.05) {
      shadowHues.push(h);
      shadowWeights.push(s * (1 - l / 255));
      sumShadowSat += s;
    }
  }

  const avgHighlightHue = highlightHues.length > 0 
    ? averageHue(highlightHues, highlightWeights) 
    : 35; // 默认暖色
  const avgShadowHue = shadowHues.length > 0 
    ? averageHue(shadowHues, shadowWeights) 
    : 210; // 默认冷色

  const avgHighlightSat = highlightHues.length > 0 
    ? +(sumHighlightSat / highlightHues.length).toFixed(2) 
    : 0.3;
  const avgShadowSat = shadowHues.length > 0 
    ? +(sumShadowSat / shadowHues.length).toFixed(2) 
    : 0.3;

  const meanL = totalL / sampleCount;
  const exposureOffset = +((meanL - 128) / 255).toFixed(2);
  const tempRatio = totalR / (totalB || 1);
  const temperature = Math.round((tempRatio - 1.0) * 50);

  // 提取 3 个代表色（按明度排序分别选取高、中、低亮度的典型颜色）
  colorSamples.sort((a, b) => b[3] - a[3]);
  const hiColor = colorSamples[0] || [230, 200, 170];
  const midColor = colorSamples[Math.floor(colorSamples.length / 2)] || [150, 150, 150];
  const loColor = colorSamples[colorSamples.length - 1] || [40, 50, 60];

  const dominantPalette = [
    rgbToHex(hiColor[0], hiColor[1], hiColor[2]),
    rgbToHex(midColor[0], midColor[1], midColor[2]),
    rgbToHex(loColor[0], loColor[1], loColor[2])
  ];

  // 生成通俗易懂的标签
  const tags = [];
  if (avgHighlightHue >= 20 && avgHighlightHue <= 70) {
    tags.push('暖阳高光');
  } else if (avgHighlightHue >= 180 && avgHighlightHue <= 240) {
    tags.push('冰蓝高光');
  } else {
    tags.push('通透高光');
  }

  if (avgShadowHue >= 170 && avgShadowHue <= 250) {
    tags.push('青冷暗部');
  } else if (avgShadowHue >= 10 && avgShadowHue <= 45) {
    tags.push('复古棕调暗部');
  } else {
    tags.push('深沉暗部');
  }

  tags.push('中度胶片质感');

  return {
    id: crypto.randomUUID ? crypto.randomUUID() : `recipe_${Date.now()}`,
    createdAt: Date.now(),
    exposureOffset,
    contrast: 1.1,
    saturation: 1.05,
    temperature,
    tint: 0,
    highlights: {
      hue: avgHighlightHue,
      saturation: avgHighlightSat,
      weight: 0.6
    },
    shadows: {
      hue: avgShadowHue,
      saturation: avgShadowSat,
      weight: 0.6
    },
    filmGrain: 0.15,
    vignette: 0.1,
    tags,
    dominantPalette
  };
}

module.exports = {
  extractRecipe,
  rgbToHsv,
  rgbToHex,
  averageHue
};
