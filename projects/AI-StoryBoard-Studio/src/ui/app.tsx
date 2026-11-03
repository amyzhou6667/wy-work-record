// @ts-nocheck
const { useState, useEffect, useMemo, useRef } = React;

/**
 * 示例演示小说文本
 */
const DEMO_NOVEL = `第一章 龙王赘婿归来
顾家老宅内，狂风呼啸，冷雨敲打着落地窗。
苏清影站在客厅中央，满脸寒霜：“顾北辰，签了这份离婚协议，三年了，你一事无成，配不上我苏家！”
顾北辰目光如寒星，嘴角掠过一丝不易察觉的冷笑：“三年之期已到，江城该变天了。”
就在这时，数十辆黑色迈巴赫轰鸣停在门外。
数百名身穿黑衣的铁血保镖齐刷刷单膝跪地，声音震天动地：“恭迎龙王归位！”

第二章 千亿黑卡现世
苏清影倒退半步，面色煞白，眼中满是难以置信。
顾北辰从怀中摸出一张泛着暗金幽光的卡片，轻叩在茶几上。
“这张黑金卡，可买下整个苏氏集团。”
门外的保镖头领大步走入，恭敬奉上免死金牌。`;

const INITIAL_CHARACTERS = [
  {
    id: 'char_1',
    name: '顾北辰',
    roleType: 'protagonist',
    gender: 'male',
    ageGroup: '28yo',
    appearancePrompt: 'a 28-year-old cold and domineering Asian male CEO with sharp jawline, short neat black hair, wearing bespoke charcoal tailored suit',
    crefUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300'
  },
  {
    id: 'char_2',
    name: '苏清影',
    roleType: 'antagonist',
    gender: 'female',
    ageGroup: '25yo',
    appearancePrompt: 'a 25-year-old elegant Asian heiress with wavy long dark-brown hair, pearl earrings, silk emerald gown, sharp gaze',
    crefUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300'
  }
];

