# 【研发实施任务拆解与测试计划】AgentRelay MVP

| 责任人 | 关联 PRD | 关联 TRD | 当前状态 |
| :--- | :--- | :--- | :--- |
| 研发团队 | [PRD 链接](../prd/PRD-AgentRelay-远程AI任务伴侣.md) | [TRD 链接](./TRD-AgentRelay-技术架构方案.md) | 核心通过 (Passed 8/8) |

---

## 🎯 微任务清单 (Task Breakdown Checklist)

### 阶段一：领域契约与 Prompt 阻断检测器 (TDD 核心)
- [x] **Task 1.1: 基础实体与接口签名契约定义**
  - **文件**：`projects/AgentRelay/src/types/index.js`
  - **内容**：实现 `RelayTask`, `TaskStatus`, `PromptPayload`, `IPromptDetector` 枚举与结构。
  - **验收**：通过。
- [x] **Task 1.2: ANSI 终端转义字符脱敏清洗器 (TDD: Red-Green)**
  - **测试文件**：`projects/AgentRelay/tests/ansi.test.js`
  - **实现文件**：`projects/AgentRelay/src/detector/ansi.js`
  - **验收命令**：`node --test projects/AgentRelay/tests/ansi.test.js` (2/2 通过)。
- [x] **Task 1.3: 终端静止与 Prompt 正则检测引擎 (TDD: Red-Green)**
  - **测试文件**：`projects/AgentRelay/tests/detector.test.js`
  - **实现文件**：`projects/AgentRelay/src/detector/index.js`
  - **验收命令**：`node --test projects/AgentRelay/tests/detector.test.js` (3/3 通过)。
  - **目标**：能识别 `[Y/n]`、`?`、选择项，并正确返回脱敏 `PromptPayload`。

### 阶段二：云端同步客户端与状态机
- [x] **Task 2.1: 模拟与真实云端同步适配器 (Cloud Sync Client)**
  - **测试文件**：`projects/AgentRelay/tests/cloud_sync.test.js`
  - **实现文件**：`projects/AgentRelay/src/client/sync.js`
  - **验收命令**：`node --test projects/AgentRelay/tests/cloud_sync.test.js` (2/2 通过)。
  - **目标**：实现心跳、提问上报、指令拉取与消费确认。

### 阶段三：CLI 包装器主进程与端到端闭环
- [x] **Task 3.1: 端到端交互模拟集成测试 (E2E Integration)**
  - **测试文件**：`projects/AgentRelay/tests/e2e.test.js`
  - **实现文件**：`projects/AgentRelay/src/session.js` / `projects/AgentRelay/src/cli.js`
  - **验收命令**：`node --test projects/AgentRelay/tests/e2e.test.js` (1/1 通过)。
  - **目标**：模拟子进程输出提问，检测器拦截上报，远程指令注入后子进程顺利跑通。
