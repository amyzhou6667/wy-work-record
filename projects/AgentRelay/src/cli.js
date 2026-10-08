#!/usr/bin/env node
import { spawn } from 'node:child_process';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { PromptDetector } from './detector/index.js';
import { CloudSyncClient } from './client/sync.js';
import { RelaySession } from './session.js';
import { createRelayServer } from './server/index.js';
import { SleepBlocker } from './platform/sleep_blocker.js';
import { TunnelManager } from './platform/tunnel.js';
import { WechatWorkNotifier } from './notifier/wechat_work.js';
import { CloudActionBridge } from './platform/cloud_bridge.js';

const args = process.argv.slice(2);
const commandIdx = args.indexOf('run');

if (commandIdx === -1 || !args[commandIdx + 1]) {
  console.log(`
AgentRelay - 远程 AI 任务伴侣 (MVP)

使用方法:
  node projects/AgentRelay/src/cli.js run "<command>" [选项]

选项:
  --wechat-webhook <url>  企业微信群机器人 Webhook 链接 (100% 永久免费、免审批、手机直接弹窗)
  --public-url <url>      指定固定的公网反向代理或中继域名
  --no-sleep-block        禁用自动防休眠保活

示例:
  node projects/AgentRelay/src/cli.js run "claude \"帮我检查代码\"" --wechat-webhook 你的企微Webhook
  node projects/AgentRelay/src/cli.js run "claude"
`);
  process.exit(1);
}

let targetCmd = args[commandIdx + 1].trim();

// 1. 读取企业微信 Webhook 配置 (参数优先 > 环境变量 > 本地已存配置)
const homeDir = os.homedir();
const configPath = path.join(homeDir, '.agentrelay', 'config.json');
let savedConfig = {};
try {
  if (fs.existsSync(configPath)) {
    savedConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  }
} catch (e) {}

let wechatWebhook = process.env.WECHAT_WORK_WEBHOOK || savedConfig.wechatWebhook || '';
const webhookIdx = args.indexOf('--wechat-webhook');
if (webhookIdx !== -1 && args[webhookIdx + 1]) {
  wechatWebhook = args[webhookIdx + 1];
  // 自动记住配置，下次免输
  try {
    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    fs.writeFileSync(configPath, JSON.stringify({ ...savedConfig, wechatWebhook }, null, 2));
  } catch (e) {}
}

const wechatNotifier = new WechatWorkNotifier({ webhookUrl: wechatWebhook });

// 2. 智能别名与 Windows 路径解析
const localBinClaude = path.join(homeDir, '.local', 'bin', 'claude.exe');

if (targetCmd === 'claude-code' || targetCmd.startsWith('claude-code ')) {
  targetCmd = targetCmd.replace(/^claude-code/, fs.existsSync(localBinClaude) ? `"${localBinClaude}"` : 'claude');
} else if (targetCmd === 'claude' || targetCmd.startsWith('claude ')) {
  if (fs.existsSync(localBinClaude)) {
    targetCmd = targetCmd.replace(/^claude/, `"${localBinClaude}"`);
  }
}

// Claude Code 专用容错：若未传任务提示词，自动补充初始任务
const cleanCmd = targetCmd.replace(/^"|"$/g, '').trim();
if (cleanCmd.endsWith('claude.exe') || cleanCmd === 'claude') {
  targetCmd += ' "你好，请列出当前项目状态"';
  console.log(`[AgentRelay] 💡 提示: 托管 Claude Code 建议带上任务目标，本次已自动配置初始目标: "你好，请列出当前项目状态"`);
}

const taskId = `task_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
const cloudBridge = new CloudActionBridge(taskId);

// 3. 激活系统防休眠保活锁
const sleepBlocker = new SleepBlocker();
if (!args.includes('--no-sleep-block')) {
  sleepBlocker.enable();
}

// 4. 启动轻量中继服务与手机端 H5 服务
let relayPort = 3300;
let serverInstance;
try {
  const s = await createRelayServer({ port: 3300 });
  relayPort = s.port;
  serverInstance = s.server;
} catch (e) {
  const s = await createRelayServer({ port: 0 });
  relayPort = s.port;
  serverInstance = s.server;
}

// 5. 解析局域网 IP 与公网隧道
function getNetworkIps() {
  const interfaces = os.networkInterfaces();
  const ips = [];
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        ips.push(net.address);
      }
    }
  }
  return ips;
}

const lanIps = getNetworkIps();
const lanMobileUrl = lanIps.length > 0 
  ? `http://${lanIps[0]}:${relayPort}/?task=${taskId}` 
  : `http://localhost:${relayPort}/?task=${taskId}`;

