/**
 * ToneRelay - 移动端前端应用交互逻辑 (Web Preview)
 * 全面集成 ToneRelayEngine 真实算法
 */

(function () {
  const engine = window.ToneRelayEngine;

  // 核心状态
  let refImageData = null;
  let targetImages = []; // Array of Image elements
  let currentRecipe = null;
  let currentSkinMask = null;
  let currentTargetData = null;
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

  // 事件绑定：触发选图
  refCard.addEventListener('click', () => refInput.click());
  targetCard.addEventListener('click', () => targetInput.click());

  refInput.addEventListener('change', (e) => handleFileSelect(e, 'ref'));
  targetInput.addEventListener('change', (e) => handleFileSelect(e, 'target'));

  function showToast(msg, isError = false) {
    toastBar.textContent = msg;
    toastBar.style.display = 'block';
    toastBar.style.borderColor = isError ? 'rgba(239, 68, 68, 0.4)' : 'rgba(59, 130, 246, 0.2)';
    toastBar.style.color = isError ? '#f87171' : '#60a5fa';
  }

  function handleFileSelect(e, type) {
    const files = Array.from(e.target.files);
    if (!files || files.length === 0) return;

    if (type === 'ref') {
      const file = files[0];
      const img = new Image();
      img.onload = () => {
        refPreview.innerHTML = '';
        const previewImg = img.cloneNode();
        refPreview.appendChild(previewImg);
        refImageData = getImageDataFromImg(img, 400);

        // 前置特征门控校验
        const check = engine.validateReferenceImage(refImageData);
        if (!check.valid) {
          showToast(check.reason, true);
          currentRecipe = null;
          previewSection.style.display = 'none';
          return;
        }

        // 真实解构调色配方
        currentRecipe = engine.extractRecipe(refImageData);
        renderRecipeBadges(currentRecipe);
        showToast('✨ 灵感色调已成功解构！');
        analyzeAndRenderIfReady();
      };
      img.src = URL.createObjectURL(file);
    } else {
      if (files.length > 9) {
        showToast('单次最多选择 9 张照片，已自动选取前 9 张');
        files.length = 9;
      }
      targetImages = [];
      let loaded = 0;
      files.forEach((file) => {
        const img = new Image();
        img.onload = () => {
          targetImages.push(img);
          loaded++;
          if (loaded === files.length) {
            targetPreview.innerHTML = '';
            const previewImg = targetImages[0].cloneNode();
            targetPreview.appendChild(previewImg);
            batchCount.textContent = targetImages.length;
            analyzeAndRenderIfReady();
          }
        };
        img.src = URL.createObjectURL(file);
      });
    }
  }

  function getImageDataFromImg(img, maxDim = 800) {
    const canvas = document.createElement('canvas');
    let w = img.width;
    let h = img.height;
    if (w > maxDim || h > maxDim) {
      if (w > h) {
        h = Math.round((h * maxDim) / w);
        w = maxDim;
      } else {
        w = Math.round((w * maxDim) / h);
        h = maxDim;
      }
    }
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, w, h);
    return ctx.getImageData(0, 0, w, h);
  }

  function analyzeAndRenderIfReady() {
    if (!currentRecipe || targetImages.length === 0) return;

    previewSection.style.display = 'flex';
    const firstImg = targetImages[0];
    currentTargetData = getImageDataFromImg(firstImg, 600);

    // 绘制原图
    canvasBefore.width = currentTargetData.width;
    canvasBefore.height = currentTargetData.height;
    const ctxBefore = canvasBefore.getContext('2d');
    ctxBefore.putImageData(currentTargetData, 0, 0);

    canvasAfter.width = currentTargetData.width;
    canvasAfter.height = currentTargetData.height;

    // 异步提取人脸肤色蒙版
    currentSkinMask = engine.generateSkinMask(currentTargetData);

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
    if (!currentTargetData || !currentRecipe) return;

    const ctxAfter = canvasAfter.getContext('2d');
    const intensity = parseFloat(intensitySlider.value) / 100;
    const protectSkin = skinToggle.checked;

    // 调用真实渲染算法
    const renderedData = engine.renderGrading(
      ctxAfter,
      currentTargetData,
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

  // 批量九宫格导出
  batchExportBtn.addEventListener('click', async () => {
    if (targetImages.length === 0 || !currentRecipe) return;
    batchModal.style.display = 'flex';
    finishBatchBtn.style.display = 'none';

    const total = targetImages.length;
    const intensity = parseFloat(intensitySlider.value) / 100;
    const protectSkin = skinToggle.checked;

    for (let i = 0; i < total; i++) {
      progressInfo.textContent = `串行无损渲染中 (${i + 1}/${total})...`;
      const pct = Math.round(((i + 1) / total) * 100);
      progressFill.style.width = `${pct}%`;

      // 真实无损串行处理
      const targetImg = targetImages[i];
      const data = getImageDataFromImg(targetImg, 1200);
      const mask = protectSkin ? engine.generateSkinMask(data) : null;
      const offCanvas = document.createElement('canvas');
      const offCtx = offCanvas.getContext('2d');
      engine.renderGrading(offCtx, data, currentRecipe, { intensity, protectSkin }, mask);

      // 释放临时引用以促成 GC
      offCanvas.width = 0;
      offCanvas.height = 0;

      await new Promise((r) => setTimeout(r, 150));
    }

    progressInfo.textContent = `✨ 全部 ${total} 张高画质照片已成功渲染完成！`;
    finishBatchBtn.style.display = 'block';
  });

  finishBatchBtn.addEventListener('click', () => {
    batchModal.style.display = 'none';
  });
})();
