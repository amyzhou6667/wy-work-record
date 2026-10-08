/**
 * AgentRelay 核心领域模型与枚举定义
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
};

/**
 * 指令动作类型枚举
 */
export const CommandType = {
  INPUT: 'INPUT',
  KILL: 'KILL'
};

/**
 * 指令消费状态枚举
 */
export const CommandStatus = {
  PENDING: 'PENDING',
  CONSUMED: 'CONSUMED',
  EXPIRED: 'EXPIRED'
};
