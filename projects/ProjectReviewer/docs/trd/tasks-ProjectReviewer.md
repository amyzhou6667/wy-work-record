# 【研发微任务拆解】ProjectReviewer - 微任务清单 (Tasks)

| 项目名称 | 负责人 | 规划总工时 | 关联 TRD |
| :--- | :--- | :--- | :--- |
| ProjectReviewer | Dev Superpower Team | 5 个迭代微阶段 | [TRD-ProjectReviewer.md](TRD-ProjectReviewer.md) |

---

## 阶段一：工程脚手架与基础契约类型定义 (Infra & Types)

- [x] **Task 1.1**：创建工程配置文件与 TypeScript 配置
  - **路径**：`projects/ProjectReviewer/package.json`, `tsconfig.json`
  - **验收标准**：配置 ES2022/NodeNext，配置 `npm test` 为 `node --test tests/*.test.ts`，配置 `bin` 执行命令为 `./src/cli.ts`。
- [x] **Task 1.2**：声明领域数据模型与服务接口签名契约
  - **路径**：`projects/ProjectReviewer/src/types/index.ts`
  - **验收标准**：完整包含 `ProjectMetadata`, `TopicAgenda`, `AnswerRecord`, `TopicSessionRecord`, `DimensionScores`, `ReviewReport`, `ReviewerOptions` 及核心服务接口。

---

## 阶段二：代码解析与项目特征感知模块 (TDD: ProjectScanner)

- [x] **Task 2.1**：编写 `ProjectScanner` 单元测试基线 (Red)
  - **路径**：`projects/ProjectReviewer/tests/scanner.test.ts`
  - **用例**：
    1. 测试扫描空目录/无效路径时的错误防御拦截；
    2. 测试扫描标准前端/Node/Go 项目时，自动提取包名、依赖与 keyFiles；
    3. 测试自动过滤 `.git`、`node_modules`、`dist` 等黑名单目录；
    4. 测试获取指定文件代码片段 (maxLines 保护)。
- [x] **Task 2.2**：实现 `ProjectScanner` 业务代码 (Green)
  - **路径**：`projects/ProjectReviewer/src/services/scanner.ts`
  - **验收标准**：`scanner.test.ts` 全部通过（100% 成功）。

---

## 阶段三：单步自适应面试引擎与状态机 (TDD: InterviewEngine)

- [x] **Task 3.1**：编写 `InterviewEngine` 单元测试基线 (Red)
  - **路径**：`projects/ProjectReviewer/tests/engine.test.ts`
  - **用例**：
    1. 测试基于项目元数据自动生成 5 个主考点大纲（覆盖架构、并发、核心逻辑等）；
    2. 测试单步（一来一回）流转：获取当前问题，提交回答；
    3. 测试自适应追问（针对关键字触发 1~2 层 follow-up）；
    4. 测试“跳过/不会”时的低分记录与平滑切题；
    5. 测试 `/exit` 中途退出（未满 2 题取消 vs 满 2 题提示阶段结算）。
- [x] **Task 3.2**：实现 `InterviewEngine` 业务逻辑 (Green)
  - **路径**：`projects/ProjectReviewer/src/services/engine.ts`
  - **验收标准**：`engine.test.ts` 全部通过。

---

## 阶段四：四维加权评分与标杆复盘生成 (TDD: Evaluator & Storage)

- [x] **Task 4.1**：编写 `ReviewEvaluator` 与 `ReportStorage` 单元测试 (Red)
  - **路径**：`projects/ProjectReviewer/tests/evaluator.test.ts`, `projects/ProjectReviewer/tests/storage.test.ts`
  - **用例**：
    1. 测试加权评分算法计算及 S/A/B/C 等级判定；
    2. 测试逐题生成“大厂标准高分范例回答 (Best Practice)”；
    3. 测试复盘文件自动落盘到统一目录 `./interview-records/<项目名>/`；
    4. 测试控制台卡片格式化输出。
- [x] **Task 4.2**：实现 `ReviewEvaluator` 与 `ReportStorage` (Green)
  - **路径**：`projects/ProjectReviewer/src/services/evaluator.ts`, `projects/ProjectReviewer/src/services/storage.ts`
  - **验收标准**：`evaluator.test.ts` 与 `storage.test.ts` 全部通过。

---

## 阶段五：CLI 交互串联与端到端集成 (CLI & Integration)

- [x] **Task 5.1**：实现 CLI 命令行入口与交互主流程
  - **路径**：`projects/ProjectReviewer/src/cli.ts`
  - **功能**：
    1. 解析命令行参数（路径/URL、`--mode`、`--retry`、`--next`）；
    2. 驱动 readline 与用户交互，单步打印面试官发言，接收回答；
    3. 输出最终复盘摘要与保存路径。
- [x] **Task 5.2**：编写端到端集成测试
  - **路径**：`projects/ProjectReviewer/tests/integration.test.ts`
  - **验收标准**：全流程打通，全量测试套件（`npm test`）0 失败全部通过。
- [x] **Task 5.3**：编制项目 README 与使用演示
  - **路径**：`projects/ProjectReviewer/README.md`
