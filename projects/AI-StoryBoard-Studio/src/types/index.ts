/**
 * AI-StoryBoard-Studio 全局核心领域模型与接口契约
 */

/**
 * 画面画幅预设
 */
export type AspectRatio = '9:16' | '16:9';

/**
 * 影视标准景别枚举 (Shot Sizes)
 */
export type ShotSize =
  | 'Extreme Close-up'  // 大特写 (眼部、局部微表情)
  | 'Close-up'          // 特写 (面部表情)
  | 'Medium Close-up'   // 中近景 (胸部以上)
  | 'Medium Shot'       // 中景 (腰部以上，标准对话)
  | 'Full Shot'         // 全景 (人物全身与即时环境)
  | 'Wide Shot'         // 远景 (宏大场景、空间建立)
  | 'Over-the-shoulder'; // 过肩镜头 (双人对话张力)

/**
 * 影视机位与运镜枚举 (Camera Movements & Angles)
 */
export type CameraMovement =
  | 'Static Eye-level'      // 平视定镜
  | 'Low-angle Dolly In'    // 低角度仰拍推镜 (压迫感/霸气)
  | 'High-angle Tilt Down'  // 俯拍下倾 (弱势/全局俯瞰)
  | 'Pan Following'         // 跟随横摇 (动感跟随)
  | 'Tracking Shot'         // 移动跟拍 (紧张快节奏)
  | 'Arc Shot'              // 360环绕 (情绪高潮转折)
  | 'Handheld Shaky';       // 手持微晃 (呼吸感/纪实紧张)

/**
 * 角色一致性资产模型
 */
export interface CharacterAsset {
  id: string;
  name: string;             // 角色中文名 (如: 顾北辰)
  roleType: 'protagonist' | 'antagonist' | 'supporting'; // 身份属性
  gender: 'male' | 'female' | 'other';
  ageGroup: string;         // 年龄段 (如: 28yo)
  appearancePrompt: string; // 英文形象特征描述 (如: 28-year-old cold Asian male CEO, sharp jawline, short black hair, tailored charcoal suit)
  crefUrl?: string;         // Midjourney --cref 人物参考链接 (可选)
}

/**
 * 适配多生图模型的英文 Prompt 集合
 */
export interface ModelPrompts {
  midjourney: string;       // MJ v6.1 参数化 Prompt
  flux: string;             // Flux.1 自然语言长提示词
  jimeng: string;           // 即梦/通用双语精炼 Prompt
}

/**
 * 对白台词结构
 */
export interface ShotDialogue {
  speaker: string;          // 说话角色名
  text: string;             // 台词文本
  isVoiceover: boolean;     // 是否旁白 / 心理独白 (VO)
}

/**
 * 单个分镜镜头完整实体模型
 */
export interface StoryboardShot {
  id: string;
  shotNumber: number;          // 镜头号 (从 1 递增)
  durationSec: number;         // 镜头预估时长 (秒)
  shotSize: ShotSize;          // 景别
  cameraMovement: CameraMovement; // 机位运镜
  characterAction: string;     // 角色表情与肢体动作
  characterIds: string[];      // 出场角色 ID 列表
  environmentLighting: string; // 环境场景与光影色调
  dialogue?: ShotDialogue;     // 镜头台词 (可选)
  soundBgm: string;            // 音效/配乐提示
  matchedSourceParagraph: string; // 映射的小说原著段落 (双栏联动高亮)
  prompts: ModelPrompts;       // 适配多生图模型的英文 Prompt
}

/**
 * 剧集大纲与分集模型
 */
export interface EpisodeOutline {
  episodeNumber: number;
  title: string;
  hookOpening: string;         // 前 3 秒黄金抓人钩子
  conflictEscalation: string;  // 1 分钟核心冲突升级
  cliffhangerEnding: string;   // 结尾悬念反转卡点
  rawContent: string;          // 本集小说原文本
  shots: StoryboardShot[];     // 该集所属分镜列表
}

/**
 * 原著文档解析结果实体
 */
export interface NovelDocument {
  id: string;
  fileName: string;
  fileSize: number;
  totalWords: number;
  chapters: {
    chapterIndex: number;
    title: string;
    content: string;
  }[];
}

/**
 * 剪映 SRT 导出配置
 */
export interface SrtExportConfig {
  charactersPerSecond: number; // 语速 (默认 4.5 字/秒)
  breathPauseSec: number;      // 句间呼吸停顿时长 (默认 0.35 秒)
  maxCharactersPerLine: number;// 手机端单行最大安全汉字数 (默认 18 汉字)
  includeSpeakerName: boolean; // 是否包含说话人前缀 (如 "[顾北辰]:")
}

/**
 * 单条字幕条目
 */
export interface SubtitleItem {
  index: number;
  startTimeFormatted: string;  // 00:00:01,234
  endTimeFormatted: string;    // 00:00:03,850
  startMs: number;
  endMs: number;
  speaker?: string;
  text: string;
}

/**
 * 大模型 API 服务商通用配置 (OpenAI 协议兼容)
 */
export interface LLMConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
  temperature?: number;
}

export interface AIDecomposeRequest {
  novelText: string;
  aspectRatio: AspectRatio;
  characters: CharacterAsset[];
  llmConfig?: LLMConfig;
}

export interface AIRefineShotRequest {
  shot: StoryboardShot;
  userInstruction: string;
  characters: CharacterAsset[];
  aspectRatio: AspectRatio;
  llmConfig?: LLMConfig;
}

/**
 * 工作流流水线阶段枚举
 */
export type PipelineStage = 'asset' | 'script' | 'shot' | 'prompt';

/**
 * 阶段执行状态
 */
export type StageStatus = 'idle' | 'running' | 'ready' | 'error' | 'skipped';

/**
 * 场景资产
 */
export interface SceneAsset {
  id: string;
  name: string;
  lightingAtmosphere: string;
  environmentPrompt: string;
}

/**
 * 短剧标准剧本场次与对白
 */
export interface ScriptDialogue {
  speaker: string;
  emotion: string;
  text: string;
  isVoiceover: boolean;
}

export interface ScriptScene {
  sceneNumber: number;
  location: string;
  timeOfDay: 'DAY' | 'NIGHT' | 'DUSK' | 'DAWN';
  atmosphere: string;
  actionDescription: string;
  dialogues: ScriptDialogue[];
}

/**
 * Agent 独立插件配置
 */
export interface AgentPluginConfig {
  id: PipelineStage;
  name: string;
  enabled: boolean;
  llmConfig: {
    baseUrl: string;
    apiKey: string;
    model: string;
    temperature: number;
  };
  systemPromptTemplate?: string;
}

/**
 * 工作流流水线全局上下文
 */
export interface WorkflowPipelineContext {
  novelText: string;
  aspectRatio: AspectRatio;
  stageStatuses: Record<PipelineStage, StageStatus>;
  dirtyFlags: Record<PipelineStage, boolean>;
  characters: CharacterAsset[];
  scenes: SceneAsset[];
  scriptScenes: ScriptScene[];
  shots: StoryboardShot[];
  agentConfigs: Record<PipelineStage, AgentPluginConfig>;
  lastExecutedAt?: number;
}


