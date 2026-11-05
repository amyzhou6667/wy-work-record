import type { AgentPluginConfig, CharacterAsset, PipelineStage, SceneAsset, WorkflowPipelineContext } from '../../types/index.ts';

export interface AssetExtractorResult {
  characters: CharacterAsset[];
  scenes: SceneAsset[];
}

export class AssetExtractorAgent {
  public readonly stage: PipelineStage = 'asset';
  public readonly defaultName: string = '资产提取 Agent';

  public async execute(
    novelText: string,
    config: AgentPluginConfig,
    context: WorkflowPipelineContext
  ): Promise<{ data: AssetExtractorResult; isFallback: boolean; message?: string }> {
    if (config.llmConfig?.baseUrl && config.llmConfig?.apiKey) {
      try {
        const prompt = `你是一名好莱坞视觉总监与角色设计师。请从以下网文小说文本中，提取核心人物与场景资产：
【小说文本】
${novelText}

请直接输出标准 JSON 格式，严禁返回任何多余解释：
{
  "characters": [
    {
      "name": "角色中文名",
      "roleType": "protagonist 或 antagonist 或 supporting",
      "gender": "male 或 female",
      "ageGroup": "如 28yo",
      "appearancePrompt": "用于生图的英文外貌神态特征",
      "costumePrompt": "服装穿搭英文",
      "crefUrl": ""
    }
  ],
  "scenes": [
    {
      "name": "场景名称",
      "lightingAtmosphere": "光影氛围描述",
      "environmentPrompt": "英文生图环境提示词"
    }
  ]
}`;
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 15000);

        const response = await fetch(`${config.llmConfig.baseUrl.replace(/\/+$/, '')}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.llmConfig.apiKey}`
          },
          body: JSON.stringify({
            model: config.llmConfig.model,
            temperature: config.llmConfig.temperature || 0.7,
            messages: [
              { role: 'system', content: config.systemPromptTemplate || '你是一个专业影视资产提炼智能体。' },
              { role: 'user', content: prompt }
            ]
          }),
          signal: controller.signal
        });
        clearTimeout(timer);

        if (response.ok) {
          const resJson: any = await response.json();
          const content = resJson.choices?.[0]?.message?.content || '';
          const match = content.match(/\{[\s\S]*\}/);
          if (match) {
            const parsed = JSON.parse(match[0]);
            if (Array.isArray(parsed.characters) && parsed.characters.length > 0) {
              const characters: CharacterAsset[] = parsed.characters.map((c: any, i: number) => ({
                id: `char_${Date.now()}_${i + 1}`,
                name: c.name || `角色${i + 1}`,
                roleType: c.roleType || (i === 0 ? 'protagonist' : 'supporting'),
                gender: c.gender || 'male',
                ageGroup: c.ageGroup || '25yo',
                appearancePrompt: c.appearancePrompt || 'cinematic portrait, detailed eyes',
                costumePrompt: c.costumePrompt || '',
                crefUrl: c.crefUrl || ''
              }));

              const scenes: SceneAsset[] = Array.isArray(parsed.scenes) ? parsed.scenes.map((s: any, i: number) => ({
                id: `scene_${Date.now()}_${i + 1}`,
                name: s.name || `场景${i + 1}`,
                lightingAtmosphere: s.lightingAtmosphere || '自然漫反射电影光',
                environmentPrompt: s.environmentPrompt || 'cinematic environment, 8k resolution'
              })) : [];

              return {
                data: { characters, scenes },
                isFallback: false
              };
            }
          }
        }
      } catch (err: any) {
        console.warn('[AssetExtractorAgent] LLM API 故障，切换离线规则引擎:', err.message);
      }
    }

    return {
      data: this.fallback(novelText, context),
      isFallback: true,
      message: '已启用离线智能命名实体提取'
    };
  }

  public fallback(novelText: string, context?: WorkflowPipelineContext): AssetExtractorResult {
    const characters: CharacterAsset[] = [];
    const lines = novelText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const seenNames = new Set<string>();

    const knownProtagonists = ['顾北辰', '林枫', '陆沉', '萧炎', '叶天', '楚风', '陈平', '江辰'];
    const knownHeroines = ['苏清影', '柳如烟', '姜洛神', '纳兰嫣然', '夏竹', '云曦'];

    for (const p of knownProtagonists) {
      if (novelText.includes(p) && !seenNames.has(p)) {
        seenNames.add(p);
        characters.push({
          id: `char_gu_${Date.now()}`,
          name: p,
          roleType: 'protagonist',
          gender: 'male',
          ageGroup: '28yo',
          appearancePrompt: 'cold sharp eyes, handsome Asian male CEO, masculine jawline, dark coat',
          costumePrompt: 'wearing a sharp black tailored trench coat',
          crefUrl: ''
        });
      }
    }

    for (const h of knownHeroines) {
      if (novelText.includes(h) && !seenNames.has(h)) {
        seenNames.add(h);
        characters.push({
          id: `char_su_${Date.now()}`,
          name: h,
          roleType: 'supporting',
          gender: 'female',
          ageGroup: '24yo',
          appearancePrompt: 'elegant fair-skinned Asian female, delicate features, cold distant expression, long silk hair',
          costumePrompt: 'wearing an elegant pure white chiffon dress',
          crefUrl: ''
        });
      }
    }

    // 正则提取 “xxx说道”、“xxx满脸寒霜”
    const speakerRegex = /([\u4e00-\u9fa5]{2,4})(?:身着|身穿|满脸|一身|站在|大步|冷笑|说道|沉声|喝道|怒斥|冷哼)/g;
    let match;
    while ((match = speakerRegex.exec(novelText)) !== null) {
      const name = match[1];
      if (name.length >= 2 && !seenNames.has(name) && !['狂风', '落地', '客厅', '迈巴', '保镖', '离婚'].includes(name)) {
        seenNames.add(name);
        const isFemale = /裙|如|清|雪|影|玉|仙|灵/.test(name);
        characters.push({
          id: `char_${Date.now()}_${characters.length + 1}`,
          name,
          roleType: characters.length === 0 ? 'protagonist' : 'supporting',
          gender: isFemale ? 'female' : 'male',
          ageGroup: isFemale ? '24yo' : '30yo',
          appearancePrompt: isFemale
            ? 'delicate beautiful Asian woman, cinematic lighting, photorealistic'
            : 'handsome Asian man, strong posture, cinematic rim light',
          costumePrompt: isFemale ? 'wearing white dress' : 'wearing modern suit',
          crefUrl: ''
        });
      }
    }

    // 保底
    if (characters.length === 0) {
      characters.push({
        id: `char_main_${Date.now()}`,
        name: '主角',
        roleType: 'protagonist',
        gender: 'male',
        ageGroup: '26yo',
        appearancePrompt: 'determined Asian protagonist, cinematic lighting, 8k portrait',
        costumePrompt: 'modern stylish jacket',
        crefUrl: ''
      });
    }

    const scenes: SceneAsset[] = [
      {
        id: `scene_main_${Date.now()}`,
        name: novelText.includes('顾家老宅') ? '顾家老宅客厅' : '现代室内主场景',
        lightingAtmosphere: '冷雨落地窗自然漫反射柔光，微弱边缘轮廓光',
        environmentPrompt: 'luxurious interior living room, heavy rain outside floor-to-ceiling glass window, moody cinematic lighting, 8k resolution'
      }
    ];

    return { characters, scenes };
  }
}
