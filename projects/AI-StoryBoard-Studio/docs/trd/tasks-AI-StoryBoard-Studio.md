# 【研发微任务拆解与测试计划】AI-StoryBoard-Studio V2.0 多智能体工作流

| 责任人 | 关联 PRD | 关联 TRD | 预估周期 | 状态 |
| :--- | :--- | :--- | :--- | :--- |
| 全栈研发工程师 | [PRD-AI-StoryBoard-Studio.md](../prd/PRD-AI-StoryBoard-Studio.md) | [TRD-AI-StoryBoard-Studio.md](TRD-AI-StoryBoard-Studio.md) | 2 ~ 3 天 | ✅ 已完成 (36/36 测试 100% 通过) |

---

## 🎯 微任务拆解原则与 TDD 规范
- **微任务粒度**：每个小任务控制在 2~5 分钟内完成代码与独立自动化测试用例验证；
- **严格遵循 TypeScript 全栈规范**：严禁新建 `.js`，统一固定为 `.ts` 与 `.tsx`；
- **上下文隔离与测试先行 (Red ➡️ Green ➡️ Refactor)**：先编写针对 Agent 接口契约的失败用例（Red），再实现业务代码（Green）；
- **0 失败门禁**：执行 `node --test projects/AI-StoryBoard-Studio/tests/*.test.ts` 必须 100% 通过（0 Failures）。

---

## 📝 微任务清单 (Task Checklist)

### 阶段一：领域契约与工作流上下文基础设施 (Contracts & Context)
- [x] **Task 1.1: 建立工作流与 Agent 领域模型 TypeScript 契约**
  - **改动范围**：`projects/AI-StoryBoard-Studio/src/types/workflow.ts`
  - **目标**：声明 `PipelineStage`, `StageStatus`, `AgentPluginConfig`, `SceneAsset`, `ScriptScene`, `WorkflowPipelineContext` 等全量类型。
  - **验收命令**：`node --test projects/AI-StoryBoard-Studio/tests/*.test.ts`

---

### 阶段二：四大可插拔 Agent 引擎与流水线调度器 TDD (Pure TS Engines)
- [x] **Task 2.1: 资产提取 Agent (AssetExtractorAgent) TDD 闭环**
  - **测试用例 (Red)**：`tests/workflowEngine.test.ts` (TC-WF-01)
  - **功能目标**：从小说中提取人物外貌、服装特征与场景光影，支持大模型提取及本地离线规则实体保底。
  - **实现文件**：`src/engines/agents/assetExtractor.ts`
- [x] **Task 2.2: 剧本改编 Agent (ScriptwriterAgent) TDD 闭环**
  - **测试用例 (Red)**：`tests/workflowEngine.test.ts` (TC-WF-02)
  - **功能目标**：将网文改写为标准影视短剧场次（内/外景、时标、动作描写、角色带情绪台词），支持断句离线保底。
  - **实现文件**：`src/engines/agents/scriptwriter.ts`
- [x] **Task 2.3: 镜头切分 Agent (DirectorShotAgent) TDD 闭环**
  - **测试用例 (Red)**：`tests/workflowEngine.test.ts` (TC-WF-03)
  - **功能目标**：将剧本转化为视听分镜（景别、运镜、时长、台词对白），支持包装 DocParserEngine 离线保底。
  - **实现文件**：`src/engines/agents/directorShot.ts`
- [x] **Task 2.4: 生图 Prompt Agent (VisualPromptAgent) TDD 闭环**
  - **测试用例 (Red)**：`tests/workflowEngine.test.ts` (TC-WF-04)
  - **功能目标**：融合角色资产库 Trigger 与镜头构图，生成 MJ/Flux/即梦三模型高精度生图词。
  - **实现文件**：`src/engines/agents/visualPrompt.ts`
- [x] **Task 2.5: 流水线调度引擎 (WorkflowEngine) TDD 闭环**
  - **测试用例 (Red)**：`tests/workflowEngine.test.ts` (TC-WF-05, TC-WF-06)
  - **功能目标**：实现 `runAll`、`runStage`、跳过直通穿透、上游脏状态变更检测与增量重跑。
  - **实现文件**：`src/engines/workflowEngine.ts`

---

### 阶段三：服务端 REST API 集成
- [x] **Task 3.1: 扩展工作流专属 REST API**
  - **改动范围**：`src/server.ts`
  - **功能目标**：增加 `POST /api/v1/workflow/run-all` 与 `POST /api/v1/workflow/run-stage` 路由，保留向后兼容接口。
  - **测试验收**：`tests/webUi.test.ts`

---

### 阶段四：前端现代化工作台交互改造 (React + AntD + TS)
- [x] **Task 4.1: 顶部横向流水线节点看板 (Pipeline Stepper)**
  - **改动范围**：`src/ui/app.tsx`
  - **功能目标**：展示 4 大 Agent 节点状态胶囊（待处理/运行中/就绪/跳过），支持一键全流水线执行与单步运行。
- [x] **Task 4.2: 可插拔 Agent 配置工坊弹窗 (Agent Hub Modal)**
  - **改动范围**：`src/ui/app.tsx`
  - **功能目标**：可视化管理 4 个 Agent 的独立 LLM 模型、Key、开关与预设 Prompt 模板。
- [x] **Task 4.3: 双栏自适应节点专属工作台视图**
  - **改动范围**：`src/ui/app.tsx`
  - **功能目标**：切换工作流节点时，右栏自适应展示资产列表、剧本排版、镜头卡片流；支持上游变更黄色脏标记与增量更新。
- [x] **Task 4.4: Prompt 视窗模态弹窗与物料导出中心**
  - **改动范围**：`src/ui/app.tsx`
  - **功能目标**：保持卡片弹窗化触发，显式深黑高对比度，全物料（角色包、剧本、分镜母表、Prompt、SRT）一键打包下载。

---

### 阶段五：全量回归与 0 失败门禁
- [x] **Task 5.1: 执行全量自动化测试套件**
  - **命令**：`node --test projects/AI-StoryBoard-Studio/tests/*.test.ts`
  - **准则**：100% 通过（0 Failures）。
- [x] **Task 5.2: 原子性 Git 提交**
  - **准则**：文档与代码同 Commit 提交。
