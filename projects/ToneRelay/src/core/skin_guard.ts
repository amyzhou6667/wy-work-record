/**
 * ToneRelay - 智能人像肤色保护软蒙版生成器 (TypeScript)
 */
import { rgbToHsv } from './extractor.ts';
import type { ImageDataLike } from './validator.ts';

/**
 * 为输入图像生成肤色软蒙版 (Float32Array)
 * @returns 长度为 width * height，每个值为 [0.0, 1.0]
 */
export function generateSkinMask(imageData: ImageDataLike | null | undefined): Float32Array {
  if (!imageData || !imageData.width || !imageData.height || !imageData.data) {
    return new Float32Array(0);
  }

  const { width, height, data } = imageData;
  const totalPixels = width * height;
  const mask = new Float32Array(totalPixels);

  for (let i = 0; i < totalPixels; i++) {
    const dataIdx = i * 4;
    const r = data[dataIdx];
    const g = data[dataIdx + 1];
    const b = data[dataIdx + 2];

    // 经典人脸/人体生理肤色初筛: R > G > B, (R - G) > 15, R > 60
    if (r > g && g > b && (r - g) > 15 && r > 60) {
      const [h, s, v] = rgbToHsv(r, g, b);
      
      // 判定色相 (Hue) 是否在典型亚洲/健康肤色范围 [0, 48] 或 [345, 360]
      const isSkinHue = (h >= 0 && h <= 48) || (h >= 345 && h <= 360);
      const isSkinSat = s >= 0.15 && s <= 0.75;
      const isSkinVal = v >= 0.20 && v <= 0.98;

      if (isSkinHue && isSkinSat && isSkinVal) {
        // 计算平滑权重
        let hueDist = h > 180 ? 360 - h : h;
        // 最佳肤色中心约为 20~25度
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
