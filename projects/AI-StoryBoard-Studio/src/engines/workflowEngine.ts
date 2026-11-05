import type {
  AgentPluginConfig,
  AspectRatio,
  PipelineStage,
  WorkflowPipelineContext
} from '../types/index.ts';
import { AssetExtractorAgent } from './agents/assetExtractor.ts';
import { ScriptwriterAgent } from './agents/scriptwriter.ts';
import { DirectorShotAgent } from './agents/directorShot.ts';
import { VisualPromptAgent } from './agents/visualPrompt.ts';

export class WorkflowEngine {
  private assetAgent = new AssetExtractorAgent();
  private scriptAgent = new ScriptwriterAgent();
  private shotAgent = new DirectorShotAgent();
  private promptAgent = new VisualPromptAgent();

  /**
   * 构造初始化的工作流上下文
   */
  public createInitialContext(novelText: string, aspectRatio: AspectRatio = '9:16'): WorkflowPipelineContext {
    const defaultConfigs: Record<PipelineStage, AgentPluginConfig> = {
      asset: {
        id: 'asset',
        name: '资产提取 Agent',
        enabled: true,
        llmConfig: { baseUrl: '', apiKey: '', model: 'deepseek-chat', temperature: 0.7 }
      },
      script: {
        id: 'script',
        name: '剧本改编 Agent',
        enabled: true,
        llmConfig: { baseUrl: '', apiKey: '', model: 'deepseek-chat', temperature: 0.7 }
      },
      shot: {
        id: 'shot',
        name: '镜头切分 Agent',
        enabled: true,
        llmConfig: { baseUrl: '', apiKey: '', model: 'deepseek-chat', temperature: 0.7 }
      },
      prompt: {
        id: 'prompt',
        name: '生图 Prompt Agent',
        enabled: true,
        llmConfig: { baseUrl: '', apiKey: '', model: 'deepseek-chat', temperature: 0.7 }
      }
    };

    return {
      novelText,
      aspectRatio,
      stageStatuses: {
        asset: 'idle',
        script: 'idle',
        shot: 'idle',
        prompt: 'idle'
      },
      dirtyFlags: {
        asset: false,
        script: false,
        shot: false,
        prompt: false
      },
      executionModes: {
        asset: 'offline_fallback',
        script: 'offline_fallback',
        shot: 'offline_fallback',
        prompt: 'offline_fallback'
      },
      characters: [],
      scenes: [],
      scriptScenes: [],
      shots: [],
      agentConfigs: defaultConfigs,
      lastExecutedAt: Date.now()
    };
  }

  /**
   * 顺序执行全流水线
   */
  public async runAll(context: WorkflowPipelineContext): Promise<WorkflowPipelineContext> {
    let ctx = { ...context };
    ctx.executionModes = ctx.executionModes || {
      asset: 'offline_fallback',
      script: 'offline_fallback',
      shot: 'offline_fallback',
      prompt: 'offline_fallback'
    };

    // 阶段 1：资产提取
    if (ctx.agentConfigs.asset.enabled) {
      ctx.stageStatuses.asset = 'running';
      const assetRes = await this.assetAgent.execute(ctx.novelText, ctx.agentConfigs.asset, ctx);
      ctx.characters = assetRes.data.characters;
      ctx.scenes = assetRes.data.scenes;
      ctx.stageStatuses.asset = 'ready';
      ctx.dirtyFlags.asset = false;
      ctx.executionModes.asset = assetRes.isFallback ? 'offline_fallback' : 'llm';
    } else {
      ctx.stageStatuses.asset = 'skipped';
      ctx.executionModes.asset = 'skipped';
    }

    // 阶段 2：剧本改编 (支持跳过直通)
    if (ctx.agentConfigs.script.enabled) {
      ctx.stageStatuses.script = 'running';
      const scriptRes = await this.scriptAgent.execute(ctx.novelText, ctx.agentConfigs.script, ctx);
      ctx.scriptScenes = scriptRes.data;
      ctx.stageStatuses.script = 'ready';
      ctx.dirtyFlags.script = false;
      ctx.executionModes.script = scriptRes.isFallback ? 'offline_fallback' : 'llm';
    } else {
      ctx.stageStatuses.script = 'skipped';
      ctx.executionModes.script = 'skipped';
    }

    // 阶段 3：镜头切分
    if (ctx.agentConfigs.shot.enabled) {
      ctx.stageStatuses.shot = 'running';
      const shotRes = await this.shotAgent.execute(
        {
          novelText: ctx.novelText,
          scriptScenes: ctx.scriptScenes,
          aspectRatio: ctx.aspectRatio
        },
        ctx.agentConfigs.shot,
        ctx
      );
      ctx.shots = shotRes.data;
      ctx.stageStatuses.shot = 'ready';
      ctx.dirtyFlags.shot = false;
      ctx.executionModes.shot = shotRes.isFallback ? 'offline_fallback' : 'llm';
    } else {
      ctx.stageStatuses.shot = 'skipped';
      ctx.executionModes.shot = 'skipped';
    }

    // 阶段 4：生图 Prompt 生成
    if (ctx.agentConfigs.prompt.enabled) {
      ctx.stageStatuses.prompt = 'running';
      const promptRes = await this.promptAgent.execute(
        {
          shots: ctx.shots,
          characters: ctx.characters,
          aspectRatio: ctx.aspectRatio
        },
        ctx.agentConfigs.prompt,
        ctx
      );
      ctx.shots = promptRes.data;
      ctx.stageStatuses.prompt = 'ready';
      ctx.dirtyFlags.prompt = false;
      ctx.executionModes.prompt = promptRes.isFallback ? 'offline_fallback' : 'llm';
    } else {
      ctx.stageStatuses.prompt = 'skipped';
      ctx.executionModes.prompt = 'skipped';
    }

    ctx.lastExecutedAt = Date.now();
    return ctx;
  }

