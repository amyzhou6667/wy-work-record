# AI-StoryBoard-Studio (剧创 AI 智能分镜工场)

专为 **AI 短剧 / 漫剧 / 慢剧** 制作团队打造的全链路工业级视觉分镜与提示词提效工作台。

---

## 🌟 核心特性与技术栈 (v1.5)

- **前端架构**：**React 18 + TypeScript (.tsx) + TailwindCSS** 组件化与状态驱动，电影调色台暗色设计（Cinematic Dark UI）。
- **双模智能分镜引擎**：
  - **🤖 AI 大模型智能拆解**：支持接入任何 OpenAI 兼容协议的大模型（如 DeepSeek、OpenAI GPT-4o、硅基流动或本地 Ollama `qwen2.5` 等），好莱坞导演级视听语言外化与戏剧节奏把控；
  - **⚡ 离线高容错引擎**：本地毫秒级断网保底拆解，智能识别多引语格式台词与角色名，杜绝特定小说模板硬编码；
  - **✨ 单镜头 AI 润色**：支持针对单个分镜输入自然语言导演修改意见，局部智能重绘；
- **离线内网高可用**：免除外部强依赖，本地内置运行时，开箱即用。
- **长文本小说/剧本智能切分**：智能章节提取、黄金短剧叙事节奏分析（前3秒钩子、1分钟冲突、结尾卡点）。
- **影视工业级分镜语言**：景别（Shot Size）、机位运镜（Camera Movement）、角色动作神态、环境光影、声画对白与音效 BGM 全面结构化。
- **多生图模型英文标准 Prompt 适配**：
  - **Midjourney v6.1**：参数化语法（`--ar 9:16 --v 6.1 --style raw`，支持 `--cref` 人物参考图注入）。
  - **Flux.1**：自然语言高保真胶片质感（35mm film still, micro-expressions, volumetrics）。
  - **即梦 (Dreamina) / 通用双语**：精炼双语关键词，逗号分隔。
- **多题材范例开箱体验**：内置都市战神爽剧、东方玄幻逆袭、雨夜悬疑探案多套预设文本与角色库。
- **剪映高保真标准 SRT 导出**：
  - 配音语速智能估算（默认 4.5 字/秒，支持 3.5~6.0 字/秒动态滑动微调）。
  - 0.35 秒句间呼吸停顿位。
  - 手机移动端防折行安全保护（超长句子按标点语义自动截断为多行）。
  - 一键直接导入剪映，对齐零成本。
- **工业物料导出中心**：一键导出 `.srt` 字幕、影视分镜表 `.csv`（内置 UTF-8 BOM，Excel 打开不乱码）、全集生图 Prompt 批量清单。

---

## 📁 目录结构

```text
projects/AI-StoryBoard-Studio/
├── docs/
│   ├── prd/
│   │   └── PRD-AI-StoryBoard-Studio.md    # 工业级产品需求文档 (PRD)
│   └── trd/
│       ├── TRD-AI-StoryBoard-Studio.md    # 技术方案设计 (TRD)
│       └── tasks-AI-StoryBoard-Studio.md  # 研发微任务清单与测试计划
├── src/
│   ├── engines/
│   │   ├── docParser.ts                   # 文本长篇切分与离线分镜提取引擎
│   │   ├── exportFormatter.ts             # 工业级 CSV/Excel 与批量 Prompt 导出器
│   │   ├── llmService.ts                  # 大模型分镜拆解与单镜润色引擎 (OpenAI 协议兼容)
│   │   ├── promptAdapter.ts               # Midjourney/Flux/即梦 多模型提示词适配器
│   │   └── srtGenerator.ts                # 剪映高保真 SRT 字幕生成与时间轴引擎
│   ├── types/
│   │   └── index.ts                       # 全局 TypeScript 领域契约模型
│   ├── ui/
│   │   ├── app.tsx                        # React 18 + TSX 核心双栏精修工作台
│   │   ├── styles.css                     # TailwindCSS 工业暗色系样式系统
│   │   ├── index.html                     # Web 入口挂载页
│   │   └── vendor/                        # 离线 React / ReactDOM / Babel
│   └── server.ts                          # 纯 TypeScript 高性能 HTTP 服务器
├── tests/
│   ├── docParser.test.ts                  # 文档切分与分镜提取单元测试
│   ├── exportFormatter.test.ts            # CSV 与 Prompt 导出器单元测试
│   ├── llmService.test.ts                 # 大模型服务与 JSON 容错解析测试
│   ├── promptAdapter.test.ts              # 多模型 Prompt 适配单元测试
│   ├── srtGenerator.test.ts               # 剪映 SRT 算法与时间轴单元测试
│   └── webUi.test.ts                      # Web API 与 UI 模拟集成测试
├── package.json
└── tsconfig.json
```

---

## 🚀 启动与使用指南

1. **直接启动本地工作台**：
   ```bash
   pnpm start
   # 或
   tsx src/server.ts
   ```
2. 浏览器打开 `http://localhost:3000`。
3. **配置大模型（可选）**：点击右上角【⚙️ AI 模型配置】，填入您的 DeepSeek / OpenAI / 硅基流动 / 本地 Ollama 的 Base URL 与 API Key（配置保存在浏览器本地）。
4. 在左侧文本框粘贴您的小说文本，或切换上方“范例”（都市战神 / 东方玄幻 / 悬疑探案），点击【🤖 AI 智能拆解】或【⚡ 离线规则】，即可立即生成专业视觉分镜与三模型 Prompt。
