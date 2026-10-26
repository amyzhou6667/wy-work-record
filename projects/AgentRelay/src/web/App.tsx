import React, { useState, useEffect, useRef, useCallback } from 'react';

// 接口定义
export interface SuggestedOption {
  id?: string | number;
  index?: string;
  label: string;
  description?: string;
  isRecommended?: boolean;
}

export interface PromptData {
  question: string;
  recent_logs?: string[];
  suggested_options?: SuggestedOption[];
  triggered_at?: number;
  engine_id?: string;
  is_multi_select?: boolean;
}

export interface TaskState {
  _id: string;
  command: string;
  engine_id?: string;
  status: 'RUNNING' | 'WAITING_CONFIRMATION' | 'COMPLETED' | 'FAILED' | 'ABORTED' | string;
  created_at: number;
  updated_at: number;
  last_heartbeat: number;
  prompt_data?: PromptData;
}

const statusMap: Record<string, string> = {
  RUNNING: '运行中',
  WAITING_CONFIRMATION: '等待决策',
  COMPLETED: '已完成',
  FAILED: '失败',
  ABORTED: '已中止',
  OFFLINE: '离线'
};

const engineMetaMap: Record<string, { label: string; icon: string; className: string }> = {
  antigravity: { label: 'Antigravity', icon: '🟢', className: 'antigravity' },
  dsh: { label: 'DeepSeek', icon: '🔵', className: 'dsh' },
  claude: { label: 'Claude Code', icon: '🟣', className: 'claude' }
};

export const App: React.FC = () => {
  const [tasks, setTasks] = useState<TaskState[]>([]);
  const [activeTaskId, setActiveTaskId] = useState<string>('');
  const [isOnline, setIsOnline] = useState<boolean>(false);
  const [customInput, setCustomInput] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const lastPromptTriggerRef = useRef<number | null>(null);

  // 获取任务列表与状态
  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch('/api/tasks');
      if (!res.ok) throw new Error('Failed to fetch tasks');
      const data = await res.json();
      const taskList: TaskState[] = Array.isArray(data) ? data : [data];
      setTasks(taskList);
      setIsOnline(true);

      // 智能聚焦逻辑：若存在处于 WAITING_CONFIRMATION 的任务，自动切换为当前焦点卡片
      const pendingTask = taskList.find(t => t.status === 'WAITING_CONFIRMATION');
      if (pendingTask) {
        setActiveTaskId(pendingTask._id);
        if (pendingTask.prompt_data?.triggered_at && lastPromptTriggerRef.current !== pendingTask.prompt_data.triggered_at) {
          lastPromptTriggerRef.current = pendingTask.prompt_data.triggered_at;
          if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate(200);
          }
        }
      } else if (!activeTaskId && taskList.length > 0) {
        setActiveTaskId(taskList[0]._id);
      }
    } catch {
      setIsOnline(false);
    }
  }, [activeTaskId]);

  useEffect(() => {
    fetchTasks();
    const timer = setInterval(fetchTasks, 1500);
    return () => clearInterval(timer);
  }, [fetchTasks]);

  const currentTask = tasks.find(t => t._id === activeTaskId) || tasks[0] || null;

  // 发送指令动作
  const sendAction = async (payload: string, actionType: 'INPUT' | 'KILL' = 'INPUT') => {
    if (isSubmitting || !currentTask) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/tasks/${currentTask._id}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action_type: actionType, payload })
      });
      if (res.status === 409) {
        alert('⚠️ 该提问已在工位本地处理完毕');
      }
      setCustomInput('');
    } catch {
      alert('发送指令失败，请重试');
    } finally {
      setIsSubmitting(false);
      fetchTasks();
    }
  };

  const handleCustomSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = customInput.trim();
    if (!trimmed) return;
    sendAction(trimmed);
  };

  const handleConfirmKill = () => {
    if (window.confirm('⚠️ 确定要强制中止该 AI 任务吗？')) {
      sendAction('', 'KILL');
    }
  };

  const engineMeta = currentTask?.engine_id ? engineMetaMap[currentTask.engine_id] : null;

  return (
    <div className="container">
      {/* 头部 Header */}
      <header className="header">
        <div className="brand">
          <span className="brand-icon">⚡</span>
          <span>AgentRelay</span>
        </div>
        <div className="device-badge">
          <div className={`status-dot ${isOnline ? 'online' : ''}`} />
          <span>{isOnline ? '工位电脑 在线' : '等待连接...'}</span>
        </div>
      </header>

      {/* 多任务横滑切换卡片 */}
      {tasks.length > 1 && (
        <div className="task-tabs-container">
          {tasks.map(t => {
            const meta = t.engine_id ? engineMetaMap[t.engine_id] : null;
            const isPending = t.status === 'WAITING_CONFIRMATION';
            const isActive = t._id === currentTask?._id;
            return (
              <div
                key={t._id}
                className={`task-tab-pill ${isActive ? 'active' : ''} ${isPending ? 'pending' : ''}`}
                onClick={() => setActiveTaskId(t._id)}
              >
                <span>{meta?.icon || '🤖'}</span>
                <span>{meta?.label || t.command}</span>
                {isPending && <span>⚠️</span>}
              </div>
            );
          })}
        </div>
      )}

      {/* 任务卡片 Card */}
      <main className="card">
        <div className="task-meta">
          <div className="task-title">
            <span>{engineMeta?.icon || '🤖'}</span>
            <span>{currentTask ? currentTask.command : '正在加载任务...'}</span>
            {engineMeta && (
              <span className={`engine-tag ${engineMeta.className}`}>
                {engineMeta.label}
              </span>
            )}
          </div>
          <div className={`status-pill ${currentTask?.status || 'RUNNING'}`}>
            {statusMap[currentTask?.status || ''] || '连接中'}
          </div>
        </div>

        {/* 动态内容区 */}
        <DynamicContent
          task={currentTask}
          isSubmitting={isSubmitting}
          customInput={customInput}
          onCustomInputChange={setCustomInput}
          onSendAction={sendAction}
          onCustomSubmit={handleCustomSubmit}
          onConfirmKill={handleConfirmKill}
        />
      </main>

      {/* 底部 Footer */}
      <footer className="footer">
        <p>工位多 AI 引擎远程伴侣 · Claude Code / Antigravity / DeepSeek (React + TS)</p>
      </footer>
    </div>
  );
};

