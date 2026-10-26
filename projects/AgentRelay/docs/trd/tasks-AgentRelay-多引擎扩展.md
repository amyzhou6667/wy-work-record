# 【研发实施任务拆解与测试计划】AgentRelay 多 AI 引擎扩展

| 责任人 | 关联 PRD | 关联 TRD | 当前状态 |
| :--- | :--- | :--- | :--- |
| 研发团队 | [PRD 链接](../prd/PRD-AgentRelay-多引擎插件扩展.md) | [TRD 链接](./TRD-AgentRelay-多引擎插件架构.md) | **全量通过 (Passed 32/32)** |

---

## 🎯 微任务清单 (Task Breakdown Checklist - 2~5分钟粒度)

### 阶段一：领域接口契约与配置基础
- [x] **Task 1.1: 领域模型与适配器接口契约定义**
  - **文件**：`projects/AgentRelay/src/types/engine.ts`
  - **工作内容**：实现 `IEngineAdapter`, `EnginePluginConfig`, `RelaySession`, `PendingDecision`, `DecisionOption`, `DecisionCommand` 等纯 TS 类型签名。
- [x] **Task 1.2: 声明式引擎配置文件构建**
  - **文件**：`projects/AgentRelay/config/engines.json`
  - **工作内容**：创建初始配置文件，配置 `antigravity`, `dsh`, `claude` 的默认参数与匹配规则。

### 阶段二：引擎管理器与热重载 (EngineManager - TDD: Red-Green)
- [x] **Task 2.1: 编写 EngineManager 测试用例 (Red)**
  - **测试文件**：`projects/AgentRelay/tests/engine_manager.test.ts`
  - **覆盖场景**：读取合法配置、非法配置报错、动态注册适配器、监听文件修改并热重载生效。
- [x] **Task 2.2: 实现 EngineManager (Green)**
  - **实现文件**：`projects/AgentRelay/src/engine/manager.ts`
  - **验收命令**：`node --test projects/AgentRelay/tests/engine_manager.test.ts` (3/3 通过)

### 阶段三：Claude Code 适配器封装与规范化
- [x] **Task 3.1: 编写 ClaudeAdapter 单元测试 (Red)**
  - **测试文件**：`projects/AgentRelay/tests/claude_adapter.test.ts`
  - **覆盖场景**：检测 Claude 工作区指纹、启动监听、解析提问并映射为 `PendingDecision`。
- [x] **Task 3.2: 实现 ClaudeAdapter (Green)**
  - **实现文件**：`projects/AgentRelay/src/engine/adapters/claude.ts`
  - **验收命令**：`node --test projects/AgentRelay/tests/claude_adapter.test.ts` (3/3 通过)

### 阶段四：Antigravity 专有适配器 (AntigravityAdapter - TDD: Red-Green)
- [x] **Task 4.1: 编写 AntigravityAdapter 单元测试 (Red)**
  - **测试文件**：`projects/AgentRelay/tests/antigravity_adapter.test.ts`
  - **覆盖场景**：模拟解析 `transcript.jsonl` 中的 `ask_question` 工具调用，成功提取题目、单/多选标识与候选项。
- [x] **Task 4.2: 实现 AntigravityAdapter (Green)**
  - **实现文件**：`projects/AgentRelay/src/engine/adapters/antigravity.ts`
  - **验收命令**：`node --test projects/AgentRelay/tests/antigravity_adapter.test.ts` (2/2 通过)

### 阶段五：DeepSeek Harness (dsh) 适配器 (DshAdapter - TDD: Red-Green)
- [x] **Task 5.1: 编写 DshAdapter 单元测试 (Red)**
  - **测试文件**：`projects/AgentRelay/tests/dsh_adapter.test.ts`
  - **覆盖场景**：输入 ANSI 终端流、静默检测判定、正则匹配 `[y/n]` 与数字选项、生成决策卡片、stdin 注入。
- [x] **Task 5.2: 实现 DshAdapter (Green)**
  - **实现文件**：`projects/AgentRelay/src/engine/adapters/dsh.ts`
  - **验收命令**：`node --test projects/AgentRelay/tests/dsh_adapter.test.ts` (3/3 通过)

### 阶段六：多会话路由器与双端防竞争 (SessionRouter - TDD: Red-Green)
- [x] **Task 6.1: 编写 SessionRouter 测试用例 (Red)**
  - **测试文件**：`projects/AgentRelay/tests/router_deconflict.test.ts`
  - **覆盖场景**：多引擎 Session 路由分发、手机端指令路由至目标 Session、本地推进时自动触发撤销事件。
- [x] **Task 6.2: 实现 SessionRouter (Green)**
  - **实现文件**：`projects/AgentRelay/src/engine/router.ts`
  - **验收命令**：`node --test projects/AgentRelay/tests/router_deconflict.test.ts` (3/3 通过)

### 阶段七：移动端控制台升级 (React + TSX)
- [x] **Task 7.1: 更新 React 移动端自适应决策与多任务看板**
  - **实现文件**：`projects/AgentRelay/src/web/App.tsx`, `projects/AgentRelay/src/web/index.tsx`, `styles.css`
  - **特性**：顶部多任务横滑卡片、动态单选/多选/Y-N 表单渲染、防抖提交与撤回动画。
- [x] **Task 7.2: 编写 Web UI 托管与静态资源测试**
  - **测试文件**：`projects/AgentRelay/tests/web_ui.test.ts`
  - **验收命令**：`node --test projects/AgentRelay/tests/web_ui.test.ts` (3/3 通过)

### 阶段八：全链路 CLI 集成与 0 失败门禁
- [x] **Task 8.1: 更新 CLI 入口支持多引擎选择**
  - **实现文件**：`projects/AgentRelay/src/cli.ts`
  - **参数支持**：`relay watch <dir> --engine auto|antigravity|dsh|claude`
- [x] **Task 8.2: 全量测试集回归与门禁验收**
  - **验收命令**：`node --test projects/AgentRelay/tests/*.test.ts` (32/32 全量通过，0 Failures)。
