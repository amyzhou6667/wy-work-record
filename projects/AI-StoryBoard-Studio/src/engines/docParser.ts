import type {
  NovelDocument,
  EpisodeOutline,
  StoryboardShot,
  ShotSize,
  CameraMovement
} from '../types/index.ts';
import { PromptAdapterEngine } from './promptAdapter.ts';

const promptEngine = new PromptAdapterEngine();

/**
 * 电子书与网文剧本解析引擎
 */
export class DocParserEngine {
  /**
   * 解析纯文本或 Markdown 格式小说
   */
  public parseTextDocument(fileName: string, content: string): NovelDocument {
    const lines = content.split(/\r?\n/);
    const chapterPattern =
      /^(?:第\s*[0-9一二三四两五六七八九十百千万]+\s*[章回节集部卷篇]|Chapter\s+\d+|Episode\s+\d+)(.*)$/i;

    const chapters: { chapterIndex: number; title: string; content: string }[] = [];
    let currentTitle = '引子 / 序章';
    let currentParagraphs: string[] = [];
    let chapterIndex = 1;

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;

      if (chapterPattern.test(line)) {
        if (currentParagraphs.length > 0) {
          chapters.push({
            chapterIndex: chapterIndex++,
            title: currentTitle,
            content: currentParagraphs.join('\n\n')
          });
          currentParagraphs = [];
        }
        currentTitle = line;
      } else {
        currentParagraphs.push(line);
      }
    }

    if (currentParagraphs.length > 0) {
      chapters.push({
        chapterIndex: chapterIndex,
        title: currentTitle,
        content: currentParagraphs.join('\n\n')
      });
    }

    // 若无明显章节标记，将全文作为第一集
    if (chapters.length === 0) {
      chapters.push({
        chapterIndex: 1,
        title: '第一集',
        content: content.trim()
      });
    }

    const totalWords = content.replace(/\s+/g, '').length;

    return {
      id: `doc_${Date.now()}`,
      fileName,
      fileSize: Buffer.byteLength(content, 'utf-8'),
      totalWords,
      chapters
    };
  }

  /**
   * 提炼单集短剧叙事结构（3秒黄金钩子、1分钟冲突升级、结尾悬念卡点）
   */
  public extractEpisodeOutline(chapter: { chapterIndex: number; title: string; content: string }): EpisodeOutline {
    const paragraphs = chapter.content.split(/\n\n+/).filter(p => p.trim());
    const firstPara = paragraphs[0] || '暴风雨前夕，危机四伏的开局。';
    const midIndex = Math.floor(paragraphs.length / 2);
    const midPara = paragraphs[midIndex] || '双方针锋相对，冲突迅速升级。';
    const lastPara = paragraphs[paragraphs.length - 1] || '局势悬而未决，惊天反转留待下回揭晓。';

    return {
      episodeNumber: chapter.chapterIndex,
      title: chapter.title,
      hookOpening: `【前3秒黄金钩子】${firstPara.slice(0, 80)}...`,
      conflictEscalation: `【1分钟冲突爆发】${midPara.slice(0, 100)}...`,
      cliffhangerEnding: `【结尾悬念卡点】${lastPara.slice(0, 80)}...`,
      rawContent: chapter.content,
      shots: []
    };
  }

  /**
   * 拆解单章内容为影视级视觉分镜流
   */
  public decomposeToShots(chapter: { chapterIndex: number; title: string; content: string }): StoryboardShot[] {
    const paragraphs = chapter.content.split(/\n\n+/).filter(p => p.trim());
    const shots: StoryboardShot[] = [];
    let shotNumber = 1;

    for (let i = 0; i < paragraphs.length; i++) {
      const para = paragraphs[i].trim();
      if (!para) continue;

      // 智能识别台词与说话人
      const quoteMatch = para.match(/[“"「]([^”"」]+)[”"」]/);
      let hasDialogue = false;
      let speaker = '';
      let dialogueText = '';

      if (quoteMatch && quoteMatch.index !== undefined) {
        dialogueText = quoteMatch[1];
        const beforeQuote = para.slice(0, quoteMatch.index).trim();
        // 提取句首核心人名 (常见 2~3 个汉字)
        const nameMatch = beforeQuote.match(/^([\u4e00-\u9fa5]{2,3})/);
        if (nameMatch) {
          speaker = nameMatch[1];
          hasDialogue = true;
        }
      }

      // 智能分镜景别推导：对话镜头偏近景/特写，环境描写偏全景/远景
      const shotSize: ShotSize = hasDialogue
        ? (i % 2 === 0 ? 'Close-up' : 'Medium Close-up')
        : (i === 0 ? 'Wide Shot' : (i === paragraphs.length - 1 ? 'Extreme Close-up' : 'Medium Shot'));

      const cameraMovement: CameraMovement = hasDialogue
        ? 'Low-angle Dolly In'
        : (i === 0 ? 'Static Eye-level' : 'Pan Following');

      let dialogueObj = undefined;
      if (hasDialogue) {
        dialogueObj = {
          speaker,
          text: dialogueText,
          isVoiceover: para.includes('独白') || para.includes('心想') || para.includes('暗道')
        };
      }

      // 动作神态推导
      const characterAction = hasDialogue
        ? `${speaker}神情凌厉，眼神冷峻如刃，沉浸于高压对峙`
        : `场景宏大，环境与人物形成强烈张力 (${para.slice(0, 30)})`;

      // 光影推导
      const environmentLighting = i % 2 === 0
        ? '昏暗暴雨夜景，窗外冷蓝色闪电冷光划破室内微弱暖灯'
        : '豪门宴会厅高对比度顶光，华丽水晶灯明暗交错，电影质感颗粒';

      const shot: StoryboardShot = {
        id: `shot_${chapter.chapterIndex}_${shotNumber}`,
        shotNumber: shotNumber++,
        durationSec: hasDialogue ? 3.5 : 2.5,
        shotSize,
        cameraMovement,
        characterAction,
        characterIds: speaker ? [`char_${speaker}`] : [],
        environmentLighting,
        dialogue: dialogueObj,
        soundBgm: i === 0 ? '暴雨雷声与悬疑弦乐' : (hasDialogue ? '心跳重音与紧绷提琴' : '沉重大提琴渐强'),
        matchedSourceParagraph: para,
        prompts: { midjourney: '', flux: '', jimeng: '' }
      };

      // 生成三模型 Prompt
      shot.prompts = promptEngine.generateAllPrompts(shot, []);
      shots.push(shot);
    }

    return shots;
  }
}
