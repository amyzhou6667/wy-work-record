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

### 1. 运行自动化测试 (0 失败门禁)
```bash
node --test projects/AgentRelay/tests/*.test.js
```

### 2. 本地/局域网托管启动（同一 Wi-Fi 直接访问）
```bash
node projects/AgentRelay/src/cli.js run "claude \"帮我检查项目代码\""
```
终端会输出局域网访问链接：`http://10.x.x.x:3300/?task=task_xxxx`，同一 Wi-Fi 下手机直接打开！

### 3. 下班回家公网访问（国内节点穿透方案）

#### 方式 A：使用国内 cpolar 穿透（国内备案节点，手机 4G/5G 秒开）
1. 在工位电脑安装并启动 cpolar（国内免费内网穿透）：
   ```bash
   cpolar http 3300
   ```
   cpolar 会为您分配一个国内 HTTPS 域名（例如 `https://xxxx.cpolar.top`）；
2. 启动 AgentRelay 时传入该公网地址：
   ```bash
   node projects/AgentRelay/src/cli.js run "claude \"分析项目\"" --public-url https://xxxx.cpolar.top
   ```
3. 无论您在地铁上还是在家里，手机流量直接打开该地址即可远程查看与确认！

#### 方式 B：自建国内云服务器反向代理
若您有阿里云/腾讯云/网易云等国内轻量服务器，将服务器域名通过 `--public-url` 传入即可。

---

## 📁 项目文档导航

- [产品需求文档 (PRD)](./docs/prd/PRD-AgentRelay-远程AI任务伴侣.md)：完整三轮 Superpower 对齐产出的工业级 PRD。
- [技术方案设计 (TRD)](./docs/trd/TRD-AgentRelay-技术架构方案.md)：包含领域模型、接口签名契约与双向通信机制。
- [微任务拆解与测试计划 (Tasks)](./docs/trd/tasks-AgentRelay.md)：原子任务清单。
- 源代码目录：`src/`
- 测试用例目录：`tests/`
