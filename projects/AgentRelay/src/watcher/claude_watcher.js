import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { EventEmitter } from 'node:events';

/**
 * 智能监听指定工作区的 Claude Code 会话流
 */
export class ClaudeWatcher extends EventEmitter {
  constructor(targetProjectPath) {
    super();
    this.targetProjectPath = path.resolve(targetProjectPath);
    this.sessionDir = this.resolveClaudeProjectDir(this.targetProjectPath);
    this.currentFile = null;
    this.lastOffset = 0;
    this.pollTimer = null;
    this.lastMessage = null;
  }

  /**
   * 将 Windows/POSIX 项目路径转换为 Claude projects 目录名
   * 如 D:\hyper-v\share\proj\opendeck -> D--hyper-v-share-proj-opendeck
   */
  resolveClaudeProjectDir(projectPath) {
    const home = os.homedir();
    // Windows 盘符冒号在 Claude 中被替换为 '-'，斜杠也被替换为 '-'
    // D:/... => D + '-' + '-' + ... 即 D--hyper-v-share-proj-opendeck
    const normalized = projectPath.replace(/\\/g, '/');
    let folderName = normalized.replace(/:/g, '-').replace(/\//g, '-');
    // 如果首字符没有连字符，保证盘符与后面路径连字符正确
    return path.join(home, '.claude', 'projects', folderName);
  }

  /**
   * 启动观察者
   */
  start(intervalMs = 800) {
    this.locateLatestSessionFile();
    // 启动时立即主动检查并读入尾部记录
    this.checkAndReadUpdates();

    this.pollTimer = setInterval(() => {
      this.checkAndReadUpdates();
    }, intervalMs);

    return this;
  }

  /**
   * 寻找该项目下最近修改的 .jsonl 会话文件
   */
  locateLatestSessionFile() {
    if (!fs.existsSync(this.sessionDir)) {
      return null;
    }

    try {
      const allFiles = fs.readdirSync(this.sessionDir)
        .filter(f => f.endsWith('.jsonl'))
        .map(f => {
          const fullPath = path.join(this.sessionDir, f);
          const stat = fs.statSync(fullPath);
          return { fullPath, mtime: stat.mtimeMs, size: stat.size };
        })
        .sort((a, b) => b.mtime - a.mtime);

      if (allFiles.length === 0) return null;

      // 从 mtime 最新的前 5 个候选文件中，通过读取尾部真实记录时间戳选出真正最新活跃会话
      let bestFile = allFiles[0].fullPath;
      let latestRecordTime = 0;

      const candidates = allFiles.slice(0, 5);
      for (const cand of candidates) {
        const lastTs = this.peekLastRecordTimestamp(cand.fullPath, cand.size);
        if (lastTs > latestRecordTime) {
          latestRecordTime = lastTs;
          bestFile = cand.fullPath;
        }
      }

      if (this.currentFile !== bestFile) {
        this.currentFile = bestFile;
        const stat = fs.statSync(bestFile);
        // 新文件定位：若首次加载，回溯读取最后 128KB 记录，确保当前未决提问立刻被发现
        this.lastOffset = Math.max(0, stat.size - 131072);
        this.readTail();
      }
    } catch (e) {}
  }

  /**
   * 探测指定会话文件尾部的最新记录时间戳
   */
  peekLastRecordTimestamp(filePath, fileSize) {
    try {
      const readLen = Math.min(fileSize, 8192);
      if (readLen <= 0) return 0;
      const buf = Buffer.alloc(readLen);
      const fd = fs.openSync(filePath, 'r');
      fs.readSync(fd, buf, 0, readLen, fileSize - readLen);
      fs.closeSync(fd);

      const lines = buf.toString('utf8').trim().split('\n');
      for (let i = lines.length - 1; i >= 0; i--) {
        const line = lines[i].trim();
        if (!line || !line.startsWith('{')) continue;
        try {
          const obj = JSON.parse(line);
          if (obj.timestamp) {
            const t = new Date(obj.timestamp).getTime();
            if (!isNaN(t)) return t;
          }
        } catch {}
      }
    } catch {}
    return 0;
  }

  /**
   * 检查文件变更并增量拉取
   */
  checkAndReadUpdates() {
    // 检查是否有产生更新的会话文件
    this.locateLatestSessionFile();

    if (!this.currentFile || !fs.existsSync(this.currentFile)) {
      return;
    }

    try {
      const stat = fs.statSync(this.currentFile);
      if (stat.size > this.lastOffset) {
        this.readTail();
      }
    } catch (e) {}
  }

  /**
   * 增量读取文件内容并解析 JSONL
   */
  readTail() {
    try {
      const stat = fs.statSync(this.currentFile);
      const readLength = stat.size - this.lastOffset;
      if (readLength <= 0) return;

      const buffer = Buffer.alloc(readLength);
      const fd = fs.openSync(this.currentFile, 'r');
      fs.readSync(fd, buffer, 0, readLength, this.lastOffset);
      fs.closeSync(fd);

      this.lastOffset = stat.size;

      const text = buffer.toString('utf8');
      const lines = text.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const trimmed = lines[i].trim();
        if (!trimmed) continue;
        // 如果首行截断导致不是有效 JSON，尝试从下一个 { 开始
        let jsonStr = trimmed;
        if (!jsonStr.startsWith('{')) {
          const startIdx = jsonStr.indexOf('{');
          if (startIdx !== -1) jsonStr = jsonStr.slice(startIdx);
          else continue;
        }
        try {
          const record = JSON.parse(jsonStr);
          this.handleRecord(record);
        } catch (e) {}
      }
    } catch (e) {}
  }

