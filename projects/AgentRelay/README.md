# 🚀 AgentRelay - 远程 AI 任务伴侣

> 解决在 wy 内网工位电脑运行 `claude-code`、`antigravity`、`deepseek harness` 等长耗时任务时，下班后在家通过手机微信随时查看进度、接收卡住提问、一键确认/紧急中止的轻量中继工具。

---

## 📌 项目核心亮点

- **零成本、免审批**：支持**企业微信群机器人 (WeChat Work Bot)** 官方原生推送，100% 永久免费、零审批，手机锁屏直接弹窗震动提醒！
- **移动端 H5 响应式卡片**：提供微信小程序风格的深色卡片操作界面，大号按键一键 `[同意 Y]` / `[拒绝 N]` / `[紧急中止]`。
- **电脑防休眠保活**：任务运行期间自动申请系统保活锁，阻止 Windows/macOS 进入休眠，任务结束后自动释放。
- **免侵入接入**：命令行包装器 `relay run "<command>"`，无感接管终端输入输出。
- **安全合规无忧**：严格遵守内网安全红线，仅上传当前卡住的提问摘要（最近 10 行），绝不上传源码。

---

## 🏃 快速启动指南

### 1. 运行自动化测试 (0 失败门禁)
```bash
node --test projects/AgentRelay/tests/*.test.js
```

### 2. 启动长耗时任务 (开启手机企微强提醒)
```bash
node projects/AgentRelay/src/cli.js run "claude \"帮我检查项目代码\"" --wechat-webhook 你的企微群机器人Webhook
```
*提示：只需传一次 `--wechat-webhook`，系统会自动保存在本地配置，下次启动无需重复输入！*

### 3. 如何创建企业微信群机器人（10秒搞定）
1. 在企业微信中，拉一个只有您自己的小群（或任意工作群）；
2. 点击右上角群设置 `...` ➡️ **【添加群机器人】**；
3. 随意起名（如“AI伴侣”），点击添加后，企微会自动生成一个 Webhook 链接；
4. 将该链接传入 `--wechat-webhook` 即可！

---

## 📁 项目文档导航

- [产品需求文档 (PRD)](./docs/prd/PRD-AgentRelay-远程AI任务伴侣.md)：完整三轮 Superpower 对齐产出的工业级 PRD。
- [技术方案设计 (TRD)](./docs/trd/TRD-AgentRelay-技术架构方案.md)：包含领域模型、接口签名契约与双向通信机制。
- [微任务拆解与测试计划 (Tasks)](./docs/trd/tasks-AgentRelay.md)：原子任务清单。
- 源代码目录：`src/`
- 测试用例目录：`tests/`
