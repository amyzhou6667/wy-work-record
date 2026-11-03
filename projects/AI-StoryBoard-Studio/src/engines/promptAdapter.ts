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
 * 多生图模型提示词适配引擎
 */
export class PromptAdapterEngine {
  /**
   * 格式化 Midjourney 提示词
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

    // 2. 角色主体与动作表情
    const activeChars = characters.filter(c => shot.characterIds.includes(c.id));
    if (activeChars.length > 0) {
      const charDescriptions = activeChars.map(c => c.appearancePrompt).join(' and ');
      parts.push(`${charDescriptions}, acting: ${shot.characterAction}`);
    } else {
      parts.push(`Scene action: ${shot.characterAction}`);
    }

    // 3. 环境与光影
    parts.push(`environment and lighting: ${shot.environmentLighting}`);

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

    return basePrompt;
  }

  /**
   * 格式化 Flux.1 自然语言长提示词
   */
  public formatFlux(
    shot: StoryboardShot,
    characters: CharacterAsset[],
    aspectRatio: AspectRatio
  ): string {
    const shotDesc = SHOT_SIZE_MAP[shot.shotSize];
    const moveDesc = CAMERA_MOVEMENT_MAP[shot.cameraMovement];
    const framePrompt =
      aspectRatio === '9:16'
        ? 'cinematic vertical 9:16 framing, mobile short-drama aesthetic'
        : 'cinematic 16:9 widescreen composition, anamorphic cinema lens';

    const activeChars = characters.filter(c => shot.characterIds.includes(c.id));
    let subjectText = `focusing on ${shot.characterAction}`;
    if (activeChars.length > 0) {
      const charsText = activeChars.map(c => c.appearancePrompt).join(' alongside ');
      subjectText = `featuring ${charsText}, engaged in: ${shot.characterAction}`;
    }

    return `A high quality, photorealistic 35mm film still captured in ${framePrompt}. The camera utilizes an ${shotDesc} with ${moveDesc}. The scene showcases ${subjectText}. The ambient environment and light source is styled with ${shot.environmentLighting}. Ultra-detailed facial micro-expressions, rich pore textures, natural catchlights in pupils, atmospheric volumetrics, professional color grading, cinematic motion picture look.`;
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
