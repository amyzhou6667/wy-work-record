# 仓库全局规则与工作流指令 (GEMINI.md)

本仓库采用“**三位一体**”结构化体系：
1. **产品工作流 (`workflows/product/`)**：负责从构想输入、Superpower 问答拆解到 PRD 产出。
2. **开发工作流 (`workflows/development/`)**：负责从 PRD、TRD 架构设计、微任务拆解到 TDD 编码实现。
3. **项目库 (`projects/`)**：存放具体项目的需求文档、技术方案与源代码（如 `projects/AgentRelay/`）。

---

## 智能体协作行为规范

### 1. 产品阶段指令 (产品经理视角)
当用户提出新构想或产品需求时：
- 严格遵循 `workflows/product/` 下的 Superpower 问答拆解方法。
- 严禁未经问答对齐直接编写 PRD 或代码。
- 3 轮问答对齐后，统一将 PRD 产出至：`projects/<项目名称>/docs/prd/PRD-<项目名称>.md`。

### 2. 开发阶段指令 (研发视角)
当用户输入 `/dev-flow <PRD路径或项目名>`，或指示“根据 PRD 进行开发”时：
- 严格遵循 `workflows/development/` 下的工程闭环自动推进：
  1. **环境预检与风险门控**：检查工作区与安全合规；
  2. **TRD 方案设计与接口契约先行**：产出 TRD 至 `projects/<项目名称>/docs/trd/TRD-<项目名称>.md`，锁定接口签名契约；
  3. **微任务拆解**：产出任务清单至 `projects/<项目名称>/docs/trd/tasks-<项目名称>.md`；
  4. **上下文隔离 TDD 编码**：在 `projects/<项目名称>/src/` 编写代码，坚持测试先行（Red）与开发隔离（Green）；
  5. **0 失败门禁与原子文档提交**：测试 100% 通过，文档与代码在同一个 Commit 提交。

### 3. 项目库归档规范
所有项目均独立保存在 `projects/<项目名称>/` 目录下，包含独立的 README、docs（prd/trd）与 src 目录。
