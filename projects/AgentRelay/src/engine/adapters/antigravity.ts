import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import type {
  IEngineAdapter,
  EnginePluginConfig,
  RelaySession,
  DecisionCommand,
  PendingDecision
} from '../../types/engine.ts';

export class AntigravityAdapter implements IEngineAdapter {
  readonly id = 'antigravity';
  readonly name = 'Google Antigravity';

  private config: EnginePluginConfig | null = null;
  private currentSession: RelaySession | null = null;
  private watchedFilePath: string | null = null;
  private lastByteOffset = 0;
  private pollTimer: NodeJS.Timeout | null = null;
  private onUpdateCallback: ((session: RelaySession) => void) | null = null;

  async init(config: EnginePluginConfig): Promise<void> {
    this.config = config;
  }

  async detect(targetPath: string): Promise<boolean> {
    // 检查项目目录下是否有 .gemini 特征目录
    const geminiDir = path.join(path.resolve(targetPath), '.gemini');
    if (fs.existsSync(geminiDir)) {
      return true;
    }
    // 检查是否有 brain 目录
    const brainDir = path.join(path.resolve(targetPath), 'brain');
    if (fs.existsSync(brainDir)) {
      return true;
    }
    return false;
  }

  watchTranscriptFile(filePath: string, onUpdate: (session: RelaySession) => void): void {
    this.watchedFilePath = path.resolve(filePath);
    this.onUpdateCallback = onUpdate;
    this.lastByteOffset = 0;

    this.currentSession = {
      taskId: `antigravity-${Date.now()}`,
      engineId: this.id,
      engineName: this.name,
      projectPath: path.dirname(path.dirname(path.dirname(this.watchedFilePath))),
      status: 'running',
      currentDecision: null,
      recentLogs: [],
      startTime: Date.now(),
      lastActiveTime: Date.now()
    };
    onUpdate(this.currentSession);

    this.checkFileUpdates();

    this.pollTimer = setInterval(() => {
      this.checkFileUpdates();
    }, 800);
    if (this.pollTimer.unref) {
      this.pollTimer.unref();
    }
  }

  startWatch(targetPath: string, onUpdate: (session: RelaySession) => void): void {
    const resolvedPath = path.resolve(targetPath);
    // 查找最近更新的 transcript.jsonl
    const transcriptFile = this.locateLatestTranscript(resolvedPath);
    if (transcriptFile) {
      this.watchTranscriptFile(transcriptFile, onUpdate);
    } else {
      // 容错兜底初始化
      this.onUpdateCallback = onUpdate;
      this.currentSession = {
        taskId: `antigravity-${Date.now()}`,
        engineId: this.id,
        engineName: this.name,
        projectPath: resolvedPath,
        status: 'running',
        currentDecision: null,
        recentLogs: ['[Antigravity] 等待会话初始化...'],
        startTime: Date.now(),
        lastActiveTime: Date.now()
      };
      onUpdate(this.currentSession);
    }
  }

  locateLatestTranscript(targetPath: string): string | null {
    const userHome = os.homedir();
    const appDataBrain = path.join(userHome, '.gemini', 'antigravity', 'brain');
    if (fs.existsSync(appDataBrain)) {
      try {
        const subdirs = fs.readdirSync(appDataBrain, { withFileTypes: true })
          .filter(d => d.isDirectory())
          .map(d => path.join(appDataBrain, d.name, '.system_generated', 'logs', 'transcript.jsonl'))
          .filter(p => fs.existsSync(p));

        if (subdirs.length > 0) {
          // 按修改时间倒序取最新的
          subdirs.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
          return subdirs[0];
        }
      } catch {
        // 忽略读取异常
      }
    }

    // 检查项目本身是否有 brain
    const localBrain = path.join(targetPath, 'brain');
    if (fs.existsSync(localBrain)) {
      // 扫描本地
      try {
        const subdirs = fs.readdirSync(localBrain, { withFileTypes: true })
          .filter(d => d.isDirectory())
          .map(d => path.join(localBrain, d.name, '.system_generated', 'logs', 'transcript.jsonl'))
          .filter(p => fs.existsSync(p));
        if (subdirs.length > 0) {
          subdirs.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
          return subdirs[0];
        }
      } catch {}
    }

    return null;
  }