  /**
   * 解析单条 Claude 记录
   */
  handleRecord(record) {
    // 1. 优先检测是否为 AskUserQuestion / ask_question 结构化工具调用
    let toolPrompt = null;
    if (record.type === 'assistant' && record.message && Array.isArray(record.message.content)) {
      for (const item of record.message.content) {
        if (item.type === 'tool_use' && (item.name === 'AskUserQuestion' || item.name === 'ask_question')) {
          toolPrompt = this.parseAskUserQuestion(item.input);
          if (toolPrompt) break;
        }
      }
    }
    if (!toolPrompt && record.wireToolInputs) {
      for (const toolId of Object.keys(record.wireToolInputs)) {
        toolPrompt = this.parseAskUserQuestion(record.wireToolInputs[toolId]);
        if (toolPrompt) break;
      }
    }

    if (toolPrompt) {
      this.lastMessage = {
        role: 'assistant',
        text: toolPrompt.fullText,
        timestamp: record.timestamp || new Date().toISOString()
      };
      this.emit('message', this.lastMessage);
      this.emit('prompt', {
        question: toolPrompt.question,
        options: toolPrompt.options,
        fullText: toolPrompt.fullText,
        timestamp: this.lastMessage.timestamp
      });
      return;
    }

    // 2. 文本记录解析
    let textContent = '';
    if (record.type === 'assistant' && record.message) {
      const msg = record.message;
      if (Array.isArray(msg.content)) {
        textContent = msg.content
          .filter(c => c.type === 'text')
          .map(c => c.text)
          .join('\n');
      } else if (typeof msg.content === 'string') {
        textContent = msg.content;
      }
    } else if (record.type === 'system' && record.subtype === 'away_summary' && record.content) {
      textContent = record.content;
    }

    if (textContent) {
      this.lastMessage = {
        role: record.type || 'assistant',
        text: textContent,
        timestamp: record.timestamp || new Date().toISOString()
      };
      this.emit('message', this.lastMessage);

      // 智能判断是否处于人工确认阶段
      if (this.isAwaitingUserDecision(textContent)) {
        this.emit('prompt', {
          question: this.extractQuestionSummary(textContent),
          options: [],
          fullText: textContent,
          timestamp: this.lastMessage.timestamp
        });
      }
    } else if (record.type === 'user' && record.message) {
      this.emit('user_reply', record.message);
    }
  }

  /**
   * 解析 AskUserQuestion 工具参数
   */
  parseAskUserQuestion(input) {
    if (!input || !Array.isArray(input.questions) || input.questions.length === 0) {
      return null;
    }
    const q = input.questions[0];
    const header = q.header ? `[${q.header}] ` : '';
    const question = `${header}${q.question || '请选择下一步操作'}`;
    const options = (q.options || []).map((opt, i) => ({
      index: i + 1,
      label: typeof opt === 'string' ? opt : (opt.label || `选项 ${i + 1}`),
      description: typeof opt === 'object' ? (opt.description || '') : ''
    }));

    const optionsText = options
      .map(o => `${o.index}. ${o.label}${o.description ? `\n   ${o.description}` : ''}`)
      .join('\n');
    const fullText = `${question}\n\n${optionsText}`;

    return {
      question,
      options,
      fullText
    };
  }

  /**
   * 检测是否处于等待用户确认决策的状态
   */
  isAwaitingUserDecision(text) {
    const triggers = [
      /阶段 B[：:]/i,
      /人工关卡/,
      /必须你裁决/,
      /请选择继续方式/,
      /请回复/i,
      /\[Y\/n\]/i,
      /allow write/i,
      /确认与裁决/i
    ];
    return triggers.some(r => r.test(text));
  }

  /**
   * 提取卡片标题提问摘要
   */
  extractQuestionSummary(text) {
    const lines = text.split('\n').filter(l => l.trim().length > 0);
    // 优先提取包含"必须你裁决"或"请回复"附近的行
    for (const line of lines) {
      if (line.includes('必须你裁决') || line.includes('请回复') || line.includes('阶段 B')) {
        return line.replace(/^[#*`\s-]+/, '').trim();
      }
    }
    return lines[lines.length - 1] || '等待人工裁决确认';
  }

  stop() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }
}
