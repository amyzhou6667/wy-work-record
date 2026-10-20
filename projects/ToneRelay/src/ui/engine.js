/**
 * ToneRelay - 纯前端浏览器端算法引擎 (Browser Bundle - 黄绿联动与灰绿深度压制升级版)
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

  // 2. HSV 转 RGB
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

  // 3. RGB 转 HEX
  function rgbToHex(r, g, b) {
    const toHex = (n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }

  // 4. 角度环平均值
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

  // 5. 前置门控校验
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

    if (stdL < 10 && stdRGB < 10) {
      return { valid: false, reason: '这张参考图色彩过于单一啦，换一张光影更丰富的照片试试吧~' };
    }
    return { valid: true };
  }

  // 6. 特征解构与配方提取 (含黄绿联动与自适应灰绿解构)
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

    let totalL = 0, totalR = 0, totalG = 0, totalB = 0, sampleCount = 0;
    const colorSamples = [];

    for (let i = 0; i < data.length; i += 4 * step) {
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const l = 0.299 * r + 0.587 * g + 0.114 * b;
      const [h, s, v] = rgbToHsv(r, g, b);

      totalL += l; totalR += r; totalG += g; totalB += b;
      sampleCount++;

      if (sampleCount <= 120) {
        colorSamples.push([r, g, b, l]);
      }

      // 真正的高光与阴影区分离
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

      // 专门捕获植被/绿色彩区 (黄绿、草绿、青绿、墨绿及低饱和灰绿)
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

    const avgHighlightHue = highlightHues.length > 0 ? averageHue(highlightHues, highlightWeights) : 38;
    const avgShadowHue = shadowHues.length > 0 ? averageHue(shadowHues, shadowWeights) : 210;
    const avgHighlightSat = highlightHues.length > 0 ? +(sumHighlightSat / highlightHues.length).toFixed(2) : 0.40;
    const avgShadowSat = shadowHues.length > 0 ? +(sumShadowSat / shadowHues.length).toFixed(2) : 0.40;

    const meanL = totalL / sampleCount;
    const exposureOffset = +((meanL - 128) / 255).toFixed(2);
    const tempRatio = totalR / (totalB || 1);
    const temperature = Math.round((tempRatio - 1.0) * 35);
    const tint = Math.round(((totalG / sampleCount) - ((totalR + totalB) / (sampleCount * 2))) * 0.4);

    // 绿色通道专项解构特征
    let greenChannel = null;
    if (greenHues.length >= 8) {
      const avgGHue = averageHue(greenHues, greenWeights);
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

      greenChannel = {
        present: true,
        targetHue: avgGHue,
        targetSat: avgGSat,
        targetVal: avgGVal,
        styleName
      };
    } else {
      greenChannel = {
        present: false,
        targetHue: 140,
        targetSat: 0.28,
        targetVal: 0.55,
        styleName: '质感青墨绿'
      };
    }

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
    else tags.push('纯净透亮高光');

    if (avgShadowHue >= 165 && avgShadowHue <= 255) tags.push('青冷暗部');
    else if (avgShadowHue >= 10 && avgShadowHue <= 50) tags.push('复古棕调暗部');
    else tags.push('胶片沉稳暗部');

    if (greenChannel && greenChannel.present) {
      tags.push(greenChannel.styleName);
    }

    tags.push('质感胶片');

    return {
      id: (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : `recipe_${Date.now()}`,
      createdAt: Date.now(),
      exposureOffset,
      contrast: 1.2,
      saturation: 1.15,
      temperature,
      tint,
      highlights: { hue: avgHighlightHue, saturation: avgHighlightSat, weight: 0.75 },
      shadows: { hue: avgShadowHue, saturation: avgShadowSat, weight: 0.75 },
      greenChannel,
      filmGrain: 0.16,
      vignette: 0.16,
      tags,
      dominantPalette
    };
  }

  // 7. 人像肤色软蒙版
  function generateSkinMask(imageData) {
    if (!imageData) return new Float32Array(0);
    const { width, height, data } = imageData;
    const totalPixels = width * height;
    const mask = new Float32Array(totalPixels);

    for (let i = 0; i < totalPixels; i++) {
      const idx = i * 4;
      const r = data[idx], g = data[idx + 1], b = data[idx + 2];
      if (r > g && g > b && (r - g) > 12 && r > 50) {
        const [h, s, v] = rgbToHsv(r, g, b);
        const isSkinHue = (h >= 0 && h <= 50) || (h >= 340 && h <= 360);
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

  // 8. 色相投影
  function hueToRgbOffset(hue) {
    const rad = (hue * Math.PI) / 180;
    return [Math.cos(rad), Math.cos(rad - (2 * Math.PI) / 3), Math.cos(rad - (4 * Math.PI) / 3)];
  }

  // 9. 专业影调增强渲染引擎 (含黄绿联动与灰绿深度压制)
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

    const cx = width / 2, cy = height / 2;
    const maxDist = Math.hypot(cx, cy);
    const totalPixels = width * height;

    for (let p = 0; p < totalPixels; p++) {
      const idx = p * 4;
      const origR = src[idx], origG = src[idx + 1], origB = src[idx + 2], origA = src[idx + 3];
      let r = origR, g = origG, b = origB;

      // 1. 植被与黄绿联动靶向调色
      const [h, s, v] = rgbToHsv(r, g, b);
      let plantWeight = 0;
      if (h >= 35 && h <= 175 && s >= 0.06) {
        const dist = Math.abs(h - 105);
        plantWeight = Math.max(0, 1.0 - dist / 70);
        if (plantWeight > 0) {
          const newHue = h * (1 - plantWeight * 0.85) + targetGreenHue * (plantWeight * 0.85);
          const targetS = Math.min(s, Math.max(0.12, targetGreenSat * 1.15));
          const newSat = s * (1 - plantWeight * 0.85) + targetS * (plantWeight * 0.85);
          const newV = v * (1 - plantWeight * 0.2) + targetGreenVal * (plantWeight * 0.2);

          const [gr, gg, gb] = hsvToRgb(newHue, newSat, newV);
          r = r * (1 - plantWeight) + gr * plantWeight;
          g = g * (1 - plantWeight) + gg * plantWeight;
          b = b * (1 - plantWeight) + gb * plantWeight;
        }
      }

      // 2. 白平衡与色温
      r += temperature * 1.0;
      b -= temperature * 1.0;
      g += tint * 0.8;

      // 3. 对比度与立体感
      r = (r - 128) * contrast + 128;
      g = (g - 128) * contrast + 128;
      b = (b - 128) * contrast + 128;

      // 4. 饱和度 (植被保护，防止全局拉爆)
      if (saturation !== 1.0) {
        const effectiveSat = 1.0 + (saturation - 1.0) * (1.0 - plantWeight * 0.92);
        const gray = 0.299 * r + 0.587 * g + 0.114 * b;
        r = gray + (r - gray) * effectiveSat;
        g = gray + (g - gray) * effectiveSat;
        b = gray + (b - gray) * effectiveSat;
      }

      // 5. 高光与阴影色调分离注入 (Split Toning)
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
        r += noise; g += noise; b += noise;
      }
      if (vignette > 0) {
        const px = p % width, py = Math.floor(p / width);
        const dist = Math.hypot(px - cx, py - cy) / maxDist;
        const vigFactor = 1.0 - Math.pow(dist, 1.8) * vignette * 0.6;
        r *= vigFactor; g *= vigFactor; b *= vigFactor;
      }

      // 7. 智能人像肤色保护
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

      // 8. 全局强度插值
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