interface DynamicContentProps {
  task: TaskState | null;
  isSubmitting: boolean;
  customInput: string;
  onCustomInputChange: (val: string) => void;
  onSendAction: (payload: string, actionType?: 'INPUT' | 'KILL') => void;
  onCustomSubmit: (e?: React.FormEvent) => void;
  onConfirmKill: () => void;
}

const DynamicContent: React.FC<DynamicContentProps> = ({
  task,
  isSubmitting,
  customInput,
  onCustomInputChange,
  onSendAction,
  onCustomSubmit,
  onConfirmKill
}) => {
  if (!task) {
    return (
      <div className="running-notice">
        <div className="spinner" />
        <p>正在同步工位电脑 AI 任务状态...</p>
      </div>
    );
  }

  // 1. 等待确认决策态
  if (task.status === 'WAITING_CONFIRMATION' && task.prompt_data) {
    const logs = (task.prompt_data.recent_logs || []).join('\n');
    const options = task.prompt_data.suggested_options || [];

    return (
      <>
        <div className="prompt-box">
          <div className="prompt-title">
            <span>⚠️ 需要人工确认决策</span>
          </div>
          <div className="prompt-text">{task.prompt_data.question}</div>
        </div>

        {/* 自适应候选按键 */}
        <div className="action-grid">
          {options.length > 0 ? (
            options.map((opt, i) => {
              const val = String(opt.id !== undefined ? opt.id : opt.index || opt.label);
              return (
                <button
                  key={i}
                  className={`btn-action btn-confirm ${opt.isRecommended ? 'recommended' : ''}`}
                  disabled={isSubmitting}
                  onClick={() => onSendAction(val)}
                >
                  <span className="btn-icon">{opt.isRecommended ? '⭐' : '👉'}</span>
                  <span>{opt.label}</span>
                </button>
              );
            })
          ) : (
            <>
              <button
                className="btn-action btn-confirm"
                disabled={isSubmitting}
                onClick={() => onSendAction('y')}
              >
                <span className="btn-icon">✅</span>
                <span>同意 (Y)</span>
              </button>
              <button
                className="btn-action btn-reject"
                disabled={isSubmitting}
                onClick={() => onSendAction('n')}
              >
                <span className="btn-icon">❌</span>
                <span>拒绝 (N)</span>
              </button>
            </>
          )}
        </div>

        {/* 自由输入 */}
        <div className="custom-input-bar">
          <input
            className="input-box"
            placeholder="自定义回复或参数输入..."
            value={customInput}
            onChange={(e) => onCustomInputChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onCustomSubmit()}
          />
          <button
            className="btn-send"
            disabled={isSubmitting || !customInput.trim()}
            onClick={() => onCustomSubmit()}
          >
            发送
          </button>
        </div>

        {/* 抽屉日志预览 */}
        {logs && (
          <details className="logs-drawer" open>
            <summary className="logs-summary">最近上下文日志 (前置 15 行)</summary>
            <pre className="logs-content">{logs}</pre>
          </details>
        )}

        <button className="btn-danger-outline" onClick={onConfirmKill}>
          🛑 紧急中止当前任务
        </button>
      </>
    );
  }

  // 2. 正常运行中
  return (
    <div className="running-notice">
      <div className="spinner" />
      <p style={{ fontWeight: 600, color: '#f0f6fc' }}>任务正在工位电脑自主执行中...</p>
      <p style={{ fontSize: 13 }}>遇到人工审核或选择题时，手机将自动收到震动通知。</p>
      <button className="btn-danger-outline" style={{ marginTop: 16 }} onClick={onConfirmKill}>
        🛑 紧急中止当前任务
      </button>
    </div>
  );
};
