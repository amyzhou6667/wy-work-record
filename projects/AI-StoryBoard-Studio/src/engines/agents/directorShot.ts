import type {
  AgentPluginConfig,
  AspectRatio,
  CameraMovement,
  PipelineStage,
  ScriptScene,
  ShotSize,
  StoryboardShot,
  WorkflowPipelineContext
} from '../../types/index.ts';
import { DocParserEngine } from '../docParser.ts';

export interface DirectorShotInput {
  novelText: string;
  scriptScenes: ScriptScene[];
  aspectRatio?: AspectRatio;
}

const VALID_SHOT_SIZES: ShotSize[] = [
  'Extreme Close-up',
  'Close-up',
  'Medium Close-up',
  'Medium Shot',
  'Full Shot',
  'Wide Shot',
  'Over-the-shoulder'
];

const VALID_CAMERA_MOVEMENTS: CameraMovement[] = [
  'Static Eye-level',
  'Low-angle Dolly In',
  'High-angle Tilt Down',
  'Pan Following',
  'Tracking Shot',
  'Arc Shot',
  'Handheld Shaky'
];

export class DirectorShotAgent {
  public readonly stage: PipelineStage = 'shot';
  public readonly defaultName: string = '镜头切分 Agent';
  private docEngine = new DocParserEngine();

  public async execute(
    input: DirectorShotInput,
    config: AgentPluginConfig,
    context: WorkflowPipelineContext
  ): Promise<{ data: StoryboardShot[]; isFallback: boolean; message?: string }> {
    if (config.llmConfig?.baseUrl && config.llmConfig?.apiKey) {
      try {
        const charList = context?.characters?.length
          ? context.characters.map(c => `- ${c.name} (${c.roleType}): ${c.appearancePrompt}`).join('\n')
          : '（暂未在第一阶段提取到预设角色，请依据剧本自主锚定出镜角色）';

        const prompt = `你是一名好莱坞资深短剧导演兼分镜摄影指导。你的任务是根据编剧改编的【短剧场次剧本】与【原著背景】，深度切分为极具影视视听张力和节奏冲突的电影分镜镜头流（8~20镜）。

【出镜角色库 (必须在 characterNames 中精准对应绑定)】：
${charList}

【改编剧本场次 (分镜切分的核心直接依据)】：
${JSON.stringify(input.scriptScenes, null, 2)}

【原著背景参考】：
${(input.novelText || '').slice(0, 1000)}

【短剧视听镜头推导准则】：
1. 视听外化：将剧本中的动作、环境与文学潜台词转化为可视的镜头神态、微表情动作与环境光影。
2. 短剧黄金节奏：
   - 黄金前3秒：建立大景深环境全景 (Wide Shot) 或高悬念微表情特写 (Extreme Close-up)，瞬间抓住观众眼球；
   - 核心冲突对峙：对白交锋时，采用近景 (Close-up)、中近景 (Medium Close-up) 与过肩对峙 (Over-the-shoulder) 交替正反打，强化眼神视线博弈；
   - 结尾悬念定格：结尾镜头定格在悬念微表情、离去背影或反转卡点，留足剧情悬念。
3. 景别规范 (shotSize，必须严格属于以下之一)：
   ${JSON.stringify(VALID_SHOT_SIZES)}
4. 机位运镜 (cameraMovement，必须严格属于以下之一)：
   ${JSON.stringify(VALID_CAMERA_MOVEMENTS)}

【输出格式强制要求】：
必须严格输出合规的 JSON 数组，严禁包含任何前言总结或 markdown 解释：
[
  {
    "shotNumber": 1,
    "durationSec": 3.0,
    "shotSize": "Wide Shot",
    "cameraMovement": "Static Eye-level",
    "characterAction": "动作微表情详细描写（角色在画面中的具体动势与神态）",
    "characterNames": ["角色名"],
    "environmentLighting": "光影场景与视觉氛围描述",
    "dialogue": {
      "speaker": "说话人",
      "text": "台词内容",
      "isVoiceover": false
    },
    "soundBgm": "音效与情绪配乐"
  }
]`;

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 60000);

        const cleanBaseUrl = config.llmConfig.baseUrl.trim().replace(/\/+$/, '').replace(/\/anthropic\/?$/, '/v1').replace(/\/chat\/completions\/?$/, '');
        const response = await fetch(`${cleanBaseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.llmConfig.apiKey}`
          },
          body: JSON.stringify({
            model: config.llmConfig.model,
            temperature: config.llmConfig.temperature || 0.6,
            messages: [
              { role: 'system', content: config.systemPromptTemplate || '你是一个专业电影分镜导演智能体。' },
              { role: 'user', content: prompt }
            ]
          }),
          signal: controller.signal
        });
        clearTimeout(timer);

