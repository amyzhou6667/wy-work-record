import { stripAnsi, desensitize } from './ansi.ts';

// 常见终端 Prompt 正则模式
const PROMPT_PATTERNS: RegExp[] = [
  /\[(y\/n|yes\/no)\]/i,
  /\((y\/n|yes\/no)\)/i,
  /\?\s*$/m,
  /(?:please enter|choice|select|confirm|option).*[:?]?\s*$/i,
  />\s*$/m
];

export interface PromptDetectorOptions {
  silenceThresholdMs?: number;
}

export interface EvaluatedPrompt {
  question: string;
  recent_logs: string[];
  suggested_options: string[];
  triggered_at: number;
}

/**
 * Prompt 阻断检测器 (TypeScript)
 */
export class PromptDetector {
  public silenceThresholdMs: number;
  public buffer: string;
  public lastFeedTime: number;

  constructor(options: PromptDetectorOptions = {}) {
    this.silenceThresholdMs = options.silenceThresholdMs || 1500;
    this.buffer = '';
    this.lastFeedTime = Date.now();
  }

  /**
   * 接收终端流数据并存入滑动窗口
   */
  feed(chunk: string): void {
    if (!chunk) return;
    this.buffer += stripAnsi(chunk);
    if (this.buffer.length > 4000) {
      this.buffer = this.buffer.slice(-2000);
    }
    this.lastFeedTime = Date.now();
  }

  /**
   * 评估当前是否处于等待用户输入状态
   * @returns EvaluatedPrompt 或 null
   */
  evaluatePrompt(): EvaluatedPrompt | null {
    const rawLines = this.buffer.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (rawLines.length === 0) return null;

    const lastLine = rawLines[rawLines.length - 1];

    // 匹配末行特征
    const isMatched = PROMPT_PATTERNS.some(regex => regex.test(lastLine));
    if (!isMatched) {
      return null;
    }

    // 提取最近最多 10 行并进行脱敏
    const recentLogs = rawLines.slice(-10).map(line => desensitize(line));

    // 智能提取推荐选项
    const suggestedOptions: string[] = [];
    if (/\[y\/n\]|\(y\/n\)/i.test(lastLine)) {
      suggestedOptions.push('Y', 'N');
    }

    return {
      question: desensitize(lastLine),
      recent_logs: recentLogs,
      suggested_options: suggestedOptions,
      triggered_at: Date.now()
    };
  }

  /**
   * 重置检测器
   */
  reset(): void {
    this.buffer = '';
    this.lastFeedTime = Date.now();
  }
}
