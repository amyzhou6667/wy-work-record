#!/usr/bin/env node
import { spawn } from 'node:child_process';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { PromptDetector } from './detector/index.ts';
import { CloudSyncClient } from './client/sync.ts';
import { RelaySession } from './session.ts';
import { createRelayServer } from './server/index.ts';
import { SleepBlocker } from './platform/sleep_blocker.ts';
import { TunnelManager } from './platform/tunnel.ts';
import { ClaudeWatcher } from './watcher/claude_watcher.ts';
import { WindowsKeyInjector } from './platform/injector.ts';
import { fileURLToPath } from 'node:url';
import { EngineManager } from './engine/manager.ts';
import { AntigravityAdapter } from './engine/adapters/antigravity.ts';
import { DshAdapter } from './engine/adapters/dsh.ts';
import { ClaudeAdapter } from './engine/adapters/claude.ts';
import type { IEngineAdapter } from './types/engine.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const args = process.argv.slice(2);

// 更加健壮地解析 CLI 参数与目标命令
let targetCwd = process.cwd();
let customPublicUrl: string | null = null;
let noSleepBlock = false;
let targetEngine = 'auto';

// 提取标志参数
const cleanedArgs: string[] = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--cwd' && args[i + 1]) {
    targetCwd = path.resolve(args[i + 1]);
    i++;
  } else if (args[i] === '--public-url' && args[i + 1]) {
    customPublicUrl = args[i + 1];
    i++;
  } else if (args[i] === '--engine' && args[i + 1]) {
    targetEngine = args[i + 1].toLowerCase();
    i++;
  } else if (args[i] === '--no-sleep-block') {
    noSleepBlock = true;
  } else {
    cleanedArgs.push(args[i]);
  }
}

const isWatchMode = cleanedArgs.includes('watch');
const runIdx = cleanedArgs.indexOf('run');

if (!isWatchMode && (runIdx === -1 || !cleanedArgs[runIdx + 1])) {
  console.log(`
AgentRelay - 远程 AI 任务伴侣 (TypeScript 版)

使用方法:
  # 方式 1: 伴侣监听模式 (推荐！不干扰 codemaker 窗口，直接监听已运行的项目)
  node projects/AgentRelay/src/cli.ts watch [项目路径] [选项]

  # 方式 2: 托管启动模式
  node projects/AgentRelay/src/cli.ts run "<command>" [选项]

选项:
  --cwd <path>         指定工作区目录
  --public-url <url>   指定国内云服务器或穿透域名 (如 cpolar 国内节点分配的域名)
  --no-sleep-block     禁用自动防休眠保活

示例:
  # 监听 opendeck 项目的 Claude 会话，手机微信随时看进度与确认:
  node projects/AgentRelay/src/cli.ts watch "D:\\hyper-v\\share\\proj\\opendeck" --public-url http://5ba752e9.r6.cpolar.cn
`);
  process.exit(1);
}

// 拼接 run 后面的所有参数作为目标执行命令（防止 PowerShell 引号吞掉空格）
let rawCmd = cleanedArgs.slice(runIdx + 1).join(' ').trim();

// 容错处理：如果 rawCmd 内部由于 PowerShell 引号逃逸遗留了 --cwd 或 --public-url，剥离干净
rawCmd = rawCmd.replace(/--cwd\s+("[^"]+"|[^\s]+)/g, (_match, p1) => {
  if (targetCwd === process.cwd()) {
    targetCwd = path.resolve(p1.replace(/^"|"$/g, ''));
  }
  return '';
});
rawCmd = rawCmd.replace(/--public-url\s+("[^"]+"|[^\s]+)/g, (_match, p1) => {
  if (!customPublicUrl) {
    customPublicUrl = p1.replace(/^"|"$/g, '');
  }
  return '';
});
rawCmd = rawCmd.replace(/--no-sleep-block/g, () => {
  noSleepBlock = true;
  return '';
}).trim();

// 清理可能由于 PowerShell 传参残留的尾部反斜杠或多余引号
rawCmd = rawCmd.replace(/\\+$/, '').trim();

let targetCmd = rawCmd;

// 1. 智能别名与 Windows 路径解析
const homeDir = os.homedir();
const localBinClaude = path.join(homeDir, '.local', 'bin', 'claude.exe');

if (targetCmd === 'claude-code' || targetCmd.startsWith('claude-code ')) {
  targetCmd = targetCmd.replace(/^claude-code/, fs.existsSync(localBinClaude) ? `"${localBinClaude}"` : 'claude');
} else if (targetCmd === 'claude' || targetCmd.startsWith('claude ')) {
  if (fs.existsSync(localBinClaude)) {
    targetCmd = targetCmd.replace(/^claude/, `"${localBinClaude}"`);
  }
}

