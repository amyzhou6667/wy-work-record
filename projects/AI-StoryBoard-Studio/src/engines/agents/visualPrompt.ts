import type {
  AgentPluginConfig,
  AspectRatio,
  CharacterAsset,
  PipelineStage,
  StoryboardShot,
  WorkflowPipelineContext
} from '../../types/index.ts';
import { PromptAdapterEngine } from '../promptAdapter.ts';

export interface VisualPromptInput {
  shots: StoryboardShot[];
  characters: CharacterAsset[];
  aspectRatio: AspectRatio;
}

export class VisualPromptAgent {
  public readonly stage: PipelineStage = 'prompt';
  public readonly defaultName: string = '生图 Prompt Agent';
  private promptEngine = new PromptAdapterEngine();

  public async execute(
    input: VisualPromptInput,
    config: AgentPluginConfig,
    context: WorkflowPipelineContext
  ): Promise<{ data: StoryboardShot[]; isFallback: boolean; message?: string }> {
    const { shots, characters, aspectRatio } = input;

    // 若配置了大模型 API，调用大模型充当好莱坞 AI 视觉总监进行专业生图 Prompt 扩写与光影润色
    if (config.llmConfig?.baseUrl && config.llmConfig?.apiKey) {
      try {
        const charDescriptions = characters.length > 0
          ? characters.map(c => `- ${c.name} (${c.roleType}): ${c.appearancePrompt}${c.crefUrl ? ` [crefUrl: ${c.crefUrl}]` : ''}`).join('\n')
          : '（暂未提取到预设出镜角色设定）';

        const prompt = `你是一名好莱坞资深 AI 概念视觉总监兼顶级生图提示词专家。
请根据以下导演分镜流、出镜角色设定以及画幅规格（${aspectRatio}），为每个分镜深度扩写极具视觉震撼力、摄影级写实质感的三大生图模型提示词。

【出镜角色视觉特征 (必须在各模型提示词中严格一致锚定)】：
${charDescriptions}

【画幅比例要求】：${aspectRatio}

【导演分镜列表】：
${JSON.stringify(shots.map(s => ({
  shotNumber: s.shotNumber,
  shotSize: s.shotSize,
  cameraMovement: s.cameraMovement,
  characterAction: s.characterAction,
  characterNames: characters.filter(c => s.characterIds?.includes(c.id)).map(c => c.name),
  environmentLighting: s.environmentLighting,
  dialogue: s.dialogue
})), null, 2)}

【生图提示词生成规范与强制约束】：
1. 必须输出严格与输入分镜一一对应的 JSON 数组，严禁包含任何前言总结或 markdown 解释：
[
  {
    "shotNumber": 1,
    "prompts": {
      "midjourney": "...",
      "flux": "...",
      "jimeng": "..."
    }
  }
]
2. midjourney 提示词规范：
   - 必须 100% 纯英文（绝对严禁包含任何中文字符与全角标点符号）！
   - 包含景别运镜机位专业英文、出镜角色英文外貌与精细穿搭、具体神态动作、电影级光影打光（如三点布光、轮廓光、体积丁达尔光比）、工业质感词（8k, cinematic lighting, photorealistic, depth of field, film grain）、结尾必须包含 --ar ${aspectRatio} --v 6.1 --style raw。若出镜角色有 crefUrl 请追加 --cref <url>。
3. flux 提示词规范：
   - 必须 100% 纯英文（绝对严禁包含任何中文字符与全角标点符号）！
   - 35mm 胶片长文摄影写真描述（A high quality photorealistic 35mm film still captured in...），包含细腻的微表情毛孔肌理、瞳孔眼神光与环境光影层次。
4. jimeng 提示词规范：
   - 针对即梦 (Dreamina) 的工业级精炼双语描述，包含画幅、构图景别、出镜角色、动作与光影质感。
`;

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
              { role: 'system', content: config.systemPromptTemplate || '你是一个专业 AI 生图提示词视觉总监智能体。' },
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
              const enhanced = shots.map((shot, idx) => {
                const matchItem = parsed.find((p: any) => p.shotNumber === shot.shotNumber) || parsed[idx];
                const autoPrompts = this.promptEngine.generateAllPrompts(shot, characters, aspectRatio);

                const rawMj = (matchItem?.prompts?.midjourney || matchItem?.midjourney || '').trim();
                const rawFlux = (matchItem?.prompts?.flux || matchItem?.flux || '').trim();
                const rawJimeng = (matchItem?.prompts?.jimeng || matchItem?.jimeng || '').trim();

                const cleanMj = rawMj && !/[\u4e00-\u9fa5]/.test(rawMj)
                  ? this.promptEngine.sanitizeToPureEnglish(rawMj)
                  : autoPrompts.midjourney;

                const cleanFlux = rawFlux && !/[\u4e00-\u9fa5]/.test(rawFlux)
                  ? this.promptEngine.sanitizeToPureEnglish(rawFlux)
                  : autoPrompts.flux;

                return {
                  ...shot,
                  prompts: {
                    midjourney: cleanMj,
                    flux: cleanFlux,
                    jimeng: rawJimeng || autoPrompts.jimeng
                  }
                };
              });

              return {
                data: enhanced,
                isFallback: false
              };
            }
          }
        }
      } catch (err: any) {
        console.warn('[VisualPromptAgent] LLM API 故障，切换确定性提示词引擎:', err.message);
      }
    }

    // 优雅离线保底逻辑：通过 PromptAdapterEngine 进行确定性工业级提示词构造
    const enhancedShots = shots.map(shot => {
      const matchedChar = characters.find(c =>
        (shot.characterIds && shot.characterIds.includes(c.id)) ||
        (shot.dialogue?.speaker && (c.name.includes(shot.dialogue.speaker) || shot.dialogue.speaker.includes(c.name))) ||
        (shot.characterAction && shot.characterAction.includes(c.name))
      ) || characters[0];

      const characterIds = matchedChar ? [matchedChar.id] : (shot.characterIds || []);
      const shotToFormat = { ...shot, characterIds };

      const generatedPrompts = this.promptEngine.generateAllPrompts(shotToFormat, characters, aspectRatio);

      return {
        ...shotToFormat,
        prompts: {
          midjourney: generatedPrompts.midjourney,
          flux: generatedPrompts.flux,
          jimeng: generatedPrompts.jimeng
        }
      };
    });

    return {
      data: enhancedShots,
      isFallback: true,
      message: '已启用确定性 Prompt 适配引擎保底生成'
    };
  }

  public fallback(input: VisualPromptInput, context?: WorkflowPipelineContext): StoryboardShot[] {
    const { shots, characters, aspectRatio } = input;
    return shots.map(shot => {
      const matchedChar = characters.find(c =>
        (shot.dialogue?.speaker && c.name.includes(shot.dialogue.speaker)) ||
        (shot.characterAction && shot.characterAction.includes(c.name))
      );
      const activeChars = matchedChar ? [matchedChar] : characters.slice(0, 1);
      const generatedPrompts = this.promptEngine.generateAllPrompts(shot, activeChars, aspectRatio);
      return {
        ...shot,
        prompts: generatedPrompts
      };
    });
  }
}
