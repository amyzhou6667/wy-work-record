/**
 * ToneRelay - 纯前端浏览器端算法引擎 (Universal Style & Tone Browser Engine - TypeScript)
 * 零依赖、纯客户端 Canvas / 像素矩阵运算，保障相册隐私
 * 支持：通用光影分位数曲线 (日系高调白 / 电影暗调)、黑位抬升灰雾、真实颗粒度/暗角自适应反解、电影 Teal-Orange 撞色与人像肤色保护
 */

export interface ToneEngineInterface {
  validateReferenceImage: (imageData: ImageData) => { valid: boolean; reason?: string };
  extractRecipe: (imageData: ImageData) => any;
  generateSkinMask: (imageData: ImageData) => Float32Array;
  renderGrading: (targetImageData: ImageData, recipe: any, options?: any, skinMask?: Float32Array | null) => ImageData;
  pitiColorTransfer: (srcImageData: ImageData, refImageData: ImageData, options?: any) => ImageData;
  guidedFilter: (p: Float32Array, I: Float32Array, width: number, height: number, r?: number, eps?: number) => Float32Array;
  matchHistogram1D: (src: Float32Array, ref: Float32Array) => Float32Array;
  boxFilter: (input: Float32Array, width: number, height: number, r: number) => Float32Array;
}

