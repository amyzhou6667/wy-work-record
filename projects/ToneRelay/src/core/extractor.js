/**
 * ToneRelay - 色彩与影调配方解构提取器 (升级：黄绿联动与自适应灰绿解构)
 */
const crypto = require('crypto');

/**
 * RGB 转 HSV
 * @returns {[number, number, number]} [H: 0~360, S: 0~1, V: 0~1]
 */
function rgbToHsv(r, g, b) {
  r /= 255; g /= 255; b /= 255;
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
  let sumX = 0, sumY = 0, totalW = 0;

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
 * 解构参考图，输出完整的 StyleRecipe
 * @param {ImageData} imageData 
 * @returns {import('../types').StyleRecipe}
 */
function extractRecipe(imageData) {
  const { width, height, data } = imageData;
  const totalPixels = width * height;
  const step = Math.max(1, Math.floor(totalPixels / 3000));

  const highlightHues = [], highlightWeights = [];
  const shadowHues = [], shadowWeights = [];
  let sumHighlightSat = 0, sumShadowSat = 0;

  // 植被/绿色通道专项统计 (扩展至黄绿~正绿~青墨绿: H 38°~175°，放宽门槛至 s >= 0.05 捕获灰绿)
  const greenHues = [], greenWeights = [];
  const greenSats = [];
  let sumGreenSat = 0, sumGreenVal = 0;

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

    if (sampleCount <= 120) {
      colorSamples.push([r, g, b, l]);
    }

    // 1. 高光区与阴影区分离 (聚焦于真正的高光 L > 140 与真正的暗部 L < 105)
    if (l > 140 && s > 0.05) {
      highlightHues.push(h);
      highlightWeights.push(s * (l / 255));
      sumHighlightSat += s;
    }
    if (l < 105 && s > 0.05) {
      shadowHues.push(h);
      shadowWeights.push(s * (1 - l / 255));
      sumShadowSat += s;
    }

    // 2. 专门捕获植被/绿色彩区 (黄绿、草绿、青绿、墨绿及低饱和灰绿)
    if (h >= 38 && h <= 175 && s >= 0.05 && v >= 0.08) {
      greenHues.push(h);
      greenSats.push(s);
      // 避免用 s 作为单纯乘数导致过饱和像素虚高；采用色域中心高斯加权
      const centerDist = Math.abs(h - 105) / 70;
      const gw = Math.max(0.2, 1.0 - centerDist);
      greenWeights.push(gw);
      sumGreenSat += s;
      sumGreenVal += v;
    }
  }

  const avgHighlightHue = highlightHues.length > 0 
    ? averageHue(highlightHues, highlightWeights) 
    : 35;
  const avgShadowHue = shadowHues.length > 0 
    ? averageHue(shadowHues, shadowWeights) 
    : 210;

  const avgHighlightSat = highlightHues.length > 0 
    ? +(sumHighlightSat / highlightHues.length).toFixed(2) 
    : 0.4;
  const avgShadowSat = shadowHues.length > 0 
    ? +(sumShadowSat / shadowHues.length).toFixed(2) 
    : 0.4;

  const meanL = totalL / sampleCount;
  const exposureOffset = +((meanL - 128) / 255).toFixed(2);
  const tempRatio = totalR / (totalB || 1);
  const temperature = Math.round((tempRatio - 1.0) * 35);
  // 计算全局红-绿偏移
  const tint = Math.round(((totalG / sampleCount) - ((totalR + totalB) / (sampleCount * 2))) * 0.4);

  // 绿色通道专项解构特征
  let greenChannel = null;
  if (greenHues.length >= 8) {
    const avgGHue = averageHue(greenHues, greenWeights);
    // 采用中位数或稳健均值，杜绝少数噪点拉高饱和度
    greenSats.sort((a, b) => a - b);
    const medianSat = greenSats[Math.floor(greenSats.length / 2)];
    const avgGSat = +(Math.min(sumGreenSat / greenHues.length, medianSat * 1.1)).toFixed(2);
    const avgGVal = +(sumGreenVal / greenHues.length).toFixed(2);

    let styleName = '清新日系绿';
    if (avgGSat <= 0.32) {
      if (avgGHue >= 125) {
        styleName = '莫兰迪青冷灰绿';
      } else if (avgGHue <= 80) {
        styleName = '复古低饱和橄榄灰绿';
      } else {
        styleName = '高级沉稳灰绿';
      }
    } else {
      if (avgGHue >= 135) {
        styleName = '复古青冷墨绿';
      } else if (avgGHue <= 85) {
        styleName = '胶片复古橄榄绿';
      } else {
        styleName = '森系冷杉绿';
      }
    }

    const shadowHue = Math.min(360, avgGHue + 6);
    const highlightHue = Math.max(0, avgGHue - 5);

    greenChannel = {
      present: true,
      directReuse: true,
      targetHue: avgGHue,
      targetSat: avgGSat,
      shadowHue,
      highlightHue,
      targetVal: avgGVal,
      styleName
    };
  } else {
    // 默认高质感冷青灰绿倾向 (140°, 饱和度稳妥在 0.28)
    greenChannel = {
      present: false,
      directReuse: false,
      targetHue: 140,
      targetSat: 0.28,
      shadowHue: 145,
      highlightHue: 135,
      targetVal: 0.55,
      styleName: '质感青墨绿'
    };
  }

  // 提取代表色
  colorSamples.sort((a, b) => b[3] - a[3]);
  const hiColor = colorSamples[0] || [240, 190, 140];
  const midColor = colorSamples[Math.floor(colorSamples.length / 2)] || [140, 150, 160];
  const loColor = colorSamples[colorSamples.length - 1] || [30, 45, 60];

  const dominantPalette = [
    rgbToHex(hiColor[0], hiColor[1], hiColor[2]),
    rgbToHex(midColor[0], midColor[1], midColor[2]),
    rgbToHex(loColor[0], loColor[1], loColor[2])
  ];

  const tags = [];
  if (avgHighlightHue >= 15 && avgHighlightHue <= 75) tags.push('暖阳金调高光');
  else if (avgHighlightHue >= 170 && avgHighlightHue <= 245) tags.push('清冷冰蓝高光');
  else tags.push('纯净通透高光');

  if (avgShadowHue >= 165 && avgShadowHue <= 255) tags.push('青冷暗部');
  else if (avgShadowHue >= 10 && avgShadowHue <= 50) tags.push('复古棕调暗部');
  else tags.push('胶片深沉暗部');

  if (greenChannel && greenChannel.present) {
    tags.push(greenChannel.styleName);
  }

  tags.push('质感胶片');

  return {
    id: (crypto.randomUUID) ? crypto.randomUUID() : `recipe_${Date.now()}`,
    createdAt: Date.now(),
    exposureOffset,
    contrast: 1.2,
    saturation: 1.15,
    temperature,
    tint,
    highlights: {
      hue: avgHighlightHue,
      saturation: avgHighlightSat,
      weight: 0.75
    },
    shadows: {
      hue: avgShadowHue,
      saturation: avgShadowSat,
      weight: 0.75
    },
    greenChannel,
    filmGrain: 0.16,
    vignette: 0.16,
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
