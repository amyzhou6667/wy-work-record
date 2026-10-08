---
name: dev-superpower-workflow
description: >-
  面向研发工程师与架构师的端到端开发工作流。在 PRD 确定后，执行架构方案设计 (TRD)、
  微任务拆解 (2~5分钟粒度) 与测试驱动开发 (TDD: 红-绿-重构) 工程闭环。
---

# 研发 Superpower 工程化工作流

本技能遵循 Superpower 7 步工程化闭环规范，严格落实工业级软件工程纪律：

## 执行全流程

1. **环境预检与风险门控**：
   - 检查 Git 状态、测试基线、依赖环境（参考 `workflows/development/environment-precheck.md`）。
   - 识别操作风险等级，破坏性操作需经确认并提供降级方案（参考 `workflows/development/risk-gate.md`）。
2. **TRD 架构设计与接口契约先行**：
   - 优先产出**接口签名契约**（方法名、入参、出参、异常、实体结构），编写 TRD（参考 `workflows/development/templates/trd-template.md`）。
3. **上下文隔离开发 (Context Isolation)**：
   - **Code-Dev 角色**：基于接口契约与验收标准实现代码，**严禁偷读测试实现代码**。
   - **TDD 角色**：基于接口契约编写测试用例，**严禁篡改业务源码**。
4. **系统化调试排查**：
   - 遇到 Bug 按五步走：复现 ➡️ 至少 2 个假设 ➡️ 最小验证实验 ➡️ 锁定根因 ➡️ 编写回归测试修复。
5. **零容忍测试门禁 (0 Failures)**：
   - 0 失败 = 通过，>0 失败 = 不通过。严禁带着旧失败提交代码。
6. **原子文档同步与提交**：
   - 凡新增类/模块、改接口、改模型、改功能边界，必须在**同一个 Git Commit** 中同时提交代码与更新后的文档（参考 `workflows/development/doc-sync.md`）。
