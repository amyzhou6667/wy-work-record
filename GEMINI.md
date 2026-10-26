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
  2. **TRD 方案设计与接口契约先行**：产出 TRD 至 `projects/<项目名称>/docs/trd/TRD-<项目名称>.md`，**强制使用 TypeScript 声明接口契约与数据模型**；
  3. **微任务拆解**：产出任务清单至 `projects/<项目名称>/docs/trd/tasks-<项目名称>.md`；
  4. **全局强制 TypeScript (TS) 规约**：
     - **凡涉及 JavaScript/Node.js/前端/脚本/CLI 的内容，强制且固定采用 TypeScript (.ts/.tsx)**，严禁新建或回退为 JavaScript (.js)；
     - 启动项目与执行脚本一律使用 TS 运行时指令（如 Node 22.6+ 原生 TS 支持、tsx 等），测试命令一律为 `*.test.ts`；
  5. **全局强制现代前端框架规约 (Vue / React + TS)**：
     - **凡涉及前端 Web、H5、移动端 UI、可视化控制台或交互界面的开发，强制且固定采用 Vue 3 或 React 实现组件化与状态驱动（搭配 TypeScript，即 `.vue` + TS 或 `.tsx`）**；
     - **严禁新建或回退为纯原生 HTML + 原生 JS/DOM 操控的裸页面**，彻底避免后续项目使用裸 HTML 堆砌交互；
     - 前端工程须支持离线/内网免外部强依赖（支持本地 vendor 或开箱即用运行时），确保局域网与内网环境高可用；
  6. **上下文隔离 TDD 编码**：在 `projects/<项目名称>/src/` 编写 TypeScript 代码，坚持测试先行（Red）与开发隔离（Green）；
  7. **0 失败门禁与原子文档提交**：测试 100% 通过，文档与代码在同一个 Commit 提交。

### 3. 缺陷修复阶段指令 (Bug-Fix 视角)
当用户反馈 Bug、报错、异常或功能失效时：
- 严格遵循 `.agents/skills/bug-fix-workflow/` 技能规范：
  1. **精准复现定位根因**：优先通过最小可执行命令/脚本或断言复现故障，捕获底层真实报错与堆栈，禁止未经复现盲猜改代码；
  2. **测试用例先行 (Red)**：若模块已有测试文件（`*.test.ts`），**必须先在测试文件中新增或修改测试用例**，精确复现故障并验证其运行失败（红灯）；若无测试文件则先建立测试基线；
  3. **针对性修复 (Green)**：修改业务源码根除缺陷，验证测试用例转绿；
  4. **全量回归防御**：执行所属项目全量测试套件（`node --test ...`），确保 100% 通过（0 失败门禁）。

### 4. 项目库归档规范
所有项目均独立保存在 `projects/<项目名称>/` 目录下，包含独立的 README、docs（prd/trd）与 src 目录。
- **技术栈固化**：
  - **后端/脚本/CLI**：统一固定为 TypeScript (`.ts`)，必须配置标准 `tsconfig.json`；
  - **前端/Web/UI**：统一固定为 **Vue 3 或 React**（配合 TypeScript，即 `.vue` 或 `.tsx`），禁止纯原生 HTML 交互实现。


