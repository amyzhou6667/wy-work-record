import type { DailyAction, ActionCheckin } from '../types/index.ts';

export interface CheckinInput {
  action: DailyAction;
  summary: string;
  actualMinutes: number;
  attachmentUrl?: string;
}

export interface CheckinResult {
  updatedAction: DailyAction;
}

export class CheckinService {
  executeCheckin(input: CheckinInput): CheckinResult {
    const { action, summary, actualMinutes, attachmentUrl } = input;
    const now = new Date().toISOString();

    const aiFeedback = this.generateFeedback(action, summary, actualMinutes);

    const checkinRecord: ActionCheckin = {
      checkinTime: now,
      summary,
      attachmentUrl,
      actualMinutes,
      aiFeedback
    };

    const updatedAction: DailyAction = {
      ...action,
      status: 'completed',
      checkin: checkinRecord
    };

    return { updatedAction };
  }

  private generateFeedback(
    action: DailyAction,
    summary: string,
    actualMinutes: number
  ): { encouragement: string; highlight: string; nextStepTip: string } {
    if (action.isReducedLoad) {
      return {
        encouragement: '🌟 太赞了！你在状态低谷时战胜了阻力，成功用 2 分钟点亮了火种，这就是最坚韧的成长韧性！',
        highlight: `你在停顿后迅速完成启动：${summary.slice(0, 40)}`,
        nextStepTip: '今晚安心休整，明天如果精力恢复，我们再慢慢回到主节奏。'
      };
    }

    return {
      encouragement: `🎯 行动力拉满！你在 ${actualMinutes} 分钟内高效攻克了今日微行动，知行合一的复利正在悄然发生！`,
      highlight: `精准落地关键思考：${summary.slice(0, 40)}`,
      nextStepTip: '今日任务已圆满归档，稍后可以查看进度燃尽图与经验资产累积。'
    };
  }
}
