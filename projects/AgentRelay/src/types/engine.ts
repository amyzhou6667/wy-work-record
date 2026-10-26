/**
 * AgentRelay 多引擎插件体系核心类型与接口定义 (TypeScript)
 */

export type EngineDetectMode = 'transcript_file' | 'process_pty' | 'custom';

export type SessionStatus = 'idle' | 'running' | 'pending' | 'completed' | 'error' | 'terminated';

export interface DecisionOption {
  id: string | number;
  label: string;
  isRecommended?: boolean;
}

export interface PendingDecision {
  taskId: string;
  engineId: string;
  engineName: string;
  title: string;
  question: string;
  isMultiSelect: boolean;
  options?: DecisionOption[];
  rawText?: string;
  timestamp: number;
}

export interface RelaySession {
  taskId: string;
  engineId: string;
  engineName: string;
  projectPath: string;
  status: SessionStatus;
  currentDecision: PendingDecision | null;
  recentLogs: string[];
  startTime: number;
  lastActiveTime: number;
}

export interface DecisionCommand {
  taskId: string;
  engineId: string;
  action: 'confirm' | 'reject' | 'select' | 'input' | 'kill';
  payload?: string | number | (string | number)[];
  timestamp: number;
}

export interface EnginePluginConfig {
  id: string;
  name: string;
  enabled: boolean;
  type: EngineDetectMode;
  config: {
    logPathPattern?: string;
    processPatterns?: string[];
    promptMatchers?: Array<{
      regex: string;
      type: 'confirm' | 'number_select' | 'enter_continue' | 'custom';
      defaultReply?: string;
    }>;
    extractType?: string;
    [key: string]: any;
  };
}

export interface EnginesConfigFile {
  engines: EnginePluginConfig[];
}

export interface IEngineAdapter {
  readonly id: string;
  readonly name: string;
  
  init(config: EnginePluginConfig): Promise<void> | void;
  detect(targetPath: string): Promise<boolean> | boolean;
  startWatch(targetPath: string, onUpdate: (session: RelaySession) => void): void;
  stopWatch(): void;
  injectDecision(taskId: string, command: DecisionCommand): Promise<boolean> | boolean;
  killTask(taskId: string): Promise<boolean> | boolean;
}
