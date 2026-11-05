import type {
  StoryboardShot,
  CharacterAsset,
  AspectRatio,
  ModelPrompts,
  ShotSize,
  CameraMovement
} from '../types/index.ts';

/**
 * 景别影视英文专业词汇映射表
 */
const SHOT_SIZE_MAP: Record<ShotSize, string> = {
  'Extreme Close-up': 'Extreme close-up shot',
  'Close-up': 'Close-up portrait shot',
  'Medium Close-up': 'Medium close-up shot',
  'Medium Shot': 'Medium shot',
  'Full Shot': 'Full body shot',
  'Wide Shot': 'Cinematic wide establishing shot',
  'Over-the-shoulder': 'Over-the-shoulder perspective shot'
};

/**
 * 运镜机位英文专业词汇映射表
 */
const CAMERA_MOVEMENT_MAP: Record<CameraMovement, string> = {
  'Static Eye-level': 'Static eye-level framing',
  'Low-angle Dolly In': 'Low-angle dolly in, subtle push-in',
  'High-angle Tilt Down': 'High-angle tilt down view',
  'Pan Following': 'Smooth horizontal pan following motion',
  'Tracking Shot': 'Dynamic lateral tracking shot',
  'Arc Shot': 'Dramatic 360 degree arc camera movement',
  'Handheld Shaky': 'Subtle handheld breathing camera shake, documentary feel'
};

/**
 * 影视动作与微表情动作关键词映射到专业电影英文术语
 */
const ACTION_KEYWORDS_MAP: Array<{ regex: RegExp; en: string }> = [
  // 眼神与面部微表情
  { regex: /(冷峻|冷漠|寒星|冰冷|锐利|利刃|漠然|严厉)/, en: 'gazing coldly with sharp piercing eyes' },
  { regex: /(怒视|怒目|瞪|愤怒|发怒|怒火|暴怒|怒斥|咬牙)/, en: 'glaring with fierce fiery anger' },
  { regex: /(眼眶泛红|红了眼|泪水|含泪|哭泣|落泪|哽咽|悲伤|凄楚|哀伤)/, en: 'eyes glistening with poignant tears, sorrowful emotional expression' },
  { regex: /(震惊|错愕|惊恐|骇然|难以置信|目瞪口呆|惊呆)/, en: 'stunned expression frozen in utter disbelief' },
  { regex: /(微笑|浅笑|温柔|欣慰|和煦|轻笑)/, en: 'gentle subdued warm smile with tender gaze' },
  { regex: /(冷笑|嗤笑|讥讽|嘲讽|玩味|不屑|挑眉)/, en: 'smirking with subtle cynical disdain' },
  { regex: /(沉思|凝视|出神|若有所思|远眺|沉吟)/, en: 'deep in profound contemplation, staring into distance' },
  { regex: /(慌张|慌乱|惶恐|不知所措|局促)/, en: 'looking around anxiously with restless apprehension' },

  // 姿态与头部神情
  { regex: /(扬起下颌|微扬下颌|仰头|抬颌|居高临下|俯瞰|蔑视)/, en: 'chin raised slightly with commanding haughty poise' },
  { regex: /(低视|低头|垂眸|垂首|闭眼|合眼)/, en: 'looking down solemnly with introspective stillness' },
  { regex: /(颤抖|发抖|攥紧|握紧|青筋)/, en: 'hands trembling with suppressed intensity' },
  { regex: /(专注|沉浸|认真|审视)/, en: 'intense focused concentration, piercing scrutinizing look' },

  // 肢体动势与戏剧交互
  { regex: /(转身|背对|踱步|踱着步|背过身)/, en: 'turning away slowly with dramatic gravity' },
  { regex: /(倒退|踉跄|跌跌撞撞|后退|退后)/, en: 'stumbling back in startled surprise' },
  { regex: /(跪|瘫软|摔倒|倒在地上|倒地|跌坐)/, en: 'collapsing to knees in overwhelming distress' },
  { regex: /(拥抱|相拥|搂|抱住|怀抱)/, en: 'embracing closely with emotional intimacy' },
  { regex: /(推开|甩开|挥手|挥斥|拂袖)/, en: 'shoving away with decisive forceful motion' },
  { regex: /(递出|掏出|扔出|甩出|拿出|递给|文件|合同|支票|协议)/, en: 'holding critical documents forward with tense suspense' },
  { regex: /(端起|倒茶|举杯|抿了一口|轻抿|喝酒|摇晃酒杯)/, en: 'holding a glass with contemplative poise' },
  { regex: /(跑|奔跑|冲向|狂奔|疾驰)/, en: 'dashing urgently across frame' },
  { regex: /(对峙|对立|迫近|逼近|对决)/, en: 'locked in a tense dramatic face-off' },
  { regex: /(推门|闯入|推门而入|步入)/, en: 'stepping through doorway with sudden dramatic presence' },
  { regex: /(握住手|牵手|抚摸|轻抚)/, en: 'holding hands gently, emotional connection' },
  { regex: /(倒在怀里|依偎|靠在)/, en: 'leaning against shoulder, seeking comfort' },
  { regex: /(狂风|骤雨|席卷|空荡)/, en: 'swept by intense atmospheric elements, dramatic visual impact' }
];

