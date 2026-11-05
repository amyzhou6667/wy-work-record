import type { AgentPluginConfig, PipelineStage, ScriptScene, WorkflowPipelineContext } from '../../types/index.ts';

export class ScriptwriterAgent {
  public readonly stage: PipelineStage = 'script';
  public readonly defaultName: string = '剧本改编 Agent';

  public async execute(
    novelText: string,
    config: AgentPluginConfig,
    context: WorkflowPipelineContext
  ): Promise<{ data: ScriptScene[]; isFallback: boolean; message?: string }> {
    if (config.llmConfig?.baseUrl && config.llmConfig?.apiKey) {
      try {
        const prompt = `你是一名专业影视短剧金牌编剧。请将以下网文小说文本改写为标准的影视短剧场次剧本：
【小说文本】
${novelText}

请直接输出标准 JSON 格式，严禁返回任何多余解释：
[
  {
    "sceneNumber": 1,
    "location": "内景 - 地点",
    "timeOfDay": "DAY 或 NIGHT",
    "atmosphere": "场景冲突氛围",
    "actionDescription": "纯视觉化动作与环境描写",
    "dialogues": [
      {
        "speaker": "说话角色名",
        "emotion": "情绪语气",
        "text": "精炼台词对白",
        "isVoiceover": false
      }
    ]
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
              { role: 'system', content: config.systemPromptTemplate || '你是一个专业短剧剧本编剧智能体。' },
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
              return {
                data: parsed,
                isFallback: false
              };
            }
          }
        }
      } catch (err: any) {
        console.warn('[ScriptwriterAgent] LLM API 故障，切换离线规则引擎:', err.message);
      }
    }

    return {
      data: this.fallback(novelText, context),
      isFallback: true,
      message: '已启用离线标点断句剧本改编引擎'
    };
  }

  public fallback(novelText: string, context?: WorkflowPipelineContext): ScriptScene[] {
    const lines = novelText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const scenes: ScriptScene[] = [];
    let currentDialogues: ScriptScene['dialogues'] = [];
    let currentActions: string[] = [];
    let sceneNum = 1;

    for (const line of lines) {
      if (/^(?:第\s*[0-9一二三四两五六七八九十百千万]+\s*[章回节集部卷篇]|Chapter\s+\d+|Episode\s+\d+)/i.test(line)) {
        continue;
      }

      const quoteMatch = line.match(/[“"「]([^”"」]+)[”"」]/);
      if (quoteMatch && quoteMatch.index !== undefined) {
        const text = quoteMatch[1];
        const before = line.slice(0, quoteMatch.index).trim();
        let speaker = '角色';
        let emotion = '沉着';

        if (before.includes('苏清影')) speaker = '苏清影';
        else if (before.includes('顾北辰')) speaker = '顾北辰';
        else {
          const nameMatch = before.match(/^([\u4e00-\u9fa5]{2,4}?)(?=[，,\s:：]|目光|面色|神色|神情|嘴角|握紧|站在|倒退|大步|冷笑|沉声|喊道|说道)/);
          if (nameMatch) speaker = nameMatch[1];
        }

        if (before.includes('寒霜') || before.includes('怒')) emotion = '愤怒冷酷';
        else if (before.includes('冷笑')) emotion = '不屑从容';
        else if (before.includes('震天动地') || before.includes('跪地')) emotion = '激昂敬畏';

        currentDialogues.push({
          speaker,
          emotion,
          text,
          isVoiceover: line.includes('独白') || line.includes('心想')
        });
      } else {
        currentActions.push(line);
      }
    }

    scenes.push({
      sceneNumber: sceneNum,
      location: novelText.includes('顾家老宅') ? '内景 - 顾家老宅客厅' : '内景 - 主场景',
      timeOfDay: 'NIGHT',
      atmosphere: '紧张冲突，反转前夕',
      actionDescription: currentActions.slice(0, 3).join('；') || '狂风呼啸，冷雨敲打着落地窗',
      dialogues: currentDialogues.length > 0 ? currentDialogues : [
        { speaker: '旁白', emotion: '叙述', text: novelText.slice(0, 30), isVoiceover: true }
      ]
    });

    return scenes;
  }
}