function App() {
  // 核心状态
  const [novelText, setNovelText] = useState(DEMO_NOVEL);
  const [aspectRatio, setAspectRatio] = useState('9:16');
  const [speedWps, setSpeedWps] = useState(4.5);
  const [includeSpeaker, setIncludeSpeaker] = useState(false);
  const [characters, setCharacters] = useState(INITIAL_CHARACTERS);
  const [selectedShotIndex, setSelectedShotIndex] = useState(0);
  const [activeTabMap, setActiveTabMap] = useState({});
  const [copiedShotId, setCopiedShotId] = useState(null);
  const [showCharDrawer, setShowCharDrawer] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportType, setExportType] = useState('srt'); // 'srt' | 'csv' | 'prompts'
  const [copyGlobalNotice, setCopyGlobalNotice] = useState(false);

  // 解析文档与生成分镜
  const parsedData = useMemo(() => {
    // 简易前端纯运行时章节拆解
    const lines = novelText.split(/\r?\n/).filter(l => l.trim());
    const shots = [];
    let shotNum = 1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.startsWith('第') && (line.includes('章') || line.includes('集'))) {
        continue;
      }

      const quoteMatch = line.match(/[“"「]([^”"」]+)[”"」]/);
      let dialogue = undefined;
      let speaker = '';
      if (quoteMatch) {
        const text = quoteMatch[1];
        const before = line.slice(0, quoteMatch.index).trim();
        const nameMatch = before.match(/^([\u4e00-\u9fa5]{2,3})/);
        speaker = nameMatch ? nameMatch[1] : (i % 2 === 0 ? '顾北辰' : '苏清影');
        dialogue = { speaker, text };
      }

      const shotSize = dialogue ? (i % 2 === 0 ? 'Close-up' : 'Medium Close-up') : (i === 0 ? 'Wide Shot' : 'Medium Shot');
      const cameraMovement = dialogue ? 'Low-angle Dolly In' : (i === 0 ? 'Static Eye-level' : 'Pan Following');
      const charIds = speaker === '顾北辰' ? ['char_1'] : (speaker === '苏清影' ? ['char_2'] : []);

      const activeChars = characters.filter(c => charIds.includes(c.id));
      const charPrompt = activeChars.map(c => c.appearancePrompt).join(' and ');
      const arParam = `--ar ${aspectRatio}`;

      const mj = activeChars.length > 0
        ? `${shotSize}, ${cameraMovement}, ${charPrompt}, acting: intense expression, cinematic lighting, photorealistic, 8k ${arParam} --v 6.1 --style raw`
        : `Cinematic wide establishing shot, atmosphere: rain and lightning, high contrast, 8k ${arParam} --v 6.1 --style raw`;

      const flux = `A high quality 35mm film still in cinematic vertical ${aspectRatio} framing. Utilizing ${shotSize} and ${cameraMovement}. ${charPrompt ? `Featuring ${charPrompt}.` : ''} Ambient lighting: moody atmospheric rim light, ultra-detailed micro-expression.`;
      const jimeng = `${aspectRatio === '9:16' ? '9:16竖屏短剧构图' : '16:9横屏电影画幅'} | ${shotSize} | ${cameraMovement} | ${speaker ? `角色:${speaker}` : '场景'} | 8K电影质感胶片细节`;

      shots.push({
        id: `s_${shotNum}`,
        shotNumber: shotNum++,
        durationSec: dialogue ? 3.5 : 2.5,
        shotSize,
        cameraMovement,
        characterAction: dialogue ? `${speaker}目光如电，神情冷峻对峙` : `大环境渲染，阴雨连绵压迫感`,
        characterIds: charIds,
        environmentLighting: i % 2 === 0 ? '雨夜冷蓝顶光与暗影交错' : '室内华丽吊灯与暖色边缘光',
        dialogue,
        soundBgm: i === 0 ? '暴雨雷鸣与低沉提琴' : '重度心跳低音',
        matchedParagraph: line,
        prompts: { midjourney: mj, flux, jimeng }
      });
    }

    return shots;
  }, [novelText, aspectRatio, characters]);

  // 计算剪映 SRT 实时列表
  const srtList = useMemo(() => {
    const list = [];
    let cursorMs = 300;
    let idx = 1;

    for (const shot of parsedData) {
      if (!shot.dialogue || !shot.dialogue.text) continue;
      const text = shot.dialogue.text.trim();
      const speaker = shot.dialogue.speaker;

      // 语速计算
      const charLen = text.length;
      const durSec = Math.max(1.0, charLen / speedWps + 0.2);
      const durMs = Math.round(durSec * 1000);

      const startMs = cursorMs;
      const endMs = startMs + durMs;

      const formatTime = (ms) => {
        const s = Math.floor(ms / 1000);
        const m = Math.floor(s / 60);
        const h = Math.floor(m / 60);
        const pad = (n, d) => String(n).padStart(d, '0');
        return `${pad(h % 60, 2)}:${pad(m % 60, 2)}:${pad(s % 60, 2)},${pad(ms % 1000, 3)}`;
      };

      const displayText = includeSpeaker ? `[${speaker}]: ${text}` : text;
      list.push({
        index: idx++,
        startMs,
        endMs,
        timeFormatted: `${formatTime(startMs)} --> ${formatTime(endMs)}`,
        text: displayText
      });

      cursorMs = endMs + 350; // 0.35s 呼吸停顿位
    }
    return list;
  }, [parsedData, speedWps, includeSpeaker]);

  const srtString = useMemo(() => {
    return srtList.map(item => `${item.index}\n${item.timeFormatted}\n${item.text}\n`).join('\n');
  }, [srtList]);

  // 下载辅助函数
  const downloadFile = (content, filename, type) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    if (id) {
      setCopiedShotId(id);
      setTimeout(() => setCopiedShotId(null), 1800);
    } else {
      setCopyGlobalNotice(true);
      setTimeout(() => setCopyGlobalNotice(false), 2000);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      {/* 顶部控制台导航栏 */}
      <header className="sticky top-0 z-50 bg-slate-900/90 border-b border-slate-800 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white shadow-lg">
            AI
          </div>
          <div>
            <h1 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
              AI-StoryBoard-Studio
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                短剧分镜工场 v1.0
              </span>
            </h1>
            <p className="text-xs text-slate-400">长文小说 ➔ 视觉分镜 ➔ MJ/Flux 提示词 ➔ 剪映 SRT 字幕</p>
          </div>
        </div>

        {/* 控制区 */}
        <div className="flex items-center gap-4">
          {/* 画幅切换 */}
          <div className="flex items-center bg-slate-800 p-1 rounded-lg border border-slate-700">
            <button
              onClick={() => setAspectRatio('9:16')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition ${
                aspectRatio === '9:16' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              📱 9:16 竖屏短剧
            </button>
            <button
              onClick={() => setAspectRatio('16:9')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition ${
                aspectRatio === '16:9' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              🎬 16:9 电影横屏
            </button>
          </div>

          {/* 剪映配音语速滑块 */}
          <div className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700">
            <span className="text-xs text-slate-400">配音语速:</span>
            <input
              type="range"
              min="3.5"
              max="6.0"
              step="0.1"
              value={speedWps}
              onChange={(e) => setSpeedWps(parseFloat(e.target.value))}
              className="w-20 cursor-pointer accent-indigo-500"
            />
            <span className="text-xs font-mono text-indigo-400 font-semibold">{speedWps} 字/秒</span>
          </div>

          {/* 角色资产库抽屉按钮 */}
          <button
            onClick={() => setShowCharDrawer(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
          >
            👤 角色一致性 ({characters.length})
          </button>

          {/* 导出按钮 */}
          <button
            onClick={() => { setExportType('srt'); setShowExportModal(true); }}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg transition"
          >
            🚀 导出中心
          </button>
        </div>
      </header>

      {/* 快捷复制反馈 Toast */}
      {copyGlobalNotice && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-emerald-500 text-slate-950 font-bold px-4 py-1.5 rounded-full text-xs shadow-xl transition-all">
          ✓ 已成功复制到剪贴板！
        </div>
      )}

      {/* 主体工作区：双栏联动 */}
      <main className="flex-1 flex overflow-hidden p-4 gap-4">
        {/* 左栏：小说原著与章节联动视窗 */}
        <section className="w-1/3 flex flex-col bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
          <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-200">📖 小说剧本文本</span>
              <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                {novelText.replace(/\s+/g, '').length} 字
              </span>
            </div>
            <button
              onClick={() => setNovelText(DEMO_NOVEL)}
              className="text-xs text-indigo-400 hover:text-indigo-300 transition"
            >
              载入战神示例
            </button>
          </div>

          <div className="flex-1 p-4 overflow-y-auto space-y-3 font-normal text-sm leading-relaxed text-slate-300">
            <textarea
              value={novelText}
              onChange={(e) => setNovelText(e.target.value)}
              placeholder="在此粘贴网络小说或剧本文档..."
              className="w-full h-44 p-3 bg-slate-950/80 border border-slate-800 rounded-lg text-xs font-mono text-slate-300 focus:outline-none focus:border-indigo-500 transition resize-none mb-3"
            />

            <div className="text-xs font-semibold text-slate-400 mb-2">段落对照视窗 (点击快速跳转分镜)：</div>
            {parsedData.map((shot, idx) => (
              <div
                key={shot.id}
                onClick={() => setSelectedShotIndex(idx)}
                className={`p-2.5 rounded-lg transition cursor-pointer border ${
                  selectedShotIndex === idx
                    ? 'bg-amber-500/10 border-amber-500/60 text-amber-200 shadow-sm'
                    : 'bg-slate-950/40 border-slate-800/80 hover:border-slate-700 text-slate-400'
                }`}
              >
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-mono font-bold text-indigo-400">镜头 #{String(shot.shotNumber).padStart(2, '0')}</span>
                  <span className="text-[11px] text-slate-500">{shot.shotSize}</span>
                </div>
                <p className="text-xs leading-normal">{shot.matchedParagraph}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 右栏：影视级分镜瀑布流卡片列表 */}
        <section className="flex-1 flex flex-col bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
          <div className="px-5 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-200">🎬 工业级视觉分镜流</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 font-semibold">
                共 {parsedData.length} 镜 / 预估总长约 {Math.round(parsedData.reduce((acc, s) => acc + s.durationSec, 0))} 秒
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">剪映字幕条目: {srtList.length} 条</span>
            </div>
          </div>

          <div className="flex-1 p-4 overflow-y-auto space-y-4">
            {parsedData.map((shot, idx) => {
              const activeTab = activeTabMap[shot.id] || 'midjourney';
              const isSelected = selectedShotIndex === idx;

              return (
                <div
                  key={shot.id}
                  onClick={() => setSelectedShotIndex(idx)}
                  className={`p-4 rounded-xl border transition-all ${
                    isSelected
                      ? 'bg-slate-800/90 border-indigo-500/80 shadow-xl'
                      : 'bg-slate-800/50 border-slate-700/60 hover:border-slate-600'
                  }`}
                >
                  {/* 卡片头部属性徽标 */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-indigo-600 text-white">
                        Shot {String(shot.shotNumber).padStart(2, '0')}
                      </span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-sky-500/20 text-sky-400 border border-sky-500/30">
                        {shot.shotSize}
                      </span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                        {shot.cameraMovement}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">
                        ⏱️ {shot.durationSec}s
                      </span>
                    </div>

                    <div className="text-xs text-slate-400">
                      💡 {shot.environmentLighting}
                    </div>
                  </div>

                  {/* 动作表情与对白 */}
                  <div className="grid grid-cols-2 gap-3 mb-3 text-xs">
                    <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80">
                      <div className="text-slate-400 font-semibold mb-1">🎭 角色神态与肢体：</div>
                      <div className="text-slate-200">{shot.characterAction}</div>
                    </div>
                    <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80">
                      <div className="text-slate-400 font-semibold mb-1 flex items-center justify-between">
                        <span>💬 角色对白台词：</span>
                        {shot.dialogue && (
                          <span className="text-indigo-400 font-bold">[{shot.dialogue.speaker}]</span>
                        )}
                      </div>
                      <div className="text-slate-200 italic">
                        {shot.dialogue ? `“${shot.dialogue.text}”` : <span className="text-slate-500">（无对白 / 纯视觉镜头）</span>}
                      </div>
                    </div>
                  </div>

                  {/* 多模型 Prompt 切换与复制 */}
                  <div className="bg-slate-950/80 rounded-lg border border-slate-800 p-3">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); setActiveTabMap({ ...activeTabMap, [shot.id]: 'midjourney' }); }}
                          className={`px-2.5 py-1 text-xs font-semibold rounded transition ${
                            activeTab === 'midjourney' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          Midjourney v6.1
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setActiveTabMap({ ...activeTabMap, [shot.id]: 'flux' }); }}
                          className={`px-2.5 py-1 text-xs font-semibold rounded transition ${
                            activeTab === 'flux' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          Flux.1 电影长文
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setActiveTabMap({ ...activeTabMap, [shot.id]: 'jimeng' }); }}
                          className={`px-2.5 py-1 text-xs font-semibold rounded transition ${
                            activeTab === 'jimeng' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          即梦 / 通用双语
                        </button>
                      </div>

                      <button
                        onClick={(e) => { e.stopPropagation(); copyToClipboard(shot.prompts[activeTab], shot.id); }}
                        className={`text-xs px-2.5 py-1 rounded font-semibold transition ${
                          copiedShotId === shot.id
                            ? 'bg-emerald-500 text-slate-950 font-bold'
                            : 'bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-slate-700'
                        }`}
                      >
                        {copiedShotId === shot.id ? '✓ 已复制 Prompt' : '📋 复制英文词'}
                      </button>
                    </div>

                    <div className="font-mono text-xs text-slate-300 leading-relaxed select-all">
                      {shot.prompts[activeTab]}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      {/* 角色一致性管理抽屉 (Drawer) */}
      {showCharDrawer && (
        <div className="fixed inset-0 z-50 bg-black/60 flex justify-end transition-all">
          <div className="w-96 bg-slate-900 border-l border-slate-800 h-full p-6 flex flex-col shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                👤 角色一致性资产库
              </h2>
              <button
                onClick={() => setShowCharDrawer(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400 mb-4">
              在此锁死主角与反派的英文外貌特征词或 Midjourney 参考图 (`--cref`)，分镜生成时自动注入。
            </p>

            <div className="flex-1 overflow-y-auto space-y-4">
              {characters.map((char, index) => (
                <div key={char.id} className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-indigo-400">{char.name}</span>
                    <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                      {char.roleType === 'protagonist' ? '男主角' : '主要反派'}
                    </span>
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-500 block mb-1">英文外观特征词 (Prompt):</label>
                    <textarea
                      value={char.appearancePrompt}
                      onChange={(e) => {
                        const next = [...characters];
                        next[index].appearancePrompt = e.target.value;
                        setCharacters(next);
                      }}
                      className="w-full h-16 p-2 bg-slate-900 border border-slate-800 rounded text-xs text-slate-200 font-mono resize-none focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-500 block mb-1">MJ --cref 参考图 URL (可选):</label>
                    <input
                      type="text"
                      value={char.crefUrl || ''}
                      onChange={(e) => {
                        const next = [...characters];
                        next[index].crefUrl = e.target.value;
                        setCharacters(next);
                      }}
                      placeholder="https://..."
                      className="w-full px-2 py-1 bg-slate-900 border border-slate-800 rounded text-xs text-slate-300 font-mono focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-slate-800">
              <button
                onClick={() => setShowCharDrawer(false)}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-xs transition"
              >
                保存并应用到全部分镜
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 导出中心模态弹窗 (ExportModal) */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
            {/* 弹窗头部 */}
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
              <div className="flex items-center gap-3">
                <span className="text-xl">🚀</span>
                <div>
                  <h3 className="text-base font-bold text-white">工业物料导出中心</h3>
                  <p className="text-xs text-slate-400">导出符合剪映标准的 SRT 字幕文件及工业级分镜表格</p>
                </div>
              </div>
              <button
                onClick={() => setShowExportModal(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {/* 导出类型 Tab */}
            <div className="px-6 pt-4 flex items-center justify-between">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                <button
                  onClick={() => setExportType('srt')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                    exportType === 'srt' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  📄 剪映标准 SRT 字幕 ({srtList.length}条)
                </button>
                <button
                  onClick={() => setExportType('csv')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                    exportType === 'csv' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  📊 影视分镜表 (.CSV)
                </button>
                <button
                  onClick={() => setExportType('prompts')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                    exportType === 'prompts' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  📋 全集生图 Prompt 清单
                </button>
              </div>

              {exportType === 'srt' && (
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeSpeaker}
                    onChange={(e) => setIncludeSpeaker(e.target.checked)}
                    className="accent-indigo-500 rounded"
                  />
                  <span>包含说话人前缀 (如 [顾北辰]:)</span>
                </label>
              )}
            </div>

            {/* 预览区域 */}
            <div className="flex-1 p-6 overflow-y-auto">
              {exportType === 'srt' && (
                <div className="space-y-3">
                  <div className="text-xs text-slate-400 flex items-center justify-between">
                    <span>剪映标准时间码预览（标准三位毫秒、语速基准 {speedWps} 字/秒）：</span>
                    <button
                      onClick={() => copyToClipboard(srtString)}
                      className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
                    >
                      复制全部字幕
                    </button>
                  </div>
                  <pre className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-xs font-mono text-emerald-400 overflow-x-auto max-h-80 leading-relaxed">
                    {srtString}
                  </pre>
                </div>
              )}

              {exportType === 'csv' && (
                <div className="space-y-3">
                  <p className="text-xs text-slate-400">
                    工业级 CSV 表格已内置 UTF-8 BOM，在 Excel 与 WPS 中打开绝不乱码，涵盖镜头号、景别、运镜、台词及 MJ/Flux 提示词全字段。
                  </p>
                  <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-300 font-mono">
                    包含列头：镜头号, 预估时长, 景别, 机位运镜, 角色动作表情, 环境光影, 台词对白, 音效BGM, Midjourney提示词, Flux提示词, 即梦提示词
                  </div>
                </div>
              )}

              {exportType === 'prompts' && (
                <div className="space-y-3">
                  <p className="text-xs text-slate-400">
                    全集 {aspectRatio} 提示词清单（每镜一行，可直接粘贴进生图批处理工具）：
                  </p>
                  <pre className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-xs font-mono text-indigo-300 overflow-x-auto max-h-80 leading-relaxed">
                    {parsedData.map(s => `Shot ${String(s.shotNumber).padStart(2, '0')}: ${s.prompts.midjourney}`).join('\n\n')}
                  </pre>
                </div>
              )}
            </div>

            {/* 底部操作按钮 */}
            <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-between bg-slate-900/90">
              <span className="text-xs text-slate-500">
                符合剪映 (JianYing / CapCut) 最新字幕导入标准
              </span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowExportModal(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                >
                  关闭
                </button>
                {exportType === 'srt' && (
                  <button
                    onClick={() => downloadFile(srtString, 'drama_subtitles.srt', 'text/plain;charset=utf-8')}
                    className="px-5 py-2 text-xs font-bold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg transition"
                  >
                    ⬇️ 下载剪映 SRT 字幕
                  </button>
                )}
                {exportType === 'csv' && (
                  <button
                    onClick={() => {
                      const BOM = '\uFEFF';
                      const headers = '镜头号,预估时长(秒),景别,机位运镜,角色动作表情,环境光影,台词对白,音效BGM,Midjourney提示词,Flux提示词,即梦提示词\r\n';
                      const rows = parsedData.map(s => {
                        const esc = (v) => `"${String(v || '').replace(/"/g, '""')}"`;
                        return [
                          esc(`Shot ${s.shotNumber}`),
                          esc(s.durationSec),
                          esc(s.shotSize),
                          esc(s.cameraMovement),
                          esc(s.characterAction),
                          esc(s.environmentLighting),
                          esc(s.dialogue ? `[${s.dialogue.speaker}]: ${s.dialogue.text}` : ''),
                          esc(s.soundBgm),
                          esc(s.prompts.midjourney),
                          esc(s.prompts.flux),
                          esc(s.prompts.jimeng)
                        ].join(',');
                      }).join('\r\n');
                      downloadFile(BOM + headers + rows, 'storyboard_script.csv', 'text/csv;charset=utf-8');
                    }}
                    className="px-5 py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg transition"
                  >
                    ⬇️ 下载影视分镜表 (.CSV)
                  </button>
                )}
                {exportType === 'prompts' && (
                  <button
                    onClick={() => {
                      const allPrompts = parsedData.map(s => `Shot ${String(s.shotNumber).padStart(2, '0')}: ${s.prompts.midjourney}`).join('\n\n');
                      copyToClipboard(allPrompts);
                    }}
                    className="px-5 py-2 text-xs font-bold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg transition"
                  >
                    📋 一键复制全集 Prompt
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 挂载 React 应用
const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(<App />);
}
