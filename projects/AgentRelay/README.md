# 🚀 AgentRelay - 远程 AI 任务伴侣

> 解决在 wy 内网工位电脑运行 `claude-code`、`antigravity`、`deepseek harness` 等长耗时任务时，下班后在家通过手机随时查看进度、接收卡住提问、一键确认/紧急中止的轻量中继工具。

---

## 📌 项目核心亮点

- **手机端 H5 响应式卡片**：提供微信小程序风格的深色卡片操作界面，大号按键一键 `[同意 Y]` / `[拒绝 N]` / `[紧急中止]`，手机开箱即用。
- **电脑防休眠保活**：任务运行期间自动调用系统原生底层 API 阻止 Windows/macOS 进入休眠，任务结束后自动释放，夜间长任务不冻结。
- **国内穿透支持**：原生支持国内节点内网穿透（如 cpolar 国内 BGP 节点，或通过 `--public-url` 接入国内云服务器/自建域名），手机 4G/5G 流量极速秒开。
- **免侵入接入**：命令行包装器 `relay run "<command>"`，无感接管终端输入输出。
- **安全合规无忧**：严格遵守内网安全红线，仅上传当前卡住的提问摘要（最近 10 行），绝不上传源码。

---

## 🏃 快速启动指南
 
-### 1. 伴侣监听模式 (推荐！零侵扰、不改变任何原生窗口)
如果您已经在 **codemaker** 或终端中运行了 Claude Code（如正在跑 `/auto-dev ...`），直接在旁边开启守望伴侣：
```powershell
node projects/AgentRelay/src/cli.js watch "D:\hyper-v\share\proj\opendeck" --public-url http://5ba752e9.r6.cpolar.cn
```
- **电脑端**：继续在原生 codemaker 窗口聊、看全彩高亮日志；
- **手机端**：浏览器/微信打开终端输出的链接，实时监控终端日志流；
- **智能确认**：当遇到“阶段 B 人工裁决”时，手机会震动并弹窗，点击 `[同意]` 自动注入“确认”或写入剪贴板继续推进！

### 2. 托管执行模式 (可选)
如果希望由 AgentRelay 统一托管拉起任务：
```powershell
node projects/AgentRelay/src/cli.js run "claude" --cwd "D:\hyper-v\share\proj\opendeck" --public-url http://5ba752e9.r6.cpolar.cn
```

---

## 📁 项目文档导航

- [产品需求文档 (PRD)](./docs/prd/PRD-AgentRelay-远程AI任务伴侣.md)：完整三轮 Superpower 对齐产出的工业级 PRD。
- [技术方案设计 (TRD)](./docs/trd/TRD-AgentRelay-技术架构方案.md)：包含领域模型、接口签名契约与双向通信机制。
- [微任务拆解与测试计划 (Tasks)](./docs/trd/tasks-AgentRelay.md)：原子任务清单。
- 源代码目录：`src/`
- 测试用例目录：`tests/`
