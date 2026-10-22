const test = require('node:test');
const assert = require('node:assert/strict');
const { extractRecipe, rgbToHsv, rgbToLab } = require('../src/core/extractor');
const { renderGrading } = require('../src/core/renderer');
const { createMockImageData } = require('./helpers/image_mock');

test('UniversalStyle: 针对大面积白色高调胶片风，应精准解构黑位抬升与高调透光曲线，避免误判死黑暴曝', () => {
  // 构造大面积白色高调胶片参考图: 75% 区域为奶白色 (235, 238, 232)，暗部黑位抬升至 22 灰雾感
  const highKeyWhiteImg = createMockImageData(64, 64, (x, y, w, h) => {
    const isShadow = y > h * 0.8 && x < w * 0.4;
    if (isShadow) {
      // 胶片黑位抬升 (Fade) - 模拟最低灰阶不是 0，而是 22
      return [25, 28, 26, 255];
    }
    // 大面积高调奶白日系背景
    const ratio = (x + y) / (w + h);
    const r = Math.round(230 + 15 * ratio);
    const g = Math.round(235 + 12 * ratio);
    const b = Math.round(228 + 10 * ratio);
    return [r, g, b, 255];
  });

  const recipe = extractRecipe(highKeyWhiteImg);

  // 1. 检查通用分位数光影曲线 (toneCurve)
  assert.ok(recipe.toneCurve, '必须输出通用光影曲线 toneCurve');
  assert.ok(recipe.toneCurve.p0 >= 15, `黑位最低点应体现胶片黑位抬升(p0 >= 15)，实际为: ${recipe.toneCurve.p0}`);
  assert.ok(recipe.toneCurve.p75 >= 220, `高调白高光百分位应显著偏亮(p75 >= 220)，实际为: ${recipe.toneCurve.p75}`);

  // 2. 检查 CIE-Lab 感知统计特征 (labStats)
  assert.ok(recipe.labStats, '必须输出 CIE-Lab 统计矩');
  assert.ok(recipe.labStats.meanL >= 75, `高调白色图平均亮度 L 应 >= 75，实际为: ${recipe.labStats.meanL}`);

  // 3. 验证风格标签自动反解包含日系/高调/白色相关
  const hasHighKeyTag = recipe.tags.some(t => t.includes('高调') || t.includes('通透') || t.includes('白色') || t.includes('白胶片') || t.includes('透亮'));
  assert.ok(hasHighKeyTag, `风格标签应识别出高调/通透特征，实际标签为: ${recipe.tags.join(', ')}`);

  // 4. 将高调白配方渲染到普通中性对比度的原图上
  const normalImg = createMockImageData(32, 32, (x, y, w, h) => {
    // 原始深黑暗部 (0,0,0) 与中间调 (128,128,128)
    const val = y < h / 2 ? 5 : 120;
    return [val, val, val, 255];
  });

  const rendered = renderGrading(normalImg, recipe, { intensity: 1.0, protectSkin: false });
  // 验证原图原本接近 0 的死黑暗部，是否获得了胶片黑位抬升(灰雾质感)
  const shadowPixelR = rendered.data[0];
  assert.ok(shadowPixelR >= 10, `渲染后暗部应有胶片黑位灰雾感(>= 10)，实际为: ${shadowPixelR}`);
});

test('UniversalStyle: 针对好莱坞电影风参考图，应自动反解 Teal-Orange 冷暖对冲与镜头暗角', () => {
  // 构造经典电影风参考图：高光暖金橙 (240, 150, 50)，暗部冷青深蓝 (20, 50, 75)，中心亮四周暗(镜头暗角)
  const cinemaImg = createMockImageData(64, 64, (x, y, w, h) => {
    const cx = w / 2, cy = h / 2;
    const distRatio = Math.hypot(x - cx, y - cy) / Math.hypot(cx, cy);
    const vig = 1.0 - distRatio * 0.45; // 边角约 45% 衰减暗角

    const ratioY = y / h;
    // 上方高光暖橙金，下方暗部冷青蓝
    const r = Math.round((240 * (1 - ratioY) + 20 * ratioY) * vig);
    const g = Math.round((150 * (1 - ratioY) + 50 * ratioY) * vig);
    const b = Math.round((50 * (1 - ratioY) + 75 * ratioY) * vig);
    return [r, g, b, 255];
  });

  const recipe = extractRecipe(cinemaImg);

  // 1. 应能检测出显著的镜头暗角 (vignette >= 0.15)
  assert.ok(recipe.vignette >= 0.15, `应自动检测出暗角特征，实际为: ${recipe.vignette}`);

  // 2. 应能检测出电影冷暖色调分离特征
  assert.ok(recipe.cinemaSplit, '应输出电影级色调分离 cinemaSplit');
  assert.equal(recipe.cinemaSplit.isCinemaTealOrange, true, '高光暖暗部冷应被自动判定为经典电影 Teal-Orange 撞色');

  // 3. 标签应包含电影感相关
  const hasCinemaTag = recipe.tags.some(t => t.includes('电影') || t.includes('Teal') || t.includes('青冷') || t.includes('金调'));
  assert.ok(hasCinemaTag, `标签应包含电影质感特征: ${recipe.tags.join(', ')}`);
});

test('UniversalStyle: 真实颗粒感自动反解 —— 纯净数码图颗粒为0，含噪胶片图自动提取出颗粒度', () => {
  // 1. 纯净平滑数码图 (无噪点)
  const cleanImg = createMockImageData(64, 64, (x, y, w, h) => [160, 160, 160, 255]);
  const cleanRecipe = extractRecipe(cleanImg);
  assert.ok(cleanRecipe.filmGrain <= 0.08, `纯净数码图反解出的颗粒度应极低(<= 0.08)，实际为: ${cleanRecipe.filmGrain}`);

  // 2. 带高频颗粒噪波的复古胶片图 (在平滑灰底上添加高频伪随机扰动)
  const grainyImg = createMockImageData(64, 64, (x, y) => {
    // 伪随机高频银盐颗粒
    const noise = ((Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1) * 35 - 17.5;
    const base = 140 + noise;
    return [base, base, base, 255];
  });

  const grainyRecipe = extractRecipe(grainyImg);
  assert.ok(grainyRecipe.filmGrain >= 0.18, `带噪胶片图应反解出显著颗粒感(>= 0.18)，实际为: ${grainyRecipe.filmGrain}`);

  // 3. 明度自适应颗粒合成测试：极高光处不应有脏噪点，中间调颗粒均匀
  const testImg = createMockImageData(32, 32, (x, y, w, h) => {
    const val = y < h / 2 ? 128 : 252; // 上半部分中间调，下半部分极亮高光
    return [val, val, val, 255];
  });

  const rendered = renderGrading(testImg, grainyRecipe, { intensity: 1.0, protectSkin: false });
  // 高光区域 (252) 应当被保护，避免生成粗糙脏斑
  const hiPixel = rendered.data[32 * 25 * 4]; // 下半部分高光采样
  assert.ok(hiPixel >= 240, `极高光处颗粒应自然收敛不脏，实际为: ${hiPixel}`);
});
