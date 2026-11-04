// @ts-nocheck
const { useState, useEffect, useMemo, useRef } = React;
const {
  Button,
  Modal,
  Input,
  Select,
  Slider,
  Tag,
  Tooltip,
  Space,
  Card,
  Dropdown,
  ConfigProvider,
  theme,
  message
} = antd;

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
  const [activeTabMap, setActiveTabMap] = useState({}); // 每个镜头的当前模型tab { [shotId]: 'midjourney' | 'flux' | 'jimeng' }
  const [activeModelTab, setActiveModelTab] = useState('midjourney'); // 右侧 Prompt 视窗当前选中的模型
  const [copiedKey, setCopiedKey] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingTip, setLoadingTip] = useState('');

  // 弹窗状态管理 (全部采用 Modal 弹窗)
  const [showCharModal, setShowCharModal] = useState(false);
  const [showLLMModal, setShowLLMModal] = useState(false);
  const [showRefineModal, setShowRefineModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  const [refineTargetShot, setRefineTargetShot] = useState(null);
  const [refineInstruction, setRefineInstruction] = useState('');
  const [exportType, setExportType] = useState('srt');

  // 大模型配置状态
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

        // 识别“身边的人提醒”等第三人引语动词
        const thirdPartyMatch = lastClause.match(/(?:直到|身旁的|迎出来的|门外的)([\u4e00-\u9fa5]{2,5}?)(?:提醒|说道|说|道|高呼|喊道)[:：]?$/);
        if (thirdPartyMatch && thirdPartyMatch[1]) {
          speaker = thirdPartyMatch[1];
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
        : '环境漫反射自然柔光，边缘轮廓光勾勒角色轮廓';

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

  // 执行 AI 智能拆解
  const handleAIDecompose = async () => {
    if (!novelText.trim()) {
      Modal.warning({ title: '提示', content: '请先输入小说剧本文本！' });
      return;
    }

    setIsLoading(true);
    setLoadingTip(isLLMConfigured
      ? `好莱坞导演 AI (${llmConfig.model}) 正在深度解构剧本与生成生图 Prompt...`
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
        message.success('🎬 分镜拆解与生图 Prompt 生成完成！');
      } else {
        throw new Error('未返回有效镜头数据');
      }
    } catch (err) {
      console.warn('AI 拆解失败，转为离线智能算法:', err);
      const offlineShots = generateOfflineShots(novelText, characters, aspectRatio);
      setShots(offlineShots);
      setSelectedShotIndex(0);
      Modal.info({
        title: '分镜生成提示',
        content: `大模型请求异常（${err.message || '网络超时'}），已自动启用高容错离线规则为您拆解分镜与生成 Prompt！`
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 本地离线规则拆解
  const handleOfflineDecompose = () => {
    if (!novelText.trim()) {
      setShots([]);
      return;
    }
    const result = generateOfflineShots(novelText, characters, aspectRatio);
    setShots(result);
    setSelectedShotIndex(0);
    message.success('⚡ 本地规则拆解完成！');
  };

  // 单镜头 AI 润色
  const handleRefineShot = async () => {
    if (!refineTargetShot || !refineInstruction.trim()) return;

    setIsLoading(true);
    setLoadingTip(`正在根据指令润色 Shot #${refineTargetShot.shotNumber}...`);

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
        message.success(`Shot #${refineTargetShot.shotNumber} 润色完成！`);
      }
    } catch (e) {
      console.error(e);
      message.error('润色请求失败，请稍后重试');
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
    message.info(`已载入：${sample.name}`);
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

  const copyToClipboard = (text, key) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    if (key) {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1800);
    }
    message.success('📋 已复制到剪贴板！');
  };

  // 当前选中镜头
  const currentSelectedShot = shots[selectedShotIndex] || shots[0] || null;

  return (
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: '#6366f1',
          colorBgContainer: '#0f172a',
          colorBgElevated: '#1e293b',
          colorBorder: '#334155',
          borderRadius: 8
        }
      }}
    >
      <div className="h-screen flex flex-col bg-slate-950 text-slate-100 font-sans selection:bg-indigo-600 selection:text-white overflow-hidden">
        {/* 顶部控制台导航栏 */}
        <header className="flex-none bg-slate-900/95 backdrop-blur border-b border-slate-800 px-6 py-2.5 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center font-bold text-white shadow-indigo-500/20 shadow-lg text-sm">
              AI
            </div>
            <div>
              <h1 className="text-base font-bold text-white tracking-wide flex items-center gap-2 m-0 leading-tight">
                AI-StoryBoard-Studio
                <Tag color="indigo" className="m-0 text-[11px] font-semibold border-indigo-500/30">
                  AntD 剧创分镜工场 v2.5
                </Tag>
              </h1>
              <p className="text-[11px] text-slate-400 m-0">小说剧本 ➔ 影视级分镜 ➔ 镜头下直读 Prompt ➔ 剪映 SRT 字幕</p>
            </div>
          </div>

          {/* 顶部工具栏 (全部使用 AntD 组件) */}
          <Space size="middle" align="center">
            {/* 画幅切换 */}
            <div className="flex items-center bg-slate-800 p-0.5 rounded-lg border border-slate-700">
              <Button
                type={aspectRatio === '9:16' ? 'primary' : 'text'}
                size="small"
                onClick={() => {
                  setAspectRatio('9:16');
                  setShots(generateOfflineShots(novelText, characters, '9:16'));
                }}
                className={aspectRatio === '9:16' ? 'font-semibold' : 'text-slate-400'}
              >
                📱 9:16 竖屏短剧
              </Button>
              <Button
                type={aspectRatio === '16:9' ? 'primary' : 'text'}
                size="small"
                onClick={() => {
                  setAspectRatio('16:9');
                  setShots(generateOfflineShots(novelText, characters, '16:9'));
                }}
                className={aspectRatio === '16:9' ? 'font-semibold' : 'text-slate-400'}
              >
                🎬 16:9 电影横屏
              </Button>
            </div>

            {/* 剪映配音语速滑块 */}
            <div className="flex items-center gap-2 bg-slate-800 px-3 py-0.5 rounded-lg border border-slate-700">
              <span className="text-xs text-slate-400">配音语速:</span>
              <div style={{ width: 80 }}>
                <Slider
                  min={3.5}
                  max={6.0}
                  step={0.1}
                  value={speedWps}
                  onChange={(val) => setSpeedWps(val)}
                  tooltip={{ formatter: (val) => `${val} 字/秒` }}
                />
              </div>
              <span className="text-xs font-mono text-indigo-400 font-semibold">{speedWps} 字/秒</span>
            </div>

            {/* 角色资产库按钮 (触发弹窗) */}
            <Button
              onClick={() => setShowCharModal(true)}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 text-xs"
            >
              👤 角色库 ({characters.length})
            </Button>

            {/* 大模型 API 配置按钮 (触发弹窗) */}
            <Button
              onClick={() => setShowLLMModal(true)}
              className={isLLMConfigured
                ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/40 hover:bg-emerald-900/50 text-xs'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 text-xs'}
            >
              ⚙️ AI 模型配置
              <span className={`w-2 h-2 ml-1 rounded-full inline-block ${isLLMConfigured ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
            </Button>

            {/* 导出中心按钮 */}
            <Button
              type="primary"
              onClick={() => { setExportType('srt'); setShowExportModal(true); }}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-md shadow-indigo-600/30 text-xs"
            >
              🚀 导出中心
            </Button>
          </Space>
        </header>

        {/* 主体【三栏联动工作区】：左栏剧本拆解 / 中栏视觉分镜流 / 右栏核心生图 Prompt 视窗 */}
        <main className="flex-1 flex overflow-hidden p-3 gap-3">
          {/* 左栏 (26% 宽度)：小说剧本输入与控制区 */}
          <section className="w-[26%] flex flex-col bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
            <div className="px-3.5 py-2.5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-200">📖 小说剧本文本</span>
                <Tag color="geekblue" className="font-mono text-[11px] m-0">
                  {novelText.replace(/\s+/g, '').length} 字
                </Tag>
              </div>

              {/* 范例选择 */}
              <Space size="small" align="center">
                <span className="text-[11px] text-slate-400">范例:</span>
                <Select
                  size="small"
                  defaultValue="zhanshen"
                  onChange={(val) => handleSelectSample(val)}
                  style={{ width: 130 }}
                  options={[
                    { value: 'zhanshen', label: '都市战神爽剧' },
                    { value: 'xuanhuan', label: '东方玄幻逆袭' },
                    { value: 'suspense', label: '古风权谋/女帝' }
                  ]}
                />
              </Space>
            </div>

            {/* 剧本输入区 (显式设定深黑底色与清晰白字，彻底杜绝白底白字) */}
            <div className="p-3 border-b border-slate-800 bg-slate-950/80 flex flex-col gap-2.5">
              <Input.TextArea
                value={novelText}
                onChange={(e) => setNovelText(e.target.value)}
                placeholder="在此粘贴任意网文小说、短剧剧本文本..."
                rows={6}
                style={{
                  backgroundColor: '#020617',
                  color: '#f8fafc',
                  borderColor: '#334155',
                  fontSize: '12px',
                  fontFamily: 'monospace',
                  lineHeight: '1.6'
                }}
                className="focus:border-indigo-500 rounded-lg selection:bg-indigo-600 selection:text-white"
              />

              {/* 智能拆解按钮组 */}
              <div className="flex items-center gap-2">
                <Button
                  type="primary"
                  onClick={handleAIDecompose}
                  loading={isLoading}
                  style={{
                    backgroundColor: '#6366f1',
                    borderColor: '#4f46e5',
                    color: '#ffffff',
                    fontWeight: 'bold',
                    fontSize: '12px'
                  }}
                  className="flex-1 shadow-md shadow-indigo-600/30"
                >
                  🤖 AI 智能拆解 {isLLMConfigured ? `(${llmConfig.model})` : ''}
                </Button>
                <Button
                  onClick={handleOfflineDecompose}
                  disabled={isLoading}
                  style={{
                    backgroundColor: '#1e293b',
                    borderColor: '#334155',
                    color: '#cbd5e1',
                    fontSize: '12px'
                  }}
                  title="本地离线规则秒级拆解"
                >
                  ⚡ 本地规则
                </Button>
              </div>
            </div>

            {/* 段落定位视窗 */}
            <div className="flex-1 p-2.5 overflow-y-auto space-y-1.5">
              <div className="text-[11px] font-semibold text-slate-400 mb-1 flex items-center justify-between">
                <span>镜头索引对照 ({shots.length} 镜)：</span>
                <span className="text-[10px] text-slate-500">点击高亮选中</span>
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
                  <p className="line-clamp-2 leading-tight text-slate-300 text-[11px] m-0">
                    {shot.matchedParagraph || shot.matchedSourceParagraph}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* 中栏 (40% 宽度)：影视级分镜瀑布流卡片 */}
          <section className="w-[40%] flex flex-col bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
            <div className="px-4 py-2.5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-200">🎬 工业级视觉分镜流</span>
                <Tag color="indigo" className="font-semibold text-[11px] m-0 border-indigo-500/30">
                  共 {shots.length} 镜 / 约 {Math.round(shots.reduce((acc, s) => acc + (s.durationSec || 2.5), 0))} 秒
                </Tag>
              </div>
              <span className="text-[11px] text-slate-400">剪映字幕: {srtList.length} 句</span>
            </div>

            <div className="flex-1 p-3 overflow-y-auto space-y-3">
              {shots.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center p-8 border border-dashed border-slate-800 rounded-xl bg-slate-950/40 text-center">
                  <span className="text-4xl mb-2">🎬</span>
                  <h3 className="text-sm font-bold text-slate-300 mb-1">等待分镜生成</h3>
                  <p className="text-xs text-slate-500 max-w-sm mb-4">
                    请在左侧输入小说剧本文本，点击【🤖 AI 智能拆解】即可实时生成分镜与 Prompt。
                  </p>
                  <Button type="primary" onClick={() => handleSelectSample('zhanshen')}>
                    载入都市战神示例
                  </Button>
                </div>
              ) : (
                shots.map((shot, idx) => {
                  const isSelected = selectedShotIndex === idx;
                  const cardPrompt = shot.prompts?.[activeModelTab] || shot.prompts?.midjourney || '';

                  return (
                    <Card
                      key={shot.id}
                      onClick={() => setSelectedShotIndex(idx)}
                      bodyStyle={{ padding: '12px 14px' }}
                      style={{
                        backgroundColor: isSelected ? '#1e293b' : '#0f172a',
                        borderColor: isSelected ? '#6366f1' : '#334155'
                      }}
                      className={`rounded-xl transition-all cursor-pointer shadow-md ${
                        isSelected ? 'ring-2 ring-indigo-500/40 shadow-indigo-500/10' : 'hover:border-slate-600'
                      }`}
                    >
                      {/* 1. 卡片头部信息徽标 */}
                      <div className="flex items-center justify-between mb-2">
                        <Space size={4} wrap>
                          <Tag color="indigo" className="font-mono font-bold text-[11px] m-0 px-1.5 py-0">
                            Shot #{String(shot.shotNumber).padStart(2, '0')}
                          </Tag>
                          <Tag color="cyan" className="font-medium text-[11px] m-0 px-1.5 py-0">
                            {shot.shotSize}
                          </Tag>
                          <Tag color="orange" className="font-medium text-[11px] m-0 px-1.5 py-0">
                            {shot.cameraMovement}
                          </Tag>
                          <Tag color="default" className="text-[11px] m-0 px-1.5 py-0 text-slate-400 font-mono">
                            ⏱️ {shot.durationSec}s
                          </Tag>
                        </Space>

                        <Button
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            setRefineTargetShot(shot);
                            setShowRefineModal(true);
                          }}
                          className="text-[11px] px-2 py-0 h-6 rounded bg-slate-800 text-indigo-300 border-slate-700 hover:border-indigo-500"
                        >
                          ✨ AI 润色
                        </Button>
                      </div>

                      {/* 2. 动作神态与台词 */}
                      <div className="text-[11px] text-slate-300 mb-1.5 leading-relaxed">
                        <span className="text-slate-400 font-semibold">🎭 动作: </span>
                        <span>{shot.characterAction}</span>
                      </div>

                      {shot.dialogue && (
                        <div className="text-[11px] bg-slate-950/70 p-2 rounded-lg border border-slate-800/90 text-slate-200 italic mb-1.5">
                          <span className="text-indigo-400 font-bold not-italic">[{shot.dialogue.speaker}]: </span>
                          “{shot.dialogue.text}”
                        </div>
                      )}

                      <div className="text-[11px] text-slate-400 mb-2 flex items-center justify-between">
                        <span className="truncate max-w-[200px]">💡 {shot.environmentLighting}</span>
                        <span className="text-[11px] text-indigo-400 font-semibold hover:underline">
                          {isSelected ? '👉 右侧编辑 Prompt' : '点击查看 Prompt'}
                        </span>
                      </div>

                      {/* 3. 卡片底部内嵌快捷 Prompt 复制条 (显式深暗黑底色与荧光绿文字，绝对杜绝白底白字) */}
                      <div
                        style={{
                          backgroundColor: '#020617',
                          color: '#34d399',
                          border: '1px solid #1e293b'
                        }}
                        className="prompt-preview-box rounded-lg p-2 flex items-center justify-between text-[11px] gap-2 shadow-inner"
                      >
                        <div className="flex-1 truncate font-mono text-emerald-300 text-[11px]">
                          <span className="text-slate-500 mr-1 font-sans text-[10px]">[{activeModelTab.toUpperCase()}]:</span>
                          {cardPrompt || '提示词生成中...'}
                        </div>
                        <Button
                          size="small"
                          type="primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            copyToClipboard(cardPrompt, `card_${shot.id}`);
                          }}
                          style={{
                            backgroundColor: copiedKey === `card_${shot.id}` ? '#10b981' : '#6366f1',
                            borderColor: 'transparent',
                            fontSize: '11px',
                            height: '22px',
                            padding: '0 8px',
                            fontWeight: 'bold'
                          }}
                        >
                          {copiedKey === `card_${shot.id}` ? '✓ 已复制' : '📋 复制'}
                        </Button>
                      </div>
                    </Card>
                  );
                })
              )}
            </div>
          </section>

          {/* 右栏 (34% 宽度常驻视窗)：【🎯 核心多模型 Prompt 展示与参数控制板块】 */}
          <section className="w-[34%] flex flex-col bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
            <div className="px-4 py-2.5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
                  🎯 镜头生图 Prompt 视窗
                </span>
                {currentSelectedShot && (
                  <Tag color="indigo" className="font-mono font-bold text-[11px] m-0 px-1.5 py-0">
                    Shot #{String(currentSelectedShot.shotNumber).padStart(2, '0')}
                  </Tag>
                )}
              </div>

              {/* 模型选项卡 */}
              <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800">
                <button
                  onClick={() => setActiveModelTab('midjourney')}
                  className={`px-2 py-0.5 text-xs font-bold rounded transition ${
                    activeModelTab === 'midjourney' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Midjourney
                </button>
                <button
                  onClick={() => setActiveModelTab('flux')}
                  className={`px-2 py-0.5 text-xs font-bold rounded transition ${
                    activeModelTab === 'flux' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Flux.1
                </button>
                <button
                  onClick={() => setActiveModelTab('jimeng')}
                  className={`px-2 py-0.5 text-xs font-bold rounded transition ${
                    activeModelTab === 'jimeng' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  即梦双语
                </button>
              </div>
            </div>

            {currentSelectedShot ? (
              <div className="flex-1 p-3 flex flex-col gap-2.5 overflow-y-auto">
                {/* 当前镜头属性快览 */}
                <div className="p-2.5 bg-slate-950/80 rounded-xl border border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Tag color="cyan" className="text-[11px] m-0 px-1.5 py-0">{currentSelectedShot.shotSize}</Tag>
                      <Tag color="orange" className="text-[11px] m-0 px-1.5 py-0">{currentSelectedShot.cameraMovement}</Tag>
                      <span className="text-[11px] text-slate-400 font-mono">⏱️ {currentSelectedShot.durationSec}s</span>
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono">画幅: {aspectRatio}</span>
                  </div>
                  <div className="text-[11px] text-slate-300 line-clamp-2">
                    <span className="text-slate-500 font-semibold">动作: </span>
                    {currentSelectedShot.characterAction}
                  </div>
                  {currentSelectedShot.dialogue && (
                    <div className="text-[11px] text-indigo-300 italic">
                      <span className="text-slate-500 not-italic font-semibold">台词: </span>
                      “{currentSelectedShot.dialogue.text}”
                    </div>
                  )}
                </div>

                {/* 核心生图 Prompt 展示与编辑区 (显式设定深暗黑底色、荧光绿文字，彻底杜绝白底白字) */}
                <div className="flex-1 flex flex-col bg-slate-950 rounded-xl border border-slate-800 p-3 shadow-inner">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800/80">
                    <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      📋 {activeModelTab === 'midjourney' ? 'Midjourney v6.1 专业提示词' : (activeModelTab === 'flux' ? 'Flux.1 胶片摄影长文描述' : '即梦 / 通用双语精炼提示词')}
                    </span>
                    <Button
                      type="primary"
                      size="small"
                      onClick={() => copyToClipboard(currentSelectedShot.prompts?.[activeModelTab] || '', 'current_prompt')}
                      style={{
                        backgroundColor: copiedKey === 'current_prompt' ? '#10b981' : '#6366f1',
                        borderColor: 'transparent',
                        fontWeight: 'bold',
                        fontSize: '11px'
                      }}
                    >
                      {copiedKey === 'current_prompt' ? '✓ 已复制 Prompt' : '📋 一键复制 Prompt'}
                    </Button>
                  </div>

                  {/* 提示词编辑框 (内联样式强制深黑背景 + 高亮绿文字) */}
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
                    style={{
                      backgroundColor: '#020617',
                      color: '#34d399',
                      border: '1px solid #334155',
                      minHeight: '150px',
                      fontSize: '12px',
                      lineHeight: '1.6',
                      fontFamily: 'monospace'
                    }}
                    className="prompt-textarea flex-1 w-full p-2.5 rounded-lg focus:outline-none focus:border-indigo-500 resize-none leading-relaxed select-all"
                  />

                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
                    <span>支持就地直接编辑修改，实时保存</span>
                    <span className="font-mono text-slate-400">{currentSelectedShot.prompts?.[activeModelTab]?.length || 0} 字符</span>
                  </div>
                </div>

                {/* 快捷批量操作工具 */}
                <div className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-800 flex items-center justify-between">
                  <span className="text-xs text-slate-400 font-semibold">全集生图处理:</span>
                  <div className="flex items-center gap-2">
                    <Button
                      size="small"
                      onClick={() => {
                        const all = shots.map(s => `Shot #${String(s.shotNumber).padStart(2, '0')}: ${s.prompts?.[activeModelTab] || ''}`).join('\n\n');
                        copyToClipboard(all, 'all_prompts');
                      }}
                      style={{
                        backgroundColor: copiedKey === 'all_prompts' ? '#10b981' : '#1e293b',
                        borderColor: '#334155',
                        color: copiedKey === 'all_prompts' ? '#ffffff' : '#a5b4fc',
                        fontSize: '11px'
                      }}
                    >
                      {copiedKey === 'all_prompts' ? '✓ 已复制全集 Prompt' : '📋 复制全集 Prompt'}
                    </Button>
                    <Button
                      size="small"
                      type="primary"
                      onClick={() => { setExportType('prompts'); setShowExportModal(true); }}
                      style={{ fontSize: '11px' }}
                    >
                      🚀 批量导出清单
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-slate-500 text-center">
                <span className="text-4xl mb-2">🎯</span>
                <p className="text-xs">请在左侧输入文本并拆解分镜，或在中间选择一个镜头</p>
              </div>
            )}
          </section>
        </main>

        {/* 弹窗 1：角色一致性管理弹窗 (采用 AntD Modal) */}
        <Modal
          title={<span className="text-white font-bold flex items-center gap-2">👤 角色一致性资产库</span>}
          open={showCharModal}
          onCancel={() => setShowCharModal(false)}
          width={650}
          footer={[
            <Button key="add" onClick={() => {
              const newChar = {
                id: `char_${Date.now()}`,
                name: `新角色 ${characters.length + 1}`,
                roleType: 'protagonist',
                gender: 'male',
                ageGroup: '25yo',
                appearancePrompt: 'a 25-year-old Asian character with distinctive facial features, wearing modern clothing'
              };
              setCharacters([...characters, newChar]);
            }}>
              + 添加新角色
            </Button>,
            <Button key="save" type="primary" onClick={() => {
              setShowCharModal(false);
              setShots(generateOfflineShots(novelText, characters, aspectRatio));
              message.success('角色库已更新并刷新分镜！');
            }}>
              保存并应用到分镜
            </Button>
          ]}
        >
          <p className="text-xs text-slate-400 mb-3">
            在此锁死主角与配角的英文外貌特征词（Prompt），分镜生成时自动注入，确保跨镜头生图角色不走形。
          </p>

          <div className="max-h-[50vh] overflow-y-auto space-y-3 pr-1">
            {characters.map((char, index) => (
              <div key={char.id} className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <Input
                    value={char.name}
                    onChange={(e) => {
                      const next = [...characters];
                      next[index].name = e.target.value;
                      setCharacters(next);
                    }}
                    style={{ width: 150, fontWeight: 'bold', color: '#818cf8' }}
                    placeholder="角色中文名"
                  />
                  <Button
                    danger
                    type="text"
                    size="small"
                    onClick={() => setCharacters(characters.filter((_, i) => i !== index))}
                  >
                    删除角色
                  </Button>
                </div>

                <div>
                  <label className="text-[11px] text-slate-500 block mb-1">英文外观特征词 (Prompt):</label>
                  <Input.TextArea
                    value={char.appearancePrompt}
                    onChange={(e) => {
                      const next = [...characters];
                      next[index].appearancePrompt = e.target.value;
                      setCharacters(next);
                    }}
                    rows={2}
                    style={{ fontSize: '11px', fontFamily: 'monospace', backgroundColor: '#0f172a', color: '#cbd5e1' }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Modal>

        {/* 弹窗 2：大模型服务配置弹窗 (采用 AntD Modal) */}
        <Modal
          title={<span className="text-white font-bold flex items-center gap-2">⚙️ 大模型服务配置 (OpenAI 兼容协议)</span>}
          open={showLLMModal}
          onCancel={() => setShowLLMModal(false)}
          onOk={() => {
            setShowLLMModal(false);
            message.success('大模型配置已保存！');
          }}
          okText="保存配置"
          cancelText="取消"
          width={520}
        >
          <div className="space-y-3 pt-2 text-xs">
            <div>
              <label className="text-slate-400 block mb-1">API Base URL (端点地址):</label>
              <Input
                value={llmConfig.baseUrl}
                onChange={(e) => saveLLMConfig({ ...llmConfig, baseUrl: e.target.value })}
                placeholder="https://api.deepseek.com/v1 或 http://localhost:11434/v1"
                style={{ fontFamily: 'monospace' }}
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1">API Key (密钥，本地 Ollama 可留空):</label>
              <Input.Password
                value={llmConfig.apiKey}
                onChange={(e) => saveLLMConfig({ ...llmConfig, apiKey: e.target.value })}
                placeholder="sk-..."
                style={{ fontFamily: 'monospace' }}
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1">模型代号 (Model Name):</label>
              <Input
                value={llmConfig.model}
                onChange={(e) => saveLLMConfig({ ...llmConfig, model: e.target.value })}
                placeholder="deepseek-chat / gpt-4o / qwen2.5:14b"
                style={{ fontFamily: 'monospace' }}
              />
            </div>

            <div className="p-2.5 rounded-lg bg-indigo-950/40 border border-indigo-500/30 text-[11px] text-indigo-300 leading-relaxed">
              💡 支持直连 DeepSeek-V3 (`deepseek-chat`)、OpenAI 或本地 Ollama。配置后将在分镜拆解时享受好莱坞导演级视听拆解与精准生图 Prompt 输出。
            </div>
          </div>
        </Modal>

        {/* 弹窗 3：单镜头 AI 润色弹窗 (采用 AntD Modal) */}
        <Modal
          title={
            <span className="text-white font-bold flex items-center gap-2">
              ✨ 导演级 AI 单镜润色 {refineTargetShot ? `(Shot #${refineTargetShot.shotNumber})` : ''}
            </span>
          }
          open={showRefineModal}
          onCancel={() => setShowRefineModal(false)}
          onOk={handleRefineShot}
          okText="立即润色并应用"
          cancelText="取消"
          confirmLoading={isLoading}
          width={560}
        >
          {refineTargetShot && (
            <div className="space-y-3 pt-2 text-xs">
              <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 text-slate-400 font-mono text-[11px]">
                当前分镜：[{refineTargetShot.shotSize}] [{refineTargetShot.cameraMovement}] {refineTargetShot.characterAction}
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">修改意见 / 导演指令：</label>
                <Input.TextArea
                  value={refineInstruction}
                  onChange={(e) => setRefineInstruction(e.target.value)}
                  placeholder="例如：改为大特写，眼神增加杀气与冷笑，背景强化冷雨闪电剪影..."
                  rows={3}
                  style={{ backgroundColor: '#020617', color: '#f8fafc', borderColor: '#334155' }}
                />
              </div>
            </div>
          )}
        </Modal>

        {/* 弹窗 4：物料导出中心弹窗 (采用 AntD Modal) */}
        <Modal
          title={<span className="text-white font-bold flex items-center gap-2">🚀 工业物料导出中心</span>}
          open={showExportModal}
          onCancel={() => setShowExportModal(false)}
          width={750}
          footer={null}
        >
          <div className="pt-2 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <Space>
                <Button
                  type={exportType === 'srt' ? 'primary' : 'default'}
                  onClick={() => setExportType('srt')}
                  size="small"
                >
                  📄 剪映标准 SRT 字幕 ({srtList.length}条)
                </Button>
                <Button
                  type={exportType === 'csv' ? 'primary' : 'default'}
                  onClick={() => setExportType('csv')}
                  size="small"
                >
                  📊 影视分镜表 (.CSV)
                </Button>
                <Button
                  type={exportType === 'prompts' ? 'primary' : 'default'}
                  onClick={() => setExportType('prompts')}
                  size="small"
                >
                  📋 全集生图 Prompt 清单
                </Button>
              </Space>

              {exportType === 'srt' && (
                <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeSpeaker}
                    onChange={(e) => setIncludeSpeaker(e.target.checked)}
                    className="accent-indigo-500 rounded"
                  />
                  <span>包含角色名前缀</span>
                </label>
              )}
            </div>

            {/* 导出预览区 */}
            <div className="max-h-72 overflow-y-auto">
              {exportType === 'srt' && (
                <pre className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs font-mono text-emerald-400 leading-relaxed m-0">
                  {srtString || '（暂无台词镜头）'}
                </pre>
              )}

              {exportType === 'csv' && (
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs text-slate-300 font-mono">
                  <p className="text-slate-400 mb-2">工业级 CSV 表格内置 UTF-8 BOM，在 Excel / WPS 打开绝不乱码。</p>
                  包含列头：镜头号, 预估时长, 景别, 机位运镜, 角色动作表情, 环境光影, 台词对白, 音效BGM, Midjourney提示词, Flux提示词, 即梦提示词
                </div>
              )}

              {exportType === 'prompts' && (
                <pre className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs font-mono text-indigo-300 leading-relaxed m-0">
                  {shots.map(s => `Shot #${String(s.shotNumber).padStart(2, '0')}: ${s.prompts?.midjourney || ''}`).join('\n\n')}
                </pre>
              )}
            </div>

            {/* 底部下载按钮 */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <Button onClick={() => setShowExportModal(false)}>关闭</Button>
              {exportType === 'srt' && (
                <Button type="primary" onClick={() => downloadFile(srtString, 'drama_subtitles.srt', 'text/plain;charset=utf-8')}>
                  ⬇️ 下载剪映 SRT 字幕
                </Button>
              )}
              {exportType === 'csv' && (
                <Button
                  type="primary"
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
                >
                  ⬇️ 下载影视分镜表 (.CSV)
                </Button>
              )}
              {exportType === 'prompts' && (
                <Button
                  type="primary"
                  onClick={() => {
                    const allPrompts = shots.map(s => `Shot #${String(s.shotNumber).padStart(2, '0')}: ${s.prompts?.midjourney || ''}`).join('\n\n');
                    copyToClipboard(allPrompts, 'all');
                  }}
                >
                  📋 一键复制全集 Prompt
                </Button>
              )}
            </div>
          </div>
        </Modal>
      </div>
    </ConfigProvider>
  );
}

// 挂载 React 根节点
const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(<App />);
}
