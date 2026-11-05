import type { AgentPluginConfig, AspectRatio, CharacterAsset, PipelineStage, StoryboardShot, WorkflowPipelineContext } from '../../types/index.ts';
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

    // 无论是否配置大模型，均通过 PromptAdapterEngine 进行确定性工业级提示词构造
    // 若配置了大模型，可对提示词进行高级扩写与润色
    const enhancedShots = shots.map(shot => {
      // 1. 匹配角色
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
      isFallback: false
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
