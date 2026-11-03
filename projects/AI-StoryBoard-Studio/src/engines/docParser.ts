import type {
  NovelDocument,
  EpisodeOutline,
  StoryboardShot,
  ShotSize,
  CameraMovement,
  CharacterAsset,
  AspectRatio
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
      /^(?:第\s*[0-9一二三四两五六七八九十百千万]+\s*[章回节集部卷篇]|Chapter\s+\d+|Episode\s+\d+|序章|引子|楔子|尾声)(.*)$/i;

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
   * 拆解单章内容为影视级视觉分镜流 (通用且鲁棒)
   */
  public decomposeToShots(
    chapter: { chapterIndex: number; title: string; content: string },
    characters: CharacterAsset[] = [],
    aspectRatio: AspectRatio = '9:16'
  ): StoryboardShot[] {
    const rawParagraphs = chapter.content.split(/\r?\n/).map(p => p.trim()).filter(Boolean);
    const shots: StoryboardShot[] = [];
    let shotNumber = 1;

    for (let i = 0; i < rawParagraphs.length; i++) {
      const para = rawParagraphs[i];
      if (!para) continue;

      // 智能识别台词与说话人
      const quoteMatch = para.match(/[“"「]([^”"」]+)[”"」]/);
      let hasDialogue = false;
      let speaker = '';
      let dialogueText = '';

      if (quoteMatch && quoteMatch.index !== undefined) {
        dialogueText = quoteMatch[1];
        const beforeQuote = para.slice(0, quoteMatch.index).trim();

        // 1. 优先精准命中已知角色名
        const knownChar = characters.find(c => beforeQuote.includes(c.name));
        if (knownChar) {
          speaker = knownChar.name;
        } else {
          // 2. 动词/谓词/断句引导的人名提取
          const actionSplitMatch = beforeQuote.match(/^([\u4e00-\u9fa5]{2,4}?)(?=[，,\s:：]|目光|面色|神色|神情|嘴角|握紧|站在|倒退|大步|踏空|冷笑|沉声|轻声|怒斥|问道|说道|道|喊|喝道|答道|说|心想|暗道|抬手|转身|冷哼)/);
          if (actionSplitMatch) {
            speaker = actionSplitMatch[1];
          } else {
            // 3. 句首 2~3 汉字核心人名保底
            const nameMatch = beforeQuote.match(/^([\u4e00-\u9fa5]{2,3})/);
            if (nameMatch) {
              speaker = nameMatch[1];
            }
          }
        }
        hasDialogue = true;
      }

      // 智能分镜景别推导：对话镜头偏近景/特写，环境描写偏全景/远景
      const shotSize: ShotSize = hasDialogue
        ? (i % 2 === 0 ? 'Close-up' : 'Medium Close-up')
        : (i === 0 ? 'Wide Shot' : (i === rawParagraphs.length - 1 ? 'Extreme Close-up' : 'Medium Shot'));

      const cameraMovement: CameraMovement = hasDialogue
        ? 'Low-angle Dolly In'
        : (i === 0 ? 'Static Eye-level' : 'Pan Following');

      let dialogueObj = undefined;
      if (hasDialogue) {
        dialogueObj = {
          speaker: speaker || '角色',
          text: dialogueText,
          isVoiceover: para.includes('独白') || para.includes('心想') || para.includes('暗道')
        };
      }

      // 动态匹配已配置的角色
      const matchedChars = characters.filter(c => 
        (speaker && c.name.includes(speaker)) || para.includes(c.name)
      );
      const characterIds = matchedChars.length > 0 
        ? matchedChars.map(c => c.id) 
        : (speaker ? [`char_${speaker}`] : []);

      // 通用动作神态推导 (基于原句语义摘要，非写死特定小说)
      const previewText = para.replace(/[“"「][^”"」]+[”"」]/g, '').trim() || para;
      const characterAction = hasDialogue
        ? `${dialogueObj?.speaker || '角色'}神态专注沉浸，情绪张力暗涌 (${para.slice(0, 24)}...)`
        : `环境与人物动势交织，气氛悬疑渐进 (${previewText.slice(0, 28)}...)`;

      // 通用电影感光影推导
      const environmentLighting = i % 2 === 0
        ? '电影级主光源侧打，明暗对比强烈，背景带有景深虚化'
        : '环境漫反射自然柔光，边缘轮廓光勾勒角色轮廓';

      const shot: StoryboardShot = {
        id: `shot_${chapter.chapterIndex}_${shotNumber}`,
        shotNumber: shotNumber++,
        durationSec: hasDialogue ? Math.min(6.0, Math.max(2.5, (dialogueText.length / 4.5) + 0.5)) : 2.5,
        shotSize,
        cameraMovement,
        characterAction,
        characterIds,
        environmentLighting,
        dialogue: dialogueObj,
        soundBgm: i === 0 ? '环境原声与低沉弦乐建立' : (hasDialogue ? '紧凑心跳低音伴奏' : '悬疑氛围长音'),
        matchedSourceParagraph: para,
        prompts: { midjourney: '', flux: '', jimeng: '' }
      };

      // 生成三模型 Prompt
      shot.prompts = promptEngine.generateAllPrompts(shot, characters, aspectRatio);
      shots.push(shot);
    }

    return shots;
  }
}
