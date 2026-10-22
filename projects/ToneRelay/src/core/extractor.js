/**
 * ToneRelay - 通用色彩与影调风格解构提取器 (Universal Style & Tone Extractor)
 * 支持：5点分位数光影曲线、CIE-Lab 感知统计、真实颗粒度/暗角自适应反解、电影 Teal-Orange 判定与黄绿联动
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
 * RGB 转 CIE-L*a*b*
 * @returns {[number, number, number]} [L: 0~100, a: -128~127, b: -128~127]
 */
function rgbToLab(r, g, b) {
  let rn = r / 255, gn = g / 255, bn = b / 255;
  rn = rn > 0.04045 ? Math.pow((rn + 0.055) / 1.055, 2.4) : rn / 12.92;
  gn = gn > 0.04045 ? Math.pow((gn + 0.055) / 1.055, 2.4) : gn / 12.92;
  bn = bn > 0.04045 ? Math.pow((bn + 0.055) / 1.055, 2.4) : bn / 12.92;

  // D65 标准参考白点
  let x = (rn * 0.4124564 + gn * 0.3575761 + bn * 0.1804375) / 0.95047;
  let y = (rn * 0.2126729 + gn * 0.7151522 + bn * 0.0721750) / 1.00000;
  let z = (rn * 0.0193339 + gn * 0.1191920 + bn * 0.9503041) / 1.08883;

  const f = (t) => t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116;
  const fx = f(x), fy = f(y), fz = f(z);

  const L = Math.max(0, 116 * fy - 16);
  const a = 500 * (fx - fy);
  const bVal = 200 * (fy - fz);
  return [L, a, bVal];
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
 * 自动反解画面的物理颗粒强度 (利用拉普拉斯高频残差)
 */
function detectFilmGrain(data, width, height) {
  if (width < 8 || height < 8) return 0.05;
  const step = Math.max(2, Math.floor(Math.min(width, height) / 32));
  let noiseSum = 0;
  let validCount = 0;

  for (let y = step; y < height - step; y += step) {
    for (let x = step; x < width - step; x += step) {
      const idx = (y * width + x) * 4;
      const curL = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];

      const leftIdx = (y * width + (x - 1)) * 4;
      const rightIdx = (y * width + (x + 1)) * 4;
      const topIdx = ((y - 1) * width + x) * 4;
      const bottomIdx = ((y + 1) * width + x) * 4;

      const neighborMean = (
        (0.299 * data[leftIdx] + 0.587 * data[leftIdx + 1] + 0.114 * data[leftIdx + 2]) +
        (0.299 * data[rightIdx] + 0.587 * data[rightIdx + 1] + 0.114 * data[rightIdx + 2]) +
        (0.299 * data[topIdx] + 0.587 * data[topIdx + 1] + 0.114 * data[topIdx + 2]) +
        (0.299 * data[bottomIdx] + 0.587 * data[bottomIdx + 1] + 0.114 * data[bottomIdx + 2])
      ) / 4;

      const diff = Math.abs(curL - neighborMean);
      // 排除强图像轮廓边缘 (仅在平坦区域统计细微噪波)
      if (diff > 0.01 && diff < 28) {
        noiseSum += diff;
        validCount++;
      }
    }
  }

  if (validCount === 0) return 0.0;
  const meanNoise = noiseSum / validCount;
  // 阈值判定：低于 0.8 说明是极其平滑的纯净数码图；高于 1.5 说明有明显银盐/电影颗粒
  if (meanNoise <= 0.8) return 0.0;
  const grainStrength = Math.min(0.5, (meanNoise - 0.8) * 0.045);
  return +grainStrength.toFixed(2);
}

/**
 * 自动反解镜头暗角强度 (中心亮四周暗的明度比率)
 */
function detectVignette(data, width, height) {
  const cx = width / 2;
  const cy = height / 2;
  const maxDist = Math.hypot(cx, cy);

  let centerLum = 0, centerCount = 0;
  let edgeLum = 0, edgeCount = 0;
  const step = Math.max(1, Math.floor((width * height) / 2000));

  for (let i = 0; i < data.length; i += 4 * step) {
    const p = i / 4;
    const x = p % width;
    const y = Math.floor(p / width);
    const dist = Math.hypot(x - cx, y - cy) / maxDist;
    const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];

    if (dist <= 0.35) {
      centerLum += lum;
      centerCount++;
    } else if (dist >= 0.75) {
      edgeLum += lum;
      edgeCount++;
    }
  }

  if (centerCount === 0 || edgeCount === 0) return 0.0;
  const avgCenter = centerLum / centerCount;
  const avgEdge = edgeLum / edgeCount;

  if (avgCenter > 40 && avgEdge < avgCenter * 0.90) {
    const vig = Math.min(0.65, ((avgCenter - avgEdge) / avgCenter) * 1.1);
    return +vig.toFixed(2);
  }
  return 0.0;
}

