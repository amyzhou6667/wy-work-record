import { EventEmitter } from 'node:events';
import type { RelaySession, DecisionCommand, IEngineAdapter, PendingDecision } from '../types/engine.ts';

export interface DispatchResult {
  success: boolean;
  reason?: 'NOT_FOUND' | 'ALREADY_RESOLVED' | 'EXEC_FAILED';
}

export class SessionRouter extends EventEmitter {
  private sessions: Map<string, RelaySession> = new Map();

  registerOrUpdateSession(session: RelaySession): void {
    const existing = this.sessions.get(session.taskId);
    if (existing && existing.status === 'pending' && session.status === 'running') {
      // 产生本地推进解决
      this.emit('decision_resolved_locally', {
        taskId: session.taskId,
        engineId: session.engineId
      });
    }

    this.sessions.set(session.taskId, { ...session });
    this.emit('session_updated', session);
  }

  getSession(taskId: string): RelaySession | undefined {
    return this.sessions.get(taskId);
  }

  getAllSessions(): RelaySession[] {
    return Array.from(this.sessions.values());
  }

  getActivePendingDecision(): PendingDecision | null {
    for (const session of this.sessions.values()) {
      if (session.status === 'pending' && session.currentDecision) {
        return session.currentDecision;
      }
    }
    return null;
  }

  async dispatchDecision(
    command: DecisionCommand,
    adapter?: IEngineAdapter
  ): Promise<DispatchResult> {
    const session = this.sessions.get(command.taskId);
    if (!session) {
      return { success: false, reason: 'NOT_FOUND' };
    }

    // 冲突检查：如果当前不是 pending 状态或没有 currentDecision，说明本地或他人已完成处理
    if (session.status !== 'pending' || !session.currentDecision) {
      return { success: false, reason: 'ALREADY_RESOLVED' };
    }

    if (adapter) {
      try {
        const injected = await adapter.injectDecision(command.taskId, command);
        if (!injected) {
          return { success: false, reason: 'EXEC_FAILED' };
        }
      } catch {
        return { success: false, reason: 'EXEC_FAILED' };
      }
    }

    // 状态更新为 running
    session.status = 'running';
    session.currentDecision = null;
    session.lastActiveTime = Date.now();
    this.sessions.set(session.taskId, session);
    this.emit('session_updated', session);

    return { success: true };
  }
}
