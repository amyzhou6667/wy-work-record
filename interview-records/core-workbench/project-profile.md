# 项目总览与简历提炼：CorePilot Workbench (core-workbench)

## 一、 项目全景画像 (Project Overview)

### 1. 业务定位与价值
CorePilot Workbench 是面向企业级复杂业务场景打造的 **AI Agent 宿主工作台与跨应用接入 SDK (Code Bridge)**。它旨在为上层应用快速赋能多 Agent 协同能力，打通应用宿主与 Agent 底座的双向事件通信通道（Code Bridge / HITL 人机协同），支持复杂工作流交互（审批流、工具调用、卡片渲染、资源挂载、SSE 流式响应与会话生命周期管理）。

### 2. 核心架构与技术栈
- **项目组织**：pnpm Monorepo 架构（TypeScript 5.x 全链路）
  - `@core-pilot/client-vue`：基于 Vue 3 + TSX + Element Plus + Less 的高质量 Agent 交互 UI 组件库（会话气泡、意图列表、任务侧边栏、卡片渲染器、资源市场/选配器、Markdown 动态流式渲染等）。
  - `@core-pilot/sdk`：框架无关的 Vanilla JS/TS SDK 核心库，采用分层架构与依赖注入（AuthManager、MountManager、HitlManager、EventHub、ProtocolAdapters），底层采用 Zustand/vanilla 进行高性能无框架绑定状态管理。
  - `playground/client` & `playground/server`：基于 Vue 3 与 NestJS 的真实业务端到端验证环境。
- **通信与协议层**：
  - 支持多协议抽象适配器（CoreAgent 协议、A2A 跨 Agent 交互协议、Dify 协议等）。
  - SSE (Server-Sent Events) 长连接双工流式推送，独创 `sseSessionId` 代次机制与会话隔离机制防串流。
- **工程治理与质量门控**：
  - 基于 Vitest 的单元与集成测试套件，Git Pre-commit 变更包增量与全量自动化门禁（`scripts/precheck.mjs`）。
  - 上下文隔离开发规范（Interface First + TDD 并行闭环），OCR 检视回流闭环。

---

## 二、 简历项目经验描述提炼 (STAR 法则)

### 🎯 版本 A：资深前端 / 全栈研发工程师 (Senior Dev)

- **项目名称**：CorePilot 企业级 AI Agent 交互工作台与跨应用集成 SDK
- **项目角色**：核心研发工程师 / SDK 架构主力
- **情境 (Situation)**：
  企业内部多个业务系统急需接入大模型与自主智能体能力，但各业务线前端技术栈多样、自研成本高，且缺乏统一的流式通信规范、人机交互协同 (HITL) 协议与统一的 Agent UI 规范。
- **任务 (Task)**：
  主导设计并实现轻量级、跨框架的 `@core-pilot/sdk` 核心库及 `@core-pilot/client-vue` 组件库，提供开箱即用的浮窗/抽屉/嵌入式挂载能力，打通宿主应用与 Agent 的全双工双向事件通信机制。
- **行动 (Action)**：
  1. **协议层与流式通信设计**：基于适配器模式（Adapter Pattern）设计通信协议层，统一抽象 CoreAgent 与 A2A 协议；针对 SSE 流式响应在高频切会话场景下的数据竞争与串写缺陷，创新性设计了基于代次（Generation Token, `sseSessionId`）与会话 ID 双重校验的并发流隔离策略，彻底根除了前端切会话串字与脏渲染问题。
  2. **状态与宿主解耦**：选用 Zustand/vanilla 构建框架无关的核心状态中心，解耦 UI 渲染与通信底层，使 SDK 具备无缝嵌入任意原生 JS、React 或 Vue 宿主的能力。
  3. **人机协同 (HITL) 闭环**：基于 EventHub 实现事件驱动的双向 Code Bridge，支持 Agent 运行时挂起并向宿主触发异步审批/用户确认，并在宿主用户处理完成后唤醒 Agent 恢复执行链路。
  4. **工程质量保障**：落地基于 Vitest 的 TDD 单测体系，编写 Git Hooks 自动触发改动包的测试验证，确保核心通信逻辑与协议解析用例覆盖率达 85% 以上。
- **结果 (Result)**：
  SDK 在多个业务系统落地接入，接入耗时从原有数人天降至 10 分钟开箱即用；保障了百万级会话流式交互 0 串流事故，核心组件单元测试覆盖率达标且保持 0 缺陷发布。

---

### 🏛️ 版本 B：前端技术专家 / 架构师 (Staff Engineer / Architect)

- **项目名称**：CorePilot 企业级 AI Agent 工作台架构与跨宿主 SDK 体系
- **项目角色**：前端架构师 / 技术负责人
- **情境 (Situation)**：
  随着企业业务全线拥抱大模型与多智能体（Multi-Agent），缺乏一个标准化、低侵入、协议解耦的客户端集成基建，面临协议多变、多框架兼容难度大、高频长连接状态容易失控、多团队协作缺乏契约标准等架构痛点。
- **任务 (Task)**：
  从零到一主导设计 CorePilot Workbench 前端微架构与 SDK 规范，建立契约驱动的多 Agent 协同规范、协议适配抽象层、安全沙箱与自动化测试门禁体系。
- **行动 (Action)**：
  1. **分层解耦架构设计**：采用 Clean Architecture 思想建立四层架构体系（UI 呈现层、状态与业务编排层、协议与网络适配层、宿主桥接层），抽象出标准 `AgentAdapter` 契约，使底层协议（CoreAgent / A2A / Dify）的插拔替换对上层 UI 零感知。
  2. **并发与高可用治理**：深度治理长连接 SSE 流式响应的弱网断线重连、背压缓冲与多会话快速切换场景，采用代次标记法消除异步竞态条件；设计了全局生命周期管理体系（Mount / Unmount / Reload / Destroy），杜绝 DOM 与全局事件监听器引起的内存泄漏。
  3. **研发效能与工程标准**：在团队内推行“接口先行 + 上下文隔离 TDD”研发标准，设立 0 失败提交门禁与自动化预检流；搭建 Monorepo 模块化发包与多环境 Playground 真实链路验证脚手架。
- **结果 (Result)**：
  成功支撑企业级 AI 工作台从 0 到 1 的规范化演进，支撑 10+ 业务线快速接入 Agent 能力，团队研发与协作人效提升 40%，实现 100% 测试门控合规与端到端交付高质量闭环。
