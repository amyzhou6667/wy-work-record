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
  message,
  Switch
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
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);

  const [promptTargetShot, setPromptTargetShot] = useState(null);
  const [refineTargetShot, setRefineTargetShot] = useState(null);
  const [refineInstruction, setRefineInstruction] = useState('');
  const [exportType, setExportType] = useState('srt');

  // 工作流多智能体状态 (4 大可插拔 Agent)
  const [activeStage, setActiveStage] = useState('shot'); // 'asset' | 'script' | 'shot' | 'prompt'
  const [stageStatuses, setStageStatuses] = useState({
    asset: 'ready',
    script: 'ready',
    shot: 'ready',
    prompt: 'ready'
  });
  const [dirtyFlags, setDirtyFlags] = useState({
    asset: false,
    script: false,
    shot: false,
    prompt: false
  });
  const [executionModes, setExecutionModes] = useState({
    asset: 'offline_fallback',
    script: 'offline_fallback',
    shot: 'offline_fallback',
    prompt: 'offline_fallback'
  });

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

  const [agentConfigs, setAgentConfigs] = useState(() => {
    let base = {
      asset: {
        id: 'asset',
        name: '资产提取 Agent',
        enabled: true,
        llmConfig: { baseUrl: 'https://api.deepseek.com/v1', apiKey: '', model: 'deepseek-chat', temperature: 0.7 }
      },
      script: {
        id: 'script',
        name: '剧本改编 Agent',
        enabled: true,
        llmConfig: { baseUrl: 'https://api.deepseek.com/v1', apiKey: '', model: 'deepseek-chat', temperature: 0.7 }
      },
      shot: {
        id: 'shot',
        name: '镜头切分 Agent',
        enabled: true,
        llmConfig: { baseUrl: 'https://api.deepseek.com/v1', apiKey: '', model: 'deepseek-chat', temperature: 0.7 }
      },
      prompt: {
        id: 'prompt',
        name: '生图 Prompt Agent',
        enabled: true,
        llmConfig: { baseUrl: 'https://api.deepseek.com/v1', apiKey: '', model: 'deepseek-chat', temperature: 0.7 }
      }
    };
    try {
      const saved = localStorage.getItem('asbs_agent_configs');
      if (saved) base = JSON.parse(saved);
    } catch {}
    // 自动补齐主大模型 Key
    try {
      const savedLLM = localStorage.getItem('asbs_llm_config');
      if (savedLLM) {
        const parsed = JSON.parse(savedLLM);
        if (parsed.apiKey) {
          ['asset', 'script', 'shot', 'prompt'].forEach(k => {
            if (!base[k].llmConfig?.apiKey) {
              base[k].llmConfig = { ...parsed };
            }
          });
        }
      }
    } catch {}
    return base;
  });

  const saveLLMConfig = (newConfig) => {
    // 自动智能纠偏：若用户填入 /anthropic 或 /chat/completions，自动规范为 /v1
    const cleanUrl = (newConfig.baseUrl || '').trim().replace(/\/+$/, '').replace(/\/anthropic\/?$/, '/v1').replace(/\/chat\/completions\/?$/, '');
    const normalized = {
      ...newConfig,
      baseUrl: cleanUrl || newConfig.baseUrl
    };
    setLlmConfig(normalized);
    try {
      localStorage.setItem('asbs_llm_config', JSON.stringify(normalized));
    } catch {}
    // 自动联动更新所有 Agent 配置
    const synced = { ...agentConfigs };
    ['asset', 'script', 'shot', 'prompt'].forEach(k => {
      synced[k] = {
        ...synced[k],
        llmConfig: { ...normalized }
      };
    });
    setAgentConfigs(synced);
    try {
      localStorage.setItem('asbs_agent_configs', JSON.stringify(synced));
    } catch {}
  };

  const [scriptScenes, setScriptScenes] = useState([]);
  const [scenes, setScenes] = useState([]);
  const [showAgentHubModal, setShowAgentHubModal] = useState(false);

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

      // 纯英文动作与光影推导 (杜绝中文字符渗入 MJ 与 Flux)
      const enAction = hasDialogue
        ? 'intense focused emotional performance, dramatic eye contact, subtle tension'
        : 'dynamic cinematic composition, building profound emotional climax and atmospheric suspense';

      const enLighting = i % 2 === 0
        ? 'three-point cinematic lighting with soft edge rim highlights and high contrast shadows'
        : 'atmospheric diffused ambient illumination, gentle volumetric haze';

      const mj = activeChars.length > 0
        ? `${shotSize}, ${cameraMovement}, ${charPrompt || 'cinematic portrait'}, acting: ${enAction}, environment and lighting: ${enLighting}, cinematic lighting, film grain, photorealistic, 8k, masterpiece ${arParam} --v 6.1 --style raw`
        : `Cinematic wide shot, ${cameraMovement}, scene action: ${enAction}, environment and lighting: ${enLighting}, atmospheric volumetrics, 8k, masterpiece ${arParam} --v 6.1 --style raw`;

      const flux = `A high quality, photorealistic 35mm film still captured in cinematic vertical ${ar} framing. The camera utilizes an ${shotSize} with ${cameraMovement}. ${charPrompt ? `Featuring ${charPrompt}, engaged in: ${enAction}.` : `The scene showcases ${enAction}.`} The ambient environment and light source is styled with ${enLighting}. Ultra-detailed facial textures, natural catchlights in pupils, atmospheric volumetrics, professional color grading, cinematic motion picture look.`;

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

  // 执行 AI 智能拆解 (通过多智能体工作流)
  const handleAIDecompose = async () => {
    if (!novelText.trim()) {
      Modal.warning({ title: '提示', content: '请先输入小说剧本文本！' });
      return;
    }

    setIsLoading(true);
    setLoadingTip('正在通过可插拔多智能体工作流（资产提取 ➔ 剧本改编 ➔ 镜头切分 ➔ 生图Prompt）协同推进...');

    // 动态补齐未设置 key 的 Agent 配置
    const effectiveConfigs = { ...agentConfigs };
    ['asset', 'script', 'shot', 'prompt'].forEach(k => {
      if ((!effectiveConfigs[k]?.llmConfig?.apiKey || !effectiveConfigs[k]?.llmConfig?.baseUrl) && llmConfig?.apiKey) {
        effectiveConfigs[k] = {
          ...effectiveConfigs[k],
          llmConfig: { ...llmConfig }
        };
      }
    });

    try {
      const response = await fetch('/api/v1/workflow/run-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          novelText,
          aspectRatio,
          characters,
          agentConfigs: effectiveConfigs,
          llmConfig
        })
      });

      if (!response.ok) throw new Error(`HTTP 错误 ${response.status}`);
      const res = await response.json();

      if (res.code === 0 && res.data && res.data.shots?.length > 0) {
        const d = res.data;
        if (d.characters?.length) setCharacters(d.characters);
        if (d.scenes?.length) setScenes(d.scenes);
        if (d.scriptScenes?.length) setScriptScenes(d.scriptScenes);
        setShots(d.shots);
        setStageStatuses(d.stageStatuses || { asset: 'ready', script: 'ready', shot: 'ready', prompt: 'ready' });
        setDirtyFlags({ asset: false, script: false, shot: false, prompt: false });
        if (d.executionModes) setExecutionModes(d.executionModes);
        setSelectedShotIndex(0);

        const hasOffline = Object.entries(d.executionModes || {}).some(([k, v]) => v === 'offline_fallback' && effectiveConfigs[k]?.enabled);
        if (hasOffline) {
          message.warning('提示：当前由于未配置有效 API Key，部分或全部阶段已由本地离线规则极速生成。若需深度好莱坞大模型智能创作，请点击【⚙️ AI 模型配置】填入 API Key！', 6);
        } else {
          message.success('🎬 4 大 Agent 已全量由大模型智能执行完毕，视听分镜已就绪！', 4);
        }
      } else {
        throw new Error('未返回有效镜头数据');
      }
    } catch (err) {
      console.warn('工作流执行失败，转为离线智能算法:', err);
      const offlineShots = generateOfflineShots(novelText, characters, aspectRatio);
      setShots(offlineShots);
      setSelectedShotIndex(0);
      setStageStatuses({ asset: 'ready', script: 'ready', shot: 'ready', prompt: 'ready' });
      setExecutionModes({ asset: 'offline_fallback', script: 'offline_fallback', shot: 'offline_fallback', prompt: 'offline_fallback' });
      Modal.info({
        title: '分镜生成提示',
        content: `大模型请求异常（${err.message || '网络超时'}），已自动启用高容错离线规则为您拆解分镜与生成 Prompt！`
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 单节点独立运行
  const runWorkflowStage = async (stage) => {
    setIsLoading(true);
    const stageName = agentConfigs[stage]?.name || stage;
    setLoadingTip(`正在独立运行 ${stageName}...`);

    try {
      const currentCtx = {
        novelText,
        aspectRatio,
        characters,
        scenes,
        scriptScenes,
        shots,
        agentConfigs,
        stageStatuses,
        dirtyFlags
      };

      const res = await fetch('/api/v1/workflow/run-stage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage, context: currentCtx })
      });

      if (!res.ok) throw new Error(`HTTP 错误 ${res.status}`);
      const json = await res.json();

      if (json.code === 0 && json.data) {
        const d = json.data;
        if (d.characters?.length) setCharacters(d.characters);
        if (d.scenes?.length) setScenes(d.scenes);
        if (d.scriptScenes?.length) setScriptScenes(d.scriptScenes);
        if (d.shots?.length) setShots(d.shots);
        setStageStatuses(d.stageStatuses);
        setDirtyFlags(d.dirtyFlags);
        message.success(`✓ ${stageName} 运行完成！`);
      }
    } catch (err) {
      message.error(`运行失败: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // 增量重跑 Prompt 阶段 (保护镜头动作对白)
  const runIncrementalPrompts = async () => {
    setIsLoading(true);
    setLoadingTip('正在基于最新资产增量刷新生图 Prompt (保留精修镜头动作)...');

    try {
      const currentCtx = {
        novelText,
        aspectRatio,
        characters,
        scenes,
        scriptScenes,
        shots,
        agentConfigs,
        stageStatuses,
        dirtyFlags
      };

      const res = await fetch('/api/v1/workflow/incremental-prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context: currentCtx })
      });

      if (!res.ok) throw new Error(`HTTP 错误 ${res.status}`);
      const json = await res.json();

      if (json.code === 0 && json.data) {
        setShots(json.data.shots);
        setDirtyFlags({ ...dirtyFlags, prompt: false });
        message.success('✓ 生图 Prompt 增量更新完成！');
      }
    } catch (err) {
      message.error(`更新失败: ${err.message}`);
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
  const activePromptShot = promptTargetShot || currentSelectedShot;

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
            {/* 新手流程指引 */}
            <Button
              size="small"
              onClick={() => setShowGuideModal(true)}
              className="bg-indigo-950/60 text-indigo-300 border-indigo-500/40 hover:bg-indigo-900/60 text-xs font-semibold"
            >
              📖 使用流程指引
            </Button>

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

        {/* 多智能体可插拔工作流流水线看板 (Pipeline Stepper) */}
        <div className="flex-none bg-slate-900/90 border-b border-slate-800 px-4 py-2 flex items-center justify-between shadow-sm overflow-x-auto gap-3">
          <div className="flex items-center gap-2">
            {[
              { id: 'asset', num: 1, name: '资产提取 Agent', desc: `${characters.length}人 / ${scenes.length}景` },
              { id: 'script', num: 2, name: '剧本改编 Agent', desc: `${scriptScenes.length}场` },
              { id: 'shot', num: 3, name: '镜头切分 Agent', desc: `${shots.length}镜` },
              { id: 'prompt', num: 4, name: '生图 Prompt Agent', desc: '三模型' }
            ].map((node, i) => {
              const isSelected = activeStage === node.id;
              const isDirty = dirtyFlags[node.id];
              const isAgentEnabled = agentConfigs[node.id]?.enabled;
              return (
                <React.Fragment key={node.id}>
                  {i > 0 && <span className="text-slate-600 text-xs font-mono select-none">➔</span>}
                  <div
                    onClick={() => setActiveStage(node.id)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border cursor-pointer transition text-xs ${
                      isSelected
                        ? 'bg-indigo-950/70 border-indigo-500 text-white shadow-sm ring-1 ring-indigo-500/50'
                        : isDirty
                        ? 'bg-amber-950/30 border-amber-600/50 text-amber-200'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300'
                    }`}
                  >
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[11px] ${
                      isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {node.num}
                    </span>
                    <div>
                      <div className="flex items-center gap-1.5 font-semibold text-[11px]">
                        <span>{node.name}</span>
                        {!isAgentEnabled ? (
                          <Tag color="default" className="text-[9px] m-0 px-1 py-0">跳过</Tag>
                        ) : executionModes[node.id] === 'llm' ? (
                          <Tag color="success" className="text-[9px] m-0 px-1 py-0 border-emerald-500/30 text-emerald-400">🤖 大模型</Tag>
                        ) : (
                          <Tag color="default" className="text-[9px] m-0 px-1 py-0 text-slate-500">⚡ 离线规则</Tag>
                        )}
                        {isDirty && <Tag color="warning" className="text-[9px] m-0 px-1 py-0">已变更</Tag>}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">{node.desc}</div>
                    </div>
                  </div>
                </React.Fragment>
              );
            })}
          </div>

          <Space size="small">
            <Button
              type="primary"
              size="small"
              onClick={handleAIDecompose}
              loading={isLoading}
              style={{ backgroundColor: '#6366f1', borderColor: '#4f46e5', fontWeight: 'bold' }}
            >
              ⚡ 启动全流水线
            </Button>
            <Button
              size="small"
              onClick={() => runWorkflowStage(activeStage)}
              loading={isLoading}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 text-xs"
            >
              ▶ 独立运行本阶段
            </Button>
            {dirtyFlags.prompt && (
              <Button
                size="small"
                onClick={runIncrementalPrompts}
                loading={isLoading}
                className="bg-amber-950/60 text-amber-300 border-amber-500/50 hover:bg-amber-900/60 text-xs animate-pulse font-bold"
              >
                ⚠️ 增量更新 Prompt
              </Button>
            )}
            <Button
              size="small"
              onClick={() => setShowAgentHubModal(true)}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 text-xs"
            >
              🧩 Agent 工坊配置
            </Button>
          </Space>
        </div>

        {/* 主体【双栏聚焦工作区】：左栏剧本拆解与段落 (四等分占一，25% 宽) / 右侧主栏影视级视觉分镜流 (四等分占三，75% 宽) */}
        <main className="flex-1 flex overflow-hidden p-3 gap-3">
          {/* 左栏 (四等分占一，25% 宽度)：小说剧本输入与控制区 */}
          <section
            style={{ width: '25%', flexShrink: 0, minWidth: 0 }}
            className="w-1/4 flex-none min-w-0 flex flex-col bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl"
          >
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
                rows={7}
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

              {/* 核心主操作：一键运行流水线 */}
              <div className="flex flex-col gap-1.5">
                <Button
                  type="primary"
                  onClick={handleAIDecompose}
                  loading={isLoading}
                  style={{
                    backgroundColor: '#6366f1',
                    borderColor: '#4f46e5',
                    color: '#ffffff',
                    fontWeight: 'bold',
                    fontSize: '13px',
                    height: '36px'
                  }}
                  className="w-full shadow-md shadow-indigo-600/30"
                >
                  ⚡ 一键启动多智能体全流水线
                </Button>
                <div className="flex items-center justify-between text-[11px] text-slate-400 px-0.5">
                  <span className="text-slate-500">自动: 资产➔剧本➔分镜➔Prompt</span>
                  <button
                    onClick={handleOfflineDecompose}
                    disabled={isLoading}
                    className="text-slate-400 hover:text-indigo-300 underline cursor-pointer bg-transparent border-none p-0 text-[11px]"
                    title="断网或免API时的秒级规则拆解"
                  >
                    ⚡ 本地离线规则
                  </button>
                </div>
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

          {/* 右侧主栏 (四等分占三，75% 宽度)：影视级视觉分镜流 */}
          <section
            style={{ width: '75%', flex: '1 1 75%', minWidth: 0 }}
            className="w-3/4 flex-1 min-w-0 flex flex-col bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl"
          >
            <div className="px-4 py-2 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
              <div className="flex items-center gap-2.5">
                <span className="text-xs font-bold text-slate-200">
                  {activeStage === 'asset' && '👤 角色与场景资产管理 (Asset)'}
                  {activeStage === 'script' && '📜 影视短剧标准剧本 (Script)'}
                  {(activeStage === 'shot' || activeStage === 'prompt') && '🎬 工业级视觉分镜流 (Shot & Prompt)'}
                </span>
                <Tag color="indigo" className="font-semibold text-[11px] m-0 border-indigo-500/30">
                  共 {shots.length} 镜 / 约 {Math.round(shots.reduce((acc, s) => acc + (s.durationSec || 2.5), 0))} 秒
                </Tag>
              </div>
              <Space size="small">
                <span className="text-[11px] text-slate-400">剪映字幕: {srtList.length} 句</span>
                <Button
                  size="small"
                  onClick={() => {
                    const all = shots.map(s => `Shot #${String(s.shotNumber).padStart(2, '0')}: ${s.prompts?.midjourney || ''}`).join('\n\n');
                    copyToClipboard(all, 'all_prompts');
                  }}
                  className="text-xs border-indigo-500/40 text-indigo-300 bg-indigo-950/30"
                >
                  📋 一键复制全集 MJ Prompt
                </Button>
              </Space>
            </div>

            <div className="flex-1 p-3 overflow-y-auto space-y-3">
              {/* 阶段 1：资产库视图 (activeStage === 'asset') */}
              {activeStage === 'asset' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between bg-slate-950/70 p-3 rounded-xl border border-slate-800">
                    <div>
                      <h3 className="text-sm font-bold text-indigo-300 m-0">👤 角色与场景资产管理 (Asset Library)</h3>
                      <p className="text-xs text-slate-400 m-0">资产提取 Agent 自动提炼角色外貌/服装与环境光影，修改后将标脏下游阶段并支持增量刷新 Prompt。</p>
                    </div>
                    <Space>
                      <Button size="small" onClick={() => setShowCharModal(true)}>
                        + 管理/新增角色
                      </Button>
                      <Button
                        size="small"
                        type="primary"
                        onClick={() => runWorkflowStage('asset')}
                        loading={isLoading}
                        style={{ backgroundColor: '#6366f1' }}
                      >
                        ⚡ 重新提取资产
                      </Button>
                    </Space>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-slate-300 mb-2">🎭 核心角色资产 ({characters.length}位)</h4>
                    <div className="grid grid-cols-2 gap-3">
                      {characters.map(char => (
                        <div key={char.id} className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-indigo-400 text-sm">{char.name}</span>
                            <Space size={4}>
                              <Tag color={char.roleType === 'protagonist' ? 'purple' : 'gold'} className="text-[10px] m-0">
                                {char.roleType === 'protagonist' ? '主角' : '配角'}
                              </Tag>
                              <Tag color="default" className="text-[10px] m-0">{char.gender === 'male' ? '男' : '女'} · {char.ageGroup}</Tag>
                            </Space>
                          </div>
                          <div className="text-[11px] font-mono text-slate-300 bg-slate-900/80 p-2 rounded border border-slate-800">
                            {char.appearancePrompt}
                          </div>
                          {char.crefUrl && (
                            <div className="text-[10px] text-slate-500 truncate font-mono">
                              cref: {char.crefUrl}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {scenes.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold text-slate-300 mb-2">🏞️ 提取场景资产 ({scenes.length}处)</h4>
                      <div className="grid grid-cols-2 gap-3">
                        {scenes.map(sc => (
                          <div key={sc.id} className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5 text-xs">
                            <div className="font-bold text-amber-300 text-xs">{sc.name}</div>
                            <div className="text-slate-400 text-[11px]"><span className="text-slate-500">氛围:</span> {sc.atmosphere}</div>
                            <div className="text-slate-400 text-[11px]"><span className="text-slate-500">光影:</span> {sc.lighting}</div>
                            <div className="text-indigo-400 text-[10px] font-mono">{sc.visualKeywords?.join(', ')}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 阶段 2：标准短剧剧本视图 (activeStage === 'script') */}
              {activeStage === 'script' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between bg-slate-950/70 p-3 rounded-xl border border-slate-800">
                    <div>
                      <h3 className="text-sm font-bold text-indigo-300 m-0">📜 影视短剧剧本 (Adapted Screenplay)</h3>
                      <p className="text-xs text-slate-400 m-0">剧本改编 Agent 将叙事小说重构为场次、场景环境提示与角色标准对白。</p>
                    </div>
                    <Button
                      size="small"
                      type="primary"
                      onClick={() => runWorkflowStage('script')}
                      loading={isLoading}
                      style={{ backgroundColor: '#6366f1' }}
                    >
                      ⚡ 重新改编剧本
                    </Button>
                  </div>

                  {scriptScenes.length === 0 ? (
                    <div className="p-8 text-center bg-slate-950/40 rounded-xl border border-dashed border-slate-800 text-slate-500 text-xs">
                      暂无改编场次，点击【⚡ 重新改编剧本】或在顶部运行全流水线
                    </div>
                  ) : (
                    scriptScenes.map((sc, sIdx) => {
                      const sceneTime = sc.timeOfDay || sc.time || 'DAY';
                      const actionDesc = (sc.actionDescription || sc.action || sc.description || sc.content || '').trim();
                      const rawDialogues = sc.dialogues || sc.dialogue || sc.lines || [];
                      const dialoguesList = Array.isArray(rawDialogues) ? rawDialogues : [];

                      return (
                        <div key={sc.sceneNumber || sIdx} className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                          {/* 场次标题条 */}
                          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs text-indigo-400 bg-indigo-950/60 border border-indigo-800/60 px-2 py-0.5 rounded">
                                第 {sc.sceneNumber || sIdx + 1} 场
                              </span>
                              <span className="font-semibold text-xs text-slate-200">
                                {sc.location || '场景'}
                              </span>
                              <span className="text-[11px] text-slate-400 font-mono">
                                ({sceneTime})
                              </span>
                            </div>
                            {sc.atmosphere && (
                              <Tag color="cyan" className="text-[11px] m-0">
                                {sc.atmosphere}
                              </Tag>
                            )}
                          </div>

                          {/* 场景正文：动作与环境视觉描写 */}
                          {actionDesc && (
                            <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800/80 text-xs text-slate-300 leading-relaxed space-y-1">
                              <div className="flex items-center gap-1.5 text-indigo-400 font-semibold text-[11px]">
                                <span>🎬</span>
                                <span>【动作与场景】</span>
                              </div>
                              <p className="m-0 pl-4 text-slate-300 italic whitespace-pre-wrap font-sans">
                                {actionDesc}
                              </p>
                            </div>
                          )}

                          {/* 角色台词对白列表 */}
                          {dialoguesList.length > 0 && (
                            <div className="space-y-2 text-xs pt-1">
                              <div className="text-[11px] text-slate-500 font-semibold px-1">
                                💬 角色对白 ({dialoguesList.length})：
                              </div>
                              {dialoguesList.map((d, dIdx) => {
                                const speaker = d.speaker || d.character || d.name;
                                const text = d.text || d.content || d.dialogue || d.line;
                                const emotion = d.emotion || d.tone;
                                const isVO = d.isVoiceover || d.voiceover;

                                return (
                                  <div key={dIdx} className="leading-relaxed">
                                    {speaker ? (
                                      <div className="bg-slate-900/70 p-2.5 rounded-lg border border-slate-800/80 flex flex-col gap-1 hover:border-slate-700 transition">
                                        <div className="flex items-center gap-2">
                                          <span className="font-bold text-indigo-300 text-xs">
                                            【{speaker}】
                                          </span>
                                          {emotion && (
                                            <Tag color="purple" className="text-[10px] m-0 px-1 py-0 leading-tight">
                                              {emotion}
                                            </Tag>
                                          )}
                                          {isVO && (
                                            <Tag color="gold" className="text-[10px] m-0 px-1 py-0 leading-tight">
                                              旁白/独白
                                            </Tag>
                                          )}
                                        </div>
                                        <div className="text-slate-200 text-xs pl-2 border-l-2 border-indigo-500/50">
                                          “{text}”
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="text-slate-400 italic pl-3 border-l-2 border-slate-700 py-1 text-xs">
                                        {text}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* 容错提示 */}
                          {!actionDesc && dialoguesList.length === 0 && (
                            <div className="text-xs text-slate-500 italic p-2">
                              （本场暂无动作描写与对白内容）
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* 阶段 3 & 4：分镜卡片流与生图视窗 (activeStage === 'shot' || activeStage === 'prompt') */}
              {(activeStage === 'shot' || activeStage === 'prompt') && (
                shots.length === 0 ? (
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
                      {/* 1. 卡片头部信息徽标与操作组 */}
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

                        <Space size="small">
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
                          <Button
                            size="small"
                            type="primary"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPromptTargetShot(shot);
                              setShowPromptModal(true);
                            }}
                            style={{
                              backgroundColor: '#6366f1',
                              borderColor: '#4f46e5',
                              fontSize: '11px',
                              height: '24px',
                              padding: '0 8px',
                              fontWeight: 'bold'
                            }}
                          >
                            🎯 生图 Prompt 弹窗
                          </Button>
                        </Space>
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
                        <span className="truncate flex-1 mr-3">💡 <span className="text-slate-300">{shot.environmentLighting}</span></span>
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            setPromptTargetShot(shot);
                            setShowPromptModal(true);
                          }}
                          className="text-[11px] text-indigo-400 font-semibold hover:underline cursor-pointer flex-none"
                        >
                          👉 弹窗查看/编辑完整 Prompt
                        </span>
                      </div>

                      {/* 3. 卡片底部内嵌快捷 Prompt 复制条 (显式深暗黑底色与荧光绿文字，点击可直接打开弹窗) */}
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          setPromptTargetShot(shot);
                          setShowPromptModal(true);
                        }}
                        style={{
                          backgroundColor: '#020617',
                          color: '#34d399',
                          border: '1px solid #1e293b'
                        }}
                        className="prompt-preview-box rounded-lg p-2 flex items-center justify-between text-[11px] gap-2 shadow-inner hover:border-indigo-500/50 transition cursor-pointer"
                        title="点击直接打开 Prompt 视窗弹窗"
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
                            backgroundColor: copiedKey === `card_${shot.id}` ? '#10b981' : '#1e293b',
                            borderColor: '#334155',
                            color: copiedKey === `card_${shot.id}` ? '#ffffff' : '#34d399',
                            fontSize: '11px',
                            height: '24px',
                            padding: '0 10px',
                            fontWeight: 'bold',
                            flexShrink: 0
                          }}
                        >
                          {copiedKey === `card_${shot.id}` ? '✓ 已复制 Prompt' : '📋 一键复制 Prompt'}
                        </Button>
                      </div>
                    </Card>
                  );
                })
              ))}
            </div>
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

        {/* 弹窗 5：镜头生图 Prompt 控制台弹窗 (采用 AntD Modal，原右栏功能全面弹窗化) */}
        <Modal
          title={
            <div className="flex items-center justify-between pr-8 w-full">
              <span className="text-white font-bold flex items-center gap-2 text-sm">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse"></span>
                🎯 镜头生图 Prompt 视窗
                {activePromptShot && (
                  <Tag color="indigo" className="font-mono font-bold text-xs m-0 px-2 py-0.5">
                    Shot #{String(activePromptShot.shotNumber).padStart(2, '0')}
                  </Tag>
                )}
              </span>

              {/* 模型选项卡 */}
              <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800">
                <button
                  onClick={() => setActiveModelTab('midjourney')}
                  className={`px-2.5 py-0.5 text-xs font-bold rounded transition ${
                    activeModelTab === 'midjourney' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Midjourney
                </button>
                <button
                  onClick={() => setActiveModelTab('flux')}
                  className={`px-2.5 py-0.5 text-xs font-bold rounded transition ${
                    activeModelTab === 'flux' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Flux.1
                </button>
                <button
                  onClick={() => setActiveModelTab('jimeng')}
                  className={`px-2.5 py-0.5 text-xs font-bold rounded transition ${
                    activeModelTab === 'jimeng' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  即梦双语
                </button>
              </div>
            </div>
          }
          open={showPromptModal}
          onCancel={() => setShowPromptModal(false)}
          width={760}
          footer={null}
        >
          {activePromptShot ? (
            <div className="pt-2 space-y-3">
              {/* 当前镜头属性快览 */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <Space size={4} wrap>
                    <Tag color="cyan" className="text-xs m-0 px-2 py-0.5">{activePromptShot.shotSize}</Tag>
                    <Tag color="orange" className="text-xs m-0 px-2 py-0.5">{activePromptShot.cameraMovement}</Tag>
                    <Tag color="default" className="text-xs m-0 px-2 py-0.5 text-slate-400 font-mono">⏱️ {activePromptShot.durationSec}s</Tag>
                    <Tag color="geekblue" className="text-xs m-0 px-2 py-0.5 font-mono">画幅: {aspectRatio}</Tag>
                  </Space>
                  <span className="text-xs text-slate-400">
                    💡 <span className="text-slate-300">{activePromptShot.environmentLighting}</span>
                  </span>
                </div>
                <div className="text-xs text-slate-300">
                  <span className="text-slate-500 font-semibold">🎭 动作: </span>
                  {activePromptShot.characterAction}
                </div>
                {activePromptShot.dialogue && (
                  <div className="text-xs text-indigo-300 italic bg-slate-900/60 p-2 rounded-lg border border-slate-800/80">
                    <span className="text-slate-500 not-italic font-semibold">💬 台词 [{activePromptShot.dialogue.speaker}]: </span>
                    “{activePromptShot.dialogue.text}”
                  </div>
                )}
              </div>

              {/* 核心生图 Prompt 展示与编辑区 (显式设定深黑底色与荧光绿文字，彻底杜绝白底白字) */}
              <div className="flex flex-col bg-slate-950 rounded-xl border border-slate-800 p-3 shadow-inner">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800/80">
                  <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    📋 {activeModelTab === 'midjourney' ? 'Midjourney v6.1 专业提示词' : (activeModelTab === 'flux' ? 'Flux.1 胶片摄影长文描述' : '即梦 / 通用双语精炼提示词')}
                  </span>
                  <Button
                    type="primary"
                    size="small"
                    onClick={() => copyToClipboard(activePromptShot.prompts?.[activeModelTab] || '', 'modal_prompt')}
                    style={{
                      backgroundColor: copiedKey === 'modal_prompt' ? '#10b981' : '#6366f1',
                      borderColor: 'transparent',
                      fontWeight: 'bold',
                      fontSize: '12px'
                    }}
                  >
                    {copiedKey === 'modal_prompt' ? '✓ 已复制 Prompt' : '📋 一键复制 Prompt'}
                  </Button>
                </div>

                {/* 提示词编辑框 (内联样式强制深黑背景 + 高亮绿文字) */}
                <textarea
                  value={activePromptShot.prompts?.[activeModelTab] || ''}
                  onChange={(e) => {
                    const newPrompt = e.target.value;
                    const updated = {
                      ...activePromptShot,
                      prompts: {
                        ...activePromptShot.prompts,
                        [activeModelTab]: newPrompt
                      }
                    };
                    setPromptTargetShot(updated);
                    setShots(shots.map(s => s.id === activePromptShot.id ? updated : s));
                  }}
                  placeholder="提示词生成中..."
                  rows={6}
                  style={{
                    backgroundColor: '#020617',
                    color: '#34d399',
                    border: '1px solid #334155',
                    fontSize: '12px',
                    lineHeight: '1.6',
                    fontFamily: 'monospace'
                  }}
                  className="prompt-textarea w-full p-3 rounded-lg focus:outline-none focus:border-indigo-500 resize-y leading-relaxed select-all"
                />

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
                  <span>支持就地直接编辑修改，实时保存</span>
                  <span className="font-mono text-slate-400">{activePromptShot.prompts?.[activeModelTab]?.length || 0} 字符</span>
                </div>
              </div>

              {/* 弹窗底部操作条 */}
              <div className="flex items-center justify-between pt-2">
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
                    fontSize: '12px'
                  }}
                >
                  {copiedKey === 'all_prompts' ? '✓ 已复制全集 Prompt' : '📋 复制全集 Prompt'}
                </Button>

                <Space>
                  <Button
                    size="small"
                    type="primary"
                    onClick={() => {
                      setShowPromptModal(false);
                      setExportType('prompts');
                      setShowExportModal(true);
                    }}
                    style={{ fontSize: '12px' }}
                  >
                    🚀 批量导出清单
                  </Button>
                  <Button size="small" onClick={() => setShowPromptModal(false)}>
                    关闭
                  </Button>
                </Space>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-slate-500">未选择镜头</div>
          )}
        </Modal>

        {/* 弹窗 6：多智能体工坊配置中心 (Agent Hub Modal) */}
        <Modal
          title={
            <div className="flex items-center justify-between pr-8">
              <span className="text-white font-bold flex items-center gap-2">
                🧩 多智能体工坊配置中心 (Pluggable Agent Hub)
              </span>
              <Button
                size="small"
                onClick={() => {
                  const synced = { ...agentConfigs };
                  ['asset', 'script', 'shot', 'prompt'].forEach(k => {
                    synced[k] = {
                      ...synced[k],
                      llmConfig: { ...llmConfig }
                    };
                  });
                  setAgentConfigs(synced);
                  try {
                    localStorage.setItem('asbs_agent_configs', JSON.stringify(synced));
                  } catch {}
                  message.success('已一键同步主大模型配置到所有 Agent！');
                }}
                className="text-xs bg-indigo-950/40 border-indigo-500/40 text-indigo-300"
              >
                🔄 同步主模型至全部 Agent
              </Button>
            </div>
          }
          open={showAgentHubModal}
          onCancel={() => setShowAgentHubModal(false)}
          onOk={() => {
            setShowAgentHubModal(false);
            try {
              localStorage.setItem('asbs_agent_configs', JSON.stringify(agentConfigs));
            } catch {}
            message.success('Agent 工坊配置已生效并持久化！');
          }}
          okText="保存全部配置"
          cancelText="取消"
          width={780}
        >
          <div className="pt-2 space-y-4 max-h-[65vh] overflow-y-auto pr-1">
            <p className="text-xs text-slate-400 mb-2">
              工作流由 4 个专业 Agent 组成，每个 Agent 均支持独立启用/跳过、独立配置专属模型（如剧本采用 DeepSeek-V3，视觉 Prompt 采用 GPT-4o 或通用模型），离线断网时自动启用容错规则自愈。
            </p>
            {[
              { id: 'asset', title: '1. 资产提取 Agent (Asset Extractor)', role: '解析原著提炼角色外观服装特征与场景光影资产' },
              { id: 'script', title: '2. 剧本改编 Agent (Scriptwriter)', role: '将叙事小说重构为场次结构、对白与舞台提示' },
              { id: 'shot', title: '3. 镜头切分 Agent (Director Shot)', role: '按工业节奏与视听语言切分景别、运镜与动作' },
              { id: 'prompt', title: '4. 生图 Prompt Agent (Visual Prompt)', role: '融合角色特征与镜头指令生成三模型专业英文提示词' }
            ].map(agent => {
              const cfg = agentConfigs[agent.id] || {
                id: agent.id,
                name: agent.title,
                enabled: true,
                llmConfig: { baseUrl: llmConfig.baseUrl, apiKey: llmConfig.apiKey, model: llmConfig.model, temperature: 0.7 }
              };
              return (
                <div key={agent.id} className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-indigo-300">{agent.title}</span>
                      <span className="text-[11px] text-slate-500">| {agent.role}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">{cfg.enabled ? '已启用' : '跳过(直通)'}</span>
                      <Switch
                        checked={cfg.enabled}
                        onChange={(val) => {
                          const updated = {
                            ...agentConfigs,
                            [agent.id]: { ...cfg, enabled: val }
                          };
                          setAgentConfigs(updated);
                        }}
                      />
                    </div>
                  </div>

                  {cfg.enabled && (
                    <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                      <div>
                        <label className="text-slate-400 block mb-1">Base URL (端点):</label>
                        <Input
                          size="small"
                          value={cfg.llmConfig?.baseUrl}
                          onChange={(e) => {
                            const updated = {
                              ...agentConfigs,
                              [agent.id]: {
                                ...cfg,
                                llmConfig: { ...cfg.llmConfig, baseUrl: e.target.value }
                              }
                            };
                            setAgentConfigs(updated);
                          }}
                          placeholder="https://api.deepseek.com/v1"
                          style={{ fontFamily: 'monospace' }}
                        />
                      </div>
                      <div>
                        <label className="text-slate-400 block mb-1">API Key:</label>
                        <Input.Password
                          size="small"
                          value={cfg.llmConfig?.apiKey}
                          onChange={(e) => {
                            const updated = {
                              ...agentConfigs,
                              [agent.id]: {
                                ...cfg,
                                llmConfig: { ...cfg.llmConfig, apiKey: e.target.value }
                              }
                            };
                            setAgentConfigs(updated);
                          }}
                          placeholder="sk-..."
                          style={{ fontFamily: 'monospace' }}
                        />
                      </div>
                      <div>
                        <label className="text-slate-400 block mb-1">模型代号 (Model):</label>
                        <Input
                          size="small"
                          value={cfg.llmConfig?.model}
                          onChange={(e) => {
                            const updated = {
                              ...agentConfigs,
                              [agent.id]: {
                                ...cfg,
                                llmConfig: { ...cfg.llmConfig, model: e.target.value }
                              }
                            };
                            setAgentConfigs(updated);
                          }}
                          placeholder="deepseek-chat / gpt-4o"
                          style={{ fontFamily: 'monospace' }}
                        />
                      </div>
                      <div>
                        <label className="text-slate-400 block mb-1">采样温度 (Temperature: {cfg.llmConfig?.temperature ?? 0.7}):</label>
                        <Slider
                          min={0}
                          max={1.5}
                          step={0.1}
                          value={cfg.llmConfig?.temperature ?? 0.7}
                          onChange={(val) => {
                            const updated = {
                              ...agentConfigs,
                              [agent.id]: {
                                ...cfg,
                                llmConfig: { ...cfg.llmConfig, temperature: val }
                              }
                            };
                            setAgentConfigs(updated);
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Modal>

        {/* 弹窗 7：新手极简操作流程指引 (Workflow Guide Modal) */}
        <Modal
          title={<span className="text-white font-bold flex items-center gap-2">💡 AI-StoryBoard-Studio 极简操作指南</span>}
          open={showGuideModal}
          onCancel={() => setShowGuideModal(false)}
          footer={<Button type="primary" onClick={() => setShowGuideModal(false)}>我知道了，立即制作</Button>}
          width={680}
        >
          <div className="pt-2 space-y-4 text-xs">
            <p className="text-slate-300 leading-relaxed m-0">
              欢迎使用 AI-StoryBoard-Studio！系统采用好莱坞工业短剧制作标准，由 4 个专业 AI Agent 自动协同编排。您只需记住 3 步即可轻松出片：
            </p>

            <div className="space-y-3">
              <div className="p-3 bg-slate-950 rounded-xl border border-indigo-500/30 flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs flex-none">1</span>
                <div>
                  <h4 className="font-bold text-indigo-300 text-xs mb-1">【贴小说 / 选范例】</h4>
                  <p className="text-slate-400 m-0">在左侧文本框粘贴您的小说文本（也可在右上角【范例】中一键载入都市战神、东方玄幻或古风权谋剧本），顶部支持自由切换 📱 9:16 竖屏短剧 或 🎬 16:9 横屏电影画幅。</p>
                </div>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-indigo-500/30 flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs flex-none">2</span>
                <div>
                  <h4 className="font-bold text-indigo-300 text-xs mb-1">【一键跑全流水线】</h4>
                  <p className="text-slate-400 m-0">点击左侧醒目的【⚡ 一键启动多智能体全流水线】大按钮。系统将自动推进 4 步：① 提取角色与场景外观 ➔ ② 改编为影视标准分场 ➔ ③ 切分专业景别与运镜 ➔ ④ 输出 Midjourney / Flux / 即梦三模型工业级英文生图词。</p>
                </div>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-indigo-500/30 flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs flex-none">3</span>
                <div>
                  <h4 className="font-bold text-indigo-300 text-xs mb-1">【复制 Prompt 生图 ➔ 导出字幕】</h4>
                  <p className="text-slate-400 m-0">在右侧分镜卡片底部直接点击【📋 一键复制 Prompt】，贴进 Midjourney / Flux / 即梦等 AI 软件即可生成电影级画面；剪辑时点击右上角【🚀 导出中心】，即可一键下载剪映标准 SRT 字幕与影视分镜母表 (.CSV)。</p>
                </div>
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-indigo-950/40 border border-indigo-500/20 text-[11px] text-slate-400">
              💡 进阶技巧：在顶部点击任意 Agent 节点（如 1.资产提取 或 2.剧本改编），可随时在右侧检视与编辑中间产物；点击右上角【⚙️ AI 模型配置】可填入您的 DeepSeek / OpenAI API Key 享受更高画质理解。
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
