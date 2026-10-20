/**
 * ToneRelay - 串行防 OOM 批量导出管道
 */
const { renderGrading } = require('../core/renderer');
const { generateSkinMask } = require('../core/skin_guard');

class BatchPipeline {
  constructor(maxBatch = 9) {
    this.maxBatch = maxBatch;
    this.tasks = [];
  }

  /**
   * 初始化待修图片列表
   * @param {Array<ImageData|Blob>} items 
   * @returns {Array<Object>}
   */
  initTasks(items) {
    if (!Array.isArray(items)) {
      throw new Error('参数必须为数组');
    }
    if (items.length > this.maxBatch) {
      throw new Error(`单次批量处理最多仅支持 ${this.maxBatch} 张图片`);
    }

    this.tasks = items.map((item, idx) => ({
      id: `task_${Date.now()}_${idx}`,
      index: idx,
      item,
      status: 'pending',
      errorMsg: null,
      result: null
    }));

    return this.tasks;
  }

  /**
   * 启动串行逐张渲染
   * @param {import('../types').StyleRecipe} recipe 
   * @param {import('../types').GradingOptions} options 
   * @param {Function} [onProgress] (current, total) => void
   * @returns {Promise<Array>}
   */
  async runBatchExport(recipe, options, onProgress) {
    const total = this.tasks.length;
    const results = [];

    for (let i = 0; i < total; i++) {
      const task = this.tasks[i];
      task.status = 'processing';

      try {
        const img = task.item;
        if (!img || !img.data || !img.width || !img.height) {
          throw new Error('无效的图像数据或格式损坏');
        }

        // 1. 若开启肤色保护，提取肤色蒙版
        let skinMask = null;
        if (options && options.protectSkin) {
          skinMask = generateSkinMask(img);
        }

        // 2. 执行调色渲染
        const rendered = renderGrading(img, recipe, options, skinMask);

        task.status = 'done';
        task.result = rendered;
        results.push(rendered);
      } catch (err) {
        task.status = 'failed';
        task.errorMsg = err.message || String(err);
        results.push(null);
      }

      if (typeof onProgress === 'function') {
        onProgress(i + 1, total);
      }

      // 让出事件循环微任务，保证移动端 UI 进度条平滑刷新与内存及时 GC
      await new Promise((resolve) => setImmediate ? setImmediate(resolve) : setTimeout(resolve, 0));
    }

    return results;
  }
}

module.exports = {
  BatchPipeline
};
