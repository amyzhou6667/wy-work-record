/**
 * ToneRelay - 自动曝光预对齐器
 */
const { MockImageData } = require('../../tests/helpers/image_mock');

/**
 * 计算图像平均亮度
 */
function calculateMeanLuminance(imageData) {
  const { data, width, height } = imageData;
  const totalPixels = width * height;
  const step = Math.max(1, Math.floor(totalPixels / 2000));
  let sumL = 0;
  let count = 0;

  for (let i = 0; i < data.length; i += 4 * step) {
    const l = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    sumL += l;
    count++;
  }

  return count > 0 ? sumL / count : 128;
}

/**
 * 自适应对齐原图与参考图曝光基准
 * @param {ImageData} targetImageData 
 * @param {ImageData} referenceImageData 
 * @returns {ImageData}
 */
function alignExposure(targetImageData, referenceImageData) {
  const targetLum = calculateMeanLuminance(targetImageData);
  const refLum = calculateMeanLuminance(referenceImageData);

  const diff = refLum - targetLum;
  // 差异比例在 25% 以内视作自然动态范围，不强行抹平
  if (Math.abs(diff) < 255 * 0.25) {
    // 无需大幅对齐，浅拷贝返回
    const copy = new (targetImageData.constructor || MockImageData)(targetImageData.width, targetImageData.height);
    copy.data.set(targetImageData.data);
    return copy;
  }

  // 引入阻尼因子 0.45，既拉近光比又不破坏原片光影氛围
  const targetRatio = (refLum + 20) / (targetLum + 20);
  const gain = 1.0 + (targetRatio - 1.0) * 0.45;

  const result = new (targetImageData.constructor || MockImageData)(targetImageData.width, targetImageData.height);
  const src = targetImageData.data;
  const dst = result.data;

  for (let i = 0; i < src.length; i += 4) {
    dst[i] = Math.max(0, Math.min(255, Math.round(src[i] * gain)));
    dst[i + 1] = Math.max(0, Math.min(255, Math.round(src[i + 1] * gain)));
    dst[i + 2] = Math.max(0, Math.min(255, Math.round(src[i + 2] * gain)));
    dst[i + 3] = src[i + 3];
  }

  return result;
}

module.exports = {
  calculateMeanLuminance,
  alignExposure
};
