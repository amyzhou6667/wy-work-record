import type { StoryboardShot, SrtExportConfig, SubtitleItem } from '../types/index.ts';

/**
 * 剪映默认导出配置
 */
export const DEFAULT_SRT_CONFIG: SrtExportConfig = {
  charactersPerSecond: 4.5,
  breathPauseSec: 0.35,
  maxCharactersPerLine: 18,
  includeSpeakerName: false
};

/**
 * 剪映高保真 SRT 字幕引擎
 */
export class JianYingSrtEngine {
  /**
   * 将毫秒数转为标准 SRT 时间戳: HH:MM:SS,mmm
   */
  public formatMsToSrtTime(totalMs: number): string {
    const safeMs = Math.max(0, Math.floor(totalMs));
    const ms = safeMs % 1000;
    const totalSeconds = Math.floor(safeMs / 1000);
    const seconds = totalSeconds % 60;
    const totalMinutes = Math.floor(totalSeconds / 60);
    const minutes = totalMinutes % 60;
    const hours = Math.floor(totalMinutes / 60);

    const pad = (num: number, digits: number) => String(num).padStart(digits, '0');
    return `${pad(hours, 2)}:${pad(minutes, 2)}:${pad(seconds, 2)},${pad(ms, 3)}`;
  }

  /**
   * 智能断句：
   * 1. 优先按整句标点 (。！？!?\n) 拆分自然句子；
   * 2. 若单个句子长度仍超过 maxLen，再按逗号、顿号、分号 (，、；,;) 二级切分；
   * 3. 若无标点且依然过长，按 maxLen 安全物理切分。
   */
  public splitLongText(text: string, maxLen: number): string[] {
    const trimmed = text.trim();
    if (!trimmed) return [];
    if (trimmed.length <= maxLen) {
      return [trimmed];
    }

    // 1. 一级切分：按整句标点 (。！？!?\n)
    const sentenceRegex = /([^。！？!?\n]+[。！？!?\n]*)/g;
    const rawSentences = trimmed.match(sentenceRegex) || [trimmed];

    const result: string[] = [];

    for (const sent of rawSentences) {
      const cleanSent = sent.trim();
      if (!cleanSent) continue;

      if (cleanSent.length <= maxLen) {
        result.push(cleanSent);
        continue;
      }

      // 2. 二级切分：按句中停顿标点 (，、；,;)
      const clauseRegex = /([^，、；,;]+[，、；,;]*)/g;
      const clauses = cleanSent.match(clauseRegex) || [cleanSent];
      let currentBuffer = '';

      for (const clause of clauses) {
        const item = clause.trim();
        if (!item) continue;

        if ((currentBuffer + item).length <= maxLen) {
          currentBuffer += item;
        } else {
          if (currentBuffer) {
            result.push(currentBuffer);
          }
          currentBuffer = item;
        }
      }
      if (currentBuffer) {
        result.push(currentBuffer);
      }
    }

    // 3. 兜底切分：若仍有极端无标点长文本
    const finalResult: string[] = [];
    for (const chunk of result) {
      if (chunk.length <= maxLen) {
        finalResult.push(chunk);
      } else {
        let rem = chunk;
        while (rem.length > 0) {
          finalResult.push(rem.slice(0, maxLen));
          rem = rem.slice(maxLen);
        }
      }
    }

    return finalResult;
  }

  /**
   * 生成剪映字幕条目列表
   */
  public generateSubtitles(
    shots: StoryboardShot[],
    customConfig?: Partial<SrtExportConfig>
  ): { items: SubtitleItem[]; totalDurationMs: number } {
    const config: SrtExportConfig = { ...DEFAULT_SRT_CONFIG, ...customConfig };
    const items: SubtitleItem[] = [];

    let currentCursorMs = 300; // 前置 300ms 黄金静音吸附呼吸位
    let currentIndex = 1;

    for (const shot of shots) {
      if (!shot.dialogue || !shot.dialogue.text.trim()) {
        continue;
      }

      const rawText = shot.dialogue.text.trim();
      const speaker = shot.dialogue.speaker.trim();

      // 单行防折行切分
      const segments = this.splitLongText(rawText, config.maxCharactersPerLine);

      for (const segment of segments) {
        // 语速计算：字符数 / charactersPerSecond 秒 + 200ms 尾音衰减
        const charCount = segment.replace(/\s+/g, '').length;
        const calculatedSec = Math.max(1.0, charCount / config.charactersPerSecond + 0.2);
        const segmentDurationMs = Math.round(calculatedSec * 1000);

        const startMs = currentCursorMs;
        const endMs = startMs + segmentDurationMs;

        // 组装文本内容
        let displayContent = segment;
        if (config.includeSpeakerName && speaker) {
          displayContent = `[${speaker}]: ${segment}`;
        }

        items.push({
          index: currentIndex++,
          startMs,
          endMs,
          startTimeFormatted: this.formatMsToSrtTime(startMs),
          endTimeFormatted: this.formatMsToSrtTime(endMs),
          speaker,
          text: displayContent
        });

        // 推进时间轴，加上呼吸位
        currentCursorMs = endMs + Math.round(config.breathPauseSec * 1000);
      }
    }

    return {
      items,
      totalDurationMs: currentCursorMs
    };
  }

  /**
   * 输出符合标准 SRT 规范的文本字符串
   */
  public toSrtString(items: SubtitleItem[]): string {
    return items
      .map(item => {
        return `${item.index}\n${item.startTimeFormatted} --> ${item.endTimeFormatted}\n${item.text}\n`;
      })
      .join('\n');
  }
}
