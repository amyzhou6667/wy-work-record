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
    name: '古风权谋 / 反派女帝',
    text: `夕阳西下，漫天霞光给偌大个京城蒙上了一层柔软的光晕。
时不虞靠着马车抬头看了许久，直到身边的人提醒：“姑娘，他回来了。”
眨了眨眼，时不虞收回视线看向不远处的言宅。
步入正堂，背对着她而立的男人转过身来，那是一张出乎她预料的俊秀面孔。
两人对视一眼，男子率先行礼：“在下言十安。”
“时不虞。”时不虞自报家门，在左侧挑了张椅子坐下：“三日后便要抄斩的时家，我就是那个灾星。”
言十安笑了：“灾星想做什么？”
“既是灾星，自是要带来些灾难才对得起这名号，比如……”时不虞微微往前倾身：“掀了他的皇位。”`,
    characters: [
      {
        id: 'char_sby',
        name: '时不虞',
        roleType: 'protagonist',
        gender: 'female',
        ageGroup: '19yo',
        appearancePrompt: 'a 19-year-old calm and sharp Asian noble strategist lady, dressed in elegant understated robes, deep intelligent gaze, composed smile',
        crefUrl: ''
      },
      {
        id: 'char_ysa',
        name: '言十安',
        roleType: 'protagonist',
        gender: 'male',
        ageGroup: '22yo',
        appearancePrompt: 'a 22-year-old handsome refined Asian noble lord, wearing clean white silk robes, subtle sharp observant eyes',
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
  const [activeModelTab, setActiveModelTab] = useState('midjourney'); // 'midjourney' | 'flux' | 'jimeng'
  const [copiedKey, setCopiedKey] = useState(null);
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

  const isLLMConfigured = !!(llmConfig && llmConfig.baseUrl && llmConfig.apiKey);

  const saveLLMConfig = (newConfig) => {
    setLlmConfig(newConfig);
    try {
      localStorage.setItem('asbs_llm_config', JSON.stringify(newConfig));
    } catch {}
  };

  // 通用离线高容错分镜生成器
  const generateOfflineShots = (text, currentChars, ar) => {
    if (!text || !text.trim()) return [];
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const resultShots = [];
    let shotNum = 1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (/^(?:第\s*[0-9一二三四两五六七八九十百千万]+\s*[章回节集部卷篇]|Chapter\s+\d+|Episode\s+\d+|序章|引子|尾声)/i.test(line) && line.length < 35) {
        continue;
      }

      const quoteMatch = line.match(/[“"「]([^”"」]+)[”"」]/);
      let dialogue = undefined;
      let speaker = '';

      if (quoteMatch && quoteMatch.index !== undefined) {
        const textPart = quoteMatch[1];
        const before = line.slice(0, quoteMatch.index).trim();
        const clauses = before.split(/[，,。；;！!？?]/).filter(c => c.trim());
        const lastClause = (clauses[clauses.length - 1] || before).trim();

        const isPureAdverb = /^(?:冷声|沉声|轻声|厉声|低声|柔声|转头|抬头|皱眉|笑着|微笑|怒|冷笑)?(?:提醒|说道|说|道|喊|喝道|答道|心想|暗道)[:：]?$/.test(lastClause);
        if (!isPureAdverb) {
          const speakerMatch = lastClause.match(/(?:直到|身旁的|迎出来的)?([\u4e00-\u9fa5]{2,6}?)(?:提醒|说道|说|冷笑道|冷笑|沉声|轻声|怒斥|问道|道|喊|喝道|答道|心想|暗道)[:：]?$/);
          if (speakerMatch && speakerMatch[1] && !/^(?:冷声|沉声|轻声|厉声|低声|柔声)$/.test(speakerMatch[1])) {
            speaker = speakerMatch[1];
          }
        }

        if (!speaker) {
          const charInLast = currentChars.find(c => lastClause.includes(c.name));
          if (charInLast) speaker = charInLast.name;
        }

        if (!speaker) {
          const known = currentChars.find(c => before.includes(c.name));
          if (known) speaker = known.name;
        }

        if (!speaker) {
          const actionMatch = before.match(/^([\u4e00-\u9fa5]{2,4}?)(?=[，,\s:：]|目光|面色|神色|神情|嘴角|握紧|站在|倒退|大步|踏空|冷笑|沉声|轻声|怒斥|问道|说道|道|喊|喝道|答道|说|心想|暗道|抬手|转身|冷哼)/);
          speaker = actionMatch ? actionMatch[1] : '';
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

      const activeChars = currentChars.filter(c =>
        (speaker && c.name.includes(speaker)) || line.includes(c.name)
      );
      const characterIds = activeChars.map(c => c.id);
      const charPrompt = activeChars.map(c => c.appearancePrompt).join(' and ');
      const arParam = `--ar ${ar}`;

      const cleanAction = line.replace(/[“"「][^”"」]+[”"」]/g, '').trim() || line;
      const characterAction = hasDialogue
        ? `${dialogue.speaker}情感张力迸发，神情专注沉浸 (${cleanAction.slice(0, 24)}...)`
        : `场景与人物动势推进，氛围渐入高潮 (${cleanAction.slice(0, 28)}...)`;

      const environmentLighting = i % 2 === 0
        ? '电影主光侧打，明暗对比立体，高光与阴影过渡柔和'
        : '环境通透自然柔光，边缘光勾勒主体轮廓，景深层次丰富';

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

  // 初始加载首屏自动生成
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
    setLoadingTip(isLLMConfigured
      ? `好莱坞导演 AI (${llmConfig.model}) 正在深度解构剧本与生成多模型 Prompt...`
      : '正在通过离线智能引擎进行分镜视听结构拆解...');

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

      if (!response.ok) throw new Error(`HTTP 错误 ${response.status}`);
      const res = await response.json();

      if (res.code === 0 && res.data && res.data.shots?.length > 0) {
        setShots(res.data.shots);
        setSelectedShotIndex(0);
        setCopyGlobalNotice(true);
        setTimeout(() => setCopyGlobalNotice(false), 2500);
      } else {
        throw new Error('未返回有效镜头数据');
      }
    } catch (err) {
      console.warn('AI 拆解失败，转为离线智能算法:', err);
      const offlineShots = generateOfflineShots(novelText, characters, aspectRatio);
      setShots(offlineShots);
      setSelectedShotIndex(0);
      alert(`AI 拆解服务提示：${err.message || '网络请求超时'}。已自动使用高容错离线规则为您拆解分镜！`);
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

  // 当前选中的分镜镜头
  const currentSelectedShot = shots[selectedShotIndex] || shots[0] || null;

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

  const copyToClipboard = (text, key) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    if (key) {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1800);
    } else {
      setCopyGlobalNotice(true);
      setTimeout(() => setCopyGlobalNotice(false), 2000);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-slate-950 text-slate-100 font-sans selection:bg-indigo-600 selection:text-white overflow-hidden">
      {/* 顶部控制台导航栏 */}
      <header className="flex-none bg-slate-900/95 backdrop-blur border-b border-slate-800 px-6 py-2.5 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center font-bold text-white shadow-indigo-500/20 shadow-lg text-sm">
            AI
          </div>
          <div>
            <h1 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
              AI-StoryBoard-Studio
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                三栏专业分镜工场 v2.0
              </span>
            </h1>
            <p className="text-[11px] text-slate-400">小说文本 ➔ 影视级分镜 ➔ 右侧常驻 Prompt 视窗 ➔ 剪映 SRT 字幕</p>
          </div>
        </div>

        {/* 顶部控制区 */}
        <div className="flex items-center gap-3">
          {/* 画幅切换 */}
          <div className="flex items-center bg-slate-800 p-0.5 rounded-lg border border-slate-700">
            <button
              onClick={() => {
                setAspectRatio('9:16');
                setShots(generateOfflineShots(novelText, characters, '9:16'));
              }}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition ${
                aspectRatio === '9:16' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              📱 9:16 竖屏短剧
            </button>
            <button
              onClick={() => {
                setAspectRatio('16:9');
                setShots(generateOfflineShots(novelText, characters, '16:9'));
              }}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition ${
                aspectRatio === '16:9' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              🎬 16:9 电影横屏
            </button>
          </div>

          {/* 剪映配音语速滑块 */}
          <div className="flex items-center gap-2 bg-slate-800 px-3 py-1 rounded-lg border border-slate-700">
            <span className="text-xs text-slate-400">配音语速:</span>
            <input
              type="range"
              min="3.5"
              max="6.0"
              step="0.1"
              value={speedWps}
              onChange={(e) => setSpeedWps(parseFloat(e.target.value))}
              className="w-14 cursor-pointer accent-indigo-500"
            />
            <span className="text-xs font-mono text-indigo-400 font-semibold">{speedWps} 字/秒</span>
          </div>

          {/* 角色资产库抽屉按钮 */}
          <button
            onClick={() => setShowCharDrawer(true)}
            className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
          >
            👤 角色库 ({characters.length})
          </button>

          {/* 大模型 API 配置按钮 */}
          <button
            onClick={() => setShowLLMModal(true)}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg border transition ${
              isLLMConfigured
                ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/40 hover:bg-emerald-900/50'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
            }`}
          >
            ⚙️ AI 模型配置
            <span className={`w-2 h-2 rounded-full ${isLLMConfigured ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
          </button>

          {/* 导出中心按钮 */}
          <button
            onClick={() => { setExportType('srt'); setShowExportModal(true); }}
            className="flex items-center gap-1.5 px-3.5 py-1 text-xs font-bold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition"
          >
            🚀 导出中心
          </button>
        </div>
      </header>

      {/* 快捷全局复制反馈 Toast */}
      {copyGlobalNotice && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 bg-emerald-500 text-slate-950 font-bold px-4 py-1.5 rounded-full text-xs shadow-xl transition-all">
          ✓ 操作成功完成！
        </div>
      )}

      {/* 加载中遮罩 */}
      {isLoading && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-semibold text-slate-200">{loadingTip || 'AI 正在处理中，请稍候...'}</p>
        </div>
      )}

      {/* 主体【三栏联动工作区】 */}
      <main className="flex-1 flex overflow-hidden p-3 gap-3">
        {/* 左栏 (28% 宽度)：小说原著与拆解控制区 */}
        <section className="w-[28%] flex flex-col bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          <div className="px-3.5 py-2.5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-200">📖 小说剧本文本</span>
              <span className="text-[11px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                {novelText.replace(/\s+/g, '').length} 字
              </span>
            </div>

            {/* 范例下拉 */}
            <div className="flex items-center gap-1 text-[11px]">
              <span className="text-slate-400">范例:</span>
              <select
                onChange={(e) => handleSelectSample(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-indigo-300 text-xs rounded px-1.5 py-0.5 focus:outline-none"
              >
                <option value="zhanshen">都市战神</option>
                <option value="xuanhuan">东方玄幻</option>
                <option value="suspense">古风权谋/反派女帝</option>
              </select>
            </div>
          </div>

          <div className="p-3 border-b border-slate-800 bg-slate-950/60 flex flex-col gap-2">
            <textarea
              value={novelText}
              onChange={(e) => setNovelText(e.target.value)}
              placeholder="在此粘贴任意小说或剧本文档..."
              className="w-full h-36 p-2.5 bg-slate-900/90 border border-slate-800 rounded-lg text-xs font-mono text-slate-300 focus:outline-none focus:border-indigo-500 transition resize-none leading-relaxed"
            />

            {/* 拆解按钮组 */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleAIDecompose}
                disabled={isLoading}
                className="flex-1 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/20 transition disabled:opacity-50"
              >
                🤖 AI 智能拆解 {isLLMConfigured ? `(${llmConfig.model})` : ''}
              </button>
              <button
                onClick={handleOfflineDecompose}
                disabled={isLoading}
                className="px-2.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-lg text-xs border border-slate-700 transition"
                title="本地离线规则秒级拆解"
              >
                ⚡ 本地规则
              </button>
            </div>
          </div>

          {/* 段落定位视窗 */}
          <div className="flex-1 p-2.5 overflow-y-auto space-y-1.5">
            <div className="text-[11px] font-semibold text-slate-400 mb-1 flex items-center justify-between">
              <span>段落对照列表 ({shots.length} 个镜头)：</span>
              <span className="text-[10px] text-slate-500">点击选中高亮</span>
            </div>
            {shots.map((shot, idx) => (
              <div
                key={shot.id}
                onClick={() => setSelectedShotIndex(idx)}
                className={`p-2 rounded-lg transition cursor-pointer border text-xs ${
                  selectedShotIndex === idx
                    ? 'bg-indigo-600/20 border-indigo-500 text-indigo-200 shadow-sm'
                    : 'bg-slate-950/40 border-slate-800/80 hover:border-slate-700 text-slate-400'
                }`}
              >
                <div className="flex items-center justify-between text-[11px] mb-0.5">
                  <span className="font-mono font-bold text-indigo-400">Shot #{String(shot.shotNumber).padStart(2, '0')}</span>
                  <span className="text-slate-500">{shot.shotSize}</span>
                </div>
                <p className="line-clamp-2 leading-tight text-slate-300 text-[11px]">{shot.matchedParagraph || shot.matchedSourceParagraph}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 中栏 (40% 宽度)：影视级分镜镜头流 (Shot Stream) */}
        <section className="w-[40%] flex flex-col bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          <div className="px-4 py-2.5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-200">🎬 镜头流卡片</span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 font-semibold">
                共 {shots.length} 镜 / 约 {Math.round(shots.reduce((acc, s) => acc + (s.durationSec || 2.5), 0))} 秒
              </span>
            </div>
            <span className="text-[11px] text-slate-400">对白: {srtList.length} 句</span>
          </div>

          <div className="flex-1 p-3 overflow-y-auto space-y-3">
            {shots.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center p-6 text-center text-slate-500">
                <span className="text-4xl mb-2">🎬</span>
                <p className="text-xs">暂无分镜数据，请在左侧输入文本后点击【AI 智能拆解】</p>
              </div>
            ) : (
              shots.map((shot, idx) => {
                const isSelected = selectedShotIndex === idx;

                return (
                  <div
                    key={shot.id}
                    onClick={() => setSelectedShotIndex(idx)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-slate-800/95 border-indigo-500 shadow-xl ring-2 ring-indigo-500/40'
                        : 'bg-slate-800/40 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {/* 卡片头部信息 */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono text-xs font-bold px-1.5 py-0.5 rounded bg-indigo-600 text-white">
                          #{String(shot.shotNumber).padStart(2, '0')}
                        </span>
                        <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-400 border border-sky-500/30">
                          {shot.shotSize}
                        </span>
                        <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                          {shot.cameraMovement}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          ⏱️ {shot.durationSec}s
                        </span>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setRefineTargetShot(shot);
                          setShowRefineModal(true);
                        }}
                        className="text-[11px] px-2 py-0.5 rounded bg-slate-700 hover:bg-slate-600 text-indigo-300 border border-slate-600 transition"
                      >
                        ✨ AI 润色
                      </button>
                    </div>

                    {/* 动作神态 */}
                    <div className="text-xs text-slate-300 mb-1.5 leading-snug">
                      <span className="text-slate-400 font-semibold">🎭 动作: </span>
                      {shot.characterAction}
                    </div>

                    {/* 对白台词 */}
                    {shot.dialogue && (
                      <div className="text-xs bg-slate-950/60 p-2 rounded-lg border border-slate-800 text-slate-200 italic mb-1.5">
                        <span className="text-indigo-400 font-bold not-italic">[{shot.dialogue.speaker}]: </span>
                        “{shot.dialogue.text}”
                      </div>
                    )}

                    {/* 底部光影与提示词缩略 */}
                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/80">
                      <span className="truncate max-w-[200px]">💡 {shot.environmentLighting}</span>
                      <span className="text-indigo-400 font-semibold hover:underline">
                        {isSelected ? '👉 右侧编辑 Prompt' : '查看 Prompt'}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* 右栏 (32% 宽度常驻视窗)：【🎯 核心多模型 Prompt 展示与参数控制板块】 */}
        <section className="flex-1 flex flex-col bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          <div className="px-4 py-2.5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
                🎯 镜头生图 Prompt 视窗
              </span>
              {currentSelectedShot && (
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-indigo-600/30 text-indigo-300 border border-indigo-500/40">
                  Shot #{String(currentSelectedShot.shotNumber).padStart(2, '0')}
                </span>
              )}
            </div>

            {/* 模型选项卡 */}
            <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800">
              <button
                onClick={() => setActiveModelTab('midjourney')}
                className={`px-2 py-1 text-xs font-bold rounded-md transition ${
                  activeModelTab === 'midjourney' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Midjourney
              </button>
              <button
                onClick={() => setActiveModelTab('flux')}
                className={`px-2 py-1 text-xs font-bold rounded-md transition ${
                  activeModelTab === 'flux' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Flux.1
              </button>
              <button
                onClick={() => setActiveModelTab('jimeng')}
                className={`px-2 py-1 text-xs font-bold rounded-md transition ${
                  activeModelTab === 'jimeng' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                即梦双语
              </button>
            </div>
          </div>

          {currentSelectedShot ? (
            <div className="flex-1 p-4 flex flex-col gap-3 overflow-y-auto">
              {/* 当前镜头视听标签摘要 */}
              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-indigo-400 font-bold">{currentSelectedShot.shotSize}</span>
                    <span className="text-slate-500">|</span>
                    <span className="text-amber-400">{currentSelectedShot.cameraMovement}</span>
                    <span className="text-slate-500">|</span>
                    <span className="text-slate-300 font-mono">{currentSelectedShot.durationSec}s</span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">画幅: {aspectRatio}</span>
                </div>
                <div className="text-xs text-slate-300 line-clamp-2">
                  <span className="text-slate-500 font-semibold">动作: </span>
                  {currentSelectedShot.characterAction}
                </div>
                {currentSelectedShot.dialogue && (
                  <div className="text-xs text-indigo-300 italic">
                    <span className="text-slate-500 not-italic font-semibold">台词: </span>
                    “{currentSelectedShot.dialogue.text}”
                  </div>
                )}
              </div>

              {/* 核心生图 Prompt 展示与编辑区 */}
              <div className="flex-1 flex flex-col bg-slate-950 rounded-xl border border-slate-800 p-3 shadow-inner">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800/80">
                  <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    📋 {activeModelTab === 'midjourney' ? 'Midjourney v6.1 专业提示词' : (activeModelTab === 'flux' ? 'Flux.1 胶片摄影长文描述' : '即梦 / 通用双语精炼提示词')}
                  </span>
                  <button
                    onClick={() => copyToClipboard(currentSelectedShot.prompts?.[activeModelTab] || '', 'current_prompt')}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition flex items-center gap-1 ${
                      copiedKey === 'current_prompt'
                        ? 'bg-emerald-500 text-slate-950'
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow'
                    }`}
                  >
                    {copiedKey === 'current_prompt' ? '✓ 已复制 Prompt' : '📋 一键复制'}
                  </button>
                </div>

                <textarea
                  value={currentSelectedShot.prompts?.[activeModelTab] || ''}
                  onChange={(e) => {
                    const newPrompt = e.target.value;
                    setShots(shots.map((s, idx) => idx === selectedShotIndex ? {
                      ...s,
                      prompts: {
                        ...s.prompts,
                        [activeModelTab]: newPrompt
                      }
                    } : s));
                  }}
                  placeholder="提示词生成中..."
                  className="flex-1 w-full p-2.5 bg-transparent border-0 text-xs font-mono text-emerald-300 focus:outline-none resize-none leading-relaxed select-all"
                />

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
                  <span>支持就地直接编辑修改，修改实时生效</span>
                  <span>{currentSelectedShot.prompts?.[activeModelTab]?.length || 0} 字符</span>
                </div>
              </div>

              {/* 快捷批量操作工具 */}
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-400 font-semibold">全集生图处理:</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const all = shots.map(s => `Shot ${String(s.shotNumber).padStart(2, '0')}: ${s.prompts?.[activeModelTab] || ''}`).join('\n\n');
                      copyToClipboard(all, 'all_prompts');
                    }}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition ${
                      copiedKey === 'all_prompts'
                        ? 'bg-emerald-500 text-slate-950 font-bold border-transparent'
                        : 'bg-slate-800 hover:bg-slate-700 text-indigo-300 border-slate-700'
                    }`}
                  >
                    {copiedKey === 'all_prompts' ? '✓ 已复制全集 Prompt' : '📋 复制全集 Prompt'}
                  </button>
                  <button
                    onClick={() => { setExportType('prompts'); setShowExportModal(true); }}
                    className="px-3 py-1.5 text-xs font-bold rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/40 transition"
                  >
                    🚀 批量导出清单
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-slate-500 text-center">
              <span className="text-4xl mb-2">🎯</span>
              <p className="text-xs">请在中间选择一个镜头以查看并调试其 Prompt 提示词</p>
            </div>
          )}
        </section>
      </main>

      {/* 大模型 API 配置弹窗 (LLM Modal) */}
      {showLLMModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
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

              <div className="p-2.5 rounded-lg bg-indigo-950/40 border border-indigo-500/30 text-[11px] text-indigo-300 leading-relaxed">
                💡 推荐配置 DeepSeek-V3 (`deepseek-chat`) 或本地 Ollama。配置后拆解分镜将享受好莱坞导演级视听语言与精准 Prompt 输出。
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowLLMModal(false)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-xs"
              >
                保存配置并关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 单镜头 AI 润色弹窗 (Refine Modal) */}
      {showRefineModal && refineTargetShot && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                ✨ 导演级 AI 单镜润色 (Shot #{refineTargetShot.shotNumber})
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
                placeholder="例如：将景别调整为大特写，眼神增加杀气与冷笑，背景强化冷雨闪电剪影..."
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
              <button onClick={() => setShowCharDrawer(false)} className="text-slate-400 hover:text-white text-lg font-bold">
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
                    gender: 'female',
                    ageGroup: '20yo',
                    appearancePrompt: 'a 20-year-old Asian character with distinctive facial features'
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
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
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
                    <button onClick={() => copyToClipboard(srtString)} className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold">
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
                    {shots.map(s => `Shot #${String(s.shotNumber).padStart(2, '0')}: ${s.prompts?.midjourney || ''}`).join('\n\n')}
                  </pre>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-between bg-slate-900/90">
              <span className="text-xs text-slate-500">符合剪映 (CapCut / JianYing) 字幕导入标准</span>
              <div className="flex items-center gap-3">
                <button onClick={() => setShowExportModal(false)} className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition">
                  关闭
                </button>
                {exportType === 'srt' && (
                  <button onClick={() => downloadFile(srtString, 'drama_subtitles.srt', 'text/plain;charset=utf-8')} className="px-5 py-2 text-xs font-bold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg transition">
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
                      const allPrompts = shots.map(s => `Shot #${String(s.shotNumber).padStart(2, '0')}: ${s.prompts?.midjourney || ''}`).join('\n\n');
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
