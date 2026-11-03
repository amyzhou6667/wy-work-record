import type {
  StoryboardShot,
  AIDecomposeRequest,
  AIRefineShotRequest,
  ShotSize,
  CameraMovement,
  CharacterAsset
} from '../types/index.ts';
import { DocParserEngine } from './docParser.ts';

const docEngine = new DocParserEngine();

/**
 * 大模型智能分镜服务引擎 (支持 OpenAI / DeepSeek / Ollama 协议)
 */
export class LLMStoryboardService {
  /**
   * 构建分镜拆解的 System Prompt
   */
  public buildSystemPrompt(characters: CharacterAsset[], aspectRatio: string): string {
    const charList = characters.length > 0
      ? characters.map(c => `- ${c.name} (${c.roleType}): ${c.appearancePrompt}`).join('\n')
      : '（暂未预设角色，请从小说文本中自主提炼角色）';

    return `你是一名好莱坞资深短剧导演兼 AI 视觉总监。你的任务是将创作者提供的小说或剧本文学文本，拆解为一组极具视觉冲击力和影视工业水准的分镜镜头列表 (10~25 镜)。

【核心镜头推导准则】：
1. 视听外化：将文学心理活动与旁白转化为可视的镜头神态、微表情动作与环境光影。
2. 戏剧节奏：遵循短剧黄金节奏（黄金前3秒大远景或特写抓人钩子 -> 中段中景近景对峙冲突升级 -> 结尾悬念微表情定格）。
3. 景别规范 (shotSize)：必须属于以下之一：
   ['Extreme Close-up', 'Close-up', 'Medium Close-up', 'Medium Shot', 'Full Shot', 'Wide Shot', 'Over-the-shoulder']
4. 机位运镜 (cameraMovement)：必须属于以下之一：
   ['Static Eye-level', 'Low-angle Dolly In', 'High-angle Tilt Down', 'Pan Following', 'Tracking Shot', 'Arc Shot', 'Handheld Shaky']
5. 角色一致性锚定：当前可用角色库如下：
${charList}
若镜头出现上述角色，必须将其英文外貌特征融入 Midjourney 和 Flux 提示词中。
6. 生图提示词规范 (画幅: ${aspectRatio}):
   - midjourney: 英文格式，包含景别运镜、角色外貌动作、环境光影、8k photorealistic, --ar ${aspectRatio} --v 6.1 --style raw
   - flux: 英文 35mm 电影长文胶片描述
   - jimeng: 针对即梦或国产模型的精炼双语描述

【输出格式强制要求】：
必须仅输出合规的 JSON 数组，绝不要添加任何前言、总结或 markdown 解释。JSON 结构范例：
[
  {
    "shotNumber": 1,
    "shotSize": "Wide Shot",
    "cameraMovement": "Static Eye-level",
    "durationSec": 2.5,
    "characterAction": "动作神态描述",
    "characterNames": ["角色名"],
    "environmentLighting": "光影场景描述",
    "dialogue": {
      "speaker": "说话人",
      "text": "台词内容",
      "isVoiceover": false
    },
    "soundBgm": "音效与配乐",
    "matchedSourceParagraph": "对应小说原句",
    "prompts": {
      "midjourney": "...",
      "flux": "...",
      "jimeng": "..."
    }
  }
]`;
  }

