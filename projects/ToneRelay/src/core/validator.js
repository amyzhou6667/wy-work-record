/**
 * ToneRelay - 参考图前置有效性门控校验器
 */

/**
 * 校验参考图是否具备足够的色彩与明度特征以供提取风格
 * @param {ImageData} imageData 
 * @returns {{valid: boolean, reason?: string}}
 */
function validateReferenceImage(imageData) {
  if (!imageData || !imageData.width || !imageData.height || !imageData.data) {
    return { valid: false, reason: '无效的图片数据，请重新选择图片' };
  }

  const { width, height, data } = imageData;
  const totalPixels = width * height;
  if (totalPixels < 16) {
    return { valid: false, reason: '图片分辨率过小，无法准确解析风格' };
  }

  // 计算亮度均值与方差，以及 RGB 分布
  let sumL = 0;
  let sumR = 0, sumG = 0, sumB = 0;

  // 采样步长 (提升大图性能，采样约 1000~2000 个像素)
  const step = Math.max(1, Math.floor(totalPixels / 2000));
  let sampleCount = 0;

  for (let i = 0; i < data.length; i += 4 * step) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const l = 0.299 * r + 0.587 * g + 0.114 * b;
    sumL += l;
    sumR += r;
    sumG += g;
    sumB += b;
    sampleCount++;
  }

  const meanL = sumL / sampleCount;
  const meanR = sumR / sampleCount;
  const meanG = sumG / sampleCount;
  const meanB = sumB / sampleCount;

  let varianceL = 0;
  let varianceRGB = 0;

  for (let i = 0; i < data.length; i += 4 * step) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const l = 0.299 * r + 0.587 * g + 0.114 * b;
    varianceL += (l - meanL) ** 2;
    varianceRGB += ((r - meanR) ** 2 + (g - meanG) ** 2 + (b - meanB) ** 2) / 3;
  }

  const stdL = Math.sqrt(varianceL / sampleCount);
  const stdRGB = Math.sqrt(varianceRGB / sampleCount);

  // 阈值检查：标准差 < 12 说明整体几乎为纯色或无层次色块
  if (stdL < 12 && stdRGB < 12) {
    return {
      valid: false,
      reason: '这张参考图色彩过于单一啦，换一张光影更丰富的照片试试吧~'
    };
  }

  return { valid: true };
}

module.exports = {
  validateReferenceImage
};
