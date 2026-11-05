import type { AgentPluginConfig, AspectRatio, CameraMovement, PipelineStage, ScriptScene, ShotSize, StoryboardShot, WorkflowPipelineContext } from '../../types/index.ts';
import { DocParserEngine } from '../docParser.ts';

export interface DirectorShotInput {
  novelText: string;
  scriptScenes: ScriptScene[];
  aspectRatio?: AspectRatio;
}

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
        const prompt = `你是一名资深好莱坞电影导演与分镜师。请根据以下剧本和原著，将其切分为影视级视听镜头流：
【剧本场次】
${JSON.stringify(input.scriptScenes, null, 2)}

请直接输出标准 JSON 数组，严禁包含任何其他文字：
[
  {
    "shotNumber": 1,
    "durationSec": 3.0,
    "shotSize": "Wide Shot 或 Close-up 或 Medium Shot 或 Extreme Close-up",
    "cameraMovement": "Static Eye-level 或 Low-angle Dolly In 或 Pan Following 或 Slow Push-in",
    "characterAction": "动作神态详细描述",
    "characterNames": ["角色名"],
    "environmentLighting": "光影氛围描述",
    "dialogue": {
      "speaker": "说话人",
      "text": "台词内容"
    }
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
            temperature: config.llmConfig.temperature || 0.7,
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
          const match = content.match(/\[[\s\S]*\]/);
          if (match) {
            const parsed = JSON.parse(match[0]);
            if (Array.isArray(parsed) && parsed.length > 0) {
              const shots: StoryboardShot[] = parsed.map((item: any, idx: number) => ({
                id: `shot_${Date.now()}_${idx + 1}`,
                shotNumber: item.shotNumber || idx + 1,
                durationSec: typeof item.durationSec === 'number' ? item.durationSec : 3.0,
                shotSize: item.shotSize || 'Medium Shot',
                cameraMovement: item.cameraMovement || 'Static Eye-level',
                characterAction: item.characterAction || '角色专注对峙',
                characterIds: [],
                environmentLighting: item.environmentLighting || '冷调电影光',
                dialogue: item.dialogue?.text ? item.dialogue : undefined,
                soundBgm: item.soundBgm || '环境音效与重音伴奏',
                matchedSourceParagraph: item.characterAction,
                prompts: { midjourney: '', flux: '', jimeng: '' }
              }));

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
          characterIds: [],
          environmentLighting: '冷雨落地窗自然漫反射柔光，边缘微弱轮廓光',
          soundBgm: '低沉大提琴环境弦乐铺垫',
          matchedSourceParagraph: scene.location,
          prompts: { midjourney: '', flux: '', jimeng: '' }
        });

        // 2. 依次切分对白镜头
        for (let i = 0; i < scene.dialogues.length; i++) {
          const d = scene.dialogues[i];
          const isGu = d.speaker.includes('顾北辰');
          const shotSize: ShotSize = isGu ? 'Close-up' : 'Medium Shot';
          const cameraMovement: CameraMovement = isGu ? 'Low-angle Dolly In' : 'Static Eye-level';

          shots.push({
            id: `shot_${Date.now()}_${shotNum}`,
            shotNumber: shotNum++,
            durationSec: Math.max(2.5, Math.min(5.0, d.text.length / 4.0)),
            shotSize,
            cameraMovement,
            characterAction: `${d.speaker}${d.emotion ? `（${d.emotion}）` : ''}注视对方，情绪饱满推进`,
            characterIds: [],
            environmentLighting: isGu ? '侧面冷峻硬光勾勒下颌线条' : '柔和正面漫射光照亮神态',
            dialogue: {
              speaker: d.speaker,
              text: d.text,
              isVoiceover: d.isVoiceover
            },
            soundBgm: '紧张对峙微弱重音',
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
      context?.characters || [],
      input.aspectRatio || '9:16'
    );
    return parsed;
  }
}