        if (response.ok) {
          const resJson: any = await response.json();
          const choice = resJson.choices?.[0]?.message;
          const content = choice?.content || choice?.reasoning_content || '';
          let clean = content.trim();
          const codeBlockMatch = clean.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
          if (codeBlockMatch) clean = codeBlockMatch[1].trim();

          const match = clean.match(/\[[\s\S]*\]/);
          if (match) {
            const parsed = JSON.parse(match[0]);
            if (Array.isArray(parsed) && parsed.length > 0) {
              const allChars = context?.characters || [];
              const shots: StoryboardShot[] = parsed.map((item: any, idx: number) => {
                const names: string[] = Array.isArray(item.characterNames)
                  ? item.characterNames
                  : (item.characterName ? [item.characterName] : []);

                // 智能关联到 context.characters 中的 id
                const matchedChars = allChars.filter(c =>
                  names.some(n => n.includes(c.name) || c.name.includes(n)) ||
                  (item.dialogue?.speaker && (c.name.includes(item.dialogue.speaker) || item.dialogue.speaker.includes(c.name))) ||
                  (item.characterAction && item.characterAction.includes(c.name))
                );

                const characterIds = matchedChars.length > 0
                  ? matchedChars.map(c => c.id)
                  : (allChars[0] ? [allChars[0].id] : []);

                const shotSize: ShotSize = VALID_SHOT_SIZES.includes(item.shotSize)
                  ? item.shotSize
                  : 'Medium Shot';

                const cameraMovement: CameraMovement = VALID_CAMERA_MOVEMENTS.includes(item.cameraMovement)
                  ? item.cameraMovement
                  : 'Static Eye-level';

                return {
                  id: `shot_${Date.now()}_${idx + 1}`,
                  shotNumber: item.shotNumber || idx + 1,
                  durationSec: typeof item.durationSec === 'number' ? Math.max(1.5, Math.min(8.0, item.durationSec)) : 3.0,
                  shotSize,
                  cameraMovement,
                  characterAction: item.characterAction || '角色专注对峙，戏剧张力暗涌',
                  characterIds,
                  environmentLighting: item.environmentLighting || '电影主光源侧打，明暗对比强烈',
                  dialogue: item.dialogue?.text ? {
                    speaker: item.dialogue.speaker || '角色',
                    text: item.dialogue.text,
                    isVoiceover: !!item.dialogue.isVoiceover
                  } : undefined,
                  soundBgm: item.soundBgm || '环境音效与重音伴奏',
                  matchedSourceParagraph: item.matchedSourceParagraph || item.characterAction || '',
                  prompts: { midjourney: '', flux: '', jimeng: '' }
                };
              });

              return {
                data: shots,
                isFallback: false
              };
            }
          }
        }
      } catch (err: any) {
        console.warn('[DirectorShotAgent] LLM API 故障，切换离线规则引擎:', err.message);
      }
    }

    return {
      data: this.fallback(input, context),
      isFallback: true,
      message: '已启用离线视听启发式分镜切分引擎'
    };
  }

  public fallback(input: DirectorShotInput, context?: WorkflowPipelineContext): StoryboardShot[] {
    const { novelText, scriptScenes } = input;
    const shots: StoryboardShot[] = [];
    const allChars = context?.characters || [];
    let shotNum = 1;

    // 优先从 scriptScenes 提取
    if (scriptScenes && scriptScenes.length > 0) {
      for (const scene of scriptScenes) {
        // 1. 建立镜头 (Establishing Shot)
        shots.push({
          id: `shot_${Date.now()}_${shotNum}`,
          shotNumber: shotNum++,
          durationSec: 3.5,
          shotSize: 'Wide Shot',
          cameraMovement: 'Static Eye-level',
          characterAction: scene.actionDescription || '空间全景建立，压抑氛围暗涌',
          characterIds: allChars.slice(0, 2).map(c => c.id),
          environmentLighting: `${scene.location || '场景'}自然漫反射柔光，边缘微弱轮廓光`,
          soundBgm: '低沉大提琴环境弦乐铺垫',
          matchedSourceParagraph: scene.location,
          prompts: { midjourney: '', flux: '', jimeng: '' }
        });

        // 2. 依次切分对白镜头
        for (let i = 0; i < scene.dialogues.length; i++) {
          const d = scene.dialogues[i];
          const matchedChar = allChars.find(c => c.name.includes(d.speaker) || d.speaker.includes(c.name));
          const charIds = matchedChar ? [matchedChar.id] : (allChars[0] ? [allChars[0].id] : []);

          // 景别随叙事节奏交替推进：近景 -> 特写 -> 过肩 -> 中近景
          const shotSizes: ShotSize[] = ['Medium Close-up', 'Close-up', 'Over-the-shoulder', 'Extreme Close-up'];
          const shotSize: ShotSize = shotSizes[i % shotSizes.length];

          const cameraMovements: CameraMovement[] = ['Static Eye-level', 'Low-angle Dolly In', 'Pan Following', 'Arc Shot'];
          const cameraMovement: CameraMovement = cameraMovements[i % cameraMovements.length];

          shots.push({
            id: `shot_${Date.now()}_${shotNum}`,
            shotNumber: shotNum++,
            durationSec: Math.max(2.5, Math.min(5.5, d.text.length / 4.0 + 0.5)),
            shotSize,
            cameraMovement,
            characterAction: `${d.speaker}${d.emotion ? `（${d.emotion}）` : ''}专注注视对方，情绪饱满推进`,
            characterIds: charIds,
            environmentLighting: i % 2 === 0
              ? '电影侧面冷调硬光勾勒面部轮廓，立体阴影'
              : '柔和漫反射环境光照亮微表情，眼神捕捉高光',
            dialogue: {
              speaker: d.speaker,
              text: d.text,
              isVoiceover: d.isVoiceover
            },
            soundBgm: i === scene.dialogues.length - 1 ? '悬疑重音定格' : '紧张对峙环境重音',
            matchedSourceParagraph: `“${d.text}”`,
            prompts: { midjourney: '', flux: '', jimeng: '' }
          });
        }
      }
      return shots;
    }

    // 保底：若 scriptScenes 为空，则调用 DocParserEngine 分镜提取
    const parsed = this.docEngine.decomposeToShots(
      { chapterIndex: 1, title: '正文', content: novelText || '' },
      allChars,
      input.aspectRatio || '9:16'
    );
    return parsed;
  }
}