  /**
   * 清理与安全解析大模型返回的 JSON
   */
  public extractJsonFromResponse(rawText: string): any[] {
    let clean = rawText.trim();
    // 提取 ```json ... ``` 块
    const codeBlockMatch = clean.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch) {
      clean = codeBlockMatch[1].trim();
    }
    // 找到最外层数组括号
    const startIdx = clean.indexOf('[');
    const endIdx = clean.lastIndexOf(']');
    if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
      clean = clean.slice(startIdx, endIdx + 1);
    }
    const parsed = JSON.parse(clean);
    if (!Array.isArray(parsed)) {
      throw new Error('LLM did not return a JSON array');
    }
    return parsed;
  }

  /**
   * 使用大模型进行智能分镜拆解 (若失败或未配置则优雅降级为离线引擎)
   */
  public async decompose(req: AIDecomposeRequest): Promise<{ shots: StoryboardShot[]; isAIGenerated: boolean }> {
    const { novelText, aspectRatio, characters, llmConfig } = req;

    // 检查大模型配置是否有效 (至少提供 baseUrl 和 model)
    const canUseLLM = !!(llmConfig && llmConfig.baseUrl && llmConfig.model);

    if (canUseLLM) {
      try {
        const systemPrompt = this.buildSystemPrompt(characters, aspectRatio);
        const userPrompt = `请严格按照系统要求，将以下小说文本拆解为影视分镜 JSON 数组：\n\n${novelText}`;

        const url = `${llmConfig.baseUrl.replace(/\/+$/, '')}/chat/completions`;
        const headers: Record<string, string> = {
          'Content-Type': 'application/json'
        };
        if (llmConfig.apiKey) {
          headers['Authorization'] = `Bearer ${llmConfig.apiKey}`;
        }

        const response = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            model: llmConfig.model,
            temperature: llmConfig.temperature ?? 0.7,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ]
          }),
          signal: AbortSignal.timeout(30000) // 30秒超时
        });

        if (!response.ok) {
          throw new Error(`LLM API returned status ${response.status}`);
        }

        const data: any = await response.json();
        const content = data?.choices?.[0]?.message?.content || '';
        const rawShots = this.extractJsonFromResponse(content);

        // 格式化与补全字段
        const shots: StoryboardShot[] = rawShots.map((item, idx) => {
          const charNames: string[] = Array.isArray(item.characterNames) ? item.characterNames : [];
          const matchedCharIds = characters
            .filter(c => charNames.includes(c.name) || (item.dialogue?.speaker && c.name.includes(item.dialogue.speaker)))
            .map(c => c.id);

          return {
            id: `shot_ai_${idx + 1}`,
            shotNumber: item.shotNumber || idx + 1,
            durationSec: typeof item.durationSec === 'number' ? item.durationSec : 3.0,
            shotSize: (item.shotSize || 'Medium Shot') as ShotSize,
            cameraMovement: (item.cameraMovement || 'Static Eye-level') as CameraMovement,
            characterAction: item.characterAction || '角色情绪克制与视觉张力推进',
            characterIds: matchedCharIds,
            environmentLighting: item.environmentLighting || '自然通透电影光照，细腻光影过渡',
            dialogue: item.dialogue?.text ? {
              speaker: item.dialogue.speaker || '角色',
              text: item.dialogue.text,
              isVoiceover: !!item.dialogue.isVoiceover
            } : undefined,
            soundBgm: item.soundBgm || '环境环境音与情绪配乐',
            matchedSourceParagraph: item.matchedSourceParagraph || novelText.slice(0, 60),
            prompts: {
              midjourney: item.prompts?.midjourney || '',
              flux: item.prompts?.flux || '',
              jimeng: item.prompts?.jimeng || ''
            }
          };
        });

        if (shots.length > 0) {
          return { shots, isAIGenerated: true };
        }
      } catch (err) {
        console.warn('[LLMStoryboardService] LLM decomposition failed, falling back to local engine:', err);
      }
    }

    // 优雅降级：使用离线智能解析引擎
    const doc = docEngine.parseTextDocument('novel.txt', novelText);
    const chapter = doc.chapters[0] || { chapterIndex: 1, title: '正文', content: novelText };
    const shots = docEngine.decomposeToShots(chapter, characters, aspectRatio);

    return { shots, isAIGenerated: false };
  }

  /**
   * 单镜头 AI 重新润色
   */
  public async refineShot(req: AIRefineShotRequest): Promise<StoryboardShot> {
    const { shot, userInstruction, characters, aspectRatio, llmConfig } = req;
    if (!llmConfig || !llmConfig.baseUrl || !llmConfig.model) {
      // 离线快速润色微调
      return {
        ...shot,
        characterAction: `${shot.characterAction} (润色指令: ${userInstruction})`,
        prompts: {
          ...shot.prompts,
          midjourney: `${shot.prompts.midjourney}, instruction: ${userInstruction}`
        }
      };
    }

    try {
      const url = `${llmConfig.baseUrl.replace(/\/+$/, '')}/chat/completions`;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (llmConfig.apiKey) headers['Authorization'] = `Bearer ${llmConfig.apiKey}`;

      const prompt = `你是一名专业短剧分镜导演。请根据用户的修改意见，润色以下单个分镜镜头，并返回纯 JSON 单个对象：
原始分镜：
${JSON.stringify(shot, null, 2)}

修改意见：
"${userInstruction}"

画幅：${aspectRatio}
请输出更新后的完整分镜对象 JSON。`;

      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: llmConfig.model,
          temperature: 0.6,
          messages: [{ role: 'user', content: prompt }]
        }),
        signal: AbortSignal.timeout(15000)
      });

      if (res.ok) {
        const data: any = await res.json();
        const content = data?.choices?.[0]?.message?.content || '';
        let clean = content.trim();
        const codeBlockMatch = clean.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (codeBlockMatch) clean = codeBlockMatch[1].trim();
        const startIdx = clean.indexOf('{');
        const endIdx = clean.lastIndexOf('}');
        if (startIdx !== -1 && endIdx !== -1) {
          const parsed = JSON.parse(clean.slice(startIdx, endIdx + 1));
          return {
            ...shot,
            ...parsed,
            id: shot.id,
            shotNumber: shot.shotNumber
          };
        }
      }
    } catch (e) {
      console.warn('[LLMStoryboardService] refineShot failed:', e);
    }

    return shot;
  }
}
