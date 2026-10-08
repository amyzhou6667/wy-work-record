import { TaskStatus, CommandType, CommandStatus } from '../types/index.js';

/**
 * 云端中转同步客户端
 * 支持真实微信云开发模式与本地测试 Mock 模式
 */
export class CloudSyncClient {
  constructor(options = {}) {
    this.mode = options.mode || 'mock';
    this.tasks = new Map();
    this.commands = new Map();
  }

  /**
   * 注册任务会话
   */
  async registerTask(taskId, command) {
    const task = {
      _id: taskId,
      tenant_id: 'tenant_default',
      user_id: 'user_dev_01',
      device_id: 'device_wy_workstation',
      command,
      status: TaskStatus.RUNNING,
      created_at: Date.now(),
      updated_at: Date.now(),
      last_heartbeat: Date.now()
    };
    this.tasks.set(taskId, task);
    return task;
  }

  /**
   * 发送心跳维持在线状态
   */
  async sendHeartbeat(taskId) {
    const task = this.tasks.get(taskId);
    if (!task) return false;
    task.last_heartbeat = Date.now();
    return true;
  }

  /**
   * 获取当前任务详情
   */
  async getTask(taskId) {
    return this.tasks.get(taskId) || null;
  }

  /**
   * 上报阻断提问与状态变更
   */
  async reportPrompt(taskId, promptPayload) {
    const task = this.tasks.get(taskId);
    if (!task) return false;
    task.status = TaskStatus.WAITING_CONFIRMATION;
    task.prompt_data = promptPayload;
    task.updated_at = Date.now();
    return true;
  }

  /**
   * 恢复为正常运行状态
   */
  async resumeTask(taskId) {
    const task = this.tasks.get(taskId);
    if (!task) return false;
    task.status = TaskStatus.RUNNING;
    delete task.prompt_data;
    task.updated_at = Date.now();
    return true;
  }

  /**
   * 轮询拉取未消费的指令
   */
  async pollCommand(taskId) {
    for (const cmd of this.commands.values()) {
      if (cmd.task_id === taskId && cmd.status === CommandStatus.PENDING) {
        return cmd;
      }
    }
    return null;
  }

  /**
   * 标记指令已被消费
   */
  async ackCommand(commandId) {
    const cmd = this.commands.get(commandId);
    if (!cmd) return false;
    cmd.status = CommandStatus.CONSUMED;
    cmd.consumed_at = Date.now();
    return true;
  }

  /**
   * 模拟手机端写入决策指令 (用于测试与本地模拟)
   */
  async mockMobileAction(taskId, commandType, payload) {
    const cmdId = `cmd_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const cmd = {
      _id: cmdId,
      task_id: taskId,
      command_type: commandType,
      payload,
      status: CommandStatus.PENDING,
      created_at: Date.now()
    };
    this.commands.set(cmdId, cmd);
    return cmd;
  }

  /**
   * 标记任务结束
   */
  async finishTask(taskId, exitCode) {
    const task = this.tasks.get(taskId);
    if (!task) return false;
    task.status = exitCode === 0 ? TaskStatus.COMPLETED : TaskStatus.FAILED;
    task.updated_at = Date.now();
    return true;
  }
}