/**
 * 影视光影与环境氛围映射到专业电影英文术语
 */
const LIGHTING_KEYWORDS_MAP: Array<{ regex: RegExp; en: string }> = [
  // 场景与环境
  { regex: /(办公室|总裁|写字楼|顶层|摩天)/, en: 'luxury modern executive penthouse office' },
  { regex: /(雨夜|暴雨|大雨|雷电|雷声|闪电|雨滴)/, en: 'dramatic stormy rainy night with lightning flashes through glass' },
  { regex: /(豪门|豪宅|别墅|水晶灯|客厅|公馆)/, en: 'opulent modern luxury mansion interior' },
  { regex: /(街道|小巷|雨街|马路|车道|霓虹)/, en: 'wet urban street at night with neon reflections on asphalt' },
  { regex: /(医院|病房|急救|走廊)/, en: 'sterile hospital corridor with cold fluorescent highlights' },
  { regex: /(酒吧|夜店|会所|宴会|酒会|晚宴)/, en: 'dimly lit luxury lounge gala with amber bokeh lights' },
  { regex: /(废墟|仓库|地下室|旧楼|工厂)/, en: 'gritty abandoned industrial warehouse with dusty atmospheric haze' },
  { regex: /(卧室|床前|酒店)/, en: 'luxurious private hotel suite' },

  // 光影风格与色调
  { regex: /(冷蓝|蓝光|青色|冰蓝|阴冷|冷色)/, en: 'cool moody cinematic blue color grading, deep shadows' },
  { regex: /(暖光|金黄|夕阳|黄昏|暖色|金色|台灯)/, en: 'warm golden hour illumination, soft glowing embers' },
  { regex: /(百叶窗|条纹阴影|百叶)/, en: 'Venetian blind shadow patterns cast across scene' },
  { regex: /(顶光|轮廓光|侧光|边缘光|发光|边缘轮廓)/, en: 'dramatic rim lighting with sculpted high-contrast edge highlights' },
  { regex: /(漫反射|柔光|自然光|柔和|自然柔光)/, en: 'soft diffused natural ambient key lighting' },
  { regex: /(逆光|剪影)/, en: 'dramatic cinematic silhouette against backlit glow' },
  { regex: /(交错|明暗|对比|阴影)/, en: 'chiaroscuro lighting with deep contrast between highlight and shadow' },
  { regex: /(刺目|强光|聚光灯|白光)/, en: 'stark high contrast spotlight with sharp directional beam' }
];

/**
 * 多生图模型提示词适配引擎
 */
export class PromptAdapterEngine {
  /**
   * 严格过滤所有中文及全角字符，确保输出 100% 纯英文提示词
   */
  public sanitizeToPureEnglish(text: string): string {
    if (!text) return '';
    return text
      // 移除所有中文字符、注音、扩展 CJK 及全角标点符号
      .replace(/[\u4e00-\u9fa5\u3000-\u303f\uff00-\uffef\u2e80-\u2eff\u31c0-\u31ef]/g, ' ')
      // 规范化逗号周围的空格
      .replace(/\s*,\s*/g, ', ')
      // 清理重复逗号 (如 ", , ")
      .replace(/(,\s*)+,/g, ', ')
      // 清理逗号紧随句号
      .replace(/,\s*\./g, '.')
      // 规范化多个连续空白
      .replace(/\s+/g, ' ')
      // 清理开头结尾多余标点和空格
      .replace(/^[, \t]+|[, \t]+$/g, '')
      .trim();
  }

