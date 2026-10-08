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
当对已有的 PRD 进行技术落地时：
- 严格遵循 `workflows/development/` 下的 TRD 方案设计与微任务拆解规范。
- 产出 TRD 至 `projects/<项目名称>/docs/trd/`。
- 编写代码至 `projects/<项目名称>/src/`，并遵循 TDD（先测试后实现）原则。

### 3. 项目库归档规范
所有项目均独立保存在 `projects/<项目名称>/` 目录下，包含独立的 README、docs（prd/trd）与 src 目录。
