# 🎨 ToneRelay - 智能影调迁移与批量修图伴侣

> **“将你心仪图片的调色美学，一键解构成专属配方，秒级无损套用至你的整组照片。”**

---

## 📖 项目简介

**ToneRelay** 是一款面向手机端摄影爱好者、朋友圈/小红书日常博主的轻量级智能影调迁移工具。
它通过解构参考灵感图片的色彩分布（色温、对比度、三色曲线、胶片质感与颗粒），提供**可视化配方标签**、**实时卷帘对比 (Before/After)**、**智能人像肤色保护**，并支持以**极简两步走**完成朋友圈九宫格照片的**一键批量无损应用与导出**。

---

## 🏛️ 项目目录结构

```text
ToneRelay/
├── README.md               # 项目概览与快速说明 (当前文件)
├── docs/                   # 文档中心
│   ├── prd/                # 产品需求文档 (PRD)
│   └── trd/                # 技术设计方案 (TRD) 与微任务清单 (tasks)
├── src/                    # 核心源码 (类型、算法引擎、批处理管道、H5前端原型)
└── tests/                  # 单元测试与端到端自动化验证套件 (100% Pass)
```

---

## 📑 核心文档与测试入口

- **产品需求文档 (PRD)**：[PRD-ToneRelay-智能影调迁移与批量修图伴侣.md](./docs/prd/PRD-ToneRelay-智能影调迁移与批量修图伴侣.md)
- **技术设计方案 (TRD)**：[TRD-ToneRelay-技术架构方案.md](./docs/trd/TRD-ToneRelay-技术架构方案.md)
- **研发微任务清单 (Tasks)**：[tasks-ToneRelay.md](./docs/trd/tasks-ToneRelay.md)
- **全量测试验收命令**：
  ```bash
  node --test projects/ToneRelay/tests/*.test.ts
  ```
- **启动 H5 原型服务命令**：
  ```bash
  # 方式 1: 直接启动 TypeScript 伺服器
  node projects/ToneRelay/serve.ts

  # 方式 2: npm 脚本
  cd projects/ToneRelay && npm start
  ```
