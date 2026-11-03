import type { SkillTag, UserSkillProfile } from '../types/index.ts';

export interface ProfileInput {
  userId: string;
  skills: SkillTag[];
  weeklyHours: number;
  riskTolerance: 'conservative' | 'balanced' | 'aggressive';
  domain: string;
}

export function generateSkillProfile(input: ProfileInput): UserSkillProfile {
  const { userId, skills, weeklyHours, riskTolerance, domain } = input;

  // 1. Calculate radar scores based on extracted skills & constraints
  const avgMonetization = skills.length
    ? Math.round(skills.reduce((sum, s) => sum + s.monetizationScore, 0) / skills.length)
    : 50;

  const hardSkills = skills.filter((s) => s.category === 'hard');
  const softSkills = skills.filter((s) => s.category === 'soft');

  const hardScore = Math.min(100, Math.max(40, hardSkills.reduce((sum, s) => sum + s.proficiencyLevel * 15, 20)));
  const businessScore = Math.min(100, Math.max(35, avgMonetization));
  const executionScore = Math.min(100, Math.max(40, Math.round(weeklyHours * 4.5)));
  const learningScore = Math.min(100, Math.max(50, (hardSkills.length + softSkills.length) * 20 + 30));
  const resilienceScore = 75; // 默认基准韧性基底

  // 2. Generate customized recommendation tracks
  const topSkillNames = skills.map((s) => s.name).join('、');
  const summary = `具备【${topSkillNames || '综合潜力'}】核心素养，每周拥有 ${weeklyHours} 小时机动时间，适合以轻量资产沉淀开启破局。`;

  const recommendedTracks = [
    {
      trackName: '高杠杆内容知识微产品 (数字资产/自媒体)',
      rationale: `基于你的【${skills[0]?.name || '内容表达'}】优势，将经验沉淀为标准化模版或垂直知识笔记，边创作边沉淀影响力。`,
      estimatedValue: '跑通后预计带来月均 3000~8000 元高边际收益',
      matchScore: 92
    },
    {
      trackName: '1v1 技能解决微服务 (陪跑/诊断/定制)',
      rationale: `利用【${skills[1]?.name || '解决问题'}】能力，直接为高需求客户提供单点交付，最小闭环跑通商业变现。`,
      estimatedValue: '单次服务定价 100~500 元，快速建立正向现金流',
      matchScore: 86
    },
    {
      trackName: '垂直技能跃迁与行业影响力构建',
      rationale: `将现有能力系统化对齐行业头部标准，用可量化作品集冲刺高薪职位或大厂专家级认知。`,
      estimatedValue: '长期职业资产增值，提升 30%~50% 岗位议价权',
      matchScore: 81
    }
  ];

  return {
    userId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    summary,
    skills,
    constraints: {
      weeklyAvailableHours: weeklyHours,
      riskTolerance,
      currentDomain: domain || '综合领域'
    },
    radarScores: {
      hardCompetence: hardScore,
      businessAcumen: businessScore,
      executionDrive: executionScore,
      learningAgility: learningScore,
      resilienceIndex: resilienceScore
    },
    recommendedTracks
  };
}
