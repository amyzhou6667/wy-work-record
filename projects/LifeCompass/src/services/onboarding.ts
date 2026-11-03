import type { SkillTag, UserSkillProfile } from '../types/index.ts';
import { generateSkillProfile } from './profile.ts';

export interface OnboardingState {
  sessionId: string;
  userId: string;
  currentStep: number;
  extractedSkills: SkillTag[];
  weeklyHours: number;
  domain: string;
}

export class OnboardingService {
  private sessions = new Map<string, OnboardingState>();

  private questions = [
    {
      step: 1,
      question:
        '你好！我是你的人生罗盘教练。迷茫往往源于我们低估了自己已有的资产。请试着分享：过去 3 年中，哪件事让你最有成就感、最投入，或者曾帮他人解决过什么麻烦？',
      options: ['我做过内容/文案策划，数据还不错', '我善于沟通协调和倾听他人困惑', '我擅长梳理逻辑、解决具体技术/实操问题', '我想直接自由描述...']
    },
    {
      step: 2,
      question:
        '太棒了，这正是你身上最宝贵的隐性优势。接下来我们看现实约束：目前每周在主业或学业之余，你大概能抽出多少小时用于投入自己的成长探索？',
      options: ['每周 5 小时左右（下班碎片时间）', '每周 10~15 小时（周末有充裕时间）', '每周 20 小时以上（全力以赴冲刺）']
    },
    {
      step: 3,
      question:
        '收到！最后一个关键问题：对于变现与目标，你当前阶段最期望的验证节奏是怎样的？',
      options: ['希望 1~3 个月内跑通最小闭环，拿到第一笔副业正反馈 (100~1000元)', '希望系统化积累长期影响力，谋求职业跃迁', '希望先养成自律习惯，探索自己真正的热情所在']
    }
  ];

  async startSession(userId: string): Promise<{ sessionId: string; firstQuestion: string; options: string[] }> {
    const sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const state: OnboardingState = {
      sessionId,
      userId,
      currentStep: 1,
      extractedSkills: [],
      weeklyHours: 10,
      domain: '综合成长'
    };
    this.sessions.set(sessionId, state);

    return {
      sessionId,
      firstQuestion: this.questions[0].question,
      options: this.questions[0].options
    };
  }

  async respond(
    sessionId: string,
    userReply: string
  ): Promise<{
    isFinished: boolean;
    nextQuestion?: string;
    options?: string[];
    extractedSkills?: SkillTag[];
    profile?: UserSkillProfile;
  }> {
    const state = this.sessions.get(sessionId);
    if (!state) {
      throw new Error(`Session ${sessionId} not found.`);
    }

    // Step 1: Extract skills from reply
    if (state.currentStep === 1) {
      const skills = this.parseSkillsFromText(userReply);
      state.extractedSkills.push(...skills);
      state.currentStep = 2;
      return {
        isFinished: false,
        nextQuestion: this.questions[1].question,
        options: this.questions[1].options
      };
    }

    // Step 2: Extract hours & constraints
    if (state.currentStep === 2) {
      const hours = this.parseHoursFromText(userReply);
      state.weeklyHours = hours;
      state.currentStep = 3;
      return {
        isFinished: false,
        nextQuestion: this.questions[2].question,
        options: this.questions[2].options
      };
    }

    // Step 3: Conclude and produce profile
    state.currentStep = 4;
    // ensure at least 1-2 skills if text was brief
    if (state.extractedSkills.length === 0) {
      state.extractedSkills.push({
        id: `sk_${Date.now()}`,
        name: '问题拆解与自省反思',
        category: 'soft',
        proficiencyLevel: 3,
        evidence: userReply.slice(0, 50),
        monetizationScore: 70
      });
    }

    const profile = generateSkillProfile({
      userId: state.userId,
      skills: state.extractedSkills,
      weeklyHours: state.weeklyHours,
      riskTolerance: 'balanced',
      domain: state.domain
    });

    return {
      isFinished: true,
      extractedSkills: state.extractedSkills,
      profile
    };
  }

  private parseSkillsFromText(text: string): SkillTag[] {
    const skills: SkillTag[] = [];
    const lower = text.toLowerCase();

    if (lower.includes('文案') || lower.includes('小红书') || lower.includes('写作') || lower.includes('自媒体') || lower.includes('策划')) {
      skills.push({
        id: `sk_${Date.now()}_1`,
        name: '内容表达与文案策划',
        category: 'hard',
        proficiencyLevel: 4,
        evidence: text.slice(0, 60),
        monetizationScore: 88
      });
    }
    if (lower.includes('倾听') || lower.includes('沟通') || lower.includes('协调') || lower.includes('朋友') || lower.includes('共情')) {
      skills.push({
        id: `sk_${Date.now()}_2`,
        name: '深度共情与同理心沟通',
        category: 'soft',
        proficiencyLevel: 4,
        evidence: text.slice(0, 60),
        monetizationScore: 75
      });
    }
    if (lower.includes('代码') || lower.includes('开发') || lower.includes('技术') || lower.includes('python') || lower.includes('系统')) {
      skills.push({
        id: `sk_${Date.now()}_3`,
        name: '软件研发与技术架构思维',
        category: 'hard',
        proficiencyLevel: 4,
        evidence: text.slice(0, 60),
        monetizationScore: 92
      });
    }

    if (skills.length === 0) {
      skills.push({
        id: `sk_${Date.now()}_default`,
        name: '结构化思维与持续探索能力',
        category: 'soft',
        proficiencyLevel: 3,
        evidence: text.slice(0, 60),
        monetizationScore: 70
      });
    }
    return skills;
  }

  private parseHoursFromText(text: string): number {
    const match = text.match(/(\d+)/);
    if (match) {
      const h = parseInt(match[1], 10);
      if (h > 0 && h <= 50) return h;
    }
    if (text.includes('5')) return 5;
    if (text.includes('15')) return 15;
    if (text.includes('20')) return 20;
    return 10;
  }
}