  checkFileUpdates(): void {
    if (!this.watchedFilePath || !fs.existsSync(this.watchedFilePath)) {
      return;
    }

    try {
      const stats = fs.statSync(this.watchedFilePath);
      if (stats.size < this.lastByteOffset) {
        // 文件被重置
        this.lastByteOffset = 0;
      }
      if (stats.size === this.lastByteOffset) {
        return;
      }

      const fd = fs.openSync(this.watchedFilePath, 'r');
      const length = stats.size - this.lastByteOffset;
      const buffer = Buffer.alloc(length);
      fs.readSync(fd, buffer, 0, length, this.lastByteOffset);
      fs.closeSync(fd);

      this.lastByteOffset = stats.size;
      const chunk = buffer.toString('utf-8');
      const lines = chunk.split('\n').filter(l => l.trim().length > 0);

      for (const line of lines) {
        this.parseTranscriptLine(line);
      }
    } catch {
      // 容错处理
    }
  }

  private parseTranscriptLine(line: string): void {
    if (!this.currentSession) return;

    try {
      const step = JSON.parse(line);
      if (step.content && typeof step.content === 'string') {
        const preview = step.content.trim().slice(0, 150);
        this.currentSession.recentLogs.push(`[${step.source || 'MODEL'}]: ${preview}`);
        if (this.currentSession.recentLogs.length > 20) {
          this.currentSession.recentLogs.shift();
        }
      }

      // 检查是否有 tool_calls 调用 ask_question
      if (step.tool_calls && Array.isArray(step.tool_calls)) {
        const askCall = step.tool_calls.find((c: any) => c.name === 'ask_question');
        if (askCall && askCall.parameters) {
          const questions = askCall.parameters.questions || [];
          if (questions.length > 0) {
            const firstQ = questions[0];
            const decision: PendingDecision = {
              taskId: this.currentSession.taskId,
              engineId: this.id,
              engineName: this.name,
              title: 'Antigravity 提问待对齐',
              question: firstQ.question,
              isMultiSelect: !!firstQ.is_multi_select,
              options: (firstQ.options || []).map((opt: string, idx: number) => ({
                id: idx,
                label: opt,
                isRecommended: typeof opt === 'string' && opt.startsWith('(Recommended)')
              })),
              timestamp: Date.now()
            };
            this.currentSession.status = 'pending';
            this.currentSession.currentDecision = decision;
            this.currentSession.lastActiveTime = Date.now();
            if (this.onUpdateCallback) {
              this.onUpdateCallback(this.currentSession);
            }
            return;
          }
        }
      }

      // 如果后续出现来自用户的输入或非等待模型回复，说明阻断已解决
      if (
        (step.source === 'USER_EXPLICIT' || step.source === 'USER_INPUT' || step.type === 'USER_INPUT') &&
        this.currentSession.status === 'pending'
      ) {
        this.currentSession.status = 'running';
        this.currentSession.currentDecision = null;
        this.currentSession.lastActiveTime = Date.now();
        if (this.onUpdateCallback) {
          this.onUpdateCallback(this.currentSession);
        }
      }
    } catch {
      // 忽略畸变行
    }
  }

  stopWatch(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  async injectDecision(_taskId: string, command: DecisionCommand): Promise<boolean> {
    if (this.currentSession) {
      this.currentSession.status = 'running';
      this.currentSession.currentDecision = null;
      this.currentSession.recentLogs.push(`[Remote Decision]: ${JSON.stringify(command.payload || command.action)}`);
      this.currentSession.lastActiveTime = Date.now();
      if (this.onUpdateCallback) {
        this.onUpdateCallback(this.currentSession);
      }
    }
    return true;
  }

  async killTask(_taskId: string): Promise<boolean> {
    this.stopWatch();
    if (this.currentSession) {
      this.currentSession.status = 'terminated';
      if (this.onUpdateCallback) {
        this.onUpdateCallback(this.currentSession);
      }
    }
    return true;
  }
}
