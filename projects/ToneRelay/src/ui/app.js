/**
 * ToneRelay - 移动端前端应用交互逻辑 (Web Preview)
 */

(function () {
  // 核心状态
  let refImageData = null;
  let targetImages = []; // Array of Image elements
  let currentRecipe = null;
  let skinMask = null;
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

  function showToast(msg) {
    toastBar.textContent = msg;
    toastBar.style.display = 'block';
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
        refImageData = getImageDataFromImg(img, 300);
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
    if (!refImageData || targetImages.length === 0) return;

    // 前置门控校验
    showToast('正在解析灵感色调与特征...');
    setTimeout(() => {
      // 简单模拟前置门控
      currentRecipe = {
        id: 'recipe_' + Date.now(),
        highlights: { hue: 35, saturation: 0.5, weight: 0.7 },
        shadows: { hue: 210, saturation: 0.5, weight: 0.7 },
        contrast: 1.15,
        temperature: 15,
        tint: 5,
        filmGrain: 0.15,
        vignette: 0.15,
        dominantPalette: ['#E6A268', '#7898A5', '#243447'],
        tags: ['暖阳高光', '青冷暗部', '中度胶片质感']
      };

      // 渲染风格配方
      renderRecipeBadges(currentRecipe);
      previewSection.style.display = 'flex';
      showToast('解析完成！左右滑动卷帘可对比原片与调色效果');

      renderPreviewCanvas();
    }, 300);
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

  function renderPreviewCanvas() {
    if (!targetImages[0] || !currentRecipe) return;
    const firstImg = targetImages[0];
    const targetData = getImageDataFromImg(firstImg, 600);

    canvasBefore.width = targetData.width;
    canvasBefore.height = targetData.height;
    const ctxBefore = canvasBefore.getContext('2d');
    ctxBefore.putImageData(targetData, 0, 0);

    canvasAfter.width = targetData.width;
    canvasAfter.height = targetData.height;
    const ctxAfter = canvasAfter.getContext('2d');

    // 调色渲染计算 (前端即时渲染)
    const intensity = parseFloat(intensitySlider.value) / 100;
    const protectSkin = skinToggle.checked;

    // 创建渲染副本
    const outData = ctxAfter.createImageData(targetData.width, targetData.height);
    const src = targetData.data;
    const dst = outData.data;

    for (let i = 0; i < src.length; i += 4) {
      let r = src[i];
      let g = src[i + 1];
      let b = src[i + 2];
      const a = src[i + 3];

      // 简易色彩调色逻辑：增加对比、暖高光冷暗部
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      let styledR = r + (lum > 128 ? 20 : -10);
      let styledG = g + (lum > 128 ? 10 : 5);
      let styledB = b + (lum > 128 ? -15 : 25);

      // 肤色保护
      if (protectSkin && r > g && g > b && (r - g) > 15) {
        styledR = styledR * 0.2 + r * 0.8;
        styledG = styledG * 0.2 + g * 0.8;
        styledB = styledB * 0.2 + b * 0.8;
      }

      dst[i] = Math.max(0, Math.min(255, Math.round(r * (1 - intensity) + styledR * intensity)));
      dst[i + 1] = Math.max(0, Math.min(255, Math.round(g * (1 - intensity) + styledG * intensity)));
      dst[i + 2] = Math.max(0, Math.min(255, Math.round(b * (1 - intensity) + styledB * intensity)));
      dst[i + 3] = a;
    }
    ctxAfter.putImageData(outData, 0, 0);
  }

  // 强度滑块调节
  intensitySlider.addEventListener('input', (e) => {
    intensityText.textContent = `${e.target.value}%`;
    renderPreviewCanvas();
  });

  skinToggle.addEventListener('change', () => {
    renderPreviewCanvas();
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
    const name = prompt('为您的专属滤镜起个名字：', '秋日日落电影感');
    if (name) {
      alert(`🎉 已成功保存滤镜【${name}】至您的专属滤镜库！`);
    }
  });

  // 批量九宫格导出
  batchExportBtn.addEventListener('click', async () => {
    if (targetImages.length === 0) return;
    batchModal.style.display = 'flex';
    finishBatchBtn.style.display = 'none';

    const total = targetImages.length;
    for (let i = 0; i < total; i++) {
      progressInfo.textContent = `串行无损渲染中 (${i + 1}/${total})...`;
      const pct = Math.round(((i + 1) / total) * 100);
      progressFill.style.width = `${pct}%`;
      // 模拟每张渲染与保存耗时
      await new Promise((r) => setTimeout(r, 400));
    }

    progressInfo.textContent = `✨ 恭喜！全部 ${total} 张高清照片已成功写入手机相册`;
    finishBatchBtn.style.display = 'block';
  });

  finishBatchBtn.addEventListener('click', () => {
    batchModal.style.display = 'none';
  });
})();