(window as any).ToneRelayEngine = (function (): ToneEngineInterface {
  // 1. RGB 转 HSV
  function rgbToHsv(r: number, g: number, b: number): [number, number, number] {
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
  function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
    h = ((h % 360) + 360) % 360;
    let r: number, g: number, b: number;
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

  // 3. RGB 转 CIE-L*a*b*
  function rgbToLab(r: number, g: number, b: number): [number, number, number] {
    let rn = r / 255, gn = g / 255, bn = b / 255;
    rn = rn > 0.04045 ? Math.pow((rn + 0.055) / 1.055, 2.4) : rn / 12.92;
    gn = gn > 0.04045 ? Math.pow((gn + 0.055) / 1.055, 2.4) : gn / 12.92;
    bn = bn > 0.04045 ? Math.pow((bn + 0.055) / 1.055, 2.4) : bn / 12.92;

    let x = (rn * 0.4124564 + gn * 0.3575761 + bn * 0.1804375) / 0.95047;
    let y = (rn * 0.2126729 + gn * 0.7151522 + bn * 0.0721750) / 1.00000;
    let z = (rn * 0.0193339 + gn * 0.1191920 + bn * 0.9503041) / 1.08883;

    const f = (t: number) => t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116;
    const fx = f(x), fy = f(y), fz = f(z);

    const L = Math.max(0, 116 * fy - 16);
    const a = 500 * (fx - fy);
    const bVal = 200 * (fy - fz);
    return [L, a, bVal];
  }

  // 4. RGB 转 HEX
  function rgbToHex(r: number, g: number, b: number): string {
    const toHex = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }

  // 5. 角度环平均值
  function averageHue(hueList: number[], weightList?: number[]): number {
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

  // 6. 前置门控校验
  function validateReferenceImage(imageData: ImageData): { valid: boolean; reason?: string } {
    if (!imageData || !imageData.width || !imageData.height || !imageData.data) {
      return { valid: false, reason: '无效的图片数据，请重新选择' };
    }
    const { width, height, data } = imageData;
    const totalPixels = width * height;
    if (totalPixels < 16) {
      return { valid: false, reason: '图片分辨率过小，无法准确解析风格' };
    }

    let sumL = 0, sumR = 0, sumG = 0, sumB = 0;
    const step = Math.max(1, Math.floor(totalPixels / 2000));
    let sampleCount = 0;

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

  // 7. 真实颗粒度自适应检测
  function detectFilmGrain(data: Uint8ClampedArray, width: number, height: number): number {
    if (width < 8 || height < 8) return 0.05;
    const step = Math.max(2, Math.floor(Math.min(width, height) / 32));
    let noiseSum = 0, validCount = 0;

    for (let y = step; y < height - step; y += step) {
      for (let x = step; x < width - step; x += step) {
        const idx = (y * width + x) * 4;
        const curL = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
        const leftL = 0.299 * data[(y * width + (x - 1)) * 4] + 0.587 * data[(y * width + (x - 1)) * 4 + 1] + 0.114 * data[(y * width + (x - 1)) * 4 + 2];
        const rightL = 0.299 * data[(y * width + (x + 1)) * 4] + 0.587 * data[(y * width + (x + 1)) * 4 + 1] + 0.114 * data[(y * width + (x + 1)) * 4 + 2];
        const topL = 0.299 * data[((y - 1) * width + x) * 4] + 0.587 * data[((y - 1) * width + x) * 4 + 1] + 0.114 * data[((y - 1) * width + x) * 4 + 2];
        const botL = 0.299 * data[((y + 1) * width + x) * 4] + 0.587 * data[((y + 1) * width + x) * 4 + 1] + 0.114 * data[((y + 1) * width + x) * 4 + 2];

        const meanN = (leftL + rightL + topL + botL) / 4;
        const diff = Math.abs(curL - meanN);
        if (diff > 0.01 && diff < 28) {
          noiseSum += diff;
          validCount++;
        }
      }
    }

    if (validCount === 0) return 0.0;
    const meanNoise = noiseSum / validCount;
    if (meanNoise <= 0.8) return 0.0;
    const grainStrength = Math.min(0.5, (meanNoise - 0.8) * 0.045);
    return +grainStrength.toFixed(2);
  }

  // 8. 真实暗角反解
  function detectVignette(data: Uint8ClampedArray, width: number, height: number): number {
    const cx = width / 2, cy = height / 2;
    const maxDist = Math.hypot(cx, cy);
    let centerLum = 0, centerCount = 0;
    let edgeLum = 0, edgeCount = 0;
    const step = Math.max(1, Math.floor((width * height) / 2000));

    for (let i = 0; i < data.length; i += 4 * step) {
      const p = i / 4;
      const x = p % width, y = Math.floor(p / width);
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

  // 9. 解构风格配方
  function extractRecipe(imageData: ImageData): any {
    const { width, height, data } = imageData;
    const totalPixels = width * height;
    const step = Math.max(1, Math.floor(totalPixels / 3000));

    const allLums: number[] = [];
    const allLabs: [number, number, number][] = [];
    const highlightHues: number[] = [], highlightWeights: number[] = [];
    const shadowHues: number[] = [], shadowWeights: number[] = [];
    let sumHighlightSat = 0, sumShadowSat = 0;

    const greenHues: number[] = [], greenWeights: number[] = [];
    const greenSats: number[] = [];
    let sumGreenSat = 0, sumGreenVal = 0;

    const samples: any[] = [];
    let totalL = 0, totalR = 0, totalG = 0, totalB = 0;
    let sampleCount = 0;
    const colorSamples: [number, number, number, number][] = [];

    for (let i = 0; i < data.length; i += 4 * step) {
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const l = 0.299 * r + 0.587 * g + 0.114 * b;
      const [h, s, v] = rgbToHsv(r, g, b);
      const lab = rgbToLab(r, g, b);

      allLums.push(l);
      allLabs.push(lab);
      totalL += l; totalR += r; totalG += g; totalB += b;
      sampleCount++;
      samples.push({ r, g, b, l, h, s, v });

      if (sampleCount <= 120) {
        colorSamples.push([r, g, b, l]);
      }
    }

    allLums.sort((a, b) => a - b);
    const p0 = Math.round(allLums[Math.floor(allLums.length * 0.02)] || 0);
    const p25 = Math.round(allLums[Math.floor(allLums.length * 0.25)] || 64);
    const p50 = Math.round(allLums[Math.floor(allLums.length * 0.50)] || 128);
    const p75 = Math.round(allLums[Math.floor(allLums.length * 0.75)] || 192);
    const p100 = Math.round(allLums[Math.floor(allLums.length * 0.98)] || 255);

    const hiThreshold = Math.max(125, Math.min(220, Math.round((p50 + p75) / 2)));
    const shThreshold = Math.min(115, Math.max(40, Math.round((p0 + p25) / 2)));

    for (const item of samples) {
      const { l, h, s, v } = item;
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
      p0, p25, p50, p75, p100,
      fadeBlack: Math.max(0, p0 - 4),
      isHighKey: p75 >= 210 && p50 >= 150
    };

    const avgHighlightHue = highlightHues.length > 0 ? averageHue(highlightHues, highlightWeights) : 38;
    const avgShadowHue = shadowHues.length > 0 ? averageHue(shadowHues, shadowWeights) : 210;
    const avgHighlightSat = highlightHues.length > 0 ? +(sumHighlightSat / highlightHues.length).toFixed(2) : 0.35;
    const avgShadowSat = shadowHues.length > 0 ? +(sumShadowSat / shadowHues.length).toFixed(2) : 0.35;

    const isCinemaTealOrange = (avgHighlightHue >= 15 && avgHighlightHue <= 70) && (avgShadowHue >= 170 && avgShadowHue <= 245);
    const cinemaSplit = {
      isCinemaTealOrange,
      highlightHue: avgHighlightHue,
      shadowHue: avgShadowHue,
      strength: isCinemaTealOrange ? 0.85 : 0.5
    };

    const detectedGrain = detectFilmGrain(data, width, height);
    const detectedVignette = detectVignette(data, width, height);

    const meanL = totalL / sampleCount;
    let exposureOffset = 0;
    if (toneCurve.isHighKey) {
      exposureOffset = +((p50 - 128) / 380).toFixed(2);
    } else {
      exposureOffset = +((meanL - 128) / 255).toFixed(2);
    }

    const tempRatio = totalR / (totalB || 1);
    const temperature = Math.round((tempRatio - 1.0) * 35);
    const tint = Math.round(((totalG / sampleCount) - ((totalR + totalB) / (sampleCount * 2))) * 0.4);

    let greenChannel: any = null;
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

    colorSamples.sort((a, b) => b[3] - a[3]);
    const hiColor = colorSamples[0] || [240, 190, 140];
    const midColor = colorSamples[Math.floor(colorSamples.length / 2)] || [140, 150, 160];
    const loColor = colorSamples[colorSamples.length - 1] || [30, 45, 60];

    const dominantPalette = [
      rgbToHex(hiColor[0], hiColor[1], hiColor[2]),
      rgbToHex(midColor[0], midColor[1], midColor[2]),
      rgbToHex(loColor[0], loColor[1], loColor[2])
    ];

    const tags: string[] = [];
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

    if (detectedGrain >= 0.15) tags.push('胶片银盐颗粒');
    if (detectedVignette >= 0.15) tags.push('电影镜头暗角');
    if (greenChannel && greenChannel.present) tags.push(greenChannel.styleName);
    tags.push('质感大师');

    return {
      id: `recipe_${Date.now()}`,
      exposureOffset,
      contrast: 1.15,
      saturation: 1.1,
      temperature,
      tint,
      highlights: { hue: avgHighlightHue, saturation: avgHighlightSat, weight: 0.75 },
      shadows: { hue: avgShadowHue, saturation: avgShadowSat, weight: 0.75 },
      toneCurve,
      cinemaSplit,
      greenChannel,
      filmGrain: detectedGrain,
      vignette: detectedVignette,
      tags,
      dominantPalette
    };
  }

  // 10. 人像肤色软蒙版
  function generateSkinMask(imageData: ImageData): Float32Array {
    if (!imageData || !imageData.width || !imageData.height || !imageData.data) {
      return new Float32Array(0);
    }
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
          let hueDist = h > 180 ? 360 - h : h;
          let diff = Math.abs(hueDist - 22);
          let weight = Math.max(0.0, 1.0 - diff / 30);
          mask[i] = +weight.toFixed(3);
          continue;
        }
      }
      mask[i] = 0.0;
    }
    return mask;
  }

  // 11. 一维连续累积分布 (1D CDF) 直方图精确匹配
  function matchHistogram1D(src: Float32Array, ref: Float32Array): Float32Array {
    const nSrc = src.length;
    const nRef = ref.length;
    const result = new Float32Array(nSrc);

    const srcIndices = new Int32Array(nSrc);
    for (let i = 0; i < nSrc; i++) srcIndices[i] = i;
    srcIndices.sort((a, b) => (src[a] ?? 0) - (src[b] ?? 0));

    const sortedRef = new Float32Array(ref);
    sortedRef.sort();

    const ratio = (nRef - 1) / Math.max(1, nSrc - 1);
    for (let i = 0; i < nSrc; i++) {
      const targetIdx = Math.min(nRef - 1, Math.max(0, Math.round(i * ratio)));
      const originalPixelIdx = srcIndices[i] ?? 0;
      result[originalPixelIdx] = sortedRef[targetIdx] ?? 0;
    }
    return result;
  }

  // 12. 快速 2D 盒式滤波 (Box Filter) - O(1) 复杂度
  function boxFilter(input: Float32Array, width: number, height: number, r: number): Float32Array {
    const output = new Float32Array(width * height);
    const temp = new Float32Array(width * height);

    for (let y = 0; y < height; y++) {
      const rowOffset = y * width;
      let sum = 0;
      for (let x = -r; x <= r; x++) {
        const clampedX = Math.max(0, Math.min(width - 1, x));
        sum += input[rowOffset + clampedX] ?? 0;
      }
      for (let x = 0; x < width; x++) {
        temp[rowOffset + x] = sum / (2 * r + 1);
        const nextX = Math.min(width - 1, x + r + 1);
        const prevX = Math.max(0, x - r);
        sum += (input[rowOffset + nextX] ?? 0) - (input[rowOffset + prevX] ?? 0);
      }
    }

    for (let x = 0; x < width; x++) {
      let sum = 0;
      for (let y = -r; y <= r; y++) {
        const clampedY = Math.max(0, Math.min(height - 1, y));
        sum += temp[clampedY * width + x] ?? 0;
      }
      for (let y = 0; y < height; y++) {
        output[y * width + x] = sum / (2 * r + 1);
        const nextY = Math.min(height - 1, y + r + 1);
        const prevY = Math.max(0, y - r);
        sum += (temp[nextY * width + x] ?? 0) - (temp[prevY * width + x] ?? 0);
      }
    }
    return output;
  }

  // 13. 空间保真导向滤波 (Guided Filter)
  function guidedFilter(
    p: Float32Array,
    I: Float32Array,
    width: number,
    height: number,
    r: number = 3,
    eps: number = 0.01
  ): Float32Array {
    const total = width * height;
    const meanI = boxFilter(I, width, height, r);
    const meanP = boxFilter(p, width, height, r);

    const II = new Float32Array(total);
    const Ip = new Float32Array(total);
    for (let i = 0; i < total; i++) {
      const iVal = I[i] ?? 0;
      const pVal = p[i] ?? 0;
      II[i] = iVal * iVal;
      Ip[i] = iVal * pVal;
    }

    const corrI = boxFilter(II, width, height, r);
    const corrIp = boxFilter(Ip, width, height, r);

    const a = new Float32Array(total);
    const b = new Float32Array(total);

    for (let i = 0; i < total; i++) {
      const mi = meanI[i] ?? 0;
      const mp = meanP[i] ?? 0;
      const varI = (corrI[i] ?? 0) - mi * mi;
      const covIp = (corrIp[i] ?? 0) - mi * mp;
      a[i] = covIp / (varI + eps);
      b[i] = mp - (a[i] ?? 0) * mi;
    }

    const meanA = boxFilter(a, width, height, r);
    const meanB = boxFilter(b, width, height, r);

    const q = new Float32Array(total);
    for (let i = 0; i < total; i++) {
      q[i] = (meanA[i] ?? 0) * (I[i] ?? 0) + (meanB[i] ?? 0);
    }
    return q;
  }

  // 14. 3D 正交旋转基
  const ROTATION_MATRICES: number[][][] = [
    [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1]
    ],
    [
      [0.57735, 0.57735, 0.57735],
      [0.70710, -0.70710, 0],
      [0.40824, 0.40824, -0.81649]
    ],
    [
      [0.85355, 0.35355, 0.35355],
      [-0.35355, 0.85355, -0.35355],
      [-0.35355, -0.35355, 0.85355]
    ],
    [
      [0.5, 0.5, 0.70710],
      [-0.70710, 0.70710, 0],
      [-0.5, -0.5, 0.70710]
    ]
  ];

  function rotateChannels(rArr: Float32Array, gArr: Float32Array, bArr: Float32Array, R: number[][]): [Float32Array, Float32Array, Float32Array] {
    const len = rArr.length;
    const out1 = new Float32Array(len);
    const out2 = new Float32Array(len);
    const out3 = new Float32Array(len);

    const [r0 = 1, r1 = 0, r2 = 0] = R[0] ?? [];
    const [r3 = 0, r4 = 1, r5 = 0] = R[1] ?? [];
    const [r6 = 0, r7 = 0, r8 = 1] = R[2] ?? [];

    for (let i = 0; i < len; i++) {
      const r = rArr[i] ?? 0, g = gArr[i] ?? 0, b = bArr[i] ?? 0;
      out1[i] = r0 * r + r1 * g + r2 * b;
      out2[i] = r3 * r + r4 * g + r5 * b;
      out3[i] = r6 * r + r7 * g + r8 * b;
    }
    return [out1, out2, out3];
  }

  function rotateChannelsInverse(uArr: Float32Array, vArr: Float32Array, wArr: Float32Array, R: number[][]): [Float32Array, Float32Array, Float32Array] {
    const len = uArr.length;
    const outR = new Float32Array(len);
    const outG = new Float32Array(len);
    const outB = new Float32Array(len);

    const r0 = R[0]?.[0] ?? 1, r1 = R[1]?.[0] ?? 0, r2 = R[2]?.[0] ?? 0;
    const r3 = R[0]?.[1] ?? 0, r4 = R[1]?.[1] ?? 1, r5 = R[2]?.[1] ?? 0;
    const r6 = R[0]?.[2] ?? 0, r7 = R[1]?.[2] ?? 0, r8 = R[2]?.[2] ?? 1;

    for (let i = 0; i < len; i++) {
      const u = uArr[i] ?? 0, v = vArr[i] ?? 0, w = wArr[i] ?? 0;
      outR[i] = r0 * u + r1 * v + r2 * w;
      outG[i] = r3 * u + r4 * v + r5 * w;
      outB[i] = r6 * u + r7 * v + r8 * w;
    }
    return [outR, outG, outB];
  }

  function createImageDataHelper(w: number, h: number): ImageData {
    if (typeof ImageData !== 'undefined') {
      try {
        return new ImageData(w, h);
      } catch (e) {
        // fallback to canvas
      }
    }
    const cvs = document.createElement('canvas');
    const ctx = cvs.getContext('2d')!;
    return ctx.createImageData(w, h);
  }

  // 15. Pitié 3D 色彩概率分布传输 (N-Dimensional PDF Transfer)
  function pitiColorTransfer(
    srcImageData: ImageData,
    refImageData: ImageData,
    options: { iterations?: number; applyGuidedFilter?: boolean; radius?: number; eps?: number } = {}
  ): ImageData {
    const {
      iterations = 4,
      applyGuidedFilter: doGuidedFilter = true,
      radius = 3,
      eps = 0.01
    } = options;

    const { width: sW, height: sH, data: sData } = srcImageData;
    const { width: rW, height: rH, data: rData } = refImageData;
    const totalSrc = sW * sH;
    const totalRef = rW * rH;

    let srcR = new Float32Array(totalSrc);
    let srcG = new Float32Array(totalSrc);
    let srcB = new Float32Array(totalSrc);
    const guideL = new Float32Array(totalSrc);

    for (let i = 0; i < totalSrc; i++) {
      const idx = i * 4;
      srcR[i] = sData[idx] ?? 0;
      srcG[i] = sData[idx + 1] ?? 0;
      srcB[i] = sData[idx + 2] ?? 0;
      guideL[i] = 0.299 * (srcR[i] ?? 0) + 0.587 * (srcG[i] ?? 0) + 0.114 * (srcB[i] ?? 0);
    }

    const refStep = Math.max(1, Math.floor(totalRef / 15000));
    const refSampleCount = Math.ceil(totalRef / refStep);
    const refR = new Float32Array(refSampleCount);
    const refG = new Float32Array(refSampleCount);
    const refB = new Float32Array(refSampleCount);

    let rIdx = 0;
    for (let i = 0; i < totalRef; i += refStep) {
      const idx = i * 4;
      refR[rIdx] = rData[idx] ?? 0;
      refG[rIdx] = rData[idx + 1] ?? 0;
      refB[rIdx] = rData[idx + 2] ?? 0;
      rIdx++;
    }

    const maxIters = Math.min(iterations, ROTATION_MATRICES.length);
    for (let iter = 0; iter < maxIters; iter++) {
      const R = ROTATION_MATRICES[iter];
      if (!R) continue;

      const [uSrc, vSrc, wSrc] = rotateChannels(srcR, srcG, srcB, R);
      const [uRef, vRef, wRef] = rotateChannels(refR, refG, refB, R);

      const uMatched = matchHistogram1D(uSrc, uRef);
      const vMatched = matchHistogram1D(vSrc, vRef);
      const wMatched = matchHistogram1D(wSrc, wRef);

      [srcR, srcG, srcB] = rotateChannelsInverse(uMatched, vMatched, wMatched, R);

      for (let i = 0; i < totalSrc; i++) {
        srcR[i] = Math.max(0, Math.min(255, srcR[i] ?? 0));
        srcG[i] = Math.max(0, Math.min(255, srcG[i] ?? 0));
        srcB[i] = Math.max(0, Math.min(255, srcB[i] ?? 0));
      }
    }

    if (doGuidedFilter) {
      srcR = guidedFilter(srcR, guideL, sW, sH, radius, eps);
      srcG = guidedFilter(srcG, guideL, sW, sH, radius, eps);
      srcB = guidedFilter(srcB, guideL, sW, sH, radius, eps);
    }

    const result = createImageDataHelper(sW, sH);
    const dst = result.data;
    for (let i = 0; i < totalSrc; i++) {
      const idx = i * 4;
      dst[idx] = Math.max(0, Math.min(255, Math.round(srcR[i] ?? 0)));
      dst[idx + 1] = Math.max(0, Math.min(255, Math.round(srcG[i] ?? 0)));
      dst[idx + 2] = Math.max(0, Math.min(255, Math.round(srcB[i] ?? 0)));
      dst[idx + 3] = sData[idx + 3] ?? 255;
    }
    return result;
  }

  // 16. 调色合成
  function renderGrading(targetImageData: ImageData, recipe: any, options: any = {}, skinMask: Float32Array | null = null): ImageData {
    const intensity = typeof options.intensity === 'number' ? Math.max(0, Math.min(1, options.intensity)) : 1.0;
    const protectSkin = typeof options.protectSkin === 'boolean' ? options.protectSkin : true;

    const { width, height, data: src } = targetImageData;
    const output = createImageDataHelper(width, height);
    const dst = output.data;

    if (intensity === 0.0) {
      dst.set(src);
      return output;
    }

    // 若提供了参考图真实图像数据，启动 Pitié 3D 色彩概率分布传输 (MKL + 导向滤波)
    let baseSourceData = src;
    if (options && options.referenceImageData && options.usePitieTransfer !== false) {
      const transferred = pitiColorTransfer(targetImageData, options.referenceImageData, {
        iterations: 4,
        applyGuidedFilter: true
      });
      baseSourceData = transferred.data;
    }

    const {
      contrast = 1.15,
      saturation = 1.1,
      temperature = 0,
      tint = 0,
      highlights,
      shadows,
      toneCurve,
      cinemaSplit,
      greenChannel,
      filmGrain = 0,
      vignette = 0
    } = recipe;

    const radHi = highlights ? (highlights.hue * Math.PI) / 180 : 0;
    const radSh = shadows ? (shadows.hue * Math.PI) / 180 : 0;
    const hiOffset = highlights ? [Math.cos(radHi), Math.cos(radHi - 2 * Math.PI / 3), Math.cos(radHi - 4 * Math.PI / 3)] : [0, 0, 0];
    const shOffset = shadows ? [Math.cos(radSh), Math.cos(radSh - 2 * Math.PI / 3), Math.cos(radSh - 4 * Math.PI / 3)] : [0, 0, 0];
    const isCinema = cinemaSplit && cinemaSplit.isCinemaTealOrange;
    const hiWeight = highlights ? Math.max(0.2, highlights.saturation) * (highlights.weight || 0.6) * (isCinema ? 130 : 100) : 0;
    const shWeight = shadows ? Math.max(0.2, shadows.saturation) * (shadows.weight || 0.6) * (isCinema ? 130 : 100) : 0;

    const targetGreenHue = greenChannel ? greenChannel.targetHue : 140;
    const targetGreenSat = greenChannel ? greenChannel.targetSat : 0.28;
    const targetGreenVal = greenChannel ? (greenChannel.targetVal || 0.55) : 0.55;
    const targetGreenSh = greenChannel && greenChannel.shadowHue ? greenChannel.shadowHue : (targetGreenHue + 5);
    const targetGreenHi = greenChannel && greenChannel.highlightHue ? greenChannel.highlightHue : (targetGreenHue - 5);

    const fadeBlack = (toneCurve && toneCurve.fadeBlack) ? toneCurve.fadeBlack : 0;
    const isHighKey = toneCurve ? toneCurve.isHighKey : false;

    const cx = width / 2, cy = height / 2;
    const maxDist = Math.hypot(cx, cy);
    const totalPixels = width * height;

    for (let p = 0; p < totalPixels; p++) {
      const idx = p * 4;
      const origR = src[idx], origG = src[idx + 1], origB = src[idx + 2], origA = src[idx + 3];
      let r = baseSourceData[idx], g = baseSourceData[idx + 1], b = baseSourceData[idx + 2];

      // 1. 植被通道 1:1 直接复用
      const [h, s, v] = rgbToHsv(r, g, b);
      let plantWeight = 0;
      if (h >= 35 && h <= 175 && s >= 0.05) {
        const dist = Math.abs(h - 105);
        if (dist <= 40) plantWeight = 1.0;
        else plantWeight = Math.max(0, 1.0 - (dist - 40) / 30);

        if (plantWeight > 0 && greenChannel && greenChannel.present) {
          let desiredH = targetGreenHue;
          if (v > 0.65) desiredH = targetGreenHi;
          else if (v < 0.35) desiredH = targetGreenSh;
          const newHue = h * (1 - plantWeight) + desiredH * plantWeight;
          const newSat = s * (1 - plantWeight) + targetGreenSat * plantWeight;
          const newVal = v * (1 - plantWeight * 0.1) + targetGreenVal * (plantWeight * 0.1);

          const [gr, gg, gb] = hsvToRgb(newHue, newSat, newVal);
          r = r * (1 - plantWeight) + gr * plantWeight;
          g = g * (1 - plantWeight) + gg * plantWeight;
          b = b * (1 - plantWeight) + gb * plantWeight;
        }
      }

      // 2. 白平衡与色温
      r += temperature * 1.0;
      b -= temperature * 1.0;
      g += tint * 0.8;

      // 3. 对比度
      if (contrast !== 1.0) {
        const effContrast = 1.0 + (contrast - 1.0) * (1.0 - plantWeight * 0.5);
        r = (r - 128) * effContrast + 128;
        g = (g - 128) * effContrast + 128;
        b = (b - 128) * effContrast + 128;
      }

      // 4. 胶片分位数曲线
      if (fadeBlack > 0) {
        const curL = 0.299 * r + 0.587 * g + 0.114 * b;
        if (curL < 120) {
          const liftWeight = Math.max(0, 1.0 - curL / 120);
          r += fadeBlack * liftWeight;
          g += fadeBlack * liftWeight;
          b += fadeBlack * liftWeight;
        }
      }
      if (isHighKey) {
        const highLift = Math.min(1.0, (0.299 * r + 0.587 * g + 0.114 * b) / 255);
        r += 18 * highLift;
        g += 20 * highLift;
        b += 19 * highLift;
      }

      // 5. 饱和度
      if (saturation !== 1.0) {
        const effectiveSat = 1.0 + (saturation - 1.0) * (1.0 - plantWeight);
        const gray = 0.299 * r + 0.587 * g + 0.114 * b;
        r = gray + (r - gray) * effectiveSat;
        g = gray + (g - gray) * effectiveSat;
        b = gray + (b - gray) * effectiveSat;
      }

      // 6. 冷暖分离
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

      if (fadeBlack > 0) {
        const curL = 0.299 * r + 0.587 * g + 0.114 * b;
        if (curL < 110) {
          const liftWeight = Math.max(0, 1.0 - curL / 110);
          const minFloor = fadeBlack * 0.75;
          r = Math.max(minFloor * liftWeight, r);
          g = Math.max(minFloor * liftWeight, g);
          b = Math.max(minFloor * liftWeight, b);
        }
      }

      // 7. 颗粒度
      if (filmGrain > 0) {
        const curL = Math.max(0, Math.min(255, 0.299 * r + 0.587 * g + 0.114 * b));
        const grainFactor = Math.sin((curL / 255) * Math.PI) * (curL > 215 ? Math.max(0, (255 - curL) / 40) : 1.0);
        const noise = ((Math.sin(p * 997.13 + 37.1) * 43758.5453) % 1) * filmGrain * 32 * grainFactor;
        r += noise; g += noise; b += noise;
      }

      // 8. 暗角
      if (vignette > 0) {
        const px = p % width, py = Math.floor(p / width);
        const dist = Math.hypot(px - cx, py - cy) / maxDist;
        const vigFactor = 1.0 - Math.pow(dist, 1.8) * vignette * 0.65;
        r *= vigFactor; g *= vigFactor; b *= vigFactor;
      }

      // 9. 肤色保护
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

      // 10. 全局强度插值
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
    renderGrading,
    pitiColorTransfer,
    guidedFilter,
    matchHistogram1D,
    boxFilter
  };
})();
