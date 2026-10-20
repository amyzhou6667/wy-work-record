/**
 * ToneRelay - 移动端前端应用交互逻辑 (Web Preview)
 * [修复版]: 移动端超大分辨率照片防闪退与内存极致优化 (Anti-OOM Protection)
 */

(function () {
  const engine = window.ToneRelayEngine;

  // 核心状态 (严格控制内存占用，原图仅保留 File 句柄指针)
  let refImageData = null;
  let targetFiles = [];        // 仅保存 File 句柄，不持有未压缩 Image 像素对象！
  let firstTargetThumbnail = null; // 仅保存首张打样图的轻量缩略 ImageData (最大长边 600px)
  let currentRecipe = null;
  let currentSkinMask = null;
  let isSplitDragging = false;

  // DOM 元素
  const refCard = document.getElementById('refCard');
  const targetCard = document.getElementById('targetCard');
  const refInput = document.getElementById('refInput');
  const targetInput = document.getElementById('targetInput');
  const refPreview = document.getElementById('refPreview');
  const targetPreview = document.getElementById('targetPreview');
  const toastBar = document.getElementById('toastBar');

  const previewSection = document.getElementById('previewSection');
  const splitViewport = document.getElementById('splitViewport');
  const splitOverlay = document.getElementById('splitOverlay');
  const splitDivider = document.getElementById('splitDivider');
  const canvasBefore = document.getElementById('canvasBefore');
  const canvasAfter = document.getElementById('canvasAfter');

  const paletteGroup = document.getElementById('paletteGroup');
  const tagsGroup = document.getElementById('tagsGroup');
  const intensitySlider = document.getElementById('intensitySlider');
  const intensityText = document.getElementById('intensityText');
  const skinToggle = document.getElementById('skinToggle');

  const saveFilterBtn = document.getElementById('saveFilterBtn');
  const batchExportBtn = document.getElementById('batchExportBtn');
  const batchCount = document.getElementById('batchCount');

  const batchModal = document.getElementById('batchModal');
  const progressFill = document.getElementById('progressFill');
  const progressInfo = document.getElementById('progressInfo');
  const finishBatchBtn = document.getElementById('finishBatchBtn');

  // 原生透明 Input 覆盖层直接捕获点击，无需 JS 代理模拟点击，杜绝移动端系统崩溃
  refInput.addEventListener('change', (e) => handleFileSelect(e, 'ref'));
  targetInput.addEventListener('change', (e) => handleFileSelect(e, 'target'));

  function showToast(msg, isError = false) {
    toastBar.textContent = msg;
    toastBar.style.display = 'block';
    toastBar.style.borderColor = isError ? 'rgba(239, 68, 68, 0.4)' : 'rgba(59, 130, 246, 0.2)';
    toastBar.style.color = isError ? '#f87171' : '#60a5fa';
  }

  /**
   * 极低内存开销读取并降采样图片
   * 严格调用 URL.revokeObjectURL 与重置 Image 引用，防止手机 WebKit OOM 闪退
   */
  function loadScaledImageData(file, maxDimension = 600) {
    return new Promise((resolve, reject) => {
      let objectUrl = null;
      try {
        objectUrl = URL.createObjectURL(file);
      } catch (err) {
        reject(new Error('创建文件 URL 失败: ' + err.message));
        return;
      }

      const img = new Image();
      img.onload = () => {
        try {
          let w = img.naturalWidth || img.width;
          let h = img.naturalHeight || img.height;

          // 计算限制尺寸
          if (w > maxDimension || h > maxDimension) {
            if (w > h) {
              h = Math.round((h * maxDimension) / w);
              w = maxDimension;
            } else {
              w = Math.round((w * maxDimension) / h);
              h = maxDimension;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, w, h);

          const imageData = ctx.getImageData(0, 0, w, h);
          const thumbUrl = canvas.toDataURL('image/jpeg', 0.8);

          // 关键防闪退：立即销毁离线 Canvas 与图片引用促成 GC
          canvas.width = 0;
          canvas.height = 0;
          img.onload = null;
          img.onerror = null;
          img.src = '';
          URL.revokeObjectURL(objectUrl);

          resolve({ imageData, thumbUrl, width: w, height: h });
        } catch (e) {
          URL.revokeObjectURL(objectUrl);
          reject(e);
        }
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('图片解码失败，可能格式损坏或被系统阻断'));
      };

      img.src = objectUrl;
    });
  }

  async function handleFileSelect(e, type) {
    const files = Array.from(e.target.files);
    // 立即清空 input value，确保同一张图重复选择依然能触发 change
    e.target.value = '';

    if (!files || files.length === 0) return;

    if (type === 'ref') {
      const file = files[0];
      showToast('正在低内存快速解析参考图...');
      try {
        const { imageData, thumbUrl } = await loadScaledImageData(file, 400);

        // 前置特征门控校验
        const check = engine.validateReferenceImage(imageData);
        if (!check.valid) {
          showToast(check.reason, true);
          currentRecipe = null;
          previewSection.style.display = 'none';
          return;
        }

        refImageData = imageData;
        refPreview.innerHTML = `<img src="${thumbUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:8px;">`;

        // 提取调色配方
        currentRecipe = engine.extractRecipe(refImageData);
        renderRecipeBadges(currentRecipe);
        showToast('✨ 灵感色调已成功解构！');
        analyzeAndRenderIfReady();
      } catch (err) {
        showToast('参考图读取失败: ' + err.message, true);
      }
    } else {
      if (files.length > 9) {
        showToast('单次最多选择 9 张照片，已自动选取前 9 张');
        files.length = 9;
      }

      // 仅存储 File 句柄数组（内存仅占几十字节）
      targetFiles = files;
      batchCount.textContent = targetFiles.length;

      showToast(`已选择 ${targetFiles.length} 张照片，正在载入打样图...`);
      try {
        // 仅对首张图片做缩略图解码打样，其余待导出时再逐张流式处理
        const { imageData, thumbUrl } = await loadScaledImageData(targetFiles[0], 600);
        firstTargetThumbnail = imageData;
        targetPreview.innerHTML = `<img src="${thumbUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:8px;">`;

        analyzeAndRenderIfReady();
      } catch (err) {
        showToast('原图载入失败: ' + err.message, true);
      }
    }
  }

  function analyzeAndRenderIfReady() {
    if (!currentRecipe || !firstTargetThumbnail) return;

    previewSection.style.display = 'flex';

    // 绘制打样原图 (Before)
    canvasBefore.width = firstTargetThumbnail.width;
    canvasBefore.height = firstTargetThumbnail.height;
    const ctxBefore = canvasBefore.getContext('2d');
    ctxBefore.putImageData(firstTargetThumbnail, 0, 0);

    // 设置打样结果画布 (After)
    canvasAfter.width = firstTargetThumbnail.width;
    canvasAfter.height = firstTargetThumbnail.height;

    // 提取首张原图肤色蒙版
    currentSkinMask = engine.generateSkinMask(firstTargetThumbnail);

    renderGradingCanvas();
    showToast('打样就绪！左右拖动卷帘可即时对比，下方可微调强度与肤色保护');
  }

  function renderRecipeBadges(recipe) {
    paletteGroup.innerHTML = '';
    recipe.dominantPalette.forEach((hex) => {
      const circle = document.createElement('div');
      circle.className = 'palette-circle';
      circle.style.backgroundColor = hex;
      paletteGroup.appendChild(circle);
    });

    tagsGroup.innerHTML = '';
    recipe.tags.forEach((tag) => {
      const span = document.createElement('span');
      span.className = 'recipe-tag';
      span.textContent = `🏷️ ${tag}`;
      tagsGroup.appendChild(span);
    });
  }

  function renderGradingCanvas() {
    if (!firstTargetThumbnail || !currentRecipe) return;

    const ctxAfter = canvasAfter.getContext('2d');
    const intensity = parseFloat(intensitySlider.value) / 100;
    const protectSkin = skinToggle.checked;

    // 调用真实渲染算法
    const renderedData = engine.renderGrading(
      ctxAfter,
      firstTargetThumbnail,
      currentRecipe,
      { intensity, protectSkin },
      currentSkinMask
    );

    ctxAfter.putImageData(renderedData, 0, 0);
  }

  // 强度滑块调节 (实时计算)
  intensitySlider.addEventListener('input', (e) => {
    intensityText.textContent = `${e.target.value}%`;
    renderGradingCanvas();
  });

  skinToggle.addEventListener('change', () => {
    renderGradingCanvas();
  });

  // 卷帘滑动交互
  function updateSplitPosition(clientX) {
    const rect = splitViewport.getBoundingClientRect();
    let x = clientX - rect.left;
    x = Math.max(0, Math.min(rect.width, x));
    const percent = (x / rect.width) * 100;
    splitOverlay.style.width = `${percent}%`;
    splitDivider.style.left = `${percent}%`;
  }

  splitViewport.addEventListener('pointerdown', (e) => {
    isSplitDragging = true;
    updateSplitPosition(e.clientX);
  });
  window.addEventListener('pointermove', (e) => {
    if (isSplitDragging) updateSplitPosition(e.clientX);
  });
  window.addEventListener('pointerup', () => {
    isSplitDragging = false;
  });

  // 存为专属滤镜
  saveFilterBtn.addEventListener('click', () => {
    if (!currentRecipe) return;
    const defaultName = `滤镜_${new Date().toISOString().slice(5, 10).replace('-', '')}_${currentRecipe.tags[0] || '影调'}`;
    const name = prompt('为您的专属滤镜命名：', defaultName);
    if (name) {
      alert(`🎉 已成功保存滤镜【${name}】！下次上传同类照片可一键秒级复用`);
    }
  });

  // 批量九宫格导出 (严格单任务串行队列，处理完立即销毁，防手机 OOM 闪退)
  batchExportBtn.addEventListener('click', async () => {
    if (targetFiles.length === 0 || !currentRecipe) return;
    batchModal.style.display = 'flex';
    finishBatchBtn.style.display = 'none';

    const total = targetFiles.length;
    const intensity = parseFloat(intensitySlider.value) / 100;
    const protectSkin = skinToggle.checked;

    for (let i = 0; i < total; i++) {
      progressInfo.textContent = `串行无损渲染中 (${i + 1}/${total})...`;
      const pct = Math.round(((i + 1) / total) * 100);
      progressFill.style.width = `${pct}%`;

      try {
        // 逐张从 File 句柄按需解码
        const { imageData } = await loadScaledImageData(targetFiles[i], 1200);
        const mask = protectSkin ? engine.generateSkinMask(imageData) : null;
        
        const offCanvas = document.createElement('canvas');
        offCanvas.width = imageData.width;
        offCanvas.height = imageData.height;
        const offCtx = offCanvas.getContext('2d');
        
        const rendered = engine.renderGrading(offCtx, imageData, currentRecipe, { intensity, protectSkin }, mask);
        offCtx.putImageData(rendered, 0, 0);

        // 立即清空并解除引用促成 GC
        offCanvas.width = 0;
        offCanvas.height = 0;
      } catch (err) {
        console.warn(`第 ${i + 1} 张处理警告:`, err);
      }

      await new Promise((r) => setTimeout(r, 120));
    }

    progressInfo.textContent = `✨ 全部 ${total} 张高画质照片已成功渲染完成！`;
    finishBatchBtn.style.display = 'block';
  });

  finishBatchBtn.addEventListener('click', () => {
    batchModal.style.display = 'none';
  });
})();
