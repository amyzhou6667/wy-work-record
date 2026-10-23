import test from 'node:test';
import assert from 'node:assert/strict';

import { validateReferenceImage } from '../src/core/validator.ts';
import { extractRecipe } from '../src/core/extractor.ts';
import { alignExposure } from '../src/core/exposure.ts';
import { generateSkinMask } from '../src/core/skin_guard.ts';
import { renderGrading } from '../src/core/renderer.ts';
import { BatchPipeline } from '../src/pipeline/batch_pipeline.ts';
import { PresetStore } from '../src/pipeline/preset_store.ts';
import {
  createGradientImage,
  createPortraitImage,
  createSolidColorImage
} from './helpers/image_mock.ts';

test('E2E 全链路集成测试: 从参考图门控、打样对比、微调、存滤镜到批量九宫格导出', async () => {
  // 1. 模拟用户选图
  const refImage = createGradientImage(64, 64);
  const targetPortrait = createPortraitImage(64, 64);
  const batchPhotos = [
    targetPortrait,
    createGradientImage(40, 40),
    createGradientImage(40, 40),
    createPortraitImage(40, 40)
  ];

  // 2. 前置门控校验
  const check = validateReferenceImage(refImage);
  assert.equal(check.valid, true, '参考图应通过门控');

  // 3. 提取风格调色配方
  const recipe = extractRecipe(refImage);
  assert.ok(recipe.tags.length > 0);
  assert.ok(recipe.dominantPalette.length >= 3);

  // 4. 曝光预对齐
  const alignedPortrait = alignExposure(targetPortrait, refImage);
  assert.ok(alignedPortrait.width === targetPortrait.width);

  // 5. 生成人像肤色蒙版
  const skinMask = generateSkinMask(alignedPortrait);
  assert.equal(skinMask.length, 64 * 64);

  // 6. 首图打样渲染 (70% 强度微调，开启肤色保护)
  const previewOptions = { intensity: 0.7, protectSkin: true };
  const previewResult = renderGrading(alignedPortrait, recipe, previewOptions, skinMask);
  assert.equal(previewResult.data.length, targetPortrait.data.length);

  // 7. 一键存为“我的专属滤镜”
  const store = new PresetStore();
  const savedPreset = store.savePreset(recipe, '2026秋日日落电影感');
  assert.equal(savedPreset.name, '2026秋日日落电影感');
  assert.equal(store.listPresets().length, 1);

  // 8. 批量九宫格串行导出
  const pipeline = new BatchPipeline();
  pipeline.initTasks(batchPhotos);

  const progressTicks: { current: number; total: number }[] = [];
  const exportedResults = await pipeline.runBatchExport(
    recipe,
    previewOptions,
    (current, total) => {
      progressTicks.push({ current, total });
    }
  );

  // 9. 验收最终批量输出
  assert.equal(exportedResults.length, 4);
  assert.equal(progressTicks.length, 4);
  for (let i = 0; i < exportedResults.length; i++) {
    assert.ok(exportedResults[i] !== null, `第 ${i + 1} 张图片应成功渲染`);
    assert.equal(pipeline.tasks[i].status, 'done');
  }
});

test('E2E 异常链路: 遇到全黑参考图应在第一步即时拦截', () => {
  const badRef = createSolidColorImage(32, 32, 0, 0, 0);
  const check = validateReferenceImage(badRef);
  assert.equal(check.valid, false);
  assert.match(check.reason || '', /色彩过于单一/);
});
