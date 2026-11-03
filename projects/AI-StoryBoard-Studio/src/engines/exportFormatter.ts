import type { StoryboardShot } from '../types/index.ts';

/**
 * 工业级物料导出格式化引擎
 */
export class ExportFormatter {
  /**
   * 转义 CSV 单元格内容
   */
  public escapeCsvField(val: string | number | undefined): string {
    if (val === undefined || val === null) return '""';
    const str = String(val);
    // 若包含换行、双引号或逗号，用双引号包裹，内部英文双引号转义为两个双引号
    if (/[",\n\r]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return `"${str}"`;
  }

  /**
   * 导出带 UTF-8 BOM 的专业影视分镜 CSV 脚本表
   */
  public toCsvFormat(shots: StoryboardShot[]): string {
    const BOM = '\uFEFF';
    const headers = [
      '镜头号',
      '预估时长(秒)',
      '景别',
      '机位运镜',
      '角色动作表情',
      '环境光影',
      '台词对白',
      '音效BGM',
      'Midjourney提示词',
      'Flux提示词',
      '即梦提示词'
    ];

    const lines: string[] = [headers.join(',')];

    for (const shot of shots) {
      let dialogueStr = '';
      if (shot.dialogue && shot.dialogue.text) {
        dialogueStr = `${shot.dialogue.speaker ? `[${shot.dialogue.speaker}]: ` : ''}${shot.dialogue.text}`;
      }

      const row = [
        this.escapeCsvField(`Shot ${String(shot.shotNumber).padStart(2, '0')}`),
        this.escapeCsvField(shot.durationSec),
        this.escapeCsvField(shot.shotSize),
        this.escapeCsvField(shot.cameraMovement),
        this.escapeCsvField(shot.characterAction),
        this.escapeCsvField(shot.environmentLighting),
        this.escapeCsvField(dialogueStr),
        this.escapeCsvField(shot.soundBgm),
        this.escapeCsvField(shot.prompts.midjourney),
        this.escapeCsvField(shot.prompts.flux),
        this.escapeCsvField(shot.prompts.jimeng)
      ];

      lines.push(row.join(','));
    }

    return BOM + lines.join('\r\n');
  }

  /**
   * 批量导出全集特定模型的生图 Prompt 清单
   */
  public toBatchPromptText(
    shots: StoryboardShot[],
    modelType: 'midjourney' | 'flux' | 'jimeng'
  ): string {
    return shots
      .map(shot => {
        const num = String(shot.shotNumber).padStart(2, '0');
        const prompt = shot.prompts[modelType] || '';
        return `Shot ${num}: ${prompt}`;
      })
      .join('\n\n');
  }
}
