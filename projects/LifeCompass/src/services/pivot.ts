import type { Goal, GoalPivotRequest, ExperienceAsset, Milestone, DailyAction } from '../types/index.ts';

export interface PivotExecutionInput {
  currentGoal: Goal;
  request: GoalPivotRequest;
}

export interface PivotExecutionResult {
  archivedGoal: Goal;
  experienceAsset: ExperienceAsset;
  newGoal: Goal;
}

export class PivotService {
  executePivot(input: PivotExecutionInput): PivotExecutionResult {
    const { currentGoal, request } = input;
    const now = new Date().toISOString();

    // 1. Gather all checkins and outputs from old goal
    let totalCheckins = 0;
    const keyOutputs: string[] = [];
    const acquiredSkills: string[] = ['快速试错能力', '敏捷方向复盘'];

    for (const ms of currentGoal.milestones) {
      for (const act of ms.dailyActions) {
        if (act.status === 'completed' && act.checkin) {
          totalCheckins++;
          keyOutputs.push(`${act.title}: ${act.checkin.summary.slice(0, 30)}`);
        }
      }
    }

    if (request.lessonLearned) {
      acquiredSkills.push('认知迭代与自我觉察');
    }

    // 2. Create ExperienceAsset archive
    const experienceAsset: ExperienceAsset = {
      id: `asset_${Date.now()}`,
      userId: currentGoal.userId,
      sourceGoalId: currentGoal.id,
      title: `【沉淀】${currentGoal.title}`,
      acquiredSkills,
      totalCheckins,
      keyOutputs,
      archivedAt: now
    };

    // 3. Mark old goal archived
    const archivedGoal: Goal = {
      ...currentGoal,
      status: 'archived',
      updatedAt: now
    };

    // 4. Generate new goal based on newDirection
    const newGoalId = `goal_pivoted_${Date.now()}`;
    const newGoal: Goal = {
      id: newGoalId,
      userId: currentGoal.userId,
      title: `基于【${request.newDirection}】的新生破局计划`,
      type: 'monetization',
      status: 'active',
      targetMetric: `验证【${request.newDirection}】首个正反馈`,
      estimatedMonths: 3,
      startDate: now.split('T')[0],
      targetEndDate: new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0],
      createdAt: now,
      updatedAt: now,
      milestones: this.generatePivotedMilestones(newGoalId, request.newDirection)
    };

    return {
      archivedGoal,
      experienceAsset,
      newGoal
    };
  }

  private generatePivotedMilestones(goalId: string, direction: string): Milestone[] {
    const m1Id = `ms_p_${Date.now()}_1`;
    const m2Id = `ms_p_${Date.now()}_2`;

    const m1Actions: DailyAction[] = [
      {
        id: `act_p_${Date.now()}_1`,
        milestoneId: m1Id,
        title: `梳理【${direction}】的第一个核心交付标准`,
        instruction: '用 15 分钟写下这个新方向最容易产生价值的单点突破口。',
        maxMinutes: 15,
        isReducedLoad: false,
        status: 'pending',
        scheduledDate: new Date().toISOString().split('T')[0]
      },
      {
        id: `act_p_${Date.now()}_2`,
        milestoneId: m1Id,
        title: '梳理并复用上个阶段沉淀的笔记素材',
        instruction: '将旧目标中梳理过的内容迁移或提炼为新方向所需的知识颗粒。',
        maxMinutes: 20,
        isReducedLoad: false,
        status: 'pending',
        scheduledDate: new Date(Date.now() + 86400000).toISOString().split('T')[0]
      }
    ];

    const m2Actions: DailyAction[] = [
      {
        id: `act_p_${Date.now()}_3`,
        milestoneId: m2Id,
        title: '面向目标人群发布轻量咨询或图文样章',
        instruction: '快速试水，获取第一波真实受众反馈。',
        maxMinutes: 20,
        isReducedLoad: false,
        status: 'pending',
        scheduledDate: new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0]
      }
    ];

    return [
      {
        id: m1Id,
        goalId,
        sequence: 1,
        title: '新赛道轻量启动与资产复用',
        keyDeliverable: '明确突破口，完成历史资产迁移与首期最小方案',
        status: 'in_progress',
        estimatedWeeks: 2,
        dailyActions: m1Actions
      },
      {
        id: m2Id,
        goalId,
        sequence: 2,
        title: '快速反馈验证与闭环跑通',
        keyDeliverable: '获取种子用户反馈，完成新方向闭环验证',
        status: 'pending',
        estimatedWeeks: 3,
        dailyActions: m2Actions
      }
    ];
  }
}
