/**
 * ToneRelay - Pitié 3D 色彩概率分布传输 (MKL) 与保真导向滤波 (Guided Filter - TypeScript)
 * 论文出处: François Pitié, Anil Kokaram, Rozenn Dahyot (CVIU 2007)
 * "Automated colour grading using colour distribution transfer"
 */
import { MockImageData } from '../../tests/helpers/image_mock.ts';
import type { ImageDataLike } from './validator.ts';

export interface ColorTransferOptions {
  iterations?: number;
  applyGuidedFilter?: boolean;
  radius?: number;
  eps?: number;
}

/**
 * 一维连续累积分布 (1D CDF) 直方图精确匹配
 */
export function matchHistogram1D(src: Float32Array, ref: Float32Array): Float32Array {
  const nSrc = src.length;
  const nRef = ref.length;
  const result = new Float32Array(nSrc);

  // 1. 获取源数组排序索引
  const srcIndices = new Int32Array(nSrc);
  for (let i = 0; i < nSrc; i++) srcIndices[i] = i;
  srcIndices.sort((a, b) => (src[a] ?? 0) - (src[b] ?? 0));

  const sortedRef = new Float32Array(ref);
  sortedRef.sort();

  // 2. 将源数组的分位数排名一一对应映射至参考数组
  const ratio = (nRef - 1) / Math.max(1, nSrc - 1);
  for (let i = 0; i < nSrc; i++) {
    const targetIdx = Math.min(nRef - 1, Math.max(0, Math.round(i * ratio)));
    const originalPixelIdx = srcIndices[i] ?? 0;
    result[originalPixelIdx] = sortedRef[targetIdx] ?? 0;
  }

  return result;
}

/**
 * 快速 2D 盒式滤波 (Box Filter) - 采用行列可分离积分累加，时间复杂度 O(1)
 */
export function boxFilter(input: Float32Array, width: number, height: number, r: number): Float32Array {
  const output = new Float32Array(width * height);
  const temp = new Float32Array(width * height);

  // 1. 水平方向滑动窗口滤波
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

  // 2. 垂直方向滑动窗口滤波
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

/**
 * 导向滤波 (Guided Filter) - 保持边缘高频梯度并滤除杂色斑块
 */
export function guidedFilter(
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
    b[i] = mp - a[i]! * mi;
  }

  const meanA = boxFilter(a, width, height, r);
  const meanB = boxFilter(b, width, height, r);

  const q = new Float32Array(total);
  for (let i = 0; i < total; i++) {
    q[i] = (meanA[i] ?? 0) * (I[i] ?? 0) + (meanB[i] ?? 0);
  }

  return q;
}

/**
 * 生成预设的多组 3D 正交旋转投影基 (Precomputed Orthogonal Rotation Bases)
 */
export const ROTATION_MATRICES: number[][][] = [
  // 1. 恒等基 (对齐 R, G, B 原轴)
  [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1]
  ],
  // 2. 主对角光影轴旋转 (将亮度与色差解耦: (R+G+B)/sqrt(3))
  [
    [0.57735, 0.57735, 0.57735],
    [0.70710, -0.70710, 0],
    [0.40824, 0.40824, -0.81649]
  ],
  // 3. 围绕色度空间 45° 倾斜正交基
  [
    [0.85355, 0.35355, 0.35355],
    [-0.35355, 0.85355, -0.35355],
    [-0.35355, -0.35355, 0.85355]
  ],
  // 4. 互补青红冷暖轴正交基
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

/**
 * Pitié 3D 色彩概率分布传输 (N-Dimensional PDF Transfer)
 */
export function pitiColorTransfer(
  srcImageData: ImageDataLike,
  refImageData: ImageDataLike,
  options: ColorTransferOptions = {}
): ImageDataLike {
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

  // 1. 抽取源图像 R, G, B 通道数据
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

  // 2. 抽取参考图 R, G, B 通道数据 (适度步长下采样)
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

  // 3. 执行多次 3D 正交基连续投影直方图规范化
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

    // 每一轮投影后保证数值稳定性
    for (let i = 0; i < totalSrc; i++) {
      srcR[i] = Math.max(0, Math.min(255, srcR[i] ?? 0));
      srcG[i] = Math.max(0, Math.min(255, srcG[i] ?? 0));
      srcB[i] = Math.max(0, Math.min(255, srcB[i] ?? 0));
    }
  }

  // 4. 采用导向滤波 (Guided Filter) 进行空间保真
  if (doGuidedFilter) {
    srcR = guidedFilter(srcR, guideL, sW, sH, radius, eps);
    srcG = guidedFilter(srcG, guideL, sW, sH, radius, eps);
    srcB = guidedFilter(srcB, guideL, sW, sH, radius, eps);
  }

  // 5. 高光白与中性灰防染色保护 (White & Neutral Highlight Guard)
  // 杜绝参考图的非中性色(如浓绿)对原图纯白天空、白墙、白衣产生串色污染
  for (let i = 0; i < totalSrc; i++) {
    const idx = i * 4;
    const oR = sData[idx] ?? 0;
    const oG = sData[idx + 1] ?? 0;
    const oB = sData[idx + 2] ?? 0;
    const oLum = 0.299 * oR + 0.587 * oG + 0.114 * oB;
    if (oLum > 155) {
      const maxC = Math.max(oR, oG, oB);
      const minC = Math.min(oR, oG, oB);
      const sat = maxC === 0 ? 0 : (maxC - minC) / maxC;
      if (sat < 0.22) {
        const wWeight = Math.min(1.0, (oLum - 155) / 75) * Math.max(0.0, 1.0 - sat / 0.22);
        srcR[i] = (srcR[i] ?? 0) * (1 - wWeight) + oR * wWeight;
        srcG[i] = (srcG[i] ?? 0) * (1 - wWeight) + oG * wWeight;
        srcB[i] = (srcB[i] ?? 0) * (1 - wWeight) + oB * wWeight;
      }
    }
  }

  // 6. 生成输出图像
  const OutputClass = (srcImageData as any).constructor || MockImageData;
  const result: ImageDataLike = new OutputClass(sW, sH);
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
