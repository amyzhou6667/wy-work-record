---
name: dev-superpower-workflow
description: >-
  面向研发工程师与架构师的端到端开发工作流。在 PRD 确定后，执行架构方案设计 (TRD)、
  微任务拆解 (2~5分钟粒度) 与测试驱动开发 (TDD: 红-绿-重构) 工程闭环。
---

# 研发 Superpower 工程化工作流

本技能遵循 Superpower 7 步工程化闭环规范，指导智能体与工程师从 PRD 出发完成高质量代码落地：

1. **TRD 技术方案设计**：基于 PRD 输出清晰的数据模型、接口契约与容灾方案（参考 `workflows/development/templates/trd-template.md`）。
2. **微任务拆解 (Plan)**：将开发任务拆解为原子化、可独立运行测试命令验证的子任务（参考 `workflows/development/templates/task-breakdown-template.md`）。
3. **TDD 实施 (Execute)**：严格执行 Red（先写测试） -> Green（最小实现） -> Refactor（重构优化）。
4. **验证与合规 (Verify)**：确保无敏感信息泄露，核心用例覆盖率达标。
