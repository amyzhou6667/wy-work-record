// @ts-nocheck
const { useState, useEffect, useMemo, useRef } = React;

/**
 * 多题材预设剧本示例
 */
const SAMPLE_NOVELS = {
  zhanshen: {
    name: '战神爽剧 (都市逆袭)',
    text: `第一章 龙王赘婿归来
顾家老宅内，狂风呼啸，冷雨敲打着落地窗。
苏清影站在客厅中央，满脸寒霜：“顾北辰，签了这份离婚协议，三年了，你一事无成，配不上我苏家！”
顾北辰目光如寒星，嘴角掠过一丝冷笑：“三年之期已到，江城该变天了。”
就在这时，数十辆黑色迈巴赫轰鸣停在门外。
数百名身穿黑衣的铁血保镖齐刷刷单膝跪地，声音震天动地：“恭迎龙王归位！”

第二章 千亿黑卡现世
苏清影倒退半步，面色煞白，眼中满是难以置信。
顾北辰从怀中摸出一张泛着暗金幽光的卡片，轻叩在茶几上。
“这张黑金卡，可买下整个苏氏集团。”
门外的保镖头领大步走入，恭敬奉上免死金牌。`,
    characters: [
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
    ]
  },
  xuanhuan: {
    name: '东方玄幻 (少年逆袭)',
    text: `第一章 陨落的天才
乌坦城演武场上，烈日当空，周围满是嘲讽的冷眼。
测试魔石碑上，闪烁着刺目的五个大字：“斗之力，三段！”
萧炎紧咬下唇，指甲深陷掌心，鲜血渗出。
身旁纳兰嫣然面色冷漠，递上一纸退婚契约：“萧炎，凭你现在的实力，莫再痴心妄想。”
萧炎猛然抬头，眼神如狼似虎：“三十年河东，三十年河西，莫欺少年穷！”
说罢，他拔出玄重尺，引得全场震动。`,
    characters: [
      {
        id: 'char_xy',
        name: '萧炎',
        roleType: 'protagonist',
        gender: 'male',
        ageGroup: '18yo',
        appearancePrompt: 'a 18-year-old determined Asian martial youth, fierce black eyes, wearing dark martial tunic, holding massive black iron broadsword',
        crefUrl: ''
      },
      {
        id: 'char_nlyr',
        name: '纳兰嫣然',
        roleType: 'antagonist',
        gender: 'female',
        ageGroup: '18yo',
        appearancePrompt: 'a 18-year-old proud noble martial sect maiden, long silver-accented hair, wearing lavish white-and-cyan silk robes, haughty gaze',
        crefUrl: ''
      }
    ]
  },
  suspense: {
    name: '悬疑探案 (雨夜迷踪)',
    text: `第一案 暴雨钟楼
午夜十二点，倾盆大雨笼罩着废弃钟楼。
刑警队长陆远撑着黑色雨伞，手电光束刺破浓浓雨雾。
钟楼暗处，凶手冷冷一笑：“陆队长，你终究慢了一步。”
陆远眼神一凝，迅速拔出配枪，保险机头咔哒上膛：“放下凶器，你逃不掉了！”
一道闪电撕裂夜空，照亮了凶手嘴角那一抹诡异的弧度。`,
    characters: [
      {
        id: 'char_ly',
        name: '陆远',
        roleType: 'protagonist',
        gender: 'male',
        ageGroup: '36yo',
        appearancePrompt: 'a 36-year-old weathered Asian detective with stubble beard, tired yet sharp eyes, wearing wet trenchcoat, holding flashlight and service pistol',
        crefUrl: ''
      }
    ]
  }
};

