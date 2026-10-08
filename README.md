# 🌟 网易工作沉淀与工程资产库 (wy-work-record)

本仓库采用**“产品工作流 + 开发工作流 + 项目库”**三位一体的模块化架构，实现从业务构想孵化、到严谨需求定义、再到高质量工程代码落地的完整敏捷闭环。

---

## 🏛️ 仓库顶层架构

```text
wy-work-record/
├── workflows/                          # 🛠️ 工作流体系
│   ├── product/                        # 1. 产品工作流 (PM Superpower 需求拆解与 PRD 产出)
│   │   ├── README.md                   # 产品工作流使用指南
│   │   ├── templates/                  # 标准 PRD 文档模板
│   │   └── references/                 # Superpower 苏格拉底启发式提问方法论
│   └── development/                    # 2. 开发工作流 (研发架构、微任务拆解与 TDD 落地)
│       ├── README.md                   # 开发工作流使用指南
│       ├── templates/                  # TRD 架构设计 / 任务拆解模板
│       └── references/                 # TDD 与工程最佳实践规范
│
├── projects/                           # 📦 3. 项目库 (业务孵化与交付实战)
│   ├── README.md                       # 项目库索引与管理规范
│   └── AgentRelay/                     # 项目 1：AgentRelay 远程 AI 任务伴侣
│       ├── README.md                   # 项目概览与快速启动
│       ├── docs/                       # 需求文档 (PRD) 与技术方案 (TRD)
│       │   └── prd/                    # PRD-AgentRelay-远程AI任务伴侣.md
│       └── src/                        # 项目源代码
│
├── .agents/                            # 🤖 AI 智能体协同技能 (Skills)
│   └── skills/
│       ├── pm-superpower-prd/          # 产品经理技能
│       └── dev-superpower-workflow/    # 研发工程师技能
│
├── GEMINI.md                           # 仓库全局工作流执行规则
└── README.md                           # 顶层主索引导航 (当前文件)
```

---

## 🧭 模块导航与快速入口

### 1. [产品工作流 (workflows/product/)](./workflows/product/README.md)
- **面向人群**：产品经理 (PM)、业务架构师。
- **核心理念**：基于 **Superpower 启发式问答**，分 3 轮（价值与边界 ➡️ 场景与动线 ➡️ 规则与异常）深度拆解需求，杜绝“未想清先动手”。
- **标准化产物**：输出工业级 [PRD 产品需求文档](./workflows/product/templates/prd-template.md)。

### 2. [开发工作流 (workflows/development/)](./workflows/development/README.md)
- **面向人群**：研发工程师、技术负责人。
- **核心理念**：基于 **Superpower 7 步工程闭环**，严格遵循 `TRD 方案设计 ➡️ 微任务拆解 ➡️ TDD 测试驱动 ➡️ 隔离开发 ➡️ 门禁验证`。
- **标准化产物**：输出 [TRD 技术方案](./workflows/development/templates/trd-template.md) 与 [任务拆解表](./workflows/development/templates/task-breakdown-template.md)。

### 3. [项目库 (projects/)](./projects/README.md)
- **管理方式**：每个项目均作为独立单元管理，拥有专属的 `docs/` 和 `src/`。
- **现有项目**：
  - **[AgentRelay 远程 AI 任务伴侣](./projects/AgentRelay/README.md)**：解决在公司内网电脑运行 `claude-code`、`antigravity` 等长耗时任务时，下班后在家通过微信小程序随时查看进度、接收卡住提问、一键确认/紧急中止的轻量中继工具。
