# 【研发实施任务拆解与测试计划】AgentRelay MVP

| 责任人 | 关联 PRD | 关联 TRD | 当前状态 |
| :--- | :--- | :--- | :--- |
| 研发团队 | [PRD 链接](../prd/PRD-AgentRelay-远程AI任务伴侣.md) | [TRD 链接](./TRD-AgentRelay-技术架构方案.md) | 全部完成 (Passed 9/9) |

---

## 🎯 微任务清单 (Task Breakdown Checklist)

### 阶段一：领域契约与 Prompt 阻断检测器 (TDD 核心)
- [x] **Task 1.1: 基础实体与接口签名契约定义**
  - **文件**：`projects/AgentRelay/src/types/index.js`
  - **内容**：实现 `RelayTask`, `TaskStatus`, `PromptPayload`, `IPromptDetector` 枚举与结构。
- [x] **Task 1.2: ANSI 终端转义字符脱敏清洗器 (TDD: Red-Green)**
  - **测试文件**：`projects/AgentRelay/tests/ansi.test.js`
  - **实现文件**：`projects/AgentRelay/src/detector/ansi.js`
  - **验收命令**：`node --test projects/AgentRelay/tests/ansi.test.js` (通过)。
- [x] **Task 1.3: 终端静止与 Prompt 正则检测引擎 (TDD: Red-Green)**
  - **测试文件**：`projects/AgentRelay/tests/detector.test.js`
  - **实现文件**：`projects/AgentRelay/src/detector/index.js`
  - **验收命令**：`node --test projects/AgentRelay/tests/detector.test.js` (通过)。

### 阶段二：云端同步客户端与状态机
- [x] **Task 2.1: 模拟与真实云端同步适配器 (Cloud Sync Client)**
  - **测试文件**：`projects/AgentRelay/tests/cloud_sync.test.js`
  - **实现文件**：`projects/AgentRelay/src/client/sync.js`
  - **验收命令**：`node --test projects/AgentRelay/tests/cloud_sync.test.js` (通过)。

### 阶段三：CLI 包装器主进程与端到端闭环
- [x] **Task 3.1: 端到端交互模拟集成测试 (E2E Integration)**
  - **测试文件**：`projects/AgentRelay/tests/e2e.test.js`
  - **实现文件**：`projects/AgentRelay/src/session.js` / `projects/AgentRelay/src/cli.js`
  - **验收命令**：`node --test projects/AgentRelay/tests/e2e.test.js` (通过)。

### 阶段四：方案 A 手机端 H5 响应式卡片与轻量中继服务 (新交付)
- [x] **Task 4.1: 手机端 H5 响应式卡片前端**
  - **实现文件**：`projects/AgentRelay/src/web/index.html`
  - **特性**：微信小程序 UI 风格、自动震动提醒、一键 [同意Y]/[拒绝N]、最近 10 行日志抽屉、紧急刹车按钮。
- [x] **Task 4.2: 轻量级 HTTP 中继服务**
  - **测试文件**：`projects/AgentRelay/tests/server.test.js`
  - **实现文件**：`projects/AgentRelay/src/server/index.js`
  - **验收命令**：`node --test projects/AgentRelay/tests/server.test.js` (通过)。
- [x] **Task 4.3: CLI 自动集成 HTTP 中转与手机端访问地址打印**
  - **实测验证**：手机端与 PC 端真实通过 HTTP 完成提问接收与 `y` 决策回传闭环！
