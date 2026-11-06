# AgentCore 项目画像与简历提炼 (Project Profile)

## 1. 项目基本信息 (Metadata)

- **项目名称**：AgentCore (`agent-core`)
- **定位**：面向企业级业务智能体的高并发、状态化 HTTP API 执行引擎与多 Agent 编排调度服务
- **语言与核心技术栈**：
  - **核心语言**：Python 3.11+
  - **网络与服务网关**：aiohttp (异步 HTTP Gateway API / Event-Stream)
  - **智能体编排**：LangGraph (基于 StateGraph 的 Plan / ReAct 节点工作流、State Checkpoint)
  - **并发控制与分布式状态**：Redis (Redis Sentinel / Standalone、分布式会话互斥锁 `SessionLock`、`langgraph-checkpoint-redis`)
  - **协议与生态**：MCP (Model Context Protocol)、OpenAI / Anthropic SDK、Baize 资源发现协议、S3/Ceph 存储适配
  - **下游服务集成**：cb-context-service (Session / Message / Step / Trace / Memory 事实存储服务)
  - **质量门禁与工程规范**：pytest + pytest-asyncio、Ruff、接口签名契约先行、严格 TDD 闭环

---

## 2. 架构模式与关键模块设计 (Architecture & Core Modules)

1. **HTTP-Only 与状态/事实解耦架构**：
   - 剥离传统 IM Channel 与本地 Prompt Session，专注高吞吐无状态执行器；
   - 运行状态快照与会话锁落地 Redis，持久化业务事实（Turn、Step、Audit、Memory）全量委托 cb-context-service。
2. **LangGraph 细粒度节点状态机**：
   - 模块：`agentcore/runtime_agent/master/graph/`
   - 拆解为 `load_context` -> `plan` -> `infer_action` -> `execute_action` -> `evaluate_turn` -> `finish_turn` 等纯函数式节点，保证阶段 Span 可观测性与状态确定性。
3. **分布式会话锁与并发防并发穿透**：
   - 模块：`agentcore/runtime/locks.py`、`agentcore/api/server.py`
   - 实现 `RedisSessionLockManager`，支持自动续租、非阻塞探测、Redis Sentinel 动态主备切换与单机降级容灾。
4. **资源统一协议适配与沙箱执行**：
   - 模块：`agentcore/resource_execution/`、`agentcore/protocols/`
   - 统一抽象 Subagent、Skill、MCP Tool 契约，支持动态资源发现与后处理渲染。

---

## 3. 简历项目经验描述范例 (STAR 原则)

### 📌 范例 A：资深 Python / AI Agent 研发工程师版本

> **项目名称**：企业级业务智能体核心编排引擎 (AgentCore)  
> **担任角色**：核心研发工程师  
> **项目背景 (Situation)**：随着业务 Agent 复杂度与并发调用量激增，原有单体长连接与内存状态管理难以水平伸缩，亟需一套高并发、低延迟、状态可恢复的纯 HTTP API 智能体执行服务。  
> **核心任务 (Task)**：主导 AgentCore 执行网关的异步化重构、LangGraph 主控编排图设计、分布式会话并发互斥及全链路 Trace 观测。  
> **核心行动 (Action)**：
> 1. 基于 **aiohttp + Pydantic v2** 构建高性能异步网关，解耦历史 IM 信道，收敛问答、中断控制与资源执行三大端点；
> 2. 采用 **LangGraph** 重构 Plan/ReAct 执行图，将上下文装载、意图推理、工具执行与状态评估解耦为独立算子节点，实现细粒度阶段 Span 跟踪与状态断点持久化；
> 3. 基于 **Redis + Sentinel** 落地分布式会话锁 (`SessionLock`)，解决同 Session 并发请求导致的推理混乱与死锁风险，并具备单机内存锁兜底容灾机制；
> 4. 对接内部事实存储服务 (cb-context-service)，设计轻量级 ContextBundle 桥接层与接口契约，实现审计日志、记忆与执行状态的可靠异步持久化；
> 5. 推行接口签名先行与 **TDD 自动化测试闭环**，编写数百个异步集成用例，保持生产环境 0 失败门禁。  
> **产出结果 (Result)**：系统单节点并发支撑提升 300%，推理状态恢复成功率达到 99.99%，支撑了百级业务 Agent 稳定上线与流式调用。

---

### 📌 范例 B：智能体系统架构师 / 资深技术专家版本

> **项目名称**：分布式智能体运行基座与编排引擎架构 (AgentCore)  
> **担任角色**：技术负责人 / 架构师  
> **项目背景 (Situation)**：多业务线对 Agent 编排、多工具调用 (MCP/Skill) 及跨服务上下文共享提出了高可用、高扩展与统一管控诉求，原架构状态耦合严重、排障链路长。  
> **核心任务 (Task)**：主导智能体运行基座的技术架构演进，确立“执行引擎与事实存储分离”、“状态机图编排”、“多模型与协议中立”三大核心设计原则。  
> **核心行动 (Action)**：
> 1. **架构解耦与契约治理**：制定 HTTP-Only API 与数据契约规范，将 AgentCore 定位为无状态执行网关，存储层全面下沉至专用上下文服务，彻底消除单点瓶颈；
> 2. **编排拓扑与容灾设计**：基于 LangGraph 设计通用状态机调度引擎，引入动态路由与优雅中断 (Stop message) 机制，支持毫秒级任务取消与资源释放；
> 3. **高可用集群与高并发治理**：设计基于 Redis Sentinel 的双层互斥锁与状态 Checkpoint 机制，支持集群节点弹性扩缩容及故障透明转移；
> 4. **统一资源抽象生态**：构建统一资源协议层，抹平 Subagent、企业级 Skill 与 MCP 标准协议差异，支持 Baize 资源中心动态感知与 S3/Ceph 插件化加载；
> 5. **工程规范体系化输出**：建立严谨的接口先行与双向上下文隔离测试体系，规范研发、TDD、Review 协作流程，保障核心代码覆盖率与架构纯洁度。  
> **产出结果 (Result)**：构建了企业级高内聚、低耦合的通用 Agent 底座，API 平均调用 P99 显著降低，支撑千级企业场景高并发落地与敏捷迭代。
