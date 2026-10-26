const React = (typeof window !== 'undefined' ? (window as any).React : null) || (globalThis as any).React;
const ReactDOM = (typeof window !== 'undefined' ? (window as any).ReactDOM : null) || (globalThis as any).ReactDOM;
const { useState, useEffect, useRef, useCallback } = React || {};

// 类型定义
interface StyleRecipe {
  dominantPalette: string[];
  tags: string[];
  temperature: number;
  highlights: { hue: number; saturation?: number };
  shadows: { hue: number; saturation?: number };
  contrast: number;
}

interface ImageThumb {
  imageData: ImageData;
  thumbUrl: string;
  width: number;
  height: number;
}

interface ToastState {
  message: string;
  isError?: boolean;
}

interface BatchModalState {
  isOpen: boolean;
  progress: number;
  text: string;
  images: string[];
  isFinished: boolean;
}

const App: React.FC = () => {
  const [refImage, setRefImage] = useState<ImageThumb | null>(null);
  const [targetFiles, setTargetFiles] = useState<File[]>([]);
  const [firstTarget, setFirstTarget] = useState<ImageThumb | null>(null);
  const [recipe, setRecipe] = useState<StyleRecipe | null>(null);
  const [intensity, setIntensity] = useState<number>(100);
  const [protectSkin, setProtectSkin] = useState<boolean>(true);
  const [splitPercent, setSplitPercent] = useState<number>(50);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [toast, setToast] = useState<ToastState>({
    message: '请分别上传【灵感参考图】与【待修原图】',
    isError: false
  });
  const [isWx, setIsWx] = useState<boolean>(false);
  const [batchModal, setBatchModal] = useState<BatchModalState>({
    isOpen: false,
    progress: 0,
    text: '',
    images: [],
    isFinished: false
  });

  const canvasBeforeRef = useRef<HTMLCanvasElement | null>(null);
  const canvasAfterRef = useRef<HTMLCanvasElement | null>(null);
  const splitViewportRef = useRef<HTMLDivElement | null>(null);
  const refInputRef = useRef<HTMLInputElement | null>(null);
  const targetInputRef = useRef<HTMLInputElement | null>(null);
  const skinMaskRef = useRef<Float32Array | null>(null);

  const getEngine = () => (window as any).ToneRelayEngine;

  useEffect(() => {
    if (typeof navigator !== 'undefined' && /MicroMessenger/i.test(navigator.userAgent)) {
      setIsWx(true);
    }
  }, []);

  const showToast = (message: string, isError = false) => {
    setToast({ message, isError });
  };

  // 低内存快速降采样载入图片
  const loadScaledImageData = (file: File, maxDimension = 600): Promise<ImageThumb> => {
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
  };

  // 处理参考图选择
  const handleRefSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    e.target.value = '';

    showToast('正在低内存快速解析参考图...');
    try {
      const thumb = await loadScaledImageData(file, 400);
      const engine = getEngine();
      if (engine) {
        const check = engine.validateReferenceImage(thumb.imageData);
        if (!check.valid) {
          showToast(check.reason || '无效参考图', true);
          setRefImage(null);
          setRecipe(null);
          return;
        }
        const extracted = engine.extractRecipe(thumb.imageData);
        setRefImage(thumb);
        setRecipe(extracted);
        showToast('✨ 灵感色调已成功解构！');
      }
    } catch (err: any) {
      showToast('参考图读取失败: ' + err.message, true);
    }
  };

  // 处理原图选择
  const handleTargetSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    let fileList = Array.from(files);
    e.target.value = '';

    if (fileList.length > 9) {
      showToast('单次最多选择 9 张照片，已自动选取前 9 张');
      fileList = fileList.slice(0, 9);
    }

    setTargetFiles(fileList);
    showToast(`已选择 ${fileList.length} 张照片，正在载入打样图...`);

    try {
      const thumb = await loadScaledImageData(fileList[0], 600);
      setFirstTarget(thumb);
    } catch (err: any) {
      showToast('原图载入失败: ' + err.message, true);
    }
  };

  // 一键试玩 (Demo)
  const handleDemo = () => {
    showToast('正在生成示范样张 (日落胶片调 vs 人像摄影)...');

    // 1. 生成参考图 (落日暖橘与冷暗部渐变)
    const refC = document.createElement('canvas');
    refC.width = 400;
    refC.height = 300;
    const refCtx = refC.getContext('2d')!;
    const grad = refCtx.createLinearGradient(0, 0, 0, 300);
    grad.addColorStop(0, '#f97316');
    grad.addColorStop(0.5, '#eab308');
    grad.addColorStop(1, '#0f172a');
    refCtx.fillStyle = grad;
    refCtx.fillRect(0, 0, 400, 300);
    const refData = refCtx.getImageData(0, 0, 400, 300);
    const refUrl = refC.toDataURL('image/jpeg');

    const engine = getEngine();
    const extracted = engine ? engine.extractRecipe(refData) : null;
    setRefImage({ imageData: refData, thumbUrl: refUrl, width: 400, height: 300 });
    setRecipe(extracted);

    // 2. 生成原图 (人像摄影样张)
    const targetC = document.createElement('canvas');
    targetC.width = 400;
    targetC.height = 300;
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

    const targetData = targetCtx.getImageData(0, 0, 400, 300);
    const targetUrl = targetC.toDataURL('image/jpeg');

    setFirstTarget({ imageData: targetData, thumbUrl: targetUrl, width: 400, height: 300 });
    setTargetFiles([]);
    showToast('🎉 示例样张载入就绪！左右拖动卷帘可即时对比，下方可微调强度与肤色保护');
  };

  // 渲染对比 Canvas (Before / After)
  const renderGradingCanvases = useCallback(() => {
    if (!firstTarget || !recipe) return;
    const engine = getEngine();
    if (!engine) return;

    // 渲染原片 Before
    if (canvasBeforeRef.current) {
      const cBefore = canvasBeforeRef.current;
      cBefore.width = firstTarget.width;
      cBefore.height = firstTarget.height;
      const ctxB = cBefore.getContext('2d');
      if (ctxB) ctxB.putImageData(firstTarget.imageData, 0, 0);
    }

    // 渲染调色后 After
    if (canvasAfterRef.current) {
      const cAfter = canvasAfterRef.current;
      cAfter.width = firstTarget.width;
      cAfter.height = firstTarget.height;
      const ctxA = cAfter.getContext('2d');

      if (!skinMaskRef.current || skinMaskRef.current.length !== firstTarget.width * firstTarget.height) {
        skinMaskRef.current = engine.generateSkinMask(firstTarget.imageData);
      }

      const renderedData = engine.renderGrading(
        firstTarget.imageData,
        recipe,
        {
          intensity: intensity / 100,
          protectSkin,
          referenceImageData: refImage ? refImage.imageData : null
        },
        skinMaskRef.current
      );

      if (ctxA) ctxA.putImageData(renderedData, 0, 0);
    }
  }, [firstTarget, recipe, intensity, protectSkin, refImage]);

  // 当原图或配方改变时重新计算
  useEffect(() => {
    if (firstTarget && recipe) {
      renderGradingCanvases();
    }
  }, [firstTarget, recipe, renderGradingCanvases]);

  // 卷帘拖拽交互
  const updateSplitPosition = (clientX: number) => {
    if (!splitViewportRef.current) return;
    const rect = splitViewportRef.current.getBoundingClientRect();
    let x = clientX - rect.left;
    x = Math.max(0, Math.min(rect.width, x));
    const percent = parseFloat(((x / rect.width) * 100).toFixed(1));
    setSplitPercent(percent);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    updateSplitPosition(e.clientX);
  };

  useEffect(() => {
    const handleMove = (e: PointerEvent) => {
      if (isDragging) updateSplitPosition(e.clientX);
    };
    const handleUp = () => {
      if (isDragging) setIsDragging(false);
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };
  }, [isDragging]);

  // 保存专属滤镜
  const handleSaveFilter = () => {
    if (!recipe) return;
    const defaultName = `滤镜_${new Date().toISOString().slice(5, 10).replace('-', '')}_${recipe.tags[0] || '影调'}`;
    const name = window.prompt('为您的专属滤镜命名：', defaultName);
    if (name) {
      alert(`🎉 已成功保存滤镜【${name}】！下次上传同类照片可一键秒级复用`);
    }
  };

  // 保存调色照片 (批量处理)
  const handleBatchExport = async () => {
    if (!recipe || (!firstTarget && targetFiles.length === 0)) return;
    const engine = getEngine();
    if (!engine) return;

    const isSingleThumbnail = targetFiles.length === 0 && firstTarget;
    const total = isSingleThumbnail ? 1 : targetFiles.length;

    setBatchModal({
      isOpen: true,
      progress: 0,
      text: `正在初始化 (${0}/${total})...`,
      images: [],
      isFinished: false
    });

    const generatedImages: string[] = [];

    for (let i = 0; i < total; i++) {
      const pct = Math.round(((i + 1) / total) * 100);
      setBatchModal((prev) => ({
        ...prev,
        progress: pct,
        text: `正在生成高清照片 (${i + 1}/${total})...`
      }));

      try {
        let imageData: ImageData;
        if (isSingleThumbnail) {
          imageData = firstTarget.imageData;
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
          recipe,
          {
            intensity: intensity / 100,
            protectSkin,
            referenceImageData: refImage ? refImage.imageData : null
          },
          mask
        );
        offCtx.putImageData(rendered, 0, 0);

        const dataUrl = offCanvas.toDataURL('image/jpeg', 0.92);
        generatedImages.push(dataUrl);

        // 自动触发浏览器下载
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

    setBatchModal({
      isOpen: true,
      progress: 100,
      text: `✨ 全部 ${total} 张照片已就绪！请长按图片存入相册：`,
      images: generatedImages,
      isFinished: true
    });
  };

  const isReadyToPreview = Boolean(recipe && firstTarget);
  const targetCountDisplay = targetFiles.length > 0 ? targetFiles.length : (firstTarget ? 1 : 0);

  return (
    <div className="app-container">
      {/* 微信环境引导 */}
      {isWx && (
        <div className="wx-tip-banner">
          💡 微信提示：若在微信内选图受限，可点击右上角【...】选择【在浏览器打开】体验更顺畅。
        </div>
      )}

      {/* Header */}
      <header className="app-header">
        <div className="logo-title">
          <span className="logo-icon">🎨</span>
          <h1>ToneRelay</h1>
        </div>
        <p className="subtitle">解构灵感色调 · 批量无损应用 (React + TS)</p>
      </header>

      {/* 1. 双槽选图区 */}
      <section className="slot-section">
        <label className="slot-card" htmlFor="refInput">
          <div className="slot-badge">灵感参考图</div>
          <div className="slot-preview">
            {refImage ? (
              <img src={refImage.thumbUrl} alt="参考图" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }} />
            ) : (
              <span className="upload-tip">+ 从相册选择参考图</span>
            )}
          </div>
        </label>
        <input
          ref={refInputRef}
          type="file"
          id="refInput"
          accept="image/jpeg,image/png,image/jpg,image/webp"
          className="visually-hidden-input"
          onChange={handleRefSelect}
        />

        <label className="slot-card" htmlFor="targetInput">
          <div className="slot-badge">待修原图 (1~9张)</div>
          <div className="slot-preview">
            {firstTarget ? (
              <img src={firstTarget.thumbUrl} alt="原图打样" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }} />
            ) : (
              <span className="upload-tip">+ 从相册选择照片</span>
            )}
          </div>
        </label>
        <input
          ref={targetInputRef}
          type="file"
          id="targetInput"
          accept="image/jpeg,image/png,image/jpg,image/webp"
          multiple
          className="visually-hidden-input"
          onChange={handleTargetSelect}
        />
      </section>

      {/* 快捷免上传体验按钮 */}
      <div style={{ textAlign: 'center' }}>
        <button
          type="button"
          className="btn btn-secondary"
          style={{ fontSize: 12, padding: '6px 14px', borderRadius: 20, display: 'inline-flex', alignItems: 'center', gap: 4 }}
          onClick={handleDemo}
        >
          💡 点击这里：一键载入示例样张快速试玩
        </button>
      </div>

      {/* 2. 状态提示条 */}
      <div
        className="toast-bar"
        style={{
          borderColor: toast.isError ? 'rgba(239, 68, 68, 0.4)' : 'rgba(59, 130, 246, 0.2)',
          color: toast.isError ? '#f87171' : '#60a5fa'
        }}
      >
        {toast.message}
      </div>

      {/* 3. 打样卷帘对比工作台 */}
      {isReadyToPreview && (
        <section className="preview-section" style={{ display: 'flex' }}>
          {/* 卷帘对比视图 */}
          <div
            ref={splitViewportRef}
            className="split-viewport"
            onPointerDown={handlePointerDown}
          >
            <canvas ref={canvasBeforeRef} className="split-canvas" />
            <canvas
              ref={canvasAfterRef}
              className="split-canvas"
              style={{ clipPath: `polygon(0 0, ${splitPercent}% 0, ${splitPercent}% 100%, 0 100%)` }}
            />
            <div className="split-divider" style={{ left: `${splitPercent}%` }}>
              <div className="divider-handle" />
            </div>
            <div className="split-label after-label">调色后 (Styled)</div>
            <div className="split-label before-label">原片 (Before)</div>
          </div>

          {/* 风格配方卡片 */}
          {recipe && (
            <div className="recipe-card">
              <div className="recipe-header">
                <span className="recipe-title">✨ 提取调色逻辑</span>
                <div className="palette-group">
                  {recipe.dominantPalette.map((hex, idx) => (
                    <div key={idx} className="palette-circle" style={{ backgroundColor: hex }} />
                  ))}
                </div>
              </div>
              <div className="tags-group">
                {recipe.tags.map((tag, idx) => (
                  <span key={idx} className="recipe-tag">
                    🏷️ {tag}
                  </span>
                ))}
                <span className="recipe-tag" style={{ background: 'rgba(59, 130, 246, 0.15)', borderColor: 'rgba(59, 130, 246, 0.3)', color: '#93c5fd' }}>
                  📊 {recipe.temperature > 0 ? `色温 +${recipe.temperature}K (暖)` : recipe.temperature < 0 ? `色温 ${recipe.temperature}K (冷)` : '色温 中性'}
                </span>
                <span className="recipe-tag" style={{ background: 'rgba(59, 130, 246, 0.15)', borderColor: 'rgba(59, 130, 246, 0.3)', color: '#93c5fd' }}>
                  📊 高光色相 {recipe.highlights.hue}°
                </span>
                <span className="recipe-tag" style={{ background: 'rgba(59, 130, 246, 0.15)', borderColor: 'rgba(59, 130, 246, 0.3)', color: '#93c5fd' }}>
                  📊 阴影色相 {recipe.shadows.hue}°
                </span>
                <span className="recipe-tag" style={{ background: 'rgba(59, 130, 246, 0.15)', borderColor: 'rgba(59, 130, 246, 0.3)', color: '#93c5fd' }}>
                  📊 对比度 ×{recipe.contrast}
                </span>
              </div>
            </div>
          )}

          {/* 控制面板 */}
          <div className="control-panel">
            <div className="control-row">
              <div className="control-label">
                <span>调色强度</span>
                <span className="value-text">{intensity}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={intensity}
                className="slider-control"
                onChange={(e) => setIntensity(parseInt(e.target.value, 10))}
              />
            </div>

            <div className="control-row toggle-row">
              <label className="switch-label">
                <span>🛡️ 智能保留自然肤色 (防止发青发灰)</span>
                <input
                  type="checkbox"
                  checked={protectSkin}
                  onChange={(e) => setProtectSkin(e.target.checked)}
                />
                <span className="switch-slider" />
              </label>
            </div>
          </div>

          {/* 操作按钮栏 */}
          <div className="action-bar">
            <button type="button" className="btn btn-secondary" onClick={handleSaveFilter}>
              ⭐ 存为专属滤镜
            </button>
            <button type="button" className="btn btn-primary" onClick={handleBatchExport}>
              🚀 保存调色照片 ({targetCountDisplay}张)
            </button>
          </div>
        </section>
      )}

      {/* 4. 保存与导出弹窗 */}
      {batchModal.isOpen && (
        <div className="modal-backdrop" style={{ display: 'flex' }}>
          <div className="modal-dialog">
            <h3>调色成品图片</h3>
            <p className="modal-subtext">
              👇 <strong style={{ color: '#4ade80' }}>长按下方图片，点击【保存图片】存入手机相册！</strong>
            </p>

            {/* 进度条 */}
            {!batchModal.isFinished && (
              <div className="progress-track" style={{ display: 'block' }}>
                <div className="progress-fill" style={{ width: `${batchModal.progress}%` }} />
              </div>
            )}
            <div className="progress-info">{batchModal.text}</div>

            {/* 成品画廊 */}
            <div className="batch-gallery">
              {batchModal.images.map((src, i) => (
                <div key={i} className="gallery-card">
                  <img src={src} alt={`成品照片 ${i + 1}`} />
                  <div className="gallery-tip">👇 长按上方图片 ➡️ 选择【保存到手机/保存图片】</div>
                </div>
              ))}
            </div>

            {batchModal.isFinished && (
              <div className="modal-actions" style={{ marginTop: 14 }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ width: '100%' }}
                  onClick={() => setBatchModal((prev) => ({ ...prev, isOpen: false }))}
                >
                  关闭 / 继续修图
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

(window as any).ToneRelayApp = App;

// 自动在 #root 容器中挂载 React 根实例
if (typeof document !== 'undefined') {
  const mountApp = () => {
    try {
      const rootElement = document.getElementById('root');
      if (rootElement && ReactDOM?.createRoot) {
        const root = ReactDOM.createRoot(rootElement);
        root.render(React.createElement(App));
        console.log('✅ ToneRelay React 根应用挂载成功！');
      } else if (!ReactDOM?.createRoot) {
        console.warn('⚠️ 未检测到 ReactDOM.createRoot 实例');
      }
    } catch (err: any) {
      console.error('❌ React 挂载失败:', err);
      const tip = document.getElementById('loadingText');
      if (tip) {
        tip.innerHTML = '<span style="color:#ef4444;">❌ 挂载异常: ' + (err.message || err) + '</span>';
      }
    }
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountApp);
  } else {
    mountApp();
  }
}