function App() {
  // 核心剧本与镜头状态
  const [novelText, setNovelText] = useState(SAMPLE_NOVELS.zhanshen.text);
  const [aspectRatio, setAspectRatio] = useState('9:16');
  const [speedWps, setSpeedWps] = useState(4.5);
  const [includeSpeaker, setIncludeSpeaker] = useState(false);
  const [characters, setCharacters] = useState(SAMPLE_NOVELS.zhanshen.characters);
  const [shots, setShots] = useState([]);
  const [selectedShotIndex, setSelectedShotIndex] = useState(0);
  const [activeTabMap, setActiveTabMap] = useState({});
  const [copiedShotId, setCopiedShotId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingTip, setLoadingTip] = useState('');

  // 弹窗与抽屉控制
  const [showCharDrawer, setShowCharDrawer] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showLLMModal, setShowLLMModal] = useState(false);
  const [showRefineModal, setShowRefineModal] = useState(false);
  const [refineTargetShot, setRefineTargetShot] = useState(null);
  const [refineInstruction, setRefineInstruction] = useState('');
  const [exportType, setExportType] = useState('srt');
  const [copyGlobalNotice, setCopyGlobalNotice] = useState(false);

  // 大模型配置状态 (默认从 localStorage 读取)
  const [llmConfig, setLlmConfig] = useState(() => {
    try {
      const saved = localStorage.getItem('asbs_llm_config');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      baseUrl: 'https://api.deepseek.com/v1',
      apiKey: '',
      model: 'deepseek-chat',
      temperature: 0.7
    };
  });

  // 保存 LLM 配置到本地
  const saveLLMConfig = (newConfig) => {
    setLlmConfig(newConfig);
    try {
      localStorage.setItem('asbs_llm_config', JSON.stringify(newConfig));
    } catch {}
  };

  // 通用离线高容错分镜生成器 (彻底杜绝硬编码顾北辰与暴雨模板)
  const generateOfflineShots = (text, currentChars, ar) => {
    if (!text || !text.trim()) return [];
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const resultShots = [];
    let shotNum = 1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // 过滤章节标头
      if (/^(?:第\s*[0-9一二三四两五六七八九十百千万]+\s*[章回节集部卷篇]|Chapter\s+\d+|Episode\s+\d+|序章|引子|尾声)/i.test(line) && line.length < 35) {
        continue;
      }

      const quoteMatch = line.match(/[“"「]([^”"」]+)[”"」]/);
      let dialogue = undefined;
      let speaker = '';

      if (quoteMatch && quoteMatch.index !== undefined) {
        const textPart = quoteMatch[1];
        const before = line.slice(0, quoteMatch.index).trim();

        // 1. 优先精准命中已知角色名
        const knownChar = currentChars.find(c => before.includes(c.name));
        if (knownChar) {
          speaker = knownChar.name;
        } else {
          // 2. 动词引导的人名匹配
          const actionMatch = before.match(/^([\u4e00-\u9fa5]{2,4}?)(?=[，,\s:：]|目光|面色|神色|神情|嘴角|握紧|站在|倒退|大步|踏空|冷笑|沉声|轻声|怒斥|问道|说道|道|喊|喝道|答道|说|心想|暗道|抬手|转身|冷哼)/);
          if (actionMatch) {
            speaker = actionMatch[1];
          } else {
            const nameMatch = before.match(/^([\u4e00-\u9fa5]{2,3})/);
            speaker = nameMatch ? nameMatch[1] : '';
          }
        }

        dialogue = {
          speaker: speaker || '角色',
          text: textPart,
          isVoiceover: line.includes('独白') || line.includes('心想') || line.includes('暗道')
        };
      }

      const hasDialogue = !!dialogue;
      const shotSize = hasDialogue
        ? (i % 2 === 0 ? 'Close-up' : 'Medium Close-up')
        : (i === 0 ? 'Wide Shot' : (i === lines.length - 1 ? 'Extreme Close-up' : 'Medium Shot'));

      const cameraMovement = hasDialogue
        ? 'Low-angle Dolly In'
        : (i === 0 ? 'Static Eye-level' : 'Pan Following');

      // 匹配当前出场角色资产
      const activeChars = currentChars.filter(c =>
        (speaker && c.name.includes(speaker)) || line.includes(c.name)
      );
      const characterIds = activeChars.map(c => c.id);
      const charPrompt = activeChars.map(c => c.appearancePrompt).join(' and ');
      const arParam = `--ar ${ar}`;

      // 动态动作神态与光影 (根据原文本语义，杜绝固定模板)
      const cleanAction = line.replace(/[“"「][^”"」]+[”"」]/g, '').trim() || line;
      const characterAction = hasDialogue
        ? `${dialogue.speaker}情感张力迸发，神情专注沉浸 (${cleanAction.slice(0, 24)}...)`
        : `场景与人物动势推进，氛围渐入高潮 (${cleanAction.slice(0, 28)}...)`;

      const environmentLighting = i % 2 === 0
        ? '电影主光侧打，明暗对比立体，高光与阴影过渡柔和'
        : '环境通透自然柔光，边缘光勾勒主体轮廓，景深层次丰富';

      // 构造三模型 Prompt
      const mj = activeChars.length > 0
        ? `${shotSize}, ${cameraMovement}, ${charPrompt}, acting: ${characterAction}, 8k, cinematic lighting, photorealistic ${arParam} --v 6.1 --style raw`
        : `Cinematic wide shot, ${cameraMovement}, scene action: ${characterAction}, atmospheric volumetrics, 8k ${arParam} --v 6.1 --style raw`;

      const flux = `A high quality 35mm cinematic film still in vertical ${ar} composition. Utilizing ${shotSize} and ${cameraMovement}. ${charPrompt ? `Featuring ${charPrompt}.` : ''} Action: ${characterAction}. Rich depth of field, ultra-detailed textures.`;

      const jimeng = `${ar === '9:16' ? '9:16竖屏短剧构图' : '16:9横屏电影画幅'} | ${shotSize} | ${cameraMovement} | ${speaker ? `角色:${speaker}` : '场景氛围'} | 8K电影级质感胶片细节`;

      resultShots.push({
        id: `s_${shotNum}`,
        shotNumber: shotNum++,
        durationSec: hasDialogue ? Math.min(6.0, Math.max(2.5, (dialogue.text.length / 4.5) + 0.5)) : 2.5,
        shotSize,
        cameraMovement,
        characterAction,
        characterIds,
        environmentLighting,
        dialogue,
        soundBgm: i === 0 ? '环境音效与悬疑弦乐建立' : (hasDialogue ? '紧张对峙重音伴奏' : '沉重大提琴长音'),
        matchedParagraph: line,
        prompts: { midjourney: mj, flux, jimeng }
      });
    }

    return resultShots;
  };

  // 初始加载及文本/配置变更时自动生成（离线保底）
  useEffect(() => {
    if (shots.length === 0 && novelText.trim()) {
      const initialShots = generateOfflineShots(novelText, characters, aspectRatio);
      setShots(initialShots);
    }
  }, []);

  // 执行 AI 智能拆解 (调用服务端大模型路由)
  const handleAIDecompose = async () => {
    if (!novelText.trim()) {
      alert('请先输入小说剧本文本！');
      return;
    }

    setIsLoading(true);
    setLoadingTip('好莱坞导演 AI 正在深度研读剧本，拆解影视级视听分镜...');

    try {
      const response = await fetch('/api/v1/ai-decompose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          novelText,
          aspectRatio,
          characters,
          llmConfig
        })
      });

      if (!response.ok) throw new Error('网络请求失败');
      const res = await response.json();

      if (res.code === 0 && res.data && res.data.shots?.length > 0) {
        setShots(res.data.shots);
        setSelectedShotIndex(0);
        if (res.data.isAIGenerated) {
          setCopyGlobalNotice(true);
          setTimeout(() => setCopyGlobalNotice(false), 2500);
        }
      } else {
        throw new Error('未返回有效镜头数据');
      }
    } catch (err) {
      console.warn('AI 拆解失败，转为离线智能算法:', err);
      // 优雅降级
      const offlineShots = generateOfflineShots(novelText, characters, aspectRatio);
      setShots(offlineShots);
      setSelectedShotIndex(0);
      alert('已自动使用本地离线规则完成分镜拆解！如需使用大模型深度拆解，请点击右上角【⚙️ AI 模型配置】检查 API Key。');
    } finally {
      setIsLoading(false);
    }
  };

  // 执行本地离线快速拆解
  const handleOfflineDecompose = () => {
    if (!novelText.trim()) {
      setShots([]);
      return;
    }
    const result = generateOfflineShots(novelText, characters, aspectRatio);
    setShots(result);
    setSelectedShotIndex(0);
  };

  // 执行单镜头 AI 润色
  const handleRefineShot = async () => {
    if (!refineTargetShot || !refineInstruction.trim()) return;

    setIsLoading(true);
    setLoadingTip(`正在根据指令润色 Shot ${refineTargetShot.shotNumber}...`);

    try {
      const response = await fetch('/api/v1/ai-refine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shot: refineTargetShot,
          userInstruction: refineInstruction,
          characters,
          aspectRatio,
          llmConfig
        })
      });

      const res = await response.json();
      if (res.code === 0 && res.data?.shot) {
        setShots(shots.map(s => s.id === refineTargetShot.id ? res.data.shot : s));
        setShowRefineModal(false);
        setRefineInstruction('');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  // 切换预设题材
  const handleSelectSample = (key) => {
    const sample = SAMPLE_NOVELS[key];
    if (!sample) return;
    setNovelText(sample.text);
    setCharacters(sample.characters);
    const newShots = generateOfflineShots(sample.text, sample.characters, aspectRatio);
    setShots(newShots);
    setSelectedShotIndex(0);
  };

  // 实时 SRT 字幕列表计算
  const srtList = useMemo(() => {
    const list = [];
    let cursorMs = 300;
    let idx = 1;

    for (const shot of shots) {
      if (!shot.dialogue || !shot.dialogue.text) continue;
      const text = shot.dialogue.text.trim();
      const speaker = shot.dialogue.speaker;

      const durSec = Math.max(1.0, text.length / speedWps + 0.25);
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

      cursorMs = endMs + 350;
    }
    return list;
  }, [shots, speedWps, includeSpeaker]);

  const srtString = useMemo(() => {
    return srtList.map(item => `${item.index}\n${item.timeFormatted}\n${item.text}\n`).join('\n');
  }, [srtList]);

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
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 font-sans selection:bg-indigo-600 selection:text-white">
      {/* 顶部控制台导航栏 */}
      <header className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur border-b border-slate-800 px-6 py-3 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white shadow-indigo-500/20 shadow-lg">
            AI
          </div>
          <div>
            <h1 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
              AI-StoryBoard-Studio
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                双模智能分镜工场 v1.5
              </span>
            </h1>
            <p className="text-xs text-slate-400">长文小说 ➔ 影视级分镜 ➔ MJ/Flux 提示词 ➔ 剪映 SRT 字幕</p>
          </div>
        </div>

        {/* 顶部控制区 */}
        <div className="flex items-center gap-3">
          {/* 画幅切换 */}
          <div className="flex items-center bg-slate-800 p-1 rounded-lg border border-slate-700">
            <button
              onClick={() => {
                setAspectRatio('9:16');
                setShots(generateOfflineShots(novelText, characters, '9:16'));
              }}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition ${
                aspectRatio === '9:16' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              📱 9:16 竖屏
            </button>
            <button
              onClick={() => {
                setAspectRatio('16:9');
                setShots(generateOfflineShots(novelText, characters, '16:9'));
              }}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition ${
                aspectRatio === '16:9' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              🎬 16:9 横屏
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
              className="w-16 cursor-pointer accent-indigo-500"
            />
            <span className="text-xs font-mono text-indigo-400 font-semibold">{speedWps} 字/秒</span>
          </div>

          {/* 角色资产库抽屉按钮 */}
          <button
            onClick={() => setShowCharDrawer(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
          >
            👤 角色库 ({characters.length})
          </button>

          {/* 大模型 API 配置按钮 */}
          <button
            onClick={() => setShowLLMModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
            title="配置 OpenAI / DeepSeek / Ollama API"
          >
            ⚙️ AI 模型配置
            {llmConfig.apiKey && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            )}
          </button>

          {/* 导出中心按钮 */}
          <button
            onClick={() => { setExportType('srt'); setShowExportModal(true); }}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition"
          >
            🚀 导出物料
          </button>
        </div>
      </header>

      {/* 快捷全局复制反馈 Toast */}
      {copyGlobalNotice && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-emerald-500 text-slate-950 font-bold px-4 py-1.5 rounded-full text-xs shadow-xl transition-all">
          ✓ 操作成功完成！
        </div>
      )}

      {/* 加载中遮罩 */}
      {isLoading && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-semibold text-slate-200">{loadingTip || 'AI 正在处理中，请稍候...'}</p>
        </div>
      )}

      {/* 主体双栏联动工作区 */}
      <main className="flex-1 flex overflow-hidden p-4 gap-4">
        {/* 左栏：小说原著与章节联动视窗 */}
        <section className="w-1/3 flex flex-col bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-200">📖 小说剧本文本</span>
              <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                {novelText.replace(/\s+/g, '').length} 字
              </span>
            </div>

            {/* 多题材快速载入下拉 */}
            <div className="flex items-center gap-1 text-xs">
              <span className="text-slate-400">范例:</span>
              <select
                onChange={(e) => handleSelectSample(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-indigo-300 text-xs rounded px-2 py-0.5 focus:outline-none"
              >
                <option value="zhanshen">都市战神</option>
                <option value="xuanhuan">东方玄幻</option>
                <option value="suspense">悬疑探案</option>
              </select>
            </div>
          </div>

          <div className="p-3 border-b border-slate-800 bg-slate-950/60 flex flex-col gap-2">
            <textarea
              value={novelText}
              onChange={(e) => {
                setNovelText(e.target.value);
                if (e.target.value.trim()) {
                  setShots(generateOfflineShots(e.target.value, characters, aspectRatio));
                } else {
                  setShots([]);
                }
              }}
              placeholder="在此粘贴任意网文小说、短剧剧本..."
              className="w-full h-36 p-3 bg-slate-900/80 border border-slate-800 rounded-lg text-xs font-mono text-slate-300 focus:outline-none focus:border-indigo-500 transition resize-none"
            />

            {/* 双拆解动作按钮 */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleAIDecompose}
                disabled={isLoading}
                className="flex-1 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/20 transition disabled:opacity-50"
              >
                🤖 AI 智能拆解 (大模型)
              </button>
              <button
                onClick={handleOfflineDecompose}
                disabled={isLoading}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-lg text-xs border border-slate-700 transition"
                title="不消耗大模型 Token，毫秒级快速本地拆解"
              >
                ⚡ 离线规则
              </button>
            </div>
          </div>

          {/* 段落与分镜对照视窗 */}
          <div className="flex-1 p-3 overflow-y-auto space-y-2">
            <div className="text-xs font-semibold text-slate-400 mb-1">段落对照视窗 (点击定位分镜)：</div>
            {shots.length === 0 ? (
              <div className="text-xs text-slate-500 text-center py-8">
                暂无镜头，请输入文本或载入上方范例
              </div>
            ) : (
              shots.map((shot, idx) => (
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
                  <p className="text-xs leading-normal line-clamp-2">{shot.matchedParagraph || shot.matchedSourceParagraph}</p>
                </div>
              ))
            )}
          </div>
        </section>

        {/* 右栏：影视级分镜流与提示词卡片 */}
        <section className="flex-1 flex flex-col bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          <div className="px-5 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-200">🎬 工业级视觉分镜流</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 font-semibold">
                共 {shots.length} 镜 / 预估总长约 {Math.round(shots.reduce((acc, s) => acc + (s.durationSec || 2.5), 0))} 秒
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">剪映对白字幕: {srtList.length} 条</span>
            </div>
          </div>

          <div className="flex-1 p-4 overflow-y-auto space-y-4">
            {shots.length === 0 ? (
              /* 空状态占位提示符 (解决用户删除样本后提示词完全消失的盲区) */
              <div className="h-full flex flex-col items-center justify-center p-8 border border-dashed border-slate-800 rounded-xl bg-slate-950/40 text-center">
                <span className="text-5xl mb-3">🎬</span>
                <h3 className="text-base font-bold text-slate-200 mb-1">等待剧本文本输入</h3>
                <p className="text-xs text-slate-400 max-w-md mb-6 leading-relaxed">
                  检测到当前剧本为空或尚未拆解。请在左侧粘贴小说文本，或点击下方按钮载入预设范例，系统将智能识别角色对白、自动推导景别运镜，并实时生成 Midjourney / Flux / 即梦 工业级提示词。
                </p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleSelectSample('zhanshen')}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-xs font-bold rounded-lg text-white shadow transition"
                  >
                    载入都市战神示例
                  </button>
                  <button
                    onClick={() => handleSelectSample('xuanhuan')}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded-lg text-slate-200 border border-slate-700 transition"
                  >
                    载入东方玄幻示例
                  </button>
                </div>
              </div>
            ) : (
              shots.map((shot, idx) => {
                const activeTab = activeTabMap[shot.id] || 'midjourney';
                const isSelected = selectedShotIndex === idx;

                return (
                  <div
                    key={shot.id}
                    onClick={() => setSelectedShotIndex(idx)}
                    className={`p-4 rounded-xl border transition-all ${
                      isSelected
                        ? 'bg-slate-800/90 border-indigo-500/80 shadow-2xl ring-1 ring-indigo-500/30'
                        : 'bg-slate-800/50 border-slate-700/60 hover:border-slate-600'
                    }`}
                  >
                    {/* 卡片头部属性徽标与单镜润色 */}
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

                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setRefineTargetShot(shot);
                            setShowRefineModal(true);
                          }}
                          className="text-xs px-2 py-0.5 rounded bg-slate-700 hover:bg-slate-600 text-indigo-300 border border-slate-600 flex items-center gap-1 transition"
                        >
                          ✨ AI 润色
                        </button>
                      </div>
                    </div>

                    {/* 动作表情与对白 */}
                    <div className="grid grid-cols-2 gap-3 mb-3 text-xs">
                      <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80">
                        <div className="text-slate-400 font-semibold mb-1">🎭 角色神态与动作：</div>
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

                    {/* 多模型 Prompt 切换与复制板块 (核心高保真区域) */}
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
                          onClick={(e) => {
                            e.stopPropagation();
                            copyToClipboard(shot.prompts?.[activeTab] || '', shot.id);
                          }}
                          className={`text-xs px-2.5 py-1 rounded font-semibold transition ${
                            copiedShotId === shot.id
                              ? 'bg-emerald-500 text-slate-950 font-bold'
                              : 'bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-slate-700'
                          }`}
                        >
                          {copiedShotId === shot.id ? '✓ 已复制 Prompt' : '📋 复制 Prompt'}
                        </button>
                      </div>

                      <div className="font-mono text-xs text-slate-300 leading-relaxed select-all">
                        {shot.prompts?.[activeTab] || '提示词生成中...'}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </main>

      {/* 大模型 API 配置弹窗 (LLM Modal) */}
      {showLLMModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                ⚙️ 大模型服务配置 (OpenAI 协议兼容)
              </h3>
              <button onClick={() => setShowLLMModal(false)} className="text-slate-400 hover:text-white font-bold">
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">API Base URL (端点地址):</label>
                <input
                  type="text"
                  value={llmConfig.baseUrl}
                  onChange={(e) => saveLLMConfig({ ...llmConfig, baseUrl: e.target.value })}
                  placeholder="https://api.deepseek.com/v1 或 http://localhost:11434/v1"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">API Key (密钥，本地 Ollama 可留空):</label>
                <input
                  type="password"
                  value={llmConfig.apiKey}
                  onChange={(e) => saveLLMConfig({ ...llmConfig, apiKey: e.target.value })}
                  placeholder="sk-..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">模型代号 (Model Name):</label>
                <input
                  type="text"
                  value={llmConfig.model}
                  onChange={(e) => saveLLMConfig({ ...llmConfig, model: e.target.value })}
                  placeholder="deepseek-chat / gpt-4o / qwen2.5:14b"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>

              <p className="text-[11px] text-slate-500 leading-normal">
                支持直连 DeepSeek、OpenAI、硅基流动或本地 Ollama。配置后将在分镜拆解时享受好莱坞导演级视听拆解能力。
              </p>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowLLMModal(false)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-xs"
              >
                保存配置
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 单镜头 AI 润色弹窗 (Refine Modal) */}
      {showRefineModal && refineTargetShot && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                ✨ 导演级 AI 单镜润色 (Shot {refineTargetShot.shotNumber})
              </h3>
              <button onClick={() => setShowRefineModal(false)} className="text-slate-400 hover:text-white font-bold">
                ✕
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-slate-400 font-mono">
                当前镜头：[{refineTargetShot.shotSize}] [{refineTargetShot.cameraMovement}] {refineTargetShot.characterAction}
              </div>

              <label className="text-slate-300 font-semibold block pt-2">您的修改意见 / 导演指令：</label>
              <textarea
                value={refineInstruction}
                onChange={(e) => setRefineInstruction(e.target.value)}
                placeholder="例如：将景别调整为特写，增强眼神杀气，背景增加冷雨闪电，运镜改为低角度推镜..."
                className="w-full h-24 p-3 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500 resize-none"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowRefineModal(false)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs"
              >
                取消
              </button>
              <button
                onClick={handleRefineShot}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-xs"
              >
                立即润色并应用
              </button>
            </div>
          </div>
        </div>
      )}

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

            <p className="text-xs text-slate-400 mb-3">
              配置主角与配角外观特征词，在生成英文 Prompt 时自动注入，确保跨镜头生图角色不走形。
            </p>

            <div className="flex-1 overflow-y-auto space-y-3 mb-4">
              {characters.map((char, index) => (
                <div key={char.id} className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <input
                      type="text"
                      value={char.name}
                      onChange={(e) => {
                        const next = [...characters];
                        next[index].name = e.target.value;
                        setCharacters(next);
                      }}
                      className="font-bold text-sm text-indigo-400 bg-transparent border-b border-transparent focus:border-indigo-500 focus:outline-none"
                    />
                    <button
                      onClick={() => setCharacters(characters.filter((_, i) => i !== index))}
                      className="text-xs text-rose-400 hover:text-rose-300"
                    >
                      删除
                    </button>
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-500 block mb-1">英文外貌特征词 (Prompt):</label>
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
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-800 flex flex-col gap-2">
              <button
                onClick={() => {
                  const newChar = {
                    id: `char_${Date.now()}`,
                    name: `新角色 ${characters.length + 1}`,
                    roleType: 'protagonist',
                    gender: 'male',
                    ageGroup: '25yo',
                    appearancePrompt: 'a 25-year-old Asian character with distinctive facial features, wearing modern clothing'
                  };
                  setCharacters([...characters, newChar]);
                }}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-lg text-xs transition"
              >
                + 添加新角色
              </button>
              <button
                onClick={() => {
                  setShowCharDrawer(false);
                  setShots(generateOfflineShots(novelText, characters, aspectRatio));
                }}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-xs transition"
              >
                保存并刷新分镜
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 导出中心模态弹窗 */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
              <div className="flex items-center gap-3">
                <span className="text-xl">🚀</span>
                <div>
                  <h3 className="text-base font-bold text-white">工业物料导出中心</h3>
                  <p className="text-xs text-slate-400">导出剪映标准 SRT 字幕及影视级分镜表格</p>
                </div>
              </div>
              <button onClick={() => setShowExportModal(false)} className="text-slate-400 hover:text-white font-bold">
                ✕
              </button>
            </div>

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
                  <span>包含说话人前缀</span>
                </label>
              )}
            </div>

            <div className="flex-1 p-6 overflow-y-auto">
              {exportType === 'srt' && (
                <div className="space-y-3">
                  <div className="text-xs text-slate-400 flex items-center justify-between">
                    <span>剪映标准时间码预览（语速基准 {speedWps} 字/秒）：</span>
                    <button
                      onClick={() => copyToClipboard(srtString)}
                      className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
                    >
                      复制全部字幕
                    </button>
                  </div>
                  <pre className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-xs font-mono text-emerald-400 overflow-x-auto max-h-80 leading-relaxed">
                    {srtString || '（暂无包含对白台词的镜头）'}
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
                    {shots.map(s => `Shot ${String(s.shotNumber).padStart(2, '0')}: ${s.prompts?.midjourney || ''}`).join('\n\n')}
                  </pre>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-between bg-slate-900/90">
              <span className="text-xs text-slate-500">
                符合剪映 (CapCut / JianYing) 字幕导入标准
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
                      const rows = shots.map(s => {
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
                          esc(s.prompts?.midjourney || ''),
                          esc(s.prompts?.flux || ''),
                          esc(s.prompts?.jimeng || '')
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
                      const allPrompts = shots.map(s => `Shot ${String(s.shotNumber).padStart(2, '0')}: ${s.prompts?.midjourney || ''}`).join('\n\n');
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

// 挂载 React 根节点
const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(<App />);
}
