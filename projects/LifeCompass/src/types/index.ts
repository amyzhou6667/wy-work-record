/**
 * LifeCompass (人生罗盘) - 核心领域模型与 TypeScript 接口契约
 */

export type SkillCategory = 'hard' | 'soft' | 'resource';

export interface SkillTag {
  id: string;
  name: string;
  category: SkillCategory;
  proficiencyLevel: 1 | 2 | 3 | 4 | 5; // 1: 了解, 3: 熟练, 5: 精通/高杠杆
  evidence: string; // 提取来源证据
  monetizationScore: number; // 商业变现潜力 1~100
}

export interface UserSkillProfile {
  userId: string;
  createdAt: string;
  updatedAt: string;
  summary: string; // 核心定位
  skills: SkillTag[];
  constraints: {
    weeklyAvailableHours: number;
    riskTolerance: 'conservative' | 'balanced' | 'aggressive';
    currentDomain: string;
  };
  radarScores: {
    hardCompetence: number;   // 专业硬核度 (0-100)
    businessAcumen: number;   // 商业感知力 (0-100)
    executionDrive: number;   // 执行驱动力 (0-100)
    learningAgility: number;  // 学习敏捷度 (0-100)
    resilienceIndex: number;  // 抗挫韧性 (0-100)
  };
  recommendedTracks: {
    trackName: string;
    rationale: string;
    estimatedValue: string;
    matchScore: number;
  }[];
}

export type GoalType = 'monetization' | 'career_advance' | 'skill_mastery';
export type GoalStatus = 'exploring' | 'active' | 'reduced_load' | 'pivoting' | 'archived' | 'completed';

export interface DailyAction {
  id: string;
  milestoneId: string;
  title: string;
  instruction: string;
  maxMinutes: number; // 阻力控制：常规 <= 20 分钟；动态降载 <= 2 分钟
  isReducedLoad: boolean; // 是否处于 2 分钟动态降载状态
  status: 'pending' | 'completed' | 'reduced' | 'postponed' | 'missed';
  scheduledDate: string; // YYYY-MM-DD
  checkin?: ActionCheckin;
}

export interface ActionCheckin {
  checkinTime: string;
  summary: string;
  attachmentUrl?: string;
  actualMinutes: number;
  aiFeedback: {
    encouragement: string;
    highlight: string;
    nextStepTip: string;
  };
}

export interface Milestone {
  id: string;
  goalId: string;
  sequence: number;
  title: string;
  keyDeliverable: string;
  status: 'pending' | 'in_progress' | 'achieved' | 'pivoted';
  estimatedWeeks: number;
  dailyActions: DailyAction[];
}

export interface Goal {
  id: string;
  userId: string;
  title: string;
  type: GoalType;
  status: GoalStatus;
  targetMetric: string;
  estimatedMonths: number;
  startDate: string;
  targetEndDate: string;
  milestones: Milestone[];
  createdAt: string;
  updatedAt: string;
}

export interface ResilienceAssessment {
  consecutiveMissedDays: number;
  shouldDowngrade: boolean;
  empathyMessage: string;
  reducedAction?: {
    title: string;
    instruction: string;
    maxMinutes: 2;
  };
}

export interface GoalPivotRequest {
  goalId: string;
  reason: string;
  lessonLearned: string;
  newDirection: string;
}

export interface ExperienceAsset {
  id: string;
  userId: string;
  sourceGoalId: string;
  title: string;
  acquiredSkills: string[];
  totalCheckins: number;
  keyOutputs: string[];
  archivedAt: string;
}
