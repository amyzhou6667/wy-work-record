const test = require('node:test');
const assert = require('node:assert/strict');
const { BatchPipeline } = require('../src/pipeline/batch_pipeline');
const { extractRecipe } = require('../src/core/extractor');
const { createGradientImage } = require('./helpers/image_mock');

test('BatchPipeline: 初始化任务列表并限制单次九宫格上限 (最多9张)', () => {
  const pipeline = new BatchPipeline();
  const images = Array.from({ length: 5 }, (_, i) => createGradientImage(20, 20));
  
  const tasks = pipeline.initTasks(images);
  assert.equal(tasks.length, 5);
  assert.equal(tasks[0].status, 'pending');

  // 超限测试 (10张应报错或截断至9张)
  const tooMany = Array.from({ length: 11 }, () => createGradientImage(10, 10));
  assert.throws(() => pipeline.initTasks(tooMany), /最多仅支持 9 张/);
});

test('BatchPipeline: 串行调度应按序推进进度并在全部完成后输出结果', async () => {
  const pipeline = new BatchPipeline();
  const images = [
    createGradientImage(20, 20),
    createGradientImage(20, 20),
    createGradientImage(20, 20)
  ];
  pipeline.initTasks(images);

  const recipe = extractRecipe(createGradientImage(30, 30));
  const progressLogs = [];

  const results = await pipeline.runBatchExport(
    recipe,
    { intensity: 1.0, protectSkin: true },
    (current, total) => {
      progressLogs.push({ current, total });
    }
  );

  assert.equal(results.length, 3);
  assert.deepEqual(progressLogs, [
    { current: 1, total: 3 },
    { current: 2, total: 3 },
    { current: 3, total: 3 }
  ]);
});

test('BatchPipeline: 某张图片异常时不应阻断队列其余任务', async () => {
  const pipeline = new BatchPipeline();
  const images = [
    createGradientImage(20, 20),
    null, // 损坏图片
    createGradientImage(20, 20)
  ];
  pipeline.initTasks(images);
  const recipe = extractRecipe(createGradientImage(30, 30));

  const results = await pipeline.runBatchExport(recipe, { intensity: 1.0, protectSkin: true });
  assert.equal(results.length, 3);
  assert.ok(results[0] !== null);
  assert.equal(results[1], null); // 失败项返回 null 并在任务对象记录 error
  assert.ok(results[2] !== null);
  assert.equal(pipeline.tasks[1].status, 'failed');
  assert.equal(pipeline.tasks[2].status, 'done');
});
