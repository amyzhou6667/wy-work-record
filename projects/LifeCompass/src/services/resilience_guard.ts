import type { DailyAction, ResilienceAssessment } from '../types/index.ts';

export interface AssessInput {
  consecutiveMissedDays: number;
  currentAction: DailyAction;
}

export class ResilienceGuard {
  assessStatus(input: AssessInput): ResilienceAssessment {
    const { consecutiveMissedDays, currentAction } = input;

    if (consecutiveMissedDays >= 2 || currentAction.isReducedLoad) {
      const reducedTitle = this.downgradeTitle(currentAction.title);
      return {
        consecutiveMissedDays,
        shouldDowngrade: true,
        empathyMessage:
          '生活偶尔会打乱节奏，暂时的停顿是身心在蓄力，绝不是失败。今天我们不要求长途跋涉，只花 2 分钟点亮火种。',
        reducedAction: {
          title: `【2分钟降载微步】${reducedTitle}`,
          instruction: '放下对完美的苛求，只需完成这 1 个最简单的启动动作即可完成今日打卡。',
          maxMinutes: 2
        }
      };
    }

    return {
      consecutiveMissedDays,
      shouldDowngrade: false,
      empathyMessage: '新的一天，带着自驱与专注，继续稳步推进！'
    };
  }

  applyReducedLoad(action: DailyAction): DailyAction {
    const assessment = this.assessStatus({
      consecutiveMissedDays: 2,
      currentAction: action
    });

    if (!assessment.reducedAction) {
      return action;
    }

    return {
      ...action,
      title: assessment.reducedAction.title,
      instruction: assessment.reducedAction.instruction,
      maxMinutes: 2,
      isReducedLoad: true,
      status: 'reduced'
    };
  }

  private downgradeTitle(originalTitle: string): string {
    if (originalTitle.includes('写') || originalTitle.includes('文案')) {
      return '在备忘录写下 1 句话灵感或大纲关键词';
    }
    if (originalTitle.includes('读') || originalTitle.includes('学') || originalTitle.includes('看')) {
      return '打开文档或书籍阅读前 3 行';
    }
    if (originalTitle.includes('整理') || originalTitle.includes('梳理') || originalTitle.includes('搜集')) {
      return '搜集并收藏 1 个对标案例链接';
    }
    if (originalTitle.includes('交流') || originalTitle.includes('发布')) {
      return '起草 1 句沟通打招呼草稿存为备忘';
    }
    return '完成最无负担的 2 分钟极简启动';
  }
}
