/**
 * AgentRelay 核心领域模型与枚举定义 (TypeScript)
 */

/**
 * 任务生命周期状态枚举
 */
export const TaskStatus = {
  INITIALIZING: 'INITIALIZING',
  RUNNING: 'RUNNING',
  WAITING_CONFIRMATION: 'WAITING_CONFIRMATION',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  ABORTED: 'ABORTED',
  OFFLINE: 'OFFLINE'
} as const;

export type TaskStatusType = typeof TaskStatus[keyof typeof TaskStatus];

/**
 * 指令动作类型枚举
 */
export const CommandType = {
  INPUT: 'INPUT',
  KILL: 'KILL'
} as const;

export type CommandTypeVal = typeof CommandType[keyof typeof CommandType];

/**
 * 指令消费状态枚举
 */
export const CommandStatus = {
  PENDING: 'PENDING',
  CONSUMED: 'CONSUMED',
  EXPIRED: 'EXPIRED'
} as const;

export type CommandStatusVal = typeof CommandStatus[keyof typeof CommandStatus];

/**
 * 提问结构化数据定义
 */
export interface PromptData {
  question: string;
  options?: string[];
  defaultChoice?: string;
  rawText?: string;
  timestamp?: number;
}

/**
 * 任务会话模型接口
 */
export interface TaskSession {
  taskId: string;
  status: TaskStatusType;
  prompt: PromptData | null;
  logs: string[];
  createdAt: number;
  lastHeartbeat: number;
}

/**
 * 下发指令模型接口
 */
export interface RelayCommand {
  commandId: string;
  taskId: string;
  type: CommandTypeVal;
  payload: string;
  status: CommandStatusVal;
  createdAt: number;
}

export * from './engine.ts';