  /**
   * 将动作与微表情描述转化为专业影视英文术语
   */
  public translateActionToEnglish(actionText: string): string {
    if (!actionText || !actionText.trim()) {
      return 'intense cinematic dramatic tension, conveying focused emotion';
    }

    // 若原文本已无任何中文字符，则为纯英文，直接做格式规范化
    if (!/[\u4e00-\u9fa5]/.test(actionText)) {
      return this.sanitizeToPureEnglish(actionText);
    }

    // 匹配影视动作关键词库
    const matchedPhrases: string[] = [];
    for (const item of ACTION_KEYWORDS_MAP) {
      if (item.regex.test(actionText)) {
        if (!matchedPhrases.includes(item.en)) {
          matchedPhrases.push(item.en);
        }
      }
    }

    // 提取原描述中原本包含的英文词汇片段 (如果有)
    const englishSegments = actionText.match(/[a-zA-Z][a-zA-Z0-9\s'-]{2,}/g);
    if (englishSegments) {
      englishSegments.forEach(seg => {
        const cleanSeg = seg.trim();
        if (cleanSeg.length > 2 && !matchedPhrases.includes(cleanSeg)) {
          matchedPhrases.push(cleanSeg);
        }
      });
    }

    if (matchedPhrases.length === 0) {
      return 'intense cinematic dramatic tension, conveying focused emotion';
    }

    return this.sanitizeToPureEnglish(matchedPhrases.join(', '));
  }

  /**
   * 将环境与光影描述转化为专业影视英文术语
   */
  public translateLightingToEnglish(lightingText: string): string {
    if (!lightingText || !lightingText.trim()) {
      return 'cinematic atmospheric lighting, soft shadows, high contrast film look';
    }

    // 若原文本已无任何中文字符，直接做格式规范化
    if (!/[\u4e00-\u9fa5]/.test(lightingText)) {
      return this.sanitizeToPureEnglish(lightingText);
    }

    const matchedPhrases: string[] = [];
    for (const item of LIGHTING_KEYWORDS_MAP) {
      if (item.regex.test(lightingText)) {
        if (!matchedPhrases.includes(item.en)) {
          matchedPhrases.push(item.en);
        }
      }
    }

    // 提取原描述中的英文字段 (如 8k, volumetric fog 等)
    const englishSegments = lightingText.match(/[a-zA-Z][a-zA-Z0-9\s'-]{2,}/g);
    if (englishSegments) {
      englishSegments.forEach(seg => {
        const cleanSeg = seg.trim();
        if (cleanSeg.length > 2 && !matchedPhrases.includes(cleanSeg)) {
          matchedPhrases.push(cleanSeg);
        }
      });
    }

    if (matchedPhrases.length === 0) {
      return 'cinematic atmospheric lighting, soft shadows, high contrast film look';
    }

    return this.sanitizeToPureEnglish(matchedPhrases.join(', '));
  }

  /**
   * 格式化 Midjourney 提示词 (100% 纯英文，杜绝中文字符)
   */
  public formatMidjourney(
    shot: StoryboardShot,
    characters: CharacterAsset[],
    aspectRatio: AspectRatio
  ): string {
    const parts: string[] = [];

    // 1. 镜头景别与运镜
    const shotDesc = SHOT_SIZE_MAP[shot.shotSize] || 'Cinematic shot';
    const moveDesc = CAMERA_MOVEMENT_MAP[shot.cameraMovement] || 'Eye-level framing';
    parts.push(`${shotDesc}, ${moveDesc}`);

    // 2. 角色主体与动作表情 (自动转换为地道英文，杜绝中文)
    const activeChars = characters.filter(c => shot.characterIds.includes(c.id));
    const enAction = this.translateActionToEnglish(shot.characterAction);

    if (activeChars.length > 0) {
      const charDescriptions = activeChars
        .map(c => this.sanitizeToPureEnglish(c.appearancePrompt) || 'character portrait')
        .join(' and ');
      parts.push(`${charDescriptions}, acting: ${enAction}`);
    } else {
      parts.push(`Scene action: ${enAction}`);
    }

    // 3. 环境与光影 (自动转换为纯英文光影)
    const enLighting = this.translateLightingToEnglish(shot.environmentLighting);
    parts.push(`environment and lighting: ${enLighting}`);

    // 4. 工业级画质基准词
    parts.push('cinematic lighting, film grain, depth of field, photorealistic, 8k, masterpiece');

    // 5. MJ 官方控制参数
    const arParam = `--ar ${aspectRatio}`;
    const engineParam = '--v 6.1 --style raw';
    let basePrompt = `${parts.join(', ')} ${arParam} ${engineParam}`;

    // 6. 追加 cref 人脸一致性参考 (若存在)
    const crefTarget = activeChars.find(c => c.crefUrl);
    if (crefTarget && crefTarget.crefUrl) {
      basePrompt += ` --cref ${crefTarget.crefUrl}`;
    }

    return this.sanitizeToPureEnglish(basePrompt);
  }

  /**
   * 格式化 Flux.1 自然语言长提示词 (100% 纯英文，杜绝中文字符)
   */
  public formatFlux(
    shot: StoryboardShot,
    characters: CharacterAsset[],
    aspectRatio: AspectRatio
  ): string {
    const shotDesc = SHOT_SIZE_MAP[shot.shotSize] || 'Cinematic shot';
    const moveDesc = CAMERA_MOVEMENT_MAP[shot.cameraMovement] || 'Eye-level framing';
    const framePrompt =
      aspectRatio === '9:16'
        ? 'cinematic vertical 9:16 framing, mobile short-drama aesthetic'
        : 'cinematic 16:9 widescreen composition, anamorphic cinema lens';

    const activeChars = characters.filter(c => shot.characterIds.includes(c.id));
    const enAction = this.translateActionToEnglish(shot.characterAction);
    const enLighting = this.translateLightingToEnglish(shot.environmentLighting);

    let subjectText = `focusing on ${enAction}`;
    if (activeChars.length > 0) {
      const charsText = activeChars
        .map(c => this.sanitizeToPureEnglish(c.appearancePrompt) || 'character portrait')
        .join(' alongside ');
      subjectText = `featuring ${charsText}, engaged in: ${enAction}`;
    }

    const fluxPrompt = `A high quality, photorealistic 35mm film still captured in ${framePrompt}. The camera utilizes an ${shotDesc} with ${moveDesc}. The scene showcases ${subjectText}. The ambient environment and light source is styled with ${enLighting}. Ultra-detailed facial micro-expressions, rich pore textures, natural catchlights in pupils, atmospheric volumetrics, professional color grading, cinematic motion picture look.`;

    return this.sanitizeToPureEnglish(fluxPrompt);
  }

  /**
   * 格式化 即梦 (Dreamina) / 通用双语精炼提示词
   */
  public formatJimeng(
    shot: StoryboardShot,
    characters: CharacterAsset[],
    aspectRatio: AspectRatio
  ): string {
    const activeChars = characters.filter(c => shot.characterIds.includes(c.id));
    const charNames = activeChars.map(c => c.name).join('与');
    const charPrompt = activeChars.map(c => c.appearancePrompt).join(', ');

    const aspectDesc = aspectRatio === '9:16' ? '9:16竖屏电影构图' : '16:9横屏电影画幅';
    const shotDesc = `${shot.shotSize}, ${shot.cameraMovement}`;

    const parts: string[] = [
      aspectDesc,
      `[镜头景别]: ${shotDesc}`,
      charNames ? `[角色出镜]: ${charNames} (${charPrompt})` : '',
      `[动作神态]: ${shot.characterAction}`,
      `[光影氛围]: ${shot.environmentLighting}`,
      '电影级质感, 真实胶片细节, 8K写实, 高端短剧质感, 杰作'
    ].filter(Boolean);

    return parts.join(' | ');
  }

  /**
   * 一次性生成所有模型的 Prompt
   */
  public generateAllPrompts(
    shot: StoryboardShot,
    characters: CharacterAsset[],
    aspectRatio: AspectRatio = '9:16'
  ): ModelPrompts {
    return {
      midjourney: this.formatMidjourney(shot, characters, aspectRatio),
      flux: this.formatFlux(shot, characters, aspectRatio),
      jimeng: this.formatJimeng(shot, characters, aspectRatio)
    };
  }
}
