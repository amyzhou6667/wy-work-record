// @ts-nocheck
const { useState, useEffect } = React;

function App() {
  const [activeTab, setActiveTab] = useState('workbench'); // 'workbench' | 'onboarding' | 'dashboard' | 'pivot'
  const [currentGoal, setCurrentGoal] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [assets, setAssets] = useState([]);
  
  // Onboarding state
  const [chatMessages, setChatMessages] = useState([]);
  const [sessionId, setSessionId] = useState('');
  const [currentOptions, setCurrentOptions] = useState([]);
  const [inputVal, setInputVal] = useState('');
  const [loading, setLoading] = useState(false);

  // Checkin state
  const [checkinSummary, setCheckinSummary] = useState('');
  const [checkinMinutes, setCheckinMinutes] = useState(15);
  const [latestFeedback, setLatestFeedback] = useState(null);

  // Pivot state
  const [pivotReason, setPivotReason] = useState('');
  const [pivotLesson, setPivotLesson] = useState('');
  const [pivotDirection, setPivotDirection] = useState('');

  // 1. Initial Load: Check if goal exists or start onboarding
  useEffect(() => {
    fetchGoals();
    fetchAssets();
  }, []);

  const fetchGoals = async () => {
    try {
      const res = await fetch('/api/goals/active');
      if (res.ok) {
        const data = await res.json();
        if (data.goal) {
          setCurrentGoal(data.goal);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchAssets = async () => {
    try {
      const res = await fetch('/api/assets');
      if (res.ok) {
        const data = await res.json();
        setAssets(data.assets || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const startOnboarding = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/onboarding/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'user_default' })
      });
      const data = await res.json();
      setSessionId(data.sessionId);
      setChatMessages([
        { role: 'assistant', text: data.firstQuestion }
      ]);
      setCurrentOptions(data.options || []);
      setActiveTab('onboarding');
    } finally {
      setLoading(false);
    }
  };

  const sendReply = async (text) => {
    if (!text || !sessionId) return;
    const newMsgs = [...chatMessages, { role: 'user', text }];
    setChatMessages(newMsgs);
    setInputVal('');
    setLoading(true);

    try {
      const res = await fetch('/api/onboarding/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, reply: text })
      });
      const data = await res.json();
      if (!data.isFinished) {
        setChatMessages([...newMsgs, { role: 'assistant', text: data.nextQuestion }]);
        setCurrentOptions(data.options || []);
      } else {
        setUserProfile(data.profile);
        setChatMessages([
          ...newMsgs,
          {
            role: 'assistant',
            text: `🎉 认知资产盘点完成！你的核心优势定位：【${data.profile.summary}】。已为你反推生成了 3 条高变现潜力路径。请查看下方卡片并选择启动！`
          }
        ]);
        setCurrentOptions([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const adoptTrack = async (track) => {
    setLoading(true);
    try {
      const res = await fetch('/api/goals/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'user_default',
          trackName: track.trackName,
          customTarget: track.trackName
        })
      });
      const data = await res.json();
      setCurrentGoal(data.goal);
      setActiveTab('workbench');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckin = async (action) => {
    if (!currentGoal) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/actions/${action.id}/checkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goalId: currentGoal.id,
          summary: checkinSummary || '按指引高效完成了最小启动动作',
          actualMinutes: Number(checkinMinutes) || action.maxMinutes
        })
      });
      const data = await res.json();
      setLatestFeedback(data.action.checkin.aiFeedback);
      setCheckinSummary('');
      fetchGoals();
      fetchAssets();
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerReducedLoad = async (action) => {
    if (!currentGoal) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/actions/${action.id}/reduce-load`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goalId: currentGoal.id })
      });
      await fetchGoals();
    } finally {
      setLoading(false);
    }
  };

  const handlePivot = async () => {
    if (!currentGoal || !pivotDirection) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/goals/${currentGoal.id}/pivot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: pivotReason || '时间分配与方向微调',
          lessonLearned: pivotLesson || '发现了自己更擅长的单点突破口',
          newDirection: pivotDirection
        })
      });
      const data = await res.json();
      setCurrentGoal(data.newGoal);
      setPivotDirection('');
      setPivotReason('');
      setPivotLesson('');
      setActiveTab('workbench');
      fetchAssets();
    } finally {
      setLoading(false);
    }
  };

  const activeMilestone = currentGoal?.milestones?.find(m => m.status === 'in_progress') || currentGoal?.milestones?.[0];
  const pendingActions = activeMilestone?.dailyActions?.filter(a => a.status === 'pending' || a.status === 'reduced') || [];
  const completedActions = activeMilestone?.dailyActions?.filter(a => a.status === 'completed') || [];

  return (
    <div className="app-container">
      {/* 顶部导航 */}
      <div className="header">
        <h1>🧭 LifeCompass 人生罗盘</h1>
        <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>AI 个人潜能挖掘与目标导航</span>
      </div>

      {/* 选项卡切换 */}
      <div className="tabs">
        <button
          className={`tab-btn ${activeTab === 'workbench' ? 'active' : ''}`}
          onClick={() => setActiveTab('workbench')}
        >
          🎯 今日微行动
        </button>
        <button
          className={`tab-btn ${activeTab === 'onboarding' ? 'active' : ''}`}
          onClick={() => {
            if (!sessionId) startOnboarding();
            setActiveTab('onboarding');
          }}
        >
          💬 认知盘点
        </button>
        <button
          className={`tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          📊 资产与看板
        </button>
        <button
          className={`tab-btn ${activeTab === 'pivot' ? 'active' : ''}`}
          onClick={() => setActiveTab('pivot')}
        >
          🔄 支线重构
        </button>
      </div>

      {/* 视图 1：今日微行动打卡台 */}
      {activeTab === 'workbench' && (
        <div className="card">
          {!currentGoal ? (
            <div style={{ textAlign: 'center', padding: '30px 10px' }}>
              <div style={{ fontSize: '2rem', marginBottom: '12px' }}>🌱</div>
              <h3>尚未确立人生发展目标</h3>
              <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: '8px 0 16px' }}>
                先通过苏格拉底式 AI 启发对话盘点你的隐性优势，摸清家底后再出发！
              </p>
              <button className="btn-primary" onClick={startOnboarding}>
                开启苏格拉底认知盘点
              </button>
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div>
                  <span className="badge badge-reduced">当前主航道</span>
                  <h2 style={{ fontSize: '1.15rem', marginTop: '4px' }}>{currentGoal.title}</h2>
                </div>
                <span style={{ fontSize: '0.85rem', color: '#38bdf8' }}>阶段：{activeMilestone?.title}</span>
              </div>

              {/* 韧性守护共情提示 */}
              {pendingActions.some(a => a.isReducedLoad) && (
                <div className="resilience-alert" style={{ marginBottom: '16px' }}>
                  <strong>🛡️ 动态韧性守护器已激活：</strong>
                  <p style={{ marginTop: '4px' }}>检测到阻力较大，系统已将今日行动自动降维为“2分钟极简任务”，放下完美主义，点亮火种即算成功！</p>
                </div>
              )}

              {/* 今日待办微行动 */}
              <h3 style={{ fontSize: '0.95rem', color: '#94a3b8', marginBottom: '8px' }}>今日待办微行动 (≤20min 低阻力)</h3>
              {pendingActions.length === 0 ? (
                <div style={{ padding: '16px', background: '#111827', borderRadius: '8px', textAlign: 'center', color: '#10b981' }}>
                  ✨ 今日微行动已全部圆满完成！复利正在悄然发生。
                </div>
              ) : (
                pendingActions.map(action => (
                  <div key={action.id} style={{ background: '#111827', border: action.isReducedLoad ? '1px solid #0284c7' : '1px solid #374151', padding: '16px', borderRadius: '10px', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <h4 style={{ color: action.isReducedLoad ? '#38bdf8' : '#f8fafc', fontSize: '1rem' }}>{action.title}</h4>
                      <span className="badge badge-time">预计 {action.maxMinutes} 分钟</span>
                    </div>
                    <p style={{ fontSize: '0.875rem', color: '#94a3b8', margin: '8px 0 12px' }}>{action.instruction}</p>

                    {/* 打卡表单 */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <input
                        type="text"
                        placeholder="记录一句话执行心得/体会/产出链接..."
                        value={checkinSummary}
                        onChange={(e) => setCheckinSummary(e.target.value)}
                        style={{ padding: '8px 12px', background: '#1e293b', border: '1px solid #475569', borderRadius: '6px', color: '#fff', fontSize: '0.85rem' }}
                      />
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <button className="btn-primary" style={{ flex: 1 }} onClick={() => handleCheckin(action)}>
                          ✓ 立即打卡提交
                        </button>
                        {!action.isReducedLoad && (
                          <button className="btn-reduced" onClick={() => handleTriggerReducedLoad(action)} title="如果今天太累做不动，一键降载为2分钟动作">
                            😴 降载为2分钟微步
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}

              {/* 最新 AI 复盘点评 */}
              {latestFeedback && (
                <div style={{ background: '#1e1b4b', border: '1px solid #818cf8', borderRadius: '10px', padding: '14px', marginTop: '16px' }}>
                  <div style={{ color: '#a5b4fc', fontWeight: 'bold', fontSize: '0.9rem', marginBottom: '4px' }}>🤖 AI 人生罗盘即时复盘</div>
                  <p style={{ fontSize: '0.875rem', color: '#e0e7ff', lineHeight: '1.5' }}>{latestFeedback.encouragement}</p>
                  <div style={{ fontSize: '0.8rem', color: '#c7d2fe', marginTop: '6px' }}>💡 亮点：{latestFeedback.highlight}</div>
                  <div style={{ fontSize: '0.8rem', color: '#93c5fd', marginTop: '2px' }}>🌱 贴士：{latestFeedback.nextStepTip}</div>
                </div>
              )}

              {/* 已完成行动列表 */}
              {completedActions.length > 0 && (
                <div style={{ marginTop: '20px' }}>
                  <h4 style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '8px' }}>已归档微行动 ({completedActions.length})</h4>
                  {completedActions.map(a => (
                    <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#111827', borderRadius: '6px', fontSize: '0.85rem', marginBottom: '6px' }}>
                      <span style={{ textDecoration: 'line-through', color: '#94a3b8' }}>{a.title}</span>
                      <span style={{ color: '#10b981' }}>✓ 已完成</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 视图 2：苏格拉底认知盘点 */}
      {activeTab === 'onboarding' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1.05rem' }}>💬 苏格拉底式潜能盘点引擎</h3>
            <button className="tag-btn" onClick={startOnboarding}>重新盘点</button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '380px', overflowY: 'auto', paddingRight: '4px' }}>
            {chatMessages.map((msg, idx) => (
              <div key={idx} className={`chat-bubble ${msg.role}`}>
                {msg.text}
              </div>
            ))}
          </div>

          {/* 推荐快捷选项 */}
          {currentOptions.length > 0 && (
            <div className="tag-cloud">
              {currentOptions.map((opt, idx) => (
                <button key={idx} className="tag-btn" onClick={() => sendReply(opt)}>
                  {opt}
                </button>
              ))}
            </div>
          )}

          {/* 输入框 */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
            <input
              type="text"
              placeholder="输入你的思考或经历（越真实越好）..."
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') sendReply(inputVal); }}
              style={{ flex: 1, padding: '10px 14px', background: '#111827', border: '1px solid #374151', borderRadius: '8px', color: '#fff' }}
            />
            <button className="btn-primary" onClick={() => sendReply(inputVal)} disabled={loading}>
              发送
            </button>
          </div>

          {/* 盘点出的候选变现路径 */}
          {userProfile?.recommendedTracks && (
            <div style={{ marginTop: '16px', borderTop: '1px solid #334155', paddingTop: '16px' }}>
              <h4 style={{ fontSize: '0.95rem', color: '#38bdf8', marginBottom: '8px' }}>🚀 为你智能反推的候选变现航道</h4>
              {userProfile.recommendedTracks.map((tr, idx) => (
                <div key={idx} style={{ background: '#111827', padding: '12px', borderRadius: '8px', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong>{tr.trackName}</strong>
                    <span className="badge badge-reduced">契合度 {tr.matchScore}%</span>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: '4px 0' }}>{tr.rationale}</p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                    <span style={{ fontSize: '0.8rem', color: '#34d399' }}>{tr.estimatedValue}</span>
                    <button className="btn-primary" style={{ padding: '4px 10px', fontSize: '0.8rem' }} onClick={() => adoptTrack(tr)}>
                      选择并启动该计划 ➔
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 视图 3：资产与看板 */}
      {activeTab === 'dashboard' && (
        <div className="card">
          <h3 style={{ fontSize: '1.05rem' }}>📊 个人认知资产与经验沉淀库</h3>

          {/* 五维能力雷达简况 */}
          <div className="radar-stat-grid">
            <div className="radar-stat-item">
              <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>专业硬核度</div>
              <div className="radar-stat-val">{userProfile?.radarScores?.hardCompetence || 80} / 100</div>
            </div>
            <div className="radar-stat-item">
              <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>商业感知力</div>
              <div className="radar-stat-val">{userProfile?.radarScores?.businessAcumen || 85} / 100</div>
            </div>
            <div className="radar-stat-item">
              <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>执行驱动力</div>
              <div className="radar-stat-val">{userProfile?.radarScores?.executionDrive || 70} / 100</div>
            </div>
            <div className="radar-stat-item">
              <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>抗挫韧性指数</div>
              <div className="radar-stat-val" style={{ color: '#10b981' }}>{userProfile?.radarScores?.resilienceIndex || 88} / 100</div>
            </div>
          </div>

          {/* 历史经验资产库 */}
          <div style={{ marginTop: '16px' }}>
            <h4 style={{ fontSize: '0.95rem', color: '#94a3b8', marginBottom: '8px' }}>🗄️ 历史沉淀资产 ({assets.length})</h4>
            {assets.length === 0 ? (
              <p style={{ fontSize: '0.85rem', color: '#64748b' }}>暂无历史归档，持续打卡或进行支线调整时会自动沉淀在此。</p>
            ) : (
              assets.map(asset => (
                <div key={asset.id} style={{ background: '#111827', padding: '12px', borderRadius: '8px', marginBottom: '8px', borderLeft: '3px solid #10b981' }}>
                  <strong>{asset.title}</strong>
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '4px 0' }}>
                    累计打卡：{asset.totalCheckins} 次 | 沉淀技能：{asset.acquiredSkills.join('、')}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 视图 4：支线重构 (Pivot) */}
      {activeTab === 'pivot' && (
        <div className="card">
          <h3 style={{ fontSize: '1.05rem' }}>🔄 人生支线重构 (Pivot Flow)</h3>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8', lineHeight: '1.5' }}>
            现实发生剧变或发现当前路径不适合自己？在这里发起调整。历史所做的一切积累都将封存为永久经验资产，数据永不归零！
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
            <div>
              <label style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>1. 促使你想要调整的原因是什么？</label>
              <input
                type="text"
                placeholder="例如：主业工作变动、时间不足、对该领域失去兴趣..."
                value={pivotReason}
                onChange={(e) => setPivotReason(e.target.value)}
                style={{ width: '100%', marginTop: '4px', padding: '8px 12px', background: '#111827', border: '1px solid #374151', borderRadius: '6px', color: '#fff' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>2. 过去这段时间的尝试中，你发现了什么宝贵经验？</label>
              <input
                type="text"
                placeholder="例如：虽然剪辑耗时，但我发现自己图文整理和逻辑提炼很快..."
                value={pivotLesson}
                onChange={(e) => setPivotLesson(e.target.value)}
                style={{ width: '100%', marginTop: '4px', padding: '8px 12px', background: '#111827', border: '1px solid #374151', borderRadius: '6px', color: '#fff' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>3. 新的探索方向：</label>
              <input
                type="text"
                placeholder="例如：轻量图文知识卡片与职场咨询微服务"
                value={pivotDirection}
                onChange={(e) => setPivotDirection(e.target.value)}
                style={{ width: '100%', marginTop: '4px', padding: '8px 12px', background: '#111827', border: '1px solid #374151', borderRadius: '6px', color: '#fff' }}
              />
            </div>

            <button className="btn-primary" onClick={handlePivot} disabled={!pivotDirection || loading}>
              确认封存旧数据，无痛转向新支线 ➔
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(React.createElement(App));
}
