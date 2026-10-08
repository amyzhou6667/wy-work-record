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

const args = process.argv.slice(2);
const commandIdx = args.indexOf('run');

if (commandIdx === -1 || !args[commandIdx + 1]) {
  console.log(`
AgentRelay - 远程 AI 任务伴侣 (MVP)

使用方法:
  node projects/AgentRelay/src/cli.js run "<command>"

选项:
  --public-url <url>   指定固定的公网反向代理或中继域名
  --no-sleep-block     禁用自动防休眠保活

示例:
  node projects/AgentRelay/src/cli.js run "claude \"帮我实现某个功能\""
  node projects/AgentRelay/src/cli.js run "antigravity"
  node projects/AgentRelay/src/cli.js run "node projects/AgentRelay/scratch/mock_agent.js"
`);
  process.exit(1);
}

let targetCmd = args[commandIdx + 1].trim();

// 1. 智能别名与 Windows 路径解析
const homeDir = os.homedir();
const localBinClaude = path.join(homeDir, '.local', 'bin', 'claude.exe');

// 如果输入了 claude-code，自动映射为 claude
if (targetCmd === 'claude-code' || targetCmd.startsWith('claude-code ')) {
  targetCmd = targetCmd.replace(/^claude-code/, fs.existsSync(localBinClaude) ? `"${localBinClaude}"` : 'claude');
} else if (targetCmd === 'claude' || targetCmd.startsWith('claude ')) {
  if (fs.existsSync(localBinClaude)) {
    targetCmd = targetCmd.replace(/^claude/, `"${localBinClaude}"`);
  }
}

// 2. Claude Code 专用容错：若未传任务提示词，自动补充初始任务，避免因无输入直接退出
const cleanCmd = targetCmd.replace(/^"|"$/g, '').trim();
if (cleanCmd.endsWith('claude.exe') || cleanCmd === 'claude') {
  targetCmd += ' "你好，请列出当前项目状态"';
  console.log(`[AgentRelay] 💡 提示: 托管 Claude Code 建议带上任务目标，本次已自动配置初始目标: "你好，请列出当前项目状态"`);
}

const taskId = `task_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

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

// 检查自定义公网 URL 或自动获取
let customPublicUrl = null;
const publicUrlIdx = args.indexOf('--public-url');
if (publicUrlIdx !== -1 && args[publicUrlIdx + 1]) {
  customPublicUrl = args[publicUrlIdx + 1];
}

const tunnelManager = new TunnelManager({ customUrl: customPublicUrl });

console.log('='.repeat(65));
console.log(`[AgentRelay] 🚀 正在托管启动任务: ${targetCmd}`);
console.log(`[AgentRelay] 🆔 会话 ID: ${taskId}`);
if (sleepBlocker.isActive()) {
  console.log(`[AgentRelay] 🔋 防休眠保活已生效：任务运行期间工位电脑将保持唤醒状态`);
}
console.log(`[AgentRelay] 📱 局域网访问入口 (同一 Wi-Fi 或热点直接打开):`);
console.log(`             👉 \x1b[36m\x1b[1m${lanMobileUrl}\x1b[0m`);

// 申请全球公网隧道
console.log(`[AgentRelay] 🌐 正在申请全球公网安全通道...`);
const pubUrl = await tunnelManager.getPublicUrl(relayPort, 4000);
if (pubUrl) {
  const remoteUrl = `${pubUrl}/?task=${taskId}`;
  console.log(`[AgentRelay] 🌐 全球公网访问入口 (下班回家/手机4G/5G随时随地操控):`);
  console.log(`             👉 \x1b[32m\x1b[1m${remoteUrl}\x1b[0m`);
} else {
  console.log(`[AgentRelay] 💡 提示: 公网通道准备中，您亦可随时使用局域网入口或通过 --public-url 指定域名`);
}

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

child.stdout.on('data', (chunk) => {
  const text = chunk.toString();
  process.stdout.write(text);
  session.handleOutput(text);

  const prompt = detector.evaluatePrompt();
  if (prompt) {
    console.log(`\n[AgentRelay] 🔔 检测到交互提问阻断，已同步到手机端: "${prompt.question}"`);
    session.handlePromptDetected(prompt);
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
  const action = await session.tick();
  if (action === 'KILL') {
    console.log('\n[AgentRelay] 🛑 收到手机端紧急制动指令，正在中止任务...');
    child.kill('SIGINT');
    clearInterval(pollInterval);
  } else if (action) {
    console.log(`\n[AgentRelay] 📱 收到手机端远程决策指令: "${action}"，已注入执行`);
    child.stdin.write(`${action}\n`);
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
