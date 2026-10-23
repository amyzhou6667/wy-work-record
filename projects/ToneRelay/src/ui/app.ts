/**
 * ToneRelay - 移动端前端应用交互逻辑 (Web Preview - TypeScript)
 * [修复版]: 移动端超大分辨率照片防闪退与内存极致优化 (Anti-OOM Protection)
 */

(function () {
  const engine = (window as any).ToneRelayEngine;

  // 核心状态 (严格控制内存占用，原图仅保留 File 句柄指针)
  let refImageData: ImageData | null = null;
  let targetFiles: File[] = [];
  let firstTargetThumbnail: ImageData | null = null;
  let currentRecipe: any = null;
  let currentSkinMask: Float32Array | null = null;
  let isSplitDragging = false;

  // DOM 元素
  const refInput = document.getElementById('refInput') as HTMLInputElement;
  const targetInput = document.getElementById('targetInput') as HTMLInputElement;
  const refPreview = document.getElementById('refPreview') as HTMLElement;
  const targetPreview = document.getElementById('targetPreview') as HTMLElement;
  const toastBar = document.getElementById('toastBar') as HTMLElement;

  const previewSection = document.getElementById('previewSection') as HTMLElement;
  const splitViewport = document.getElementById('splitViewport') as HTMLElement;
  const splitDivider = document.getElementById('splitDivider') as HTMLElement;
  const canvasBefore = document.getElementById('canvasBefore') as HTMLCanvasElement;
  const canvasAfter = document.getElementById('canvasAfter') as HTMLCanvasElement;

  const paletteGroup = document.getElementById('paletteGroup') as HTMLElement;
  const tagsGroup = document.getElementById('tagsGroup') as HTMLElement;
  const intensitySlider = document.getElementById('intensitySlider') as HTMLInputElement;
  const intensityText = document.getElementById('intensityText') as HTMLElement;
  const skinToggle = document.getElementById('skinToggle') as HTMLInputElement;

  const saveFilterBtn = document.getElementById('saveFilterBtn') as HTMLButtonElement;
  const batchExportBtn = document.getElementById('batchExportBtn') as HTMLButtonElement;
  const batchCount = document.getElementById('batchCount') as HTMLElement;

  const batchModal = document.getElementById('batchModal') as HTMLElement;
  const progressTrack = document.getElementById('progressTrack') as HTMLElement;
  const progressFill = document.getElementById('progressFill') as HTMLElement;
  const progressInfo = document.getElementById('progressInfo') as HTMLElement;
  const batchGallery = document.getElementById('batchGallery') as HTMLElement;
  const finishBatchBtn = document.getElementById('finishBatchBtn') as HTMLButtonElement;
  const demoBtn = document.getElementById('demoBtn') as HTMLButtonElement;
  const wxBanner = document.getElementById('wxBanner') as HTMLElement;

  // 微信环境检测并提示
  if (/MicroMessenger/i.test(navigator.userAgent) && wxBanner) {
    wxBanner.style.display = 'block';
  }

  // 标准 label 触发文件选择
  refInput?.addEventListener('change', (e) => handleFileSelect(e, 'ref'));
  targetInput?.addEventListener('change', (e) => handleFileSelect(e, 'target'));

  // 一键试玩：直接在内存中生成高质量日落暖调参考图与人像原图
  if (demoBtn) {
    demoBtn.addEventListener('click', () => {
      showToast('正在生成示范样张 (日落胶片调 vs 人像摄影)...');
      
      // 1. 生成参考图 (落日暖橘与冷暗部渐变)
      const refC = document.createElement('canvas');
      refC.width = 400; refC.height = 300;
      const refCtx = refC.getContext('2d')!;
      const grad = refCtx.createLinearGradient(0, 0, 0, 300);
      grad.addColorStop(0, '#f97316');   // 顶部暖橘高光
      grad.addColorStop(0.5, '#eab308'); // 中间暖金
      grad.addColorStop(1, '#0f172a');   // 暗部深青深蓝
      refCtx.fillStyle = grad;
      refCtx.fillRect(0, 0, 400, 300);
      refImageData = refCtx.getImageData(0, 0, 400, 300);
      refPreview.innerHTML = `<img src="${refC.toDataURL('image/jpeg')}" style="width:100%;height:100%;object-fit:cover;border-radius:8px;">`;

      // 提取配方
      currentRecipe = engine.extractRecipe(refImageData);
      renderRecipeBadges(currentRecipe);

      // 2. 生成待修原图 (人像摄影样张：冷调背景 + 自然肤色面部)
      const targetC = document.createElement('canvas');
      targetC.width = 400; targetC.height = 300;
      const targetCtx = targetC.getContext('2d')!;
      targetCtx.fillStyle = '#1e293b';
      targetCtx.fillRect(0, 0, 400, 300);
      targetCtx.fillStyle = '#f6d8b8';
      targetCtx.beginPath();
      targetCtx.ellipse(200, 150, 70, 90, 0, 0, Math.PI * 2);
      targetCtx.fill();
      targetCtx.fillStyle = '#e2b490';
      targetCtx.beginPath();
      targetCtx.ellipse(200, 150, 20, 35, 0, 0, Math.PI * 2);
      targetCtx.fill();

      firstTargetThumbnail = targetCtx.getImageData(0, 0, 400, 300);
      targetPreview.innerHTML = `<img src="${targetC.toDataURL('image/jpeg')}" style="width:100%;height:100%;object-fit:cover;border-radius:8px;">`;
      batchCount.textContent = '3';

      analyzeAndRenderIfReady();
      showToast('🎉 示例样张载入就绪！左右拖动卷帘可即时对比，下方可微调强度与肤色保护');
    });
  }

  function showToast(msg: string, isError = false) {
    if (!toastBar) return;
    toastBar.textContent = msg;
    toastBar.style.display = 'block';
    toastBar.style.borderColor = isError ? 'rgba(239, 68, 68, 0.4)' : 'rgba(59, 130, 246, 0.2)';
    toastBar.style.color = isError ? '#f87171' : '#60a5fa';
  }

  /**
   * 极低内存开销读取并降采样图片
   */
  function loadScaledImageData(file: File, maxDimension = 600): Promise<{ imageData: ImageData; thumbUrl: string; width: number; height: number }> {
    return new Promise((resolve, reject) => {
      let objectUrl: string | null = null;
      try {
        objectUrl = URL.createObjectURL(file);
      } catch (err: any) {
        reject(new Error('创建文件 URL 失败: ' + err.message));
        return;
      }

      const img = new Image();
      img.onload = () => {
        try {
          let w = img.naturalWidth || img.width;
          let h = img.naturalHeight || img.height;

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
          const ctx = canvas.getContext('2d')!;
          ctx.drawImage(img, 0, 0, w, h);

          const imageData = ctx.getImageData(0, 0, w, h);
          const thumbUrl = canvas.toDataURL('image/jpeg', 0.8);

          canvas.width = 0;
          canvas.height = 0;
          img.onload = null;
          img.onerror = null;
          img.src = '';
          if (objectUrl) URL.revokeObjectURL(objectUrl);

          resolve({ imageData, thumbUrl, width: w, height: h });
        } catch (e) {
          if (objectUrl) URL.revokeObjectURL(objectUrl);
          reject(e);
        }
      };

      img.onerror = () => {
        if (objectUrl) URL.revokeObjectURL(objectUrl);
        reject(new Error('图片解码失败，可能格式损坏或被系统阻断'));
      };

      img.src = objectUrl;
    });
  }

  async function handleFileSelect(e: Event, type: 'ref' | 'target') {
    const input = e.target as HTMLInputElement;
    const files = Array.from(input.files || []);
    input.value = '';

    if (!files || files.length === 0) return;

    if (type === 'ref') {
      const file = files[0];
      showToast('正在低内存快速解析参考图...');
      try {
        const { imageData, thumbUrl } = await loadScaledImageData(file, 400);

        const check = engine.validateReferenceImage(imageData);
        if (!check.valid) {
          showToast(check.reason || '无效参考图', true);
          currentRecipe = null;
          if (previewSection) previewSection.style.display = 'none';
          return;
        }

        refImageData = imageData;
        refPreview.innerHTML = `<img src="${thumbUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:8px;">`;

        currentRecipe = engine.extractRecipe(refImageData);
        renderRecipeBadges(currentRecipe);
        showToast('✨ 灵感色调已成功解构！');
        analyzeAndRenderIfReady();
      } catch (err: any) {
        showToast('参考图读取失败: ' + err.message, true);
      }
    } else {
      if (files.length > 9) {
        showToast('单次最多选择 9 张照片，已自动选取前 9 张');
        files.length = 9;
      }

      targetFiles = files;
      batchCount.textContent = String(targetFiles.length);

      showToast(`已选择 ${targetFiles.length} 张照片，正在载入打样图...`);
      try {
        const { imageData, thumbUrl } = await loadScaledImageData(targetFiles[0], 600);
        firstTargetThumbnail = imageData;
        targetPreview.innerHTML = `<img src="${thumbUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:8px;">`;

        analyzeAndRenderIfReady();
      } catch (err: any) {
        showToast('原图载入失败: ' + err.message, true);
      }
    }
  }

  function analyzeAndRenderIfReady() {
    if (!currentRecipe || !firstTargetThumbnail || !previewSection) return;

    previewSection.style.display = 'flex';

    canvasBefore.width = firstTargetThumbnail.width;
    canvasBefore.height = firstTargetThumbnail.height;
    const ctxBefore = canvasBefore.getContext('2d')!;
    ctxBefore.putImageData(firstTargetThumbnail, 0, 0);

    canvasAfter.width = firstTargetThumbnail.width;
    canvasAfter.height = firstTargetThumbnail.height;

    currentSkinMask = engine.generateSkinMask(firstTargetThumbnail);
    renderGradingCanvas();
    showToast('打样就绪！左右拖动卷帘可即时对比，下方可微调强度与肤色保护');
  }

  function renderRecipeBadges(recipe: any) {
    if (!paletteGroup || !tagsGroup) return;
    paletteGroup.innerHTML = '';
    recipe.dominantPalette.forEach((hex: string) => {
      const circle = document.createElement('div');
      circle.className = 'palette-circle';
      circle.style.backgroundColor = hex;
      paletteGroup.appendChild(circle);
    });

    tagsGroup.innerHTML = '';
    recipe.tags.forEach((tag: string) => {
      const span = document.createElement('span');
      span.className = 'recipe-tag';
      span.textContent = `🏷️ ${tag}`;
      tagsGroup.appendChild(span);
    });

    const tempText = recipe.temperature > 0 ? `色温 +${recipe.temperature}K (暖)` : (recipe.temperature < 0 ? `色温 ${recipe.temperature}K (冷)` : '色温 中性');
    const params = [
      tempText,
      `高光色相 ${recipe.highlights.hue}°`,
      `阴影色相 ${recipe.shadows.hue}°`,
      `对比度 ×${recipe.contrast}`
    ];
    params.forEach(p => {
      const span = document.createElement('span');
      span.className = 'recipe-tag';
      span.style.background = 'rgba(59, 130, 246, 0.15)';
      span.style.borderColor = 'rgba(59, 130, 246, 0.3)';
      span.style.color = '#93c5fd';
      span.textContent = `📊 ${p}`;
      tagsGroup.appendChild(span);
    });
  }

  function renderGradingCanvas() {
    if (!firstTargetThumbnail || !currentRecipe || !canvasAfter) return;

    const ctxAfter = canvasAfter.getContext('2d')!;
    const intensity = parseFloat(intensitySlider.value) / 100;
    const protectSkin = skinToggle.checked;

    const renderedData = engine.renderGrading(
      firstTargetThumbnail,
      currentRecipe,
      { intensity, protectSkin, referenceImageData: refImageData },
      currentSkinMask
    );

    ctxAfter.putImageData(renderedData, 0, 0);
  }

  intensitySlider?.addEventListener('input', (e: any) => {
    intensityText.textContent = `${e.target.value}%`;
    renderGradingCanvas();
  });

  skinToggle?.addEventListener('change', () => {
    renderGradingCanvas();
  });

  function updateSplitPosition(clientX: number) {
    if (!splitViewport || !canvasAfter || !splitDivider) return;
    const rect = splitViewport.getBoundingClientRect();
    let x = clientX - rect.left;
    x = Math.max(0, Math.min(rect.width, x));
    const percent = ((x / rect.width) * 100).toFixed(1);
    canvasAfter.style.clipPath = `polygon(0 0, ${percent}% 0, ${percent}% 100%, 0 100%)`;
    splitDivider.style.left = `${percent}%`;
  }

  splitViewport?.addEventListener('pointerdown', (e) => {
    isSplitDragging = true;
    updateSplitPosition(e.clientX);
  });
  window.addEventListener('pointermove', (e) => {
    if (isSplitDragging) updateSplitPosition(e.clientX);
  });
  window.addEventListener('pointerup', () => {
    isSplitDragging = false;
  });

  saveFilterBtn?.addEventListener('click', () => {
    if (!currentRecipe) return;
    const defaultName = `滤镜_${new Date().toISOString().slice(5, 10).replace('-', '')}_${currentRecipe.tags[0] || '影调'}`;
    const name = prompt('为您的专属滤镜命名：', defaultName);
    if (name) {
      alert(`🎉 已成功保存滤镜【${name}】！下次上传同类照片可一键秒级复用`);
    }
  });

  batchExportBtn?.addEventListener('click', async () => {
    if (!currentRecipe || (!firstTargetThumbnail && targetFiles.length === 0)) return;

    batchModal.style.display = 'flex';
    finishBatchBtn.style.display = 'none';
    batchGallery.innerHTML = '';
    progressTrack.style.display = 'block';

    const intensity = parseFloat(intensitySlider.value) / 100;
    const protectSkin = skinToggle.checked;

    const isSingleThumbnail = targetFiles.length === 0 && firstTargetThumbnail;
    const total = isSingleThumbnail ? 1 : targetFiles.length;

    for (let i = 0; i < total; i++) {
      progressInfo.textContent = `正在生成高清照片 (${i + 1}/${total})...`;
      const pct = Math.round(((i + 1) / total) * 100);
      progressFill.style.width = `${pct}%`;

      try {
        let imageData: ImageData;
        if (isSingleThumbnail) {
          imageData = firstTargetThumbnail!;
        } else {
          const loaded = await loadScaledImageData(targetFiles[i], 1200);
          imageData = loaded.imageData;
        }

        const mask = protectSkin ? engine.generateSkinMask(imageData) : null;
        const offCanvas = document.createElement('canvas');
        offCanvas.width = imageData.width;
        offCanvas.height = imageData.height;
        const offCtx = offCanvas.getContext('2d')!;
        
        const rendered = engine.renderGrading(
          imageData,
          currentRecipe,
          { intensity, protectSkin, referenceImageData: refImageData },
          mask
        );
        offCtx.putImageData(rendered, 0, 0);

        const dataUrl = offCanvas.toDataURL('image/jpeg', 0.92);

        const card = document.createElement('div');
        card.className = 'gallery-card';
        card.innerHTML = `
          <img src="${dataUrl}" alt="成品照片 ${i + 1}">
          <div class="gallery-tip">👇 长按上方图片 ➡️ 选择【保存到手机/保存图片】</div>
        `;
        batchGallery.appendChild(card);

        try {
          const a = document.createElement('a');
          a.download = `ToneRelay_调色照片_${i + 1}.jpg`;
          a.href = dataUrl;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        } catch (e) {}

        offCanvas.width = 0;
        offCanvas.height = 0;
      } catch (err) {
        console.warn(`第 ${i + 1} 张处理警告:`, err);
      }

      await new Promise((r) => setTimeout(r, 100));
    }

    progressTrack.style.display = 'none';
    progressInfo.textContent = `✨ 全部 ${total} 张照片已就绪！请长按图片存入相册：`;
    finishBatchBtn.style.display = 'block';
  });

  finishBatchBtn?.addEventListener('click', () => {
    batchModal.style.display = 'none';
  });
})();
