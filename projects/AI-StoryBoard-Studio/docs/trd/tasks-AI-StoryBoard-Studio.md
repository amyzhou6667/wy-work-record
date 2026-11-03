# 【研发微任务拆解与测试计划】AI-StoryBoard-Studio

| 责任人 | 关联 PRD | 关联 TRD | 预估周期 | 状态 |
| :--- | :--- | :--- | :--- | :--- |
| 全栈研发工程师 | [PRD-AI-StoryBoard-Studio.md](../prd/PRD-AI-StoryBoard-Studio.md) | [TRD-AI-StoryBoard-Studio.md](TRD-AI-StoryBoard-Studio.md) | 2 ~ 3 天 | ✅ 已全部完成 (19/19 测试通过) |

---

## 🎯 微任务拆解原则
- **微任务粒度**：每个小任务控制在 2~5 分钟内完成编码与独立测试验证。
- **强制 TypeScript 与测试先行 (TDD: Red-Green-Refactor)**：
  - 核心计算与数据转换引擎先写 `*.test.ts`，验证红灯失败；
  - 编写实现代码转绿灯；
  - 前端采用 React + TypeScript + TailwindCSS 组件化开发。
- **0 失败门禁**：每个阶段必须通过全量单元测试与类型检查方可进入下一阶段。

---

## 📝 微任务清单 (Task Checklist)

### 阶段一：项目工程脚手架与数据契约准备
- [x] **Task 1.1: 创建 React + TypeScript + TailwindCSS 项目工程脚手架**
  - **改动范围**：`projects/AI-StoryBoard-Studio/package.json`, `tsconfig.json`
  - **目标**：配置现代化 React + TS + TailwindCSS 纯前端工程，配置 Node 原生测试运行器。
  - **验收命令**：`npm run typecheck`（✅ 通过）
- [x] **Task 1.2: 建立全局领域模型 TypeScript 契约声明**
  - **改动范围**：`projects/AI-StoryBoard-Studio/src/types/index.ts`
  - **目标**：实现 `StoryboardShot`, `ModelPrompts`, `CharacterAsset`, `SrtExportConfig`, `SubtitleItem`, `EpisodeOutline` 等全量类型声明。
  - **验收命令**：`npm run typecheck`（✅ 0 错误）

---

### 阶段二：核心业务引擎 TDD 闭环 (Red ➡️ Green ➡️ Refactor)

- [x] **Task 2.1: 剪映高保真 SRT 字幕引擎 (JianYingSrtEngine)**
  - **测试用例 (Red)**：`projects/AI-StoryBoard-Studio/tests/srtGenerator.test.ts`
    - 校验 1：标准时码格式验证 (`00:00:01,234 --> 00:00:04,567`)
    - 校验 2：动态语速计算（4.5 字/秒 vs 6.0 字/秒的毫秒差异）
    - 校验 3：超长单行（>18 汉字）自动按标点/空格拆分两行防折行
    - 校验 4：角色名前缀开关 (`[顾北辰]:` 包含与纯文本模式)
  - **业务实现 (Green)**：`projects/AI-StoryBoard-Studio/src/engines/srtGenerator.ts`
  - **验收命令**：`npx tsx --test tests/srtGenerator.test.ts`（✅ 5/5 通过）

- [x] **Task 2.2: 多生图模型 Prompt 转换引擎 (PromptAdapterEngine)**
  - **测试用例 (Red)**：`projects/AI-StoryBoard-Studio/tests/promptAdapter.test.ts`
    - 校验 1：Midjourney 提示词构造（主体、景别、运镜、光影、`--ar 9:16 --v 6.1 --style raw`、`--cref` 注入）
    - 校验 2：Flux.1 自然语言长提示词构造（细腻肌理、微表情、体积光）
    - 校验 3：画幅 16:9 与 9:16 动态切换注入
    - 校验 4：角色资产库名称识别与统一外貌词置换
  - **业务实现 (Green)**：`projects/AI-StoryBoard-Studio/src/engines/promptAdapter.ts`
  - **验收命令**：`npx tsx --test tests/promptAdapter.test.ts`（✅ 5/5 通过）

- [x] **Task 2.3: 文档解析与分镜数据 Mock/生成器引擎 (DocParser & MockEngine)**
  - **测试用例 (Red)**：`projects/AI-StoryBoard-Studio/tests/docParser.test.ts`
    - 校验 1：TXT 文本章节正则识别（第一章、第1集等）
    - 校验 2：分集大纲与分镜卡片结构化解析
  - **业务实现 (Green)**：`projects/AI-StoryBoard-Studio/src/engines/docParser.ts`
  - **验收命令**：`npx tsx --test tests/docParser.test.ts`（✅ 3/3 通过）

- [x] **Task 2.4: 工业级分镜表格与 Prompt 导出器 (ExportFormatter)**
  - **测试用例 (Red)**：`projects/AI-StoryBoard-Studio/tests/exportFormatter.test.ts`
    - 校验 1：CSV/Excel 格式导出，包含所有影视级镜头属性列与 UTF-8 BOM
    - 校验 2：全集 Prompt 批量格式化导出（每镜一行带编号）
  - **业务实现 (Green)**：`projects/AI-StoryBoard-Studio/src/engines/exportFormatter.ts`
  - **验收命令**：`npx tsx --test tests/exportFormatter.test.ts`（✅ 3/3 通过）

---

### 阶段三：现代化前端交互工作台开发 (React + TailwindCSS + TS)

- [x] **Task 3.1: 顶部控制台导航组件 (Header)**
  - **改动范围**：`src/ui/app.tsx`, `src/ui/styles.css`
  - **功能点**：影视调色台暗色设计、画幅一键切换（9:16 / 16:9）、语速滑块（3.5 ~ 6.0 字/秒）、全局导出下拉菜单。
- [x] **Task 3.2: 角色一致性管理抽屉组件 (CharacterDrawer)**
  - **改动范围**：`src/ui/app.tsx`
  - **功能点**：主角/反派卡片管理、英文形象 Prompt 就地编辑、`--cref` 链接绑定。
- [x] **Task 3.3: 文档上传与章节目录对照 (DocumentUploader)**
  - **改动范围**：`src/ui/app.tsx`
  - **功能点**：剧本文本输入、字数统计、演示 Demo 示例一键载入。
- [x] **Task 3.4: 核心双栏精修工作台 (DoubleColumnWorkspace)**
  - **改动范围**：`src/ui/app.tsx`
  - **功能点**：左栏原文高亮聚焦联动；右栏分镜卡片流，包含景别/运镜徽标、角色神态、对白台词、MJ/Flux/即梦三 Tab 切换与一键复制。
- [x] **Task 3.5: 剪映 SRT 与物料导出中心弹窗 (ExportModal)**
  - **改动范围**：`src/ui/app.tsx`
  - **功能点**：SRT 实时高保真预览与下载、分镜 CSV/Excel 下载、全集 Prompt 一键复制。
- [x] **Task 3.6: 服务端集成与静态托管**
  - **改动范围**：`src/server.ts`, `src/ui/index.html`
  - **功能点**：HTTP 服务支持页面静态资产与 REST API，支持独立无端口模拟测试。

---

### 阶段四：端到端回归验证与交付
- [x] **Task 4.1: 全量测试套件执行 (0 失败门禁)**
  - **验收命令**：`npm test`（✅ 19/19 测试用例通过，耗时 ~580ms）
- [x] **Task 4.2: 类型检查与规范治理**
  - **验收命令**：`npm run typecheck`（✅ 0 错误，TypeScript 严格模式）