console.log('='.repeat(65));
console.log(`[AgentRelay] 🚀 正在托管启动任务: ${targetCmd}`);
console.log(`[AgentRelay] 🆔 会话 ID: ${taskId}`);
if (wechatWebhook) {
  console.log(`[AgentRelay] 💬 企业微信强通知: \x1b[32m已开启 (官方机器人 Webhook 已绑定，100% 免费)\x1b[0m`);
} else {
  console.log(`[AgentRelay] 💡 提示: 传入 --wechat-webhook <群机器人链接> 可开启手机企业微信实时弹窗提醒`);
}
if (sleepBlocker.isActive()) {
  console.log(`[AgentRelay] 🔋 防休眠保活已生效：任务运行期间工位电脑将保持唤醒状态`);
}
console.log(`[AgentRelay] 📱 局域网访问入口 (公司同 Wi-Fi 直连):`);
console.log(`             👉 \x1b[36m\x1b[1m${lanMobileUrl}\x1b[0m`);

// 申请全球公网隧道
console.log(`[AgentRelay] 🌐 正在申请全球公网安全通道...`);
let activePublicUrl = null;
const tunnelManager = new TunnelManager({ customUrl: null });
tunnelManager.getPublicUrl(relayPort, 3500).then((pubUrl) => {
  if (pubUrl) {
    activePublicUrl = `${pubUrl}/?task=${taskId}`;
    console.log(`[AgentRelay] 🌐 全球公网访问入口: 👉 \x1b[32m\x1b[1m${activePublicUrl}\x1b[0m`);
  }
});

console.log(`[AgentRelay] 💻 本地调试链接: http://localhost:${relayPort}/?task=${taskId}`);
console.log('='.repeat(65));

const detector = new PromptDetector({ silenceThresholdMs: 1500 });
const syncClient = new CloudSyncClient({
  mode: 'http',
  baseUrl: `http://127.0.0.1:${relayPort}`
});

const session = new RelaySession({
  taskId,
  command: targetCmd,
  detector,
  syncClient
});

await session.start();

// 启动目标子进程
const child = spawn(targetCmd, {
  shell: true,
  stdio: ['pipe', 'pipe', 'pipe']
});

child.stdout.on('data', async (chunk) => {
  const text = chunk.toString();
  process.stdout.write(text);
  session.handleOutput(text);

  const prompt = detector.evaluatePrompt();
  if (prompt) {
    console.log(`\n[AgentRelay] 🔔 检测到交互提问阻断: "${prompt.question}"`);
    session.handlePromptDetected(prompt);

    // 触发企业微信群机器人 100% 免费强推送
    if (wechatWebhook) {
      console.log(`[AgentRelay] 💬 正在向手机企业微信推送卡片通知...`);
      const targetUrl = activePublicUrl || lanMobileUrl;
      wechatNotifier.send({
        command: targetCmd,
        question: prompt.question,
        recent_logs: prompt.recent_logs,
        taskId,
        remoteUrl: targetUrl
      }).then((res) => {
        if (res.ok) {
          console.log(`[AgentRelay] ✅ 企业微信通知发送成功！手机已响铃弹窗。`);
        }
      });
    }
  }
});

child.stderr.on('data', (chunk) => {
  process.stderr.write(chunk);
});

// 监听键盘本地输入
process.stdin.on('data', (chunk) => {
  child.stdin.write(chunk);
  if (session.status === 'WAITING_CONFIRMATION') {
    console.log('[AgentRelay] ⌨️ 检测到本地键盘输入，已唤醒任务继续');
    session.status = 'RUNNING';
  }
});

// 轮询检查远程手机端下发的决策指令
const pollInterval = setInterval(async () => {
  // 1. 检查本地 Web 中转指令
  const localAction = await session.tick();
  
  // 2. 检查云端双向桥接指令
  let cloudAction = null;
  if (session.status === 'WAITING_CONFIRMATION') {
    cloudAction = await cloudBridge.pollAction();
  }

  const finalAction = localAction || cloudAction;

  if (finalAction === 'KILL') {
    console.log('\n[AgentRelay] 🛑 收到手机端紧急制动指令，正在中止任务...');
    child.kill('SIGINT');
    clearInterval(pollInterval);
  } else if (finalAction) {
    console.log(`\n[AgentRelay] 📱 收到手机端远程决策指令: "${finalAction}"，已注入执行`);
    child.stdin.write(`${finalAction}\n`);
    session.status = 'RUNNING';
  }
}, 1000);

child.on('close', async (code) => {
  clearInterval(pollInterval);
  await session.handleExit(code);
  console.log(`\n[AgentRelay] 🏁 任务结束，退出码: ${code}`);

  // 释放资源
  sleepBlocker.disable();
  tunnelManager.close();
  if (serverInstance) {
    serverInstance.close();
  }
  process.exit(code || 0);
});