  /**
   * 独立运行单个阶段
   */
  public async runStage(context: WorkflowPipelineContext, stage: PipelineStage): Promise<WorkflowPipelineContext> {
    const ctx = { ...context };

    switch (stage) {
      case 'asset': {
        ctx.stageStatuses.asset = 'running';
        const res = await this.assetAgent.execute(ctx.novelText, ctx.agentConfigs.asset, ctx);
        ctx.characters = res.data.characters;
        ctx.scenes = res.data.scenes;
        ctx.stageStatuses.asset = 'ready';
        ctx.dirtyFlags.asset = false;
        // 标记下游为脏
        ctx.dirtyFlags.prompt = true;
        break;
      }
      case 'script': {
        ctx.stageStatuses.script = 'running';
        const res = await this.scriptAgent.execute(ctx.novelText, ctx.agentConfigs.script, ctx);
        ctx.scriptScenes = res.data;
        ctx.stageStatuses.script = 'ready';
        ctx.dirtyFlags.script = false;
        // 标记下游为脏
        ctx.dirtyFlags.shot = true;
        ctx.dirtyFlags.prompt = true;
        break;
      }
      case 'shot': {
        ctx.stageStatuses.shot = 'running';
        const res = await this.shotAgent.execute(
          {
            novelText: ctx.novelText,
            scriptScenes: ctx.scriptScenes,
            aspectRatio: ctx.aspectRatio
          },
          ctx.agentConfigs.shot,
          ctx
        );
        ctx.shots = res.data;
        ctx.stageStatuses.shot = 'ready';
        ctx.dirtyFlags.shot = false;
        ctx.dirtyFlags.prompt = true;
        break;
      }
      case 'prompt': {
        ctx.stageStatuses.prompt = 'running';
        const res = await this.promptAgent.execute(
          {
            shots: ctx.shots,
            characters: ctx.characters,
            aspectRatio: ctx.aspectRatio
          },
          ctx.agentConfigs.prompt,
          ctx
        );
        ctx.shots = res.data;
        ctx.stageStatuses.prompt = 'ready';
        ctx.dirtyFlags.prompt = false;
        break;
      }
    }

    ctx.lastExecutedAt = Date.now();
    return ctx;
  }

  /**
   * 上游资产或数据变更，级联标记下游脏状态
   */
  public markDirty(context: WorkflowPipelineContext, changedStage: PipelineStage): WorkflowPipelineContext {
    const ctx = { ...context, dirtyFlags: { ...context.dirtyFlags } };

    if (changedStage === 'asset') {
      ctx.dirtyFlags.prompt = true;
    } else if (changedStage === 'script') {
      ctx.dirtyFlags.shot = true;
      ctx.dirtyFlags.prompt = true;
    } else if (changedStage === 'shot') {
      ctx.dirtyFlags.prompt = true;
    }

    return ctx;
  }

  /**
   * 增量重跑 Prompt 阶段 (保护用户已编辑的镜头与台词不被冲掉)
   */
  public async runIncrementalPrompts(context: WorkflowPipelineContext): Promise<WorkflowPipelineContext> {
    const ctx = { ...context };
    ctx.stageStatuses.prompt = 'running';

    const res = await this.promptAgent.execute(
      {
        shots: ctx.shots,
        characters: ctx.characters,
        aspectRatio: ctx.aspectRatio
      },
      ctx.agentConfigs.prompt,
      ctx
    );

    ctx.shots = res.data;
    ctx.stageStatuses.prompt = 'ready';
    ctx.dirtyFlags.prompt = false;
    ctx.lastExecutedAt = Date.now();
    return ctx;
  }
}
