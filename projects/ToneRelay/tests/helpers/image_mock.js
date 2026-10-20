/**
 * ToneRelay - 测试脚手架与 ImageData 模拟辅助工具
 */

class MockImageData {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.data = new Uint8ClampedArray(width * height * 4);
  }
}

/**
 * 创建自定义填充的 ImageData
 */
function createMockImageData(width, height, fillFn) {
  const img = new MockImageData(width, height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const pixel = fillFn ? fillFn(x, y, width, height) : [0, 0, 0, 255];
      img.data[idx] = pixel[0];
      img.data[idx + 1] = pixel[1];
      img.data[idx + 2] = pixel[2];
      img.data[idx + 3] = pixel[3] !== undefined ? pixel[3] : 255;
    }
  }
  return img;
}

/**
 * 创建纯单色图像 (用于触发门控拦截)
 */
function createSolidColorImage(width, height, r, g, b, a = 255) {
  return createMockImageData(width, height, () => [r, g, b, a]);
}

/**
 * 创建包含丰富光影与色彩梯度的风景/摄影图像
 */
function createGradientImage(width, height) {
  return createMockImageData(width, height, (x, y, w, h) => {
    // 模拟天空与地面色彩渐变：上方暖橘色(240, 140, 60)，下方冷青深蓝(30, 60, 90)
    const ratioY = y / h;
    const ratioX = x / w;
    const r = Math.round(240 * (1 - ratioY) + 30 * ratioY);
    const g = Math.round(140 * (1 - ratioY) + 60 * ratioY);
    const b = Math.round(60 * (1 - ratioY) + 90 * ratioY + 30 * ratioX);
    return [r, g, b, 255];
  });
}

/**
 * 创建带有人像肤色的模拟照片
 * 中心区域为人脸肤色 (235, 185, 155)，背景为冷色调 (40, 80, 130)
 */
function createPortraitImage(width, height) {
  return createMockImageData(width, height, (x, y, w, h) => {
    const cx = w / 2;
    const cy = h / 2;
    const dist = Math.hypot(x - cx, y - cy);
    if (dist < Math.min(w, h) * 0.3) {
      // 典型人体肤色区间 (HSV 色相约 22度)
      return [235, 185, 155, 255];
    }
    // 背景冷青蓝色
    return [40, 80, 130, 255];
  });
}

module.exports = {
  MockImageData,
  createMockImageData,
  createSolidColorImage,
  createGradientImage,
  createPortraitImage
};
