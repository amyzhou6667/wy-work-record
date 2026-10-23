import { TaskStatus, CommandType, type TaskStatusType } from './types/index.ts';
import type { PromptDetector, EvaluatedPrompt } from './detector/index.ts';
import type { CloudSyncClient } from './client/sync.ts';

export interface RelaySessionOptions {
  taskId: string;
  command: string;
  detector?: PromptDetector;
  syncClient: CloudSyncClient;
}

/**
 * 任务会话控制器 (RelaySession - TypeScript)
 * 编排终端输出监听、Prompt 阻断捕获、云端同步与远程指令注入
 */
export class RelaySession {
  public taskId: string;
  public command: string;
  public detector?: PromptDetector;
  public syncClient: CloudSyncClient;
  public status: TaskStatusType;
  public injectedInputs: string[];

  constructor(options: RelaySessionOptions) {
    this.taskId = options.taskId;
    this.command = options.command;
    this.detector = options.detector;
    this.syncClient = options.syncClient;
    this.status = TaskStatus.INITIALIZING;
    this.injectedInputs = [];
  }

  /**
   * 启动会话并上报初始状态
   */
  async start(): Promise<void> {
    await this.syncClient.registerTask(this.taskId, this.command);
    this.status = TaskStatus.RUNNING;
  }

  /**
   * 接收终端输出字符流
   */
  handleOutput(chunk: string): void {
    if (this.detector) {
      this.detector.feed(chunk);
    }
  }

  /**
   * 阻断提问触发处理
   */
  async handlePromptDetected(promptPayload: EvaluatedPrompt | any): Promise<void> {
    this.status = TaskStatus.WAITING_CONFIRMATION;
    await this.syncClient.reportPrompt(this.taskId, promptPayload);
  }

  /**
   * 状态循环轮询（消费远程指令并注入）
   * @returns 消费并注入的指令内容
   */
  async tick(): Promise<string | null> {
    if (this.status !== TaskStatus.WAITING_CONFIRMATION) {
      // 正常运行中心跳
      await this.syncClient.sendHeartbeat(this.taskId);
      return null;
    }

    // 处于阻断等待中，拉取指令
    const cmd = await this.syncClient.pollCommand(this.taskId);
    if (!cmd) return null;

    if (cmd.command_type === CommandType.INPUT && cmd.payload) {
      this.injectedInputs.push(cmd.payload);
      await this.syncClient.ackCommand(cmd._id);
      await this.syncClient.resumeTask(this.taskId);
      this.status = TaskStatus.RUNNING;
      if (this.detector) {
        this.detector.reset();
      }
      return cmd.payload;
    }

    if (cmd.command_type === CommandType.KILL) {
      await this.syncClient.ackCommand(cmd._id);
      this.status = TaskStatus.ABORTED;
      return 'KILL';
    }

    return null;
  }

  /**
   * 目标命令退出处理
   */
  async handleExit(exitCode: number): Promise<void> {
    this.status = exitCode === 0 ? TaskStatus.COMPLETED : TaskStatus.FAILED;
    await this.syncClient.finishTask(this.taskId, exitCode);
  }
}
