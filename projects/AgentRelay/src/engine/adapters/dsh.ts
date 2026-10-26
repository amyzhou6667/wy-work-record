import type {
  IEngineAdapter,
  EnginePluginConfig,
  RelaySession,
  DecisionCommand,
  PendingDecision,
  DecisionOption
} from '../../types/engine.ts';
import { stripAnsi } from '../../detector/ansi.ts';

export class DshAdapter implements IEngineAdapter {
  readonly id = 'dsh';
  readonly name = 'DeepSeek Harness';

  private config: EnginePluginConfig | null = null;
  private currentSession: RelaySession | null = null;
  private onUpdateCallback: ((session: RelaySession) => void) | null = null;
  private childProcessStdin: { write: (data: string) => boolean } | null = null;

  async init(config: EnginePluginConfig): Promise<void> {
    this.config = config;
  }

  async detect(targetPath: string): Promise<boolean> {
    // 检查项目路径或环境是否包含 dsh 特征
    const lower = targetPath.toLowerCase();
    return lower.includes('dsh') || lower.includes('deepseek');
  }

  initSession(taskId: string, projectPath: string, onUpdate: (session: RelaySession) => void): void {
    this.onUpdateCallback = onUpdate;
    this.currentSession = {
      taskId,
      engineId: this.id,
      engineName: this.name,
      projectPath,
      status: 'running',
      currentDecision: null,
      recentLogs: [],
      startTime: Date.now(),
      lastActiveTime: Date.now()
    };
    onUpdate(this.currentSession);
  }

  setChildProcessStdin(stdin: { write: (data: string) => boolean }): void {
    this.childProcessStdin = stdin;
  }

  processTerminalChunk(chunk: string): void {
    if (!this.currentSession) return;

    const clean = stripAnsi(chunk);
    if (!clean.trim()) return;

    const lines = clean.split('\n').map(l => l.trim()).filter(Boolean);
    for (const line of lines) {
      this.currentSession.recentLogs.push(`[dsh]: ${line}`);
      if (this.currentSession.recentLogs.length > 20) {
        this.currentSession.recentLogs.shift();
      }
    }
    this.currentSession.lastActiveTime = Date.now();

    // 探测阻断正则
    const decision = this.detectDecision(clean);
    if (decision) {
      this.currentSession.status = 'pending';
      this.currentSession.currentDecision = decision;
    }

    if (this.onUpdateCallback) {
      this.onUpdateCallback(this.currentSession);
    }
  }

  private detectDecision(cleanText: string): PendingDecision | null {
    if (!this.currentSession) return null;

    // 1. 匹配 [y/n] 确认提示
    const ynMatch = cleanText.match(/(y\/n|\[y\/n\]|\[y\/N\]|\[Y\/n\])/i);
    if (ynMatch) {
      const promptLines = cleanText.split('\n').filter(l => l.trim());
      const lastLine = promptLines[promptLines.length - 1] || cleanText;
      return {
        taskId: this.currentSession.taskId,
        engineId: this.id,
        engineName: this.name,
        title: 'DeepSeek Harness 确认提示',
        question: lastLine,
        isMultiSelect: false,
        options: [
          { id: 'y', label: '同意 (Y)' },
          { id: 'n', label: '拒绝 (N)' }
        ],
        rawText: cleanText,
        timestamp: Date.now()
      };
    }

    // 2. 匹配数字选项 [1-3]
    const selectMatch = cleanText.match(/(?:Select option|请选择)[\s\S]*?\[(\d+)-(\d+)\]/i);
    if (selectMatch) {
      const start = parseInt(selectMatch[1], 10);
      const end = parseInt(selectMatch[2], 10);
      const options: DecisionOption[] = [];
      for (let i = start; i <= end; i++) {
        options.push({
          id: String(i),
          label: `选项 ${i}`
        });
      }
      return {
        taskId: this.currentSession.taskId,
        engineId: this.id,
        engineName: this.name,
        title: 'DeepSeek Harness 选项选择',
        question: selectMatch[0],
        isMultiSelect: false,
        options,
        rawText: cleanText,
        timestamp: Date.now()
      };
    }

    // 3. 匹配回车继续
    const enterMatch = cleanText.match(/(Press ENTER to continue|按回车继续)/i);
    if (enterMatch) {
      return {
        taskId: this.currentSession.taskId,
        engineId: this.id,
        engineName: this.name,
        title: 'DeepSeek Harness 等待继续',
        question: enterMatch[0],
        isMultiSelect: false,
        options: [
          { id: 'enter', label: '按回车继续' }
        ],
        rawText: cleanText,
        timestamp: Date.now()
      };
    }

    return null;
  }

  startWatch(targetPath: string, onUpdate: (session: RelaySession) => void): void {
    this.initSession(`dsh-${Date.now()}`, targetPath, onUpdate);
  }

  stopWatch(): void {
    // 释放资源
  }

  async injectDecision(_taskId: string, command: DecisionCommand): Promise<boolean> {
    if (this.childProcessStdin) {
      let inputVal = 'y\n';
      if (command.action === 'reject') {
        inputVal = 'n\n';
      } else if (command.action === 'select' && command.payload !== undefined) {
        inputVal = `${command.payload}\n`;
      } else if (command.action === 'input' && command.payload) {
        inputVal = `${command.payload}\n`;
      } else if (command.action === 'confirm') {
        inputVal = 'y\n';
      }
      this.childProcessStdin.write(inputVal);
    }

    if (this.currentSession) {
      this.currentSession.status = 'running';
      this.currentSession.currentDecision = null;
      this.currentSession.lastActiveTime = Date.now();
      if (this.onUpdateCallback) {
        this.onUpdateCallback(this.currentSession);
      }
    }
    return true;
  }

  async killTask(_taskId: string): Promise<boolean> {
    if (this.currentSession) {
      this.currentSession.status = 'terminated';
      if (this.onUpdateCallback) {
        this.onUpdateCallback(this.currentSession);
      }
    }
    return true;
  }
}
