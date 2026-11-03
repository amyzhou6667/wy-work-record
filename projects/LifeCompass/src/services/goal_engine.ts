import type { Goal, Milestone, DailyAction } from '../types/index.ts';

export interface CreateGoalInput {
  userId: string;
  trackName: string;
  customTarget?: string;
  estimatedMonths?: number;
}

export class GoalEngine {
  createGoalFromTrack(input: CreateGoalInput): Goal {
    const { userId, trackName, customTarget, estimatedMonths = 3 } = input;
    const goalId = `goal_${Date.now()}`;
    const now = new Date();
    const endDate = new Date(now.getTime() + estimatedMonths * 30 * 24 * 60 * 60 * 1000);

    const title = customTarget || `基于【${trackName}】的变现破局计划`;
    const milestones = this.generateMilestones(goalId, trackName);

    return {
      id: goalId,
      userId,
      title,
      type: 'monetization',
      status: 'active',
      targetMetric: title,
      estimatedMonths,
      startDate: now.toISOString().split('T')[0],
      targetEndDate: endDate.toISOString().split('T')[0],
      milestones,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    };
  }

  private generateMilestones(goalId: string, trackName: string): Milestone[] {
    const m1Id = `ms_${Date.now()}_1`;
    const m2Id = `ms_${Date.now()}_2`;
    const m3Id = `ms_${Date.now()}_3`;

    const m1Actions: DailyAction[] = [
      {
        id: `act_${Date.now()}_1`,
        milestoneId: m1Id,
        title: '梳理 3 个竞品对标账号/服务案例',
        instruction: '搜集同领域优秀的 3 个对标案例，记录他们的选题方向与变现路径。',
        maxMinutes: 15,
        isReducedLoad: false,
        status: 'pending',
        scheduledDate: new Date().toISOString().split('T')[0]
      },
      {
        id: `act_${Date.now()}_2`,
        milestoneId: m1Id,
        title: '撰写 1 份个人定位与价值主张草案',
        instruction: '用一句话回答：我是谁、我能为哪类人解决什么核心问题。',
        maxMinutes: 20,
        isReducedLoad: false,
        status: 'pending',
        scheduledDate: new Date(Date.now() + 86400000).toISOString().split('T')[0]
      },
      {
        id: `act_${Date.now()}_3`,
        milestoneId: m1Id,
        title: '制作首个最小原型内容大纲 (MVP Outline)',
        instruction: '列出首期内容或服务框架的 3 个核心要点，拒绝完美主义。',
        maxMinutes: 20,
        isReducedLoad: false,
        status: 'pending',
        scheduledDate: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0]
      }
    ];

    const m2Actions: DailyAction[] = [
      {
        id: `act_${Date.now()}_4`,
        milestoneId: m2Id,
        title: '公开发布第 1 篇价值笔记或展示卡片',
        instruction: '将打磨好的内容发布至目标渠道，迈出公开表达关键一步。',
        maxMinutes: 20,
        isReducedLoad: false,
        status: 'pending',
        scheduledDate: new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0]
      }
    ];

    const m3Actions: DailyAction[] = [
      {
        id: `act_${Date.now()}_5`,
        milestoneId: m3Id,
        title: '向 3 名种子潜在用户发起轻量价值交流',
        instruction: '私信或交流收集真实反馈，验证变现可行性。',
        maxMinutes: 20,
        isReducedLoad: false,
        status: 'pending',
        scheduledDate: new Date(Date.now() + 86400000 * 14).toISOString().split('T')[0]
      }
    ];

    return [
      {
        id: m1Id,
        goalId,
        sequence: 1,
        title: '定位定型与 MVP 原型验证',
        keyDeliverable: '完成对标梳理、明确价值定位、产出最小原型方案',
        status: 'in_progress',
        estimatedWeeks: 2,
        dailyActions: m1Actions
      },
      {
        id: m2Id,
        goalId,
        sequence: 2,
        title: '内容/微服务矩阵测试与持续曝光',
        keyDeliverable: '连续发布 5 篇高质量内容或完成 2 次模拟服务',
        status: 'pending',
        estimatedWeeks: 3,
        dailyActions: m2Actions
      },
      {
        id: m3Id,
        goalId,
        sequence: 3,
        title: '商业闭环跑通与首笔订单转化',
        keyDeliverable: '沉淀高意向种子用户池，完成首笔商业变现交易验证',
        status: 'pending',
        estimatedWeeks: 4,
        dailyActions: m3Actions
      }
    ];
  }
}
