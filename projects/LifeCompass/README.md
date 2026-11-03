# 🧭 LifeCompass (人生罗盘) - AI 个人潜能挖掘与人生目标导航系统

> 针对泛人群“不知道自己拥有什么、缺乏明确目标、技能变现无门、断卡容易弃坑”的核心痛点，打造的纯 AI 驱动认知资产盘点、变现路径逆向拆解与动态抗挫韧性监督系统。

---

## 📚 项目全景与工程文档

- **产品需求文档 (PRD)**：[PRD-LifeCompass.md](file:///d:/hyper-v/share/proj/wy-work-record/projects/LifeCompass/docs/prd/PRD-LifeCompass.md)
- **技术架构方案 (TRD)**：[TRD-LifeCompass.md](file:///d:/hyper-v/share/proj/wy-work-record/projects/LifeCompass/docs/trd/TRD-LifeCompass.md)
- **微任务拆解清单 (Tasks)**：[tasks-LifeCompass.md](file:///d:/hyper-v/share/proj/wy-work-record/projects/LifeCompass/docs/trd/tasks-LifeCompass.md)

---

## 💡 核心工程实现

1. **认知资产盘点引擎 (`src/services/onboarding.ts`)**：
   - 苏格拉底式启发多维探查，挖掘经历、隐性技能、时间与现实约束；
   - 自动生成五维能力雷达评分与 3 条高杠杆变现候选航道。
2. **三级目标逆向拆解 (`src/services/goal_engine.ts`)**：
   - 宏观目标 (Goal) ➔ 阶段里程碑 (Milestones) ➔ 每日微行动 (Daily Actions)；
   - 严格落实单日微行动 $\le 20$ 分钟极低心理阻力。
3. **动态韧性守护器 (`src/services/resilience_guard.ts`)**：
   - 连续 2 天断卡或遇到挫折阻力时，AI 主动介入温和共情，将行动降维至“2分钟极简任务”（如翻开书看第一页），打破自责弃坑恶性循环。
4. **人生支线重构与资产沉淀 (`src/services/pivot.ts`)**：
   - 现实剧变或方向证伪时发起复盘，历史打卡与经验自动归档至【个人经验资产沉淀库】，数据与经验永不清零。
5. **现代前端控制台 (`src/ui/app.tsx`)**：
   - 遵循全局规约：全栈 TypeScript，前端采用 **React 18 + TSX** 纯组件状态驱动；
   - 内置离线 Vendor 运行时，内网/局域网零外部依赖即开即用。

---

## 🚀 启动与测试指南

### 1. 执行全量自动化测试套件
```bash
node --test projects/LifeCompass/tests/*.test.ts
```
> 当前通过状态：**19/19 绿灯（0 失败门禁）**。

### 2. 启动本地 Web / 移动端控制台
```bash
node projects/LifeCompass/src/server.ts --port 3000
```
浏览器访问：`http://localhost:3000` 即可进入 LifeCompass 交互工作台。