/**
 * 通用参考图全风格解构，输出 StyleRecipe
 * @param {ImageData} imageData 
 * @returns {import('../types').StyleRecipe}
 */
function extractRecipe(imageData) {
  const { width, height, data } = imageData;
  const totalPixels = width * height;
  const step = Math.max(1, Math.floor(totalPixels / 3000));

  const allLums = [];
  const allLabs = [];
  const highlightHues = [], highlightWeights = [];
  const shadowHues = [], shadowWeights = [];
  let sumHighlightSat = 0, sumShadowSat = 0;

  // 植被/绿色通道专项统计
  const greenHues = [], greenWeights = [];
  const greenSats = [];
  let sumGreenSat = 0, sumGreenVal = 0;

  const samples = [];
  let totalL = 0, totalR = 0, totalG = 0, totalB = 0;
  let sampleCount = 0;
  const colorSamples = [];

  for (let i = 0; i < data.length; i += 4 * step) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const l = 0.299 * r + 0.587 * g + 0.114 * b;
    const [h, s, v] = rgbToHsv(r, g, b);
    const lab = rgbToLab(r, g, b);

    allLums.push(l);
    allLabs.push(lab);
    totalL += l;
    totalR += r;
    totalG += g;
    totalB += b;
    sampleCount++;

    samples.push({ r, g, b, l, h, s, v });

    if (sampleCount <= 120) {
      colorSamples.push([r, g, b, l]);
    }
  }

  // 1. 通用光影 5 节点分位数 (Tone Curve Percentiles)
  allLums.sort((a, b) => a - b);
  const p0 = Math.round(allLums[Math.floor(allLums.length * 0.02)] || 0);    // 黑位底线 (胶片灰雾检测)
  const p25 = Math.round(allLums[Math.floor(allLums.length * 0.25)] || 64);
  const p50 = Math.round(allLums[Math.floor(allLums.length * 0.50)] || 128); // 中位数
  const p75 = Math.round(allLums[Math.floor(allLums.length * 0.75)] || 192); // 高调参考点
  const p100 = Math.round(allLums[Math.floor(allLums.length * 0.98)] || 255); // 高光峰值

  // 动态自适应高光与暗部划分门槛 (自适应高调白与电影暗调)
  const hiThreshold = Math.max(125, Math.min(220, Math.round((p50 + p75) / 2)));
  const shThreshold = Math.min(115, Math.max(40, Math.round((p0 + p25) / 2)));

  for (const item of samples) {
    const { r, g, b, l, h, s, v } = item;
    // 1. 高光与阴影区分离 (基于动态分位数)
    if (l >= hiThreshold && s > 0.04) {
      highlightHues.push(h);
      highlightWeights.push(s * (l / 255));
      sumHighlightSat += s;
    }
    if (l <= shThreshold && s > 0.04) {
      shadowHues.push(h);
      shadowWeights.push(s * (1 - l / 255));
      sumShadowSat += s;
    }

    // 2. 捕获植被/绿色彩区
    if (h >= 38 && h <= 175 && s >= 0.05 && v >= 0.08) {
      greenHues.push(h);
      greenSats.push(s);
      const centerDist = Math.abs(h - 105) / 70;
      const gw = Math.max(0.2, 1.0 - centerDist);
      greenWeights.push(gw);
      sumGreenSat += s;
      sumGreenVal += v;
    }
  }

  const toneCurve = {
    p0,
    p25,
    p50,
    p75,
    p100,
    fadeBlack: Math.max(0, p0 - 4),     // 黑位抬升量
    isHighKey: p75 >= 210 && p50 >= 150  // 是否属于大面积高调明亮风格 (如日系高调白)
  };

  // 2. 通用 CIE-Lab 感知色彩统计
  let sumLabL = 0, sumLabA = 0, sumLabB = 0;
  for (const [L, a, b] of allLabs) {
    sumLabL += L; sumLabA += a; sumLabB += b;
  }
  const meanLabL = +(sumLabL / allLabs.length).toFixed(1);
  const meanLabA = +(sumLabA / allLabs.length).toFixed(1);
  const meanLabB = +(sumLabB / allLabs.length).toFixed(1);

  let varLabL = 0, varLabA = 0, varLabB = 0;
  for (const [L, a, b] of allLabs) {
    varLabL += (L - meanLabL) ** 2;
    varLabA += (a - meanLabA) ** 2;
    varLabB += (b - meanLabB) ** 2;
  }
  const stdLabL = +(Math.sqrt(varLabL / allLabs.length)).toFixed(1);
  const stdLabA = +(Math.sqrt(varLabA / allLabs.length)).toFixed(1);
  const stdLabB = +(Math.sqrt(varLabB / allLabs.length)).toFixed(1);

  const labStats = {
    meanL: meanLabL,
    meanA: meanLabA,
    meanB: meanLabB,
    stdL: stdLabL,
    stdA: stdLabA,
    stdB: stdLabB
  };

  // 3. 自动反解物理颗粒感与暗角
  const detectedGrain = detectFilmGrain(data, width, height);
  const detectedVignette = detectVignette(data, width, height);

  // 4. 色调分离与冷暖计算
  const avgHighlightHue = highlightHues.length > 0 ? averageHue(highlightHues, highlightWeights) : 38;
  const avgShadowHue = shadowHues.length > 0 ? averageHue(shadowHues, shadowWeights) : 210;
  const avgHighlightSat = highlightHues.length > 0 ? +(sumHighlightSat / highlightHues.length).toFixed(2) : 0.35;
  const avgShadowSat = shadowHues.length > 0 ? +(sumShadowSat / shadowHues.length).toFixed(2) : 0.35;

  // 判定是否属于经典电影 Teal-Orange 撞色
  const isCinemaTealOrange = (avgHighlightHue >= 15 && avgHighlightHue <= 70) && (avgShadowHue >= 170 && avgShadowHue <= 245);
  const cinemaSplit = {
    isCinemaTealOrange,
    highlightHue: avgHighlightHue,
    shadowHue: avgShadowHue,
    strength: isCinemaTealOrange ? 0.85 : 0.5
  };

  const meanL = totalL / sampleCount;
  // 针对高调白风格优化曝光偏移，防止均值过大导致反向死黑
  let exposureOffset = 0;
  if (toneCurve.isHighKey) {
    exposureOffset = +((p50 - 128) / 380).toFixed(2);
  } else {
    exposureOffset = +((meanL - 128) / 255).toFixed(2);
  }

  const tempRatio = totalR / (totalB || 1);
  const temperature = Math.round((tempRatio - 1.0) * 35);
  const tint = Math.round(((totalG / sampleCount) - ((totalR + totalB) / (sampleCount * 2))) * 0.4);

  // 5. 绿色通道专项解构
  let greenChannel = null;
  if (greenHues.length >= 8) {
    const avgGHue = averageHue(greenHues, greenWeights);
    greenSats.sort((a, b) => a - b);
    const medianSat = greenSats[Math.floor(greenSats.length / 2)];
    const avgGSat = +(Math.min(sumGreenSat / greenHues.length, medianSat * 1.1)).toFixed(2);
    const avgGVal = +(sumGreenVal / greenHues.length).toFixed(2);

    let styleName = '清新日系绿';
    if (avgGSat <= 0.32) {
      styleName = avgGHue >= 125 ? '莫兰迪青冷灰绿' : (avgGHue <= 80 ? '复古橄榄灰绿' : '沉稳灰绿');
    } else {
      styleName = avgGHue >= 135 ? '复古青冷墨绿' : (avgGHue <= 85 ? '胶片橄榄绿' : '森系冷杉绿');
    }

    greenChannel = {
      present: true,
      directReuse: true,
      targetHue: avgGHue,
      targetSat: avgGSat,
      shadowHue: Math.min(360, avgGHue + 6),
      highlightHue: Math.max(0, avgGHue - 5),
      targetVal: avgGVal,
      styleName
    };
  } else {
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

  // 6. 全智能自适应风格标签体系
  const tags = [];
  if (toneCurve.isHighKey) {
    tags.push('日系高调白胶片', '通透纯净白');
  } else if (p50 < 90) {
    tags.push('低调电影暗调', '深邃光影');
  } else {
    tags.push('自然透亮光影');
  }

  if (isCinemaTealOrange) {
    tags.push('好莱坞电影冷暖撞色', 'Teal-Orange');
  } else if (avgHighlightHue >= 15 && avgHighlightHue <= 75) {
    tags.push('暖阳金调高光');
  } else if (avgHighlightHue >= 170 && avgHighlightHue <= 245) {
    tags.push('清冷冰蓝高光');
  }

  if (detectedGrain >= 0.15) {
    tags.push('胶片银盐颗粒');
  }
  if (detectedVignette >= 0.15) {
    tags.push('电影镜头暗角');
  }
  if (greenChannel && greenChannel.present) {
    tags.push(greenChannel.styleName);
  }

  tags.push('质感大师');

  return {
    id: (crypto.randomUUID) ? crypto.randomUUID() : `recipe_${Date.now()}`,
    createdAt: Date.now(),
    exposureOffset,
    contrast: 1.15,
    saturation: 1.1,
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
    toneCurve,
    labStats,
    cinemaSplit,
    greenChannel,
    filmGrain: detectedGrain,
    vignette: detectedVignette,
    tags,
    dominantPalette
  };
}

module.exports = {
  extractRecipe,
  rgbToHsv,
  rgbToLab,
  rgbToHex,
  averageHue,
  detectFilmGrain,
  detectVignette
};
