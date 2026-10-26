# 💻 开发工作流 (Development Workflow)

本目录沉淀面向**工程师与技术架构师**的标准化技术方案设计、任务拆解、上下文隔离与测试驱动开发 (TDD) 工程化规范。

吸收并融合了先进的工程纪律：**环境预检、风险门控、接口签名契约先行、测试零容忍门控与原子文档同步**。

---

## 📌 核心工作流：Superpower 7 步工程闭环

在 PRD 评审完毕后，严禁未经设计直接编写业务代码，必须严格执行工程闭环：

```mermaid
flowchart TD
    Pre["0. 环境预检与风险门控<br/>(Environment Precheck & Risk Gate)"] --> Step1["1. PRD 需求消化与契约设计<br/>(产出接口签名契约)"]
    Step1 --> Step2["2. 架构设计与技术方案 (TRD)"]
    Step2 --> Step3["3. 微任务拆解 (2~5分钟粒度)"]
    Step3 --> Step4["4. 上下文隔离 TDD 循环<br/>(测试禁改业务 / 开发禁读测试)"]
    Step4 --> Step5["5. 系统化调试与修复<br/>(5 步根因排查，拒绝试错)"]
    Step5 --> Step6["6. 零容忍测试门禁<br/>(0 失败准则)"]
    Step6 --> Step7["7. 原子文档同步与提交<br/>(代码 + 文档 同一 Commit)"]
```

---

## 🛡️ 核心工程铁律一览

### 1. 接口签名契约先行与上下文隔离
- 需求/架构设计阶段首先产出**接口签名契约**（方法名、入参、出参、异常）。
- **隔离规则**：开发人员（Code-Dev）**严禁偷读测试实现代码**；测试人员（TDD）**严禁修改业务实现代码**。防止对着测试抄答案或改弱测试掩盖缺陷。

### 2. 零容忍测试门禁 (0 Failures)
- **0 失败 = 通过，>0 失败 = 不通过，绝无例外**。严禁以“非本次引入”为由容忍测试报错，杜绝破窗效应。

### 3. 代码变更后原子文档同步 (Atomic Doc-Sync)
- **文档同步与 `git commit` 是同一个原子动作，不是两个独立步骤**。
- 凡引入新模块、改接口契约、改数据模型或改业务行为，必须与代码在**同一个 commit** 中提交。

### 4. 全局强制 TypeScript (TS) 规约
- 凡涉及 JavaScript/Node.js/前端/脚本/CLI/微任务实现的内容，**强制固定为 TypeScript (`.ts`/`.tsx`)**，严禁使用 `.js`。
- 项目启动（CLI/服务）及全量测试必须通过 TS 链路执行（Node 22.6+ 原生 TS 或 tsx 等），接口契约必须直接用 TypeScript `interface` / `type` 定义。

### 5. 全局强制现代前端框架规约 (Vue 3 / React + TS)
- **凡涉及 Web、H5、移动端 UI、可视化页面或交互界面的开发，强制且固定采用 Vue 3 或 React 实现组件化与状态驱动（结合 TypeScript，即 `.vue` + TS 或 `.tsx`）**。
- **严禁新建使用纯原生 HTML/原生 JS 操控 DOM 的裸页面**，彻底杜绝后续新项目退化为原生 HTML DOM 堆砌代码。
- 前端项目须具备离线与局域网内网免依赖保障（支持本地 vendor 或开箱即用运行时），确保在无公网环境下也可完整运行。

### 6. 系统化调试 (Systematic Debugging)
- 遇 Bug 严禁盲目打补丁，按 `复现 ➡️ 至少 2 个假设 ➡️ 最小实验 ➡️ 定位根因 ➡️ 编写回归测试修复` 标准推进。


---

## 📁 规范与模板导航

- [环境预检工作流规范 (environment-precheck.md)](./environment-precheck.md)：开工前五维环境检查。
- [风险门控工作流规范 (risk-gate.md)](./risk-gate.md)：高/中/低风险分类与破坏性操作降级策略。
- [原子文档同步检查清单 (doc-sync.md)](./doc-sync.md)：Commit 前强制四项文档同步检查。
- [技术方案设计 (TRD) 模板 (templates/trd-template.md)](./templates/trd-template.md)：工业级架构与接口设计模板。
- [任务拆解与测试计划模板 (templates/task-breakdown-template.md)](./templates/task-breakdown-template.md)：微任务拆解清单。
- [开发工作流最佳实践参考 (references/dev-best-practices.md)](./references/dev-best-practices.md)：完整工程规约与机制详解。
