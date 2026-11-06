# cb-context-service 项目总览与简历画像提炼

> 归档时间：2026-11-04  
> 项目路径：`D:\hyper-v\share\proj\cb-context-service`

---

## 一、 项目定位与核心业务架构

### 1. 业务定位
`cb-context-service` 是面向大模型智能体平台（AgentCore）的核心底层支撑微服务，主导**对话上下文管理、跨会话长期记忆沉淀、审计追踪链路记录与动态 ContextBundle 上下文组装**。
该服务作为大模型推理前的上下文决策中枢，实现了大模型会话生命周期管理与上下文 Token 精细化预算控制。

### 2. 核心技术栈
- **语言与基础框架**：Java 21 (虚拟线程/现代语法特性)、Spring Boot 3.x
- **数据持久化**：MySQL 8.x (Source of Truth 事实数据源)、MyBatis
- **向量检索与记忆库**：Qdrant (可重建向量索引，存储 User Profile 与 Long-term Memory 嵌入)
- **外部集成**：OpenAI 兼容模型接口、User Identity 鉴权中心
- **工程与容器化**：Docker、Docker Compose、Helm Charts、GitLab CI、Logback (MDC 结构化日志)

### 3. 架构分层与核心模块
```text
src/main/java/com/cb/contextservice/
├── conversation/     # 会话(Session)、消息(Message)、任务(Task)、Trace、Resource Call 核心事实持久化
├── contextbundle/    # ContextBundle 上下文构建流水线 (Pipeline)、策略注入 (Strategy)、Token 预算裁剪
├── memory/           # 会话摘要、用户画像(Profile)、长期记忆(Memory)、异步后台抽取任务与向量同步
├── openapi/          # 面向控制台/外部鉴权的 /api/v1/** 接口表面
├── integration/      # 模型网关、Qdrant 向量网关、用户鉴权网关适配器 (Gateway Pattern)
└── shared/           # 多租户隔离上下文、鉴权拦截器、异常体系、分页、MDC 链路日志
```

---

## 二、 简历项目经验描述提炼 (STAR 法则)

### 范例 1：资深后端 / 研发专家版本 (强调工程实现与性能)

> **项目名称**：AgentCore 智能体上下文与长期记忆服务 (`cb-context-service`)  
> **担任角色**：核心后端研发工程师 / 资深 Java 开发  
> **项目背景**：在复杂多轮 Agent 协同场景下，随着对话轮次增加，模型上下文窗口迅速膨胀，面临 Token 超限、跨会话记忆丢失及多租户数据泄露等痛点。  
> **核心职责与行动**：  
> 1. **双存储架构与数据隔离**：主导设计 MySQL + Qdrant 双存储架构，MySQL 作为权威事实源保证事务持久性，Qdrant 作为可平滑重建的语义向量索引；构建 `tenantId + appId + workId + userId` 四级数据硬隔离体系，并在拦截器与 MyBatis Mapper 层建立防越权防御网。  
> 2. **ContextBundle 组装流水线**：基于责任链与策略模式实现 Context 构建 Pipeline，按优先级动态聚合当前 Prompt、近期消息流、会话滚动摘要及 Qdrant 召回的高相关长期记忆；开发 `TokenBudgetTrimStep` 预算裁剪器，在毫秒级内完成超出 Token 阈值的安全截断。  
> 3. **高可用异步记忆抽取**：设计解耦的后台记忆沉淀机制，采用 `MemoryJobWorker` 配合分布式租约锁，异步驱动 LLM 抽取会话意图与用户画像，并将向量化写入与 MySQL 事务解耦，保障主对话链路毫秒级响应与 0 阻塞。  
> **项目成果**：支撑百万级会话交互，对话上下文裁剪准确率 100%，会话首字延迟降低 35%，长期记忆异步召回准确率显著提升，并实现向量库故障时 100% 自动无损重建。

---

### 范例 2：技术架构师版本 (强调系统权衡、高可用容灾与领域建模)

> **项目名称**：面向企业级 Agent 平台的上下文与持久化事实中枢  
> **担任角色**：后端架构师 / 系统设计师  
> **架构背景**：针对 LLM 复杂多轮工作流中的上下文预算爆炸、记忆漂移及分布式环境下的状态一致性难题，主导研发高内聚、高可观测的企业级上下文引擎。  
> **关键架构决策与落地**：  
> 1. **职责边界清晰化**：明确上下文服务的非目标（不管理 Agent 运行态死锁、不保留推理隐式 CoT），定义 `POST /internal/v1/turns` 作为单轮持久化事务边界，实现 Agent 执行器与事实沉淀的完全解耦。  
> 2. **弹性容灾与弱依赖降级**：制定“事实强一致、索引最终一致、模型弱依赖”架构原则。当 OpenAI 接口或 Qdrant 向量库出现慢查询或宕机时，动态熔断降级至本地摘要与近期窗口模式，确保核心问答高可用；引入 `VectorRebuildJob` 实现元数据与向量索引的版本化热迁移。  
> 3. **全链路可观测性设计**：设计覆盖 Trace Span 与 Resource Call 的细粒度审计模型，结合 MDC 染色与动态日志切分策略，实现会话从意图触发到工具调用的全景回溯，支撑毫秒级线上故障排查。  
> **量化收益**：保障大模型服务 99.99% 的核心问答可用性，单容器轻松承载 2000+ QPS 的上下文拼接需求，沉淀出一套标准化的 Agent 记忆与上下文工程规范。

---

## 三、 规划的五大核心考察维度

1. **架构与选型**：MySQL 与 Qdrant 的一致性权衡、四级租户数据隔离模型、OpenAPI 与 Internal API 的双接口面隔离。
2. **核心业务实现**：ContextBundle 动态装配流水线、Token 预算裁剪策略 (`TokenBudgetTrimStep`) 与会话滚动压缩。
3. **并发与性能**：高频 Turn 提交流水线、向量检索混合排序、异步 `MemoryJobWorker` 状态机与分布式租约防重。
4. **异常与边界容灾**：外部 LLM 接口超时重试、Qdrant 向量同步失败补偿、`VectorRebuildJob` 离线平滑重建机制。
5. **工程与排障**：链路追溯（MDC 与 Trace Span 审计）、JVM 内存开销控制与容器化日志治理。
