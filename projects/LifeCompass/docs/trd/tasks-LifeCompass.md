# 【研发实施微任务拆解与测试计划】LifeCompass 人生罗盘

| 责任人 | 关联 PRD | 关联 TRD | 实施周期 |
| :--- | :--- | :--- | :--- |
| 研发工程组 | [PRD-LifeCompass.md](../prd/PRD-LifeCompass.md) | [TRD-LifeCompass.md](TRD-LifeCompass.md) | W1 ~ W2 (MVP) |

---

## 🎯 拆解原则
- **微任务化**：单个微任务颗粒度控制在 2~5 分钟或单文件可独立验证范围。
- **全局强制 TypeScript 规约**：源码统一为 `.ts`/`.tsx`，测试统一为 `*.test.ts`，严禁新建 `.js`。
- **全局强制现代前端框架规约**：UI 统一采用 React + TSX 组件化驱动，禁止裸原生 HTML/DOM 操控。
- **测试驱动闭环 (TDD)**：先写测试用例（Red）➡️ 再写业务实现（Green）➡️ 零容忍 100% 通过（0 Failures）。

---

## 📝 任务清单 (Task Checklist)

### 阶段一：基础设施、工程脚手架与 TypeScript 契约
- [x] **Task 1.1: 工程脚手架与 TS 编译配置**
  - **交付文件**：`projects/LifeCompass/package.json`, `projects/LifeCompass/tsconfig.json`
  - **验收标准**：配置 ES2022、NodeNext、React JSX 及 `npm test` 脚本，支持 Node 24 原生测试。
  - **验证命令**：`cd projects/LifeCompass && node -e "console.log('Ready')"`
- [x] **Task 1.2: 核心领域模型与 TypeScript 接口契约定义**
  - **交付文件**：`projects/LifeCompass/src/types/index.ts`
  - **目标**：实现 `SkillTag`, `UserSkillProfile`, `Goal`, `Milestone`, `DailyAction`, `ResilienceAssessment`, `ExperienceAsset` 等全部类型声明。
  - **验收命令**：`node --check projects/LifeCompass/src/types/index.ts`
- [x] **Task 1.3: 轻量化本地持久化引擎 (JSON Store Engine)**
  - **测试用例**：`projects/LifeCompass/tests/store.test.ts`
  - **交付文件**：`projects/LifeCompass/src/storage/store.ts`
  - **目标**：提供安全并发读写、版本乐观锁与离线缓存落盘。
  - **验证命令**：`node --test projects/LifeCompass/tests/store.test.ts`

### 阶段二：苏格拉底认知盘点与画像生成引擎 (TDD)
- [x] **Task 2.1: 启发式多维提问流与证据提取器 (Red-Green)**
  - **测试用例**：`projects/LifeCompass/tests/onboarding.test.ts`
  - **交付文件**：`projects/LifeCompass/src/services/onboarding.ts`
  - **目标**：实现高光经历、技能提取、变现潜力打分及防假想校验追问逻辑。
  - **验证命令**：`node --test projects/LifeCompass/tests/onboarding.test.ts`
- [x] **Task 2.2: 《个人技能潜能数字画像》生成器**
  - **测试用例**：`projects/LifeCompass/tests/profile_generator.test.ts`
  - **交付文件**：`projects/LifeCompass/src/services/profile.ts`
  - **目标**：将提取结果转换为五维雷达打分与 3 条高杠杆变现候选路径。
  - **验证命令**：`node --test projects/LifeCompass/tests/profile_generator.test.ts`

### 阶段三：三级目标逆向拆解引擎 (TDD)
- [x] **Task 3.1: 变现路径逆向拆解器 (Goal ➔ Milestones ➔ Actions)**
  - **测试用例**：`projects/LifeCompass/tests/goal_engine.test.ts`
  - **交付文件**：`projects/LifeCompass/src/services/goal_engine.ts`
  - **目标**：根据选择的发展路径自动生成阶梯里程碑，并拆解为耗时 $\le 20$ 分钟的每日微行动。
  - **验证命令**：`node --test projects/LifeCompass/tests/goal_engine.test.ts`

### 阶段四：抗挫韧性监督器与动态降载防弃坑机制 (TDD)
- [x] **Task 4.1: 连续断卡检测与动态降载判定算法 (Anti-Drop)**
  - **测试用例**：`projects/LifeCompass/tests/resilience_guard.test.ts`
  - **交付文件**：`projects/LifeCompass/src/services/resilience_guard.ts`
  - **目标**：连续 2 天断卡自动触发温和共情，并将当日任务降维为“2分钟极简微步”。
  - **验证命令**：`node --test projects/LifeCompass/tests/resilience_guard.test.ts`
- [x] **Task 4.2: 每日打卡与 AI 正向反馈激励机制**
  - **测试用例**：`projects/LifeCompass/tests/checkin.test.ts`
  - **交付文件**：`projects/LifeCompass/src/services/checkin.ts`
  - **目标**：支持心得反思与凭证提交，触发正向肯定点评并更新里程碑进度。
  - **验证命令**：`node --test projects/LifeCompass/tests/checkin.test.ts`

### 阶段五：人生支线重构 (Pivot) 与经验资产沉淀 (TDD)
- [x] **Task 5.1: 目标重构复盘与旧经验封存**
  - **测试用例**：`projects/LifeCompass/tests/pivot.test.ts`
  - **交付文件**：`projects/LifeCompass/src/services/pivot.ts`
  - **目标**：将旧目标的打卡与产出归档至“能力沉淀库”，基于新现实生成新路径，经验不归零。
  - **验证命令**：`node --test projects/LifeCompass/tests/pivot.test.ts`

### 阶段六：现代前端组件化与交互控制台 (React TSX)
- [x] **Task 6.1: 现代前端核心组件库与打字机问答卡片**
  - **测试用例**：`projects/LifeCompass/tests/web_ui.test.ts`
  - **交付文件**：`projects/LifeCompass/src/ui/app.tsx`, `projects/LifeCompass/src/ui/styles.css`
  - **目标**：编写 React (TSX) 组件（OnboardingChat、DailyWorkbench、ResilienceModal、AssetDashboard），实现组件化状态驱动。
  - **验证命令**：`node --test projects/LifeCompass/tests/web_ui.test.ts`
- [x] **Task 6.2: 离线开箱即用控制台构建**
  - **交付文件**：`projects/LifeCompass/src/server.ts`, `projects/LifeCompass/src/ui/index.html`
  - **目标**：提供一键启动的 HTTP 服务，支持浏览器直开与移动端自适应访问。
  - **验证命令**：`node projects/LifeCompass/src/server.ts --check`

### 阶段七：全量回归测试与质量门禁 (0 Failures)
- [x] **Task 7.1: 全量测试套件执行**
  - **验收命令**：`node --test projects/LifeCompass/tests/*.test.ts`
  - **门禁要求**：100% 通过（19/19 绿灯，0 失败）。
