# 项目总览与简历提炼：Litong Doc CA Adapter (内网 CA 同步执行器)

> 归档路径：`./interview-records/litong-doc-ca-adapter/project-profile.md`  
> 生成时间：2026-11-04  
> 项目性质：高安全性企业级内网数据面与公网 AI 服务受限执行中继系统

---

## 1. 项目全景架构与业务定位

### 1.1 业务定位与核心痛点
在企事业单位高安全内网环境中，核心知识库（CoreAgent，包含 CA-A 文档树与 CA-B 结构化分块）部署在内网隔离区，禁止公网直接穿透访问；而大模型文档智能解析引擎（Parser Service）部署于公网具备高算力集群。

**Litong Doc CA Adapter (Internal CA Sync Service)** 作为内网受限执行器与安全数据面中继系统，在不暴露内网拓扑与凭证的前提下，实现了“**出站单向推送文件 → 轮询拉取解析指令 → 内网安全校验与幂等执行 → 脱敏回传结果**”的安全闭环架构。

### 1.2 核心技术栈
- **核心框架**：Python 3.10+、FastAPI、Uvicorn、Pydantic v2 / Settings
- **数据持久化与事务**：SQLAlchemy ORM、SQLite (WAL 模式并发控制、乐观排他锁)
- **并发与后台任务**：多线程守护轮询引擎（ThreadPoolExecutor + Daemon Thread）、指数退避带抖动（Exponential Backoff with Jitter）
- **安全与密码学**：HMAC-SHA256 指令验签、HS256 动态短期 JWT 鉴权（CoreAgent Portal 密钥生成）、字段级数据脱敏（Result Sanitizer）
- **高可用与一致性**：多级幂等日志（`action_id + idempotency_key + payload_sha256`）、知识库快照分布式租约锁（Corpus Snapshot Lease Lock）

### 1.3 关键代码架构与职责映射
| 核心模块 / 文件路径 | 架构分层职责 | 关键设计机制 |
|-------------------|------------|------------|
| `backend/app/services/polling_daemon.py` | 后台轮询守护进程 | 支持 `POLL_WORKERS` 并发调度，基于状态机驱动中继任务生命周期 |
| `backend/app/services/polling_scheduler.py` | 核心轮询与指令执行引擎 | 动态退避抖动、背压（Backpressure 429）处理、指令拉取与编排 |
| `backend/app/services/action_validator.py` | 安全策略与指令校验器 | HMAC-SHA256 签名防篡改、租户/知识库权限校验、资源归属动态绑定校验 |
| `backend/app/services/action_journal_service.py` | 动作执行幂等日志服务 | 数据库防重日志、执行状态追踪、失败阻断与故障恢复 |
| `backend/app/services/snapshot_lock_service.py` | 知识库快照并发控制 | 租约过期乐观互斥锁，保障多任务提交 Snapshot 时的一致性与线性化 |
| `backend/app/services/ca_adapter.py` | CoreAgent 知识库底层适配层 | 封装建文档、分块增删改、树形结构维护与版本快照提交 |
| `backend/app/services/result_sanitizer.py` | 数据安全与隐私脱敏 | 出站结果敏感信息过滤，仅对外暴露 Public 最小必要元数据 |

---

## 2. 简历项目经验描述提炼 (STAR 法则)

### 📌 版本一：资深后端 / Python 全栈开发工程师（侧重工程实现与健壮性）

- **项目名称**：企业级内网知识库智能文档中继与执行引擎 (Litong Doc CA Adapter)
- **核心角色**：核心后端研发
- **项目背景 (Situation)**：
  政企核心知识库 (CoreAgent) 部署于内网物理隔离环境，公网大模型文档解析服务无法直连内网。需要构建一套低延迟、高可靠的内网受限执行器，承载内网大批量公文/政策文档的上传中继与解析指令安全落地。
- **核心任务 (Task)**：
  主导内网同步执行器的核心架构研发，攻克内网单向出站通信、公网指令安全验签、长耗时任务多线程轮询与高并发幂等入库等关键难题。
- **技术行动 (Action)**：
  1. **单向出站与并发轮询调度**：设计反向轮询架构（Outbound-Only），基于多线程 Worker 守护进程实现多任务并行轮询；引入带 Jitter 的指数退避算法与 429 背压动态调速，降低网络与服务器负载达 60% 以上。
  2. **端到端安全防御体系**：实现基于 HMAC-SHA256 的指令防篡改验签与动态绑定（CA Binding）鉴权；基于本地密钥按需派发生效期可控的短期 HS256 JWT，阻断内网凭证泄露风险；构建出站结果脱敏管道（Result Sanitizer）。
  3. **严格幂等与并发控制**：设计以 `action_id + idempotency_key + payload_sha256` 为复合键的动作流水日志（Action Journal），结合 SQLite WAL 事务机制确保网络抖动/重试下绝对零脏写；实现基于租约超时（Lease Lock）的快照并发互斥锁。
- **产出结果 (Result)**：
  系统稳定承载数万篇公文与政策规范的高保真分块同步，端到端执行成功率达 99.9%，在内网 0 暴露端口前提下实现高并发毫秒级指令响应。

---

### 📌 版本二：技术专家 / 架构师视角（侧重系统架构、安全协议与分布式一致性）

- **项目名称**：安全隔离区知识图谱受限执行数据面 (Internal CA Sync Service)
- **核心角色**：系统架构师 / 技术负责人
- **项目背景 (Situation)**：
  在多租户高密内网场景下，公网 AI 算力与私网敏感知识库存在不可调和的安全边界冲突。系统需在网络零信任（Zero Trust）前提下，保障指令执行的绝对受控、强一致性及灾难自动隔离。
- **技术架构与决策 (Architectural Actions)**：
  1. **零信任反向控制流架构**：确立“控制流反转”协议，公网解析器退化为无状态计算算子，由内网执行器主动发起出站 HTTP/mTLS 会话。内网永远不开放入站端口，根除公网越权探测风险。
  2. **指令级细粒度沙箱与双向契约**：摒弃泛化 RPC，收敛出固定 7 种原子指令（CreateDoc/AddChunks/Snapshot 等）；建立签名验签、租户边界校验、资源生命周期绑定的三重安防管道，阻止非法跨租户横向越权。
  3. **基于快照树的线性一致性保证**：设计基于版本快照（Snapshot Commit）的双层锁机制，通过本地 SQLite 租约锁防本节点竞争，配合底层 Forest 知识库乐观 CAS 比对，解决多文档并发合并时的快照分叉冲突。
- **业务价值 (Result)**：
  成功打通内网文档知识库与外部公网大模型流水线的安全断点，成为企业通过等保三级与数据安全评估的核心架构标杆，支撑集团多个百亿级向量知识库的持续增量演进。
