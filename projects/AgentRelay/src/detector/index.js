import { stripAnsi, desensitize } from './ansi.js';

// 常见终端 Prompt 正则模式
const PROMPT_PATTERNS = [
  /\[(y\/n|yes\/no)\]/i,
  /\((y\/n|yes\/no)\)/i,
  /\?\s*$/m,
  /(?:please enter|choice|select|confirm|option).*[:?]?\s*$/i,
  />\s*$/m
];

/**
 * Prompt 阻断检测器
 */
export class PromptDetector {
  constructor(options = {}) {
    this.silenceThresholdMs = options.silenceThresholdMs || 1500;
    this.buffer = '';
    this.lastFeedTime = Date.now();
  }

  /**
   * 接收终端流数据并存入滑动窗口
   */
  feed(chunk) {
    if (!chunk) return;
    this.buffer += stripAnsi(chunk);
    if (this.buffer.length > 4000) {
      this.buffer = this.buffer.slice(-2000);
    }
    this.lastFeedTime = Date.now();
  }

  /**
   * 评估当前是否处于等待用户输入状态
   * @returns {object|null} PromptPayload 或 null
   */
  evaluatePrompt() {
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
    const suggestedOptions = [];
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
  reset() {
    this.buffer = '';
    this.lastFeedTime = Date.now();
  }
}