const taskId = `task_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

// 2. 激活系统防休眠保活锁
const sleepBlocker = new SleepBlocker();
if (!noSleepBlock) {
  sleepBlocker.enable();
}

// 3. 启动轻量中继服务与手机端 H5 服务
let relayPort = 3300;
let serverInstance: http.Server | undefined;
try {
  const s = await createRelayServer({ port: 3300 });
  relayPort = s.port;
  serverInstance = s.server;
} catch (e) {
  const s = await createRelayServer({ port: 0 });
  relayPort = s.port;
  serverInstance = s.server;
}

// 4. 解析局域网 IP 与穿透域名
function getNetworkIps(): string[] {
  const interfaces = os.networkInterfaces();
  const ips: string[] = [];
  for (const name of Object.keys(interfaces)) {
    const netList = interfaces[name];
    if (netList) {
      for (const net of netList) {
        if (net.family === 'IPv4' && !net.internal) {
          ips.push(net.address);
        }
      }
    }
  }
  return ips;
}

const lanIps = getNetworkIps();
const lanMobileUrl = lanIps.length > 0 
  ? `http://${lanIps[0]}:${relayPort}/?task=${taskId}` 
  : `http://localhost:${relayPort}/?task=${taskId}`;

// 使用已解析的自定义域名或国内穿透域名
const tunnelManager = new TunnelManager({ customUrl: customPublicUrl });

// 处理伴侣监听模式 (Watch Mode)
if (isWatchMode) {
  const watchIdx = cleanedArgs.indexOf('watch');
  if (cleanedArgs[watchIdx + 1] && !cleanedArgs[watchIdx + 1].startsWith('-')) {
    targetCwd = path.resolve(cleanedArgs[watchIdx + 1]);
  }

  console.log('='.repeat(65));
  console.log(`[AgentRelay] 🛰️ 伴侣监听模式已启动 (不干扰 codemaker/终端窗口操作)`);
  console.log(`[AgentRelay] 📂 正在守望项目: ${targetCwd}`);
  console.log(`[AgentRelay] 🆔 会话 ID: ${taskId}`);
  if (sleepBlocker.isActive()) {
    console.log(`[AgentRelay] 🔋 防休眠保活已生效：工位电脑将保持唤醒状态`);
  }
  console.log(`[AgentRelay] 📱 局域网访问入口: 👉 ${lanMobileUrl}`);

  let currentActivePubUrl: string | null = null;
  const printPublicUrl = (pubUrl: string | null) => {
    if (pubUrl && pubUrl !== currentActivePubUrl) {
      currentActivePubUrl = pubUrl;
      const remoteUrl = `${pubUrl}/?task=${taskId}`;
      console.log(`[AgentRelay] 🌐 国内穿透访问入口 (手机 4G/5G 直连秒开):`);
      console.log(`             👉 \x1b[32m\x1b[1m${remoteUrl}\x1b[0m`);
      console.log('='.repeat(65));
    }
  };

  tunnelManager.getPublicUrl(relayPort).then(printPublicUrl);

  // 定时每 30 秒感知 cpolar 是否因夜间网络波动重新分配了新域名
  setInterval(async () => {
    try {
      const dynamicUrl = await tunnelManager.detectRunningCpolarTunnel(relayPort);
      if (dynamicUrl && dynamicUrl !== currentActivePubUrl) {
        console.log(`\n[AgentRelay] 🔄 检测到 cpolar 穿透域名已自动更新:`);
        printPublicUrl(dynamicUrl);
      }
    } catch (e) {}
  }, 30000);

  // 初始化引擎插件管理器与适配器
  const engineManager = new EngineManager();
  const enginesConfigPath = path.join(__dirname, '../config/engines.json');
  if (fs.existsSync(enginesConfigPath)) {
    try {
      engineManager.loadFromFile(enginesConfigPath);
      engineManager.enableHotReload();
    } catch (e) {}
  }
  engineManager.registerAdapter(new AntigravityAdapter());
  engineManager.registerAdapter(new DshAdapter());
  engineManager.registerAdapter(new ClaudeAdapter());

  let activeAdapter: IEngineAdapter = engineManager.getAdapter('claude') || new ClaudeAdapter();
  if (targetEngine !== 'auto') {
    const selected = engineManager.getAdapter(targetEngine);
    if (selected) {
      activeAdapter = selected;
    }
  } else {
    const detected = await engineManager.autoDetect(targetCwd);
    if (detected) {
      activeAdapter = detected;
    }
  }

  console.log(`[AgentRelay] 🤖 当前适配引擎: ${activeAdapter.name} (ID: ${activeAdapter.id})`);

  const syncClient = new CloudSyncClient({ mode: 'http', baseUrl: `http://127.0.0.1:${relayPort}` });
  await fetch(`http://127.0.0.1:${relayPort}/api/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      taskId,
      command: `Watch: ${path.basename(targetCwd)}`,
      engine_id: activeAdapter.id
    })
  });

  console.log(`[AgentRelay] 👂 正在无侵入监听 ${activeAdapter.name} 会话流，终端操作与阻断提问将实时同步到手机端...`);

  activeAdapter.startWatch(targetCwd, async (session) => {
    if (session.status === 'pending' && session.currentDecision) {
      console.log(`\n[AgentRelay] 🔔 触发人工裁决关卡，手机端已震动弹窗！`);
      console.log(`             提问: "${session.currentDecision.question}"`);
      await syncClient.reportPrompt(taskId, {
        question: session.currentDecision.question,
        suggested_options: (session.currentDecision.options || []).map(o => ({
          index: String(o.id),
          label: o.label
        })),
        recent_logs: session.recentLogs
      });
    } else if (session.recentLogs.length > 0) {
      try {
        await fetch(`http://127.0.0.1:${relayPort}/api/tasks/${taskId}/logs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ logs: session.recentLogs })
        });
      } catch (e) {}
    }
  });

  // 轮询手机端是否有点击决策
  setInterval(async () => {
    const cmd = await syncClient.pollCommand(taskId);
    if (cmd) {
      let action = cmd.payload || (cmd as any).action || '';
      console.log(`\n[AgentRelay] 📱 收到手机端下发的裁决决策: "${action}"`);
      await activeAdapter.injectDecision(taskId, {
        taskId,
        engineId: activeAdapter.id,
        action: 'confirm',
        payload: action,
        timestamp: Date.now()
      });
      await syncClient.ackCommand(cmd._id);
    }
  }, 1000);

  // 监听 Ctrl+C 优雅退出
  process.on('SIGINT', () => {
    console.log('\n[AgentRelay] 🛑 伴侣监听已安全退出');
    activeAdapter.stopWatch();
    sleepBlocker.disable();
    tunnelManager.close();
    if (serverInstance) serverInstance.close();
    process.exit(0);
  });

  // 保持主事件循环存活
  await new Promise(() => {});
}

