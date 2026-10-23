/**
 * ToneRelay - 通用调色渲染与多阶段合成引擎 (Universal Grading & Texture Compositor - TypeScript)
 * 支持：光影曲线分位数映射、黑位抬升(胶片灰雾)、电影冷暖对冲、明度自适应真实颗粒、通道直接复用与人像肤色保护
 */
import { normalizeGradingOptions, type StyleRecipe, type GradingOptions } from '../types/index.ts';
import { rgbToHsv } from './extractor.ts';
import { pitiColorTransfer } from './color_transfer.ts';
import { MockImageData } from '../../tests/helpers/image_mock.ts';
import type { ImageDataLike } from './validator.ts';

/**
 * HSV 转 RGB
 */
export function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
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

/**
 * 色相投影向量
 */
function hueToRgbOffset(hue: number): [number, number, number] {
  const rad = (hue * Math.PI) / 180;
  return [
    Math.cos(rad),
    Math.cos(rad - (2 * Math.PI) / 3),
    Math.cos(rad - (4 * Math.PI) / 3)
  ];
}

/**
 * 执行通用影调多阶段渲染
 */
export function renderGrading(
  targetImageData: ImageDataLike,
  recipe: StyleRecipe,
  options?: GradingOptions,
  skinMask?: Float32Array | null
): ImageDataLike {
  const { intensity, protectSkin } = normalizeGradingOptions(options);
  const { width, height, data: src } = targetImageData;

  const ctor = (targetImageData as any).constructor || MockImageData;
  const result = new ctor(width, height);
  const dst = result.data;

  // 若强度为 0，直接复制原图返回
  if (intensity === 0.0) {
    dst.set(src);
    return result;
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

  // 高光暗部投影
  const hiOffset = highlights ? hueToRgbOffset(highlights.hue) : [0, 0, 0];
  const shOffset = shadows ? hueToRgbOffset(shadows.hue) : [0, 0, 0];
  const isCinema = cinemaSplit && cinemaSplit.isCinemaTealOrange;
  const hiWeight = highlights ? Math.max(0.2, highlights.saturation) * (highlights.weight || 0.6) * (isCinema ? 130 : 100) : 0;
  const shWeight = shadows ? Math.max(0.2, shadows.saturation) * (shadows.weight || 0.6) * (isCinema ? 130 : 100) : 0;

  // 绿色植被通道配置
  const targetGreenHue = greenChannel ? greenChannel.targetHue : 140;
  const targetGreenSat = greenChannel ? greenChannel.targetSat : 0.28;
  const targetGreenVal = greenChannel ? (greenChannel.targetVal || 0.55) : 0.55;
  const targetGreenSh = greenChannel && greenChannel.shadowHue ? greenChannel.shadowHue : (targetGreenHue + 5);
  const targetGreenHi = greenChannel && greenChannel.highlightHue ? greenChannel.highlightHue : (targetGreenHue - 5);

  // 胶片分位数曲线参数
  const fadeBlack = (toneCurve && toneCurve.fadeBlack) ? toneCurve.fadeBlack : 0;
  const isHighKey = toneCurve ? toneCurve.isHighKey : false;

  const cx = width / 2;
  const cy = height / 2;
  const maxDist = Math.hypot(cx, cy);
  const totalPixels = width * height;

  for (let p = 0; p < totalPixels; p++) {
    const idx = p * 4;
    const origR = src[idx] ?? 0;
    const origG = src[idx + 1] ?? 0;
    const origB = src[idx + 2] ?? 0;
    const origA = src[idx + 3] ?? 255;

    let r = baseSourceData[idx] ?? origR;
    let g = baseSourceData[idx + 1] ?? origG;
    let b = baseSourceData[idx + 2] ?? origB;

    // 1. 语义色彩通道直接 1:1 复用 (Direct Channel Reuse)
    const [h, s, v] = rgbToHsv(r, g, b);
    let plantWeight = 0;
    if (h >= 35 && h <= 175 && s >= 0.05) {
      const dist = Math.abs(h - 105);
      if (dist <= 40) {
        plantWeight = 1.0;
      } else {
        plantWeight = Math.max(0, 1.0 - (dist - 40) / 30);
      }

      if (plantWeight > 0 && greenChannel && (greenChannel as any).present) {
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

    // 3. 对比度与立体感
    if (contrast !== 1.0) {
      const effContrast = 1.0 + (contrast - 1.0) * (1.0 - plantWeight * 0.5);
      r = (r - 128) * effContrast + 128;
      g = (g - 128) * effContrast + 128;
      b = (b - 128) * effContrast + 128;
    }

    // 4. 胶片分位数光影曲线映射 (黑位抬升 Fade & 日系高调透亮)
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

    // 5. 饱和度 (植被区域免疫全局拉爆)
    if (saturation !== 1.0) {
      const effectiveSat = 1.0 + (saturation - 1.0) * (1.0 - plantWeight);
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      r = gray + (r - gray) * effectiveSat;
      g = gray + (g - gray) * effectiveSat;
      b = gray + (b - gray) * effectiveSat;
    }

    // 6. 电影/胶片高光暗部冷暖分离注入 (Split Toning)
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

    // 胶片黑位灰雾保底
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

    // 7. 明度自适应电影/胶片颗粒合成
    if (filmGrain > 0) {
      const curL = Math.max(0, Math.min(255, 0.299 * r + 0.587 * g + 0.114 * b));
      const grainFactor = Math.sin((curL / 255) * Math.PI) * (curL > 215 ? Math.max(0, (255 - curL) / 40) : 1.0);
      const noise = ((Math.sin(p * 997.13 + 37.1) * 43758.5453) % 1) * filmGrain * 32 * grainFactor;
      r += noise;
      g += noise;
      b += noise;
    }

    // 8. 镜头暗角
    if (vignette > 0) {
      const px = p % width;
      const py = Math.floor(p / width);
      const dist = Math.hypot(px - cx, py - cy) / maxDist;
      const vigFactor = 1.0 - Math.pow(dist, 1.8) * vignette * 0.65;
      r *= vigFactor;
      g *= vigFactor;
      b *= vigFactor;
    }

    // 9. 智能人像肤色保护
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

    // 10. 全局强度插值混合 (Intensity Lerp)
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
