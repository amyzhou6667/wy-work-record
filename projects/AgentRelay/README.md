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
 
### 1. 伴侣监听模式 (推荐！零侵扰、支持多 AI 引擎)
开启守望伴侣，支持自动嗅探或指定 `--engine auto|antigravity|dsh|claude`：
```powershell
# 自动嗅探引擎（支持 Antigravity / dsh / Claude Code）:
node projects/AgentRelay/src/cli.ts watch "D:\hyper-v\share\proj\opendeck" --public-url http://5ba752e9.r6.cpolar.cn

# 明确指定监听 Antigravity:
node projects/AgentRelay/src/cli.ts watch "D:\hyper-v\share\proj\wy-work-record" --engine antigravity

# 明确指定监听 DeepSeek Harness (dsh):
node projects/AgentRelay/src/cli.ts watch "D:\hyper-v\share\proj\dsh-project" --engine dsh
```
- **电脑端**：继续在原生终端/IDE 窗口聊、看全彩高亮日志；
- **手机端**：浏览器/微信打开终端输出的链接，实时监控终端日志流；
- **智能确认与多任务**：手机端支持多任务卡片横滑切换；遇到人工裁决/选择题时，手机自动震动并智能聚焦，大按钮一键放行！

### 2. 托管执行模式 (可选)
如果希望由 AgentRelay 统一托管拉起任务：
```powershell
node projects/AgentRelay/src/cli.ts run "claude" --cwd "D:\hyper-v\share\proj\opendeck" --public-url http://5ba752e9.r6.cpolar.cn
```

### 3. 全量自动化测试 (TypeScript)
```powershell
node --test projects/AgentRelay/tests/*.test.ts
```

---

## 📁 项目文档导航

- [产品需求文档 (PRD V1.0)](./docs/prd/PRD-AgentRelay-远程AI任务伴侣.md)
- [技术方案设计 (TRD V1.0)](./docs/trd/TRD-AgentRelay-技术架构方案.md)
- [多引擎扩展需求文档 (PRD V1.1)](./docs/prd/PRD-AgentRelay-多引擎插件扩展.md)：支持 Antigravity、dsh、Claude 的完整 PRD。
- [多引擎插件技术方案 (TRD V1.1)](./docs/trd/TRD-AgentRelay-多引擎插件架构.md)：可插拔适配器体系、领域契约与双端防冲突设计。
- [多引擎微任务清单与测试报告 (Tasks V1.1)](./docs/trd/tasks-AgentRelay-多引擎扩展.md)：微任务推进与 32/32 测试通过记录。
- 源代码目录：`src/`（全量 TypeScript 实现，包含 `src/engine/` 可插拔模块）
- 移动端前端：`src/web/`（React 18 + TSX 响应式组件驱动，零外部 CDN 强依赖）
- 测试用例目录：`tests/`（32 个测试 100% 覆盖与 0 失败门禁）

