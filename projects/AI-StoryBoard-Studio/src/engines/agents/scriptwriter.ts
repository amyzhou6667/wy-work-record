import type { AgentPluginConfig, PipelineStage, ScriptScene, ScriptDialogue, WorkflowPipelineContext } from '../../types/index.ts';

export class ScriptwriterAgent {
  public readonly stage: PipelineStage = 'script';
  public readonly defaultName: string = '剧本改编 Agent';

  /**
   * 标准化与容错处理大模型返回的场次数据
   */
  public normalizeScenes(rawItems: any[]): ScriptScene[] {
    if (!Array.isArray(rawItems)) return [];

    return rawItems.map((item: any, idx: number) => {
      // 容错提取对白列表 (兼容 dialogues / dialogue / lines / conversations / paragraphs)
      const rawDialogues = item.dialogues || item.dialogue || item.lines || item.conversations || item.paragraphs || [];
      const dialogues: ScriptDialogue[] = Array.isArray(rawDialogues)
        ? rawDialogues.map((d: any) => ({
            speaker: d.speaker || d.character || d.name || d.role || '角色',
            emotion: d.emotion || d.tone || d.mood || '沉着',
            text: d.text || d.content || d.dialogue || d.line || '',
            isVoiceover: !!(d.isVoiceover || d.voiceover || d.isVo || d.is_voiceover)
          })).filter(d => d.text.trim().length > 0)
        : [];

      // 容错提取动作与环境描写 (兼容 actionDescription / action / description / sceneDescription / content / summary)
      const actionDesc = (
        item.actionDescription ||
        item.action ||
        item.description ||
        item.sceneDescription ||
        item.content ||
        item.summary ||
        ''
      ).trim();

      // 容错提取场景地点与时间
      const location = (item.location || item.scene || item.setting || item.place || '内景 - 主场景').trim();
      const rawTime = (item.timeOfDay || item.time || item.time_of_day || 'DAY').toUpperCase();
      const timeOfDay = (['DAY', 'NIGHT', 'DUSK', 'DAWN'].includes(rawTime) ? rawTime : 'DAY') as any;
      const atmosphere = (item.atmosphere || item.mood || item.tone || '戏剧冲突').trim();

      return {
        sceneNumber: typeof item.sceneNumber === 'number' ? item.sceneNumber : idx + 1,
        location,
        timeOfDay,
        atmosphere,
        actionDescription: actionDesc || (dialogues.length > 0 ? '角色出镜对峙，环境氛围暗涌。' : '场景镜头视听呈现。'),
        dialogues
      };
    });
  }

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

【重要格式规范】：
必须输出标准 JSON 数组，严禁返回任何多余解释。每个场次必须包含：
- sceneNumber: 场次序号 (数字)
- location: 场景地点，如 "外景 - 江边" 或 "内景 - 总裁办公室"
- timeOfDay: 拍摄时间 ("DAY" 或 "NIGHT" 或 "DUSK" 或 "DAWN")
- atmosphere: 影视氛围，如 "阴郁压抑" 或 "剑拔弩张"
- actionDescription: 该场次的详细动作描写、人物神态与镜头视觉环境（绝不可为空）
- dialogues: 角色对白列表数组，每句包含 speaker (角色名)、emotion (语气神态)、text (台词正文)、isVoiceover (是否独白/旁白)

范例格式：
[
  {
    "sceneNumber": 1,
    "location": "外景 - 江城跨江大桥",
    "timeOfDay": "DAY",
    "atmosphere": "黑云压城，剑拔弩张",
    "actionDescription": "暴雨如注，江面波涛翻滚。数十辆黑色迈巴赫成列封锁大桥，黑色风衣猎猎作响。",
    "dialogues": [
      {
        "speaker": "顾北辰",
        "emotion": "眼神如冰，嘴角冷笑",
        "text": "三年之期已到，江城该变天了。",
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
          let clean = content.trim();
          const codeBlockMatch = clean.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
          if (codeBlockMatch) clean = codeBlockMatch[1].trim();

          const match = clean.match(/\[[\s\S]*\]/);
          if (match) {
            const parsed = JSON.parse(match[0]);
            if (Array.isArray(parsed) && parsed.length > 0) {
              const normalized = this.normalizeScenes(parsed);
              if (normalized.length > 0) {
                return {
                  data: normalized,
                  isFallback: false
                };
              }
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
    let currentDialogues: ScriptDialogue[] = [];
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
