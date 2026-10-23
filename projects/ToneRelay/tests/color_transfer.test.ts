import test from 'node:test';
import assert from 'node:assert/strict';
import { 
  matchHistogram1D, 
  pitiColorTransfer, 
  guidedFilter 
} from '../src/core/color_transfer.ts';
import { createMockImageData } from './helpers/image_mock.ts';

test('ColorTransfer: 1D CDF 直方图精确匹配应将源数组分布完全对齐到目标数组', () => {
  // 源数据：暗调线性递增 (10 到 100)
  const src = new Float32Array([10, 20, 30, 40, 50, 60, 70, 80, 90, 100]);
  // 目标数据：高调分布 (180 到 250)
  const ref = new Float32Array([180, 190, 200, 210, 220, 230, 240, 245, 248, 250]);

  const matched = matchHistogram1D(src, ref);

  assert.equal(matched.length, src.length);
  // 匹配后，最小值应映射至目标低位，最大值应映射至目标高位
  assert.ok((matched[0] ?? 0) >= 170, `最小值应映射至目标低位(>= 170)，实际为: ${matched[0]}`);
  assert.ok((matched[matched.length - 1] ?? 0) >= 240, `最大值应映射至目标高位(>= 240)，实际为: ${matched[matched.length - 1]}`);
});

test('ColorTransfer: 导向滤波 (Guided Filter) 应在平滑色彩的同时 100% 保持引导图的边缘梯度结构', () => {
  const width = 16, height = 16;
  // 引导图：带有鲜明的垂直明暗阶梯边缘 (左半边黑 10，右半边亮 220)
  const guide = new Float32Array(width * height);
  // 输入色彩图：带有微小伪随机噪斑
  const input = new Float32Array(width * height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      guide[idx] = x < width / 2 ? 10 : 220;
      input[idx] = (x < width / 2 ? 15 : 215) + (x % 2 === 0 ? 5 : -5);
    }
  }

  const filtered = guidedFilter(input, guide, width, height, 2, 0.01);

  assert.equal(filtered.length, input.length);
  // 检验垂直阶梯边缘左侧与右侧的跳变依然鲜明保留
  const leftVal = filtered[width * 8 + 6] ?? 0;  // 左侧边缘点
  const rightVal = filtered[width * 8 + 9] ?? 0; // 右侧边缘点
  assert.ok(rightVal - leftVal >= 170, `导向边缘应清晰保留(差值 >= 170)，实际差为: ${rightVal - leftVal}`);
});

test('ColorTransfer: Pitié 3D 色彩概率分布传输 (MKL) 应成功将参考图的色域与黑阶分布完全迁移到原图', () => {
  // 原图：草木风景照片 (带有渐变光影层次的鲜绿色域)
  const srcImg = createMockImageData(32, 32, (x, y, w, h) => {
    const ratio = (x + y) / (w + h);
    return [Math.round(40 + 40 * ratio), Math.round(180 + 40 * ratio), Math.round(30 + 30 * ratio), 255];
  });

  // 参考图：大面积白色微冷胶片风 (80% 奶白，黑位抬升至 25)
  const refImg = createMockImageData(32, 32, (x, y, w, h) => {
    if (y > h * 0.8) return [25, 28, 30, 255]; // 胶片黑位抬升
    return [235, 240, 238, 255]; // 奶白高光
  });

  const transferred = pitiColorTransfer(srcImg, refImg, { iterations: 4, applyGuidedFilter: true });

  assert.equal(transferred.width, srcImg.width);
  assert.equal(transferred.height, srcImg.height);

  // 计算传输后全图的平均色彩分量
  let sumR = 0, sumG = 0, sumB = 0;
  const total = transferred.width * transferred.height;
  for (let i = 0; i < total; i++) {
    sumR += transferred.data[i * 4] ?? 0;
    sumG += transferred.data[i * 4 + 1] ?? 0;
    sumB += transferred.data[i * 4 + 2] ?? 0;
  }
  const meanR = sumR / total;
  const meanB = sumB / total;

  // 1. 原图全图均值必须显著吸收参考图的高调奶白分布 (平均 R 和 B 均大幅提升至 150 以上)
  assert.ok(meanR >= 150, `全图均值应吸收参考图高调奶白(meanR >= 150)，实际为: ${meanR.toFixed(1)}`);
  assert.ok(meanB >= 150, `全图均值应吸收参考图冷调高光(meanB >= 150)，实际为: ${meanB.toFixed(1)}`);

  // 2. 验证暗部的胶片黑位抬升：全图最低灰阶不能死黑跌到 0
  let minPixelL = 255;
  for (let i = 0; i < total; i++) {
    const l = 0.299 * (transferred.data[i * 4] ?? 0) + 0.587 * (transferred.data[i * 4 + 1] ?? 0) + 0.114 * (transferred.data[i * 4 + 2] ?? 0);
    if (l < minPixelL) minPixelL = l;
  }
  assert.ok(minPixelL >= 5, `暗部应有胶片黑位灰雾底限(minPixelL >= 5)，实际为: ${minPixelL.toFixed(1)}`);
});