// 以下为 run 托管执行模式
console.log('='.repeat(65));
console.log(`[AgentRelay] 🚀 正在托管启动任务: ${targetCmd}`);
console.log(`[AgentRelay] 📂 工作区目录: ${targetCwd}`);
console.log(`[AgentRelay] 🆔 会话 ID: ${taskId}`);
if (sleepBlocker.isActive()) {
  console.log(`[AgentRelay] 🔋 防休眠保活已生效：任务运行期间工位电脑将保持唤醒状态`);
}
console.log(`[AgentRelay] 📱 局域网访问入口 (公司同 Wi-Fi 或热点直连):`);
console.log(`             👉 \x1b[36m\x1b[1m${lanMobileUrl}\x1b[0m`);

// 尝试获取国内穿透域名
tunnelManager.getPublicUrl(relayPort).then((pubUrl) => {
  if (pubUrl) {
    const remoteUrl = `${pubUrl}/?task=${taskId}`;
    console.log(`[AgentRelay] 🌐 国内穿透访问入口 (手机 4G/5G 流量极速秒开):`);
    console.log(`             👉 \x1b[32m\x1b[1m${remoteUrl}\x1b[0m`);
    console.log('='.repeat(65));
  } else if (!customPublicUrl) {
    console.log(`[AgentRelay] 💡 跨公网提示: 本机暂未安装 cpolar。如需回家手机流量访问，推荐在电脑运行 cpolar http 3300，或启动时带上 --public-url <你的国内域名>`);
    console.log('='.repeat(65));
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
  cwd: targetCwd,
  shell: true,
  stdio: ['pipe', 'pipe', 'pipe']
});

child.stdout?.on('data', async (chunk) => {
  const text = chunk.toString();
  process.stdout.write(text);
  session.handleOutput(text);

  const prompt = detector.evaluatePrompt();
  if (prompt) {
    console.log(`\n[AgentRelay] 🔔 检测到交互提问阻断，已同步至手机端: "${prompt.question}"`);
    session.handlePromptDetected(prompt);
  }
});

child.stderr?.on('data', (chunk) => {
  process.stderr.write(chunk);
});

// 监听键盘本地输入
process.stdin.on('data', (chunk) => {
  child.stdin?.write(chunk);
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
    child.stdin?.write(`${action}\n`);
    session.status = 'RUNNING';
  }
}, 1000);

child.on('close', async (code) => {
  clearInterval(pollInterval);
  await session.handleExit(code ?? 0);
  console.log(`\n[AgentRelay] 🏁 任务结束，退出码: ${code}`);

  // 释放资源
  sleepBlocker.disable();
  tunnelManager.close();
  if (serverInstance) {
    serverInstance.close();
  }
  process.exit(code || 0);
});
