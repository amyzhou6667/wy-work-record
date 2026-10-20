/**
 * ToneRelay - 纯前端浏览器端算法引擎 (Browser Bundle)
 * 零依赖、纯客户端 Canvas / 像素矩阵运算，保障相册隐私
 */

window.ToneRelayEngine = (function () {
  // 1. RGB 转 HSV
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

  // 2. RGB 转 HEX
  function rgbToHex(r, g, b) {
    const toHex = (n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }

  // 3. 角度环平均值
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
    let deg = (Math.atan2(sumY / totalW, sumX / totalW) * 180) / Math.PI;
    if (deg < 0) deg += 360;
    return Math.round(deg);
  }

  // 4. 前置门控校验
  function validateReferenceImage(imageData) {
    if (!imageData || !imageData.width || !imageData.height || !imageData.data) {
      return { valid: false, reason: '无效的图片数据，请重新选择' };
    }
    const { width, height, data } = imageData;
    const totalPixels = width * height;
    if (totalPixels < 16) {
      return { valid: false, reason: '图片分辨率过小，无法准确解析风格' };
    }

    const step = Math.max(1, Math.floor(totalPixels / 2000));
    let sumL = 0, sumR = 0, sumG = 0, sumB = 0, sampleCount = 0;

    for (let i = 0; i < data.length; i += 4 * step) {
      const r = data[i], g = data[i + 1], b = data[i + 2];
      sumL += 0.299 * r + 0.587 * g + 0.114 * b;
      sumR += r; sumG += g; sumB += b;
      sampleCount++;
    }

    const meanL = sumL / sampleCount;
    const meanR = sumR / sampleCount;
    const meanG = sumG / sampleCount;
    const meanB = sumB / sampleCount;

    let varianceL = 0, varianceRGB = 0;
    for (let i = 0; i < data.length; i += 4 * step) {
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const l = 0.299 * r + 0.587 * g + 0.114 * b;
      varianceL += (l - meanL) ** 2;
      varianceRGB += ((r - meanR) ** 2 + (g - meanG) ** 2 + (b - meanB) ** 2) / 3;
    }

    const stdL = Math.sqrt(varianceL / sampleCount);
    const stdRGB = Math.sqrt(varianceRGB / sampleCount);

    if (stdL < 12 && stdRGB < 12) {
      return { valid: false, reason: '这张参考图色彩过于单一啦，换一张光影更丰富的照片试试吧~' };
    }
    return { valid: true };
  }

  // 5. 特征解构与配方提取
  function extractRecipe(imageData) {
    const { width, height, data } = imageData;
    const totalPixels = width * height;
    const step = Math.max(1, Math.floor(totalPixels / 3000));

    const highlightHues = [], highlightWeights = [];
    const shadowHues = [], shadowWeights = [];
    let sumHighlightSat = 0, sumShadowSat = 0;
    let totalL = 0, totalR = 0, totalB = 0, sampleCount = 0;
    const colorSamples = [];

    for (let i = 0; i < data.length; i += 4 * step) {
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const l = 0.299 * r + 0.587 * g + 0.114 * b;
      const [h, s, v] = rgbToHsv(r, g, b);

      totalL += l; totalR += r; totalB += b;
      sampleCount++;

      if (sampleCount <= 100) {
        colorSamples.push([r, g, b, l]);
      }

      if (l > 140 && s > 0.05) {
        highlightHues.push(h);
        highlightWeights.push(s * (l / 255));
        sumHighlightSat += s;
      }
      if (l < 110 && s > 0.05) {
        shadowHues.push(h);
        shadowWeights.push(s * (1 - l / 255));
        sumShadowSat += s;
      }
    }

    const avgHighlightHue = highlightHues.length > 0 ? averageHue(highlightHues, highlightWeights) : 35;
    const avgShadowHue = shadowHues.length > 0 ? averageHue(shadowHues, shadowWeights) : 210;
    const avgHighlightSat = highlightHues.length > 0 ? +(sumHighlightSat / highlightHues.length).toFixed(2) : 0.3;
    const avgShadowSat = shadowHues.length > 0 ? +(sumShadowSat / shadowHues.length).toFixed(2) : 0.3;

    const meanL = totalL / sampleCount;
    const exposureOffset = +((meanL - 128) / 255).toFixed(2);
    const tempRatio = totalR / (totalB || 1);
    const temperature = Math.round((tempRatio - 1.0) * 50);

    colorSamples.sort((a, b) => b[3] - a[3]);
    const hiColor = colorSamples[0] || [230, 200, 170];
    const midColor = colorSamples[Math.floor(colorSamples.length / 2)] || [150, 150, 150];
    const loColor = colorSamples[colorSamples.length - 1] || [40, 50, 60];

    const dominantPalette = [
      rgbToHex(hiColor[0], hiColor[1], hiColor[2]),
      rgbToHex(midColor[0], midColor[1], midColor[2]),
      rgbToHex(loColor[0], loColor[1], loColor[2])
    ];

    const tags = [];
    if (avgHighlightHue >= 20 && avgHighlightHue <= 70) tags.push('暖阳高光');
    else if (avgHighlightHue >= 180 && avgHighlightHue <= 240) tags.push('冰蓝高光');
    else tags.push('通透高光');

    if (avgShadowHue >= 170 && avgShadowHue <= 250) tags.push('青冷暗部');
    else if (avgShadowHue >= 10 && avgShadowHue <= 45) tags.push('复古棕调');
    else tags.push('深沉暗部');

    tags.push('中度胶片质感');

    return {
      id: (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : `recipe_${Date.now()}`,
      createdAt: Date.now(),
      exposureOffset,
      contrast: 1.15,
      saturation: 1.05,
      temperature,
      tint: 0,
      highlights: { hue: avgHighlightHue, saturation: avgHighlightSat, weight: 0.65 },
      shadows: { hue: avgShadowHue, saturation: avgShadowSat, weight: 0.65 },
      filmGrain: 0.12,
      vignette: 0.12,
      tags,
      dominantPalette
    };
  }

  // 6. 人像肤色软蒙版
  function generateSkinMask(imageData) {
    if (!imageData) return new Float32Array(0);
    const { width, height, data } = imageData;
    const totalPixels = width * height;
    const mask = new Float32Array(totalPixels);

    for (let i = 0; i < totalPixels; i++) {
      const idx = i * 4;
      const r = data[idx], g = data[idx + 1], b = data[idx + 2];
      if (r > g && g > b && (r - g) > 15 && r > 60) {
        const [h, s, v] = rgbToHsv(r, g, b);
        const isSkinHue = (h >= 0 && h <= 48) || (h >= 345 && h <= 360);
        const isSkinSat = s >= 0.15 && s <= 0.75;
        const isSkinVal = v >= 0.20 && v <= 0.98;
        if (isSkinHue && isSkinSat && isSkinVal) {
          const hueDist = h > 180 ? 360 - h : h;
          const diff = Math.abs(hueDist - 22);
          mask[i] = Math.max(0.0, 1.0 - diff / 30);
          continue;
        }
      }
      mask[i] = 0.0;
    }
    return mask;
  }

  // 7. 色相投影
  function hueToRgbOffset(hue) {
    const rad = (hue * Math.PI) / 180;
    return [Math.cos(rad), Math.cos(rad - (2 * Math.PI) / 3), Math.cos(rad - (4 * Math.PI) / 3)];
  }

  // 8. 调色渲染引擎
  function renderGrading(ctx, targetImageData, recipe, options, skinMask) {
    const { intensity = 1.0, protectSkin = true } = options || {};
    const { width, height, data: src } = targetImageData;
    const output = ctx.createImageData(width, height);
    const dst = output.data;

    if (intensity === 0.0) {
      dst.set(src);
      return output;
    }

    const {
      contrast = 1.0, temperature = 0, tint = 0,
      highlights, shadows, filmGrain = 0, vignette = 0
    } = recipe;

    const hiOffset = highlights ? hueToRgbOffset(highlights.hue) : [0, 0, 0];
    const shOffset = shadows ? hueToRgbOffset(shadows.hue) : [0, 0, 0];
    const hiWeight = highlights ? highlights.saturation * highlights.weight * 40 : 0;
    const shWeight = shadows ? shadows.saturation * shadows.weight * 40 : 0;

    const cx = width / 2, cy = height / 2;
    const maxDist = Math.hypot(cx, cy);
    const totalPixels = width * height;

    for (let p = 0; p < totalPixels; p++) {
      const idx = p * 4;
      const origR = src[idx], origG = src[idx + 1], origB = src[idx + 2], origA = src[idx + 3];
      let r = origR, g = origG, b = origB;

      // 白平衡
      r += temperature * 0.4;
      b -= temperature * 0.4;
      g += tint * 0.3;

      // 对比度
      r = (r - 128) * contrast + 128;
      g = (g - 128) * contrast + 128;
      b = (b - 128) * contrast + 128;

      // 高光与阴影色调分离
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

      // 颗粒与暗角
      if (filmGrain > 0) {
        const noise = (Math.sin(p * 997) * 43758.5453 % 1) * filmGrain * 20;
        r += noise; g += noise; b += noise;
      }
      if (vignette > 0) {
        const px = p % width, py = Math.floor(p / width);
        const dist = Math.hypot(px - cx, py - cy) / maxDist;
        const vigFactor = 1.0 - Math.pow(dist, 2) * vignette * 0.5;
        r *= vigFactor; g *= vigFactor; b *= vigFactor;
      }

      // 肤色保护
      if (protectSkin && skinMask && skinMask[p] > 0) {
        const skinW = skinMask[p] * 0.85;
        r = r * (1 - skinW) + origR * skinW;
        g = g * (1 - skinW) + origG * skinW;
        b = b * (1 - skinW) + origB * skinW;
      }

      // 全局强度插值
      const finalR = origR * (1 - intensity) + r * intensity;
      const finalG = origG * (1 - intensity) + g * intensity;
      const finalB = origB * (1 - intensity) + b * intensity;

      dst[idx] = Math.max(0, Math.min(255, Math.round(finalR)));
      dst[idx + 1] = Math.max(0, Math.min(255, Math.round(finalG)));
      dst[idx + 2] = Math.max(0, Math.min(255, Math.round(finalB)));
      dst[idx + 3] = origA;
    }

    return output;
  }

  return {
    validateReferenceImage,
    extractRecipe,
    generateSkinMask,
    renderGrading
  };
})();
