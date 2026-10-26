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
import { ClaudeWatcher } from '../../watcher/claude_watcher.ts';
import { WindowsKeyInjector } from '../../platform/injector.ts';

export class ClaudeAdapter implements IEngineAdapter {
  readonly id = 'claude';
  readonly name = 'Claude Code';

  private config: EnginePluginConfig | null = null;
  private watcher: ClaudeWatcher | null = null;
  private currentSession: RelaySession | null = null;
  private injector = new WindowsKeyInjector();
  private onUpdateCallback: ((session: RelaySession) => void) | null = null;

  async init(config: EnginePluginConfig): Promise<void> {
    this.config = config;
  }

  resolveProjectFolderName(projectPath: string): string {
    const normalized = path.resolve(projectPath).replace(/\\/g, '/');
    return normalized.replace(/:/g, '-').replace(/\//g, '-');
  }

  async detect(targetPath: string): Promise<boolean> {
    const home = os.homedir();
    const folderName = this.resolveProjectFolderName(targetPath);
    const claudeDir = path.join(home, '.claude', 'projects', folderName);
    return fs.existsSync(claudeDir);
  }

  startWatch(targetPath: string, onUpdate: (session: RelaySession) => void): void {
    this.onUpdateCallback = onUpdate;
    this.currentSession = {
      taskId: `claude-${Date.now()}`,
      engineId: this.id,
      engineName: this.name,
      projectPath: targetPath,
      status: 'running',
      currentDecision: null,
      recentLogs: [],
      startTime: Date.now(),
      lastActiveTime: Date.now()
    };

    this.watcher = new ClaudeWatcher(targetPath);
    this.watcher.on('message', (msg) => {
      if (this.currentSession) {
        this.currentSession.recentLogs.push(`[${msg.role}]: ${msg.text}`);
        if (this.currentSession.recentLogs.length > 20) {
          this.currentSession.recentLogs.shift();
        }
        this.currentSession.lastActiveTime = Date.now();
        onUpdate(this.currentSession);
      }
    });

    this.watcher.on('prompt', (prompt) => {
      this.handleWatcherPrompt(prompt, onUpdate);
    });

    this.watcher.on('waiting_end', () => {
      if (this.currentSession && this.currentSession.status === 'pending') {
        this.currentSession.status = 'running';
        this.currentSession.currentDecision = null;
        onUpdate(this.currentSession);
      }
    });

    this.watcher.start();
    onUpdate(this.currentSession);
  }

  handleWatcherPrompt(prompt: any, onUpdate?: (session: RelaySession) => void): void {
    if (!this.currentSession) {
      this.currentSession = {
        taskId: `claude-${Date.now()}`,
        engineId: this.id,
        engineName: this.name,
        projectPath: '',
        status: 'pending',
        currentDecision: null,
        recentLogs: [],
        startTime: Date.now(),
        lastActiveTime: Date.now()
      };
    }

    const decision: PendingDecision = {
      taskId: this.currentSession.taskId,
      engineId: this.id,
      engineName: this.name,
      title: 'Claude Code 审批确认',
      question: prompt.question || '是否继续执行？',
      isMultiSelect: false,
      options: (prompt.options || []).map((opt: any, idx: number) => ({
        id: idx,
        label: typeof opt === 'string' ? opt : (opt.label || String(opt))
      })),
      rawText: prompt.fullText,
      timestamp: Date.now()
    };

    this.currentSession.status = 'pending';
    this.currentSession.currentDecision = decision;
    this.currentSession.lastActiveTime = Date.now();

    const cb = onUpdate || this.onUpdateCallback;
    if (cb) {
      cb(this.currentSession);
    }
  }

  stopWatch(): void {
    if (this.watcher) {
      this.watcher.stop();
      this.watcher = null;
    }
  }

  async injectDecision(_taskId: string, command: DecisionCommand): Promise<boolean> {
    let textToSend = 'y';
    if (command.action === 'reject') {
      textToSend = 'n';
    } else if (command.action === 'select' && command.payload !== undefined) {
      textToSend = String(command.payload);
    } else if (command.action === 'input' && typeof command.payload === 'string') {
      textToSend = command.payload;
    }

    const injected = await this.injector.sendKeyToClaude(textToSend);
    if (this.currentSession) {
      this.currentSession.status = 'running';
      this.currentSession.currentDecision = null;
      if (this.onUpdateCallback) {
        this.onUpdateCallback(this.currentSession);
      }
    }
    return injected;
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
