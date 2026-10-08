#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { PromptDetector } from './detector/index.js';
import { CloudSyncClient } from './client/sync.js';
import { RelaySession } from './session.js';

const args = process.argv.slice(2);
const commandIdx = args.indexOf('run');

if (commandIdx === -1 || !args[commandIdx + 1]) {
  console.log(`
AgentRelay - 远程 AI 任务伴侣 (MVP)

使用方法:
  node projects/AgentRelay/src/cli.js run "<command>"

示例:
  node projects/AgentRelay/src/cli.js run "claude-code"
  node projects/AgentRelay/src/cli.js run "antigravity"
`);
  process.exit(1);
}

const targetCmd = args[commandIdx + 1];
const taskId = `task_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

console.log(`[AgentRelay] 🚀 正在托管启动任务: ${targetCmd}`);
console.log(`[AgentRelay] 🆔 会话 ID: ${taskId}`);

const detector = new PromptDetector({ silenceThresholdMs: 1500 });
const syncClient = new CloudSyncClient({ mode: 'mock' });
const session = new RelaySession({
  taskId,
  command: targetCmd,
  detector,
  syncClient
});

await session.start();

// 启动目标子进程 (支持 shell)
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
    console.log(`\n[AgentRelay] 🔔 检测到交互提问阻断，已同步至微信云中转: "${prompt.question}"`);
    session.handlePromptDetected(prompt);
  }
});

child.stderr.on('data', (chunk) => {
  process.stderr.write(chunk);
});

// 监听键盘本地输入（双向无缝响应）
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
  process.exit(code || 0);
});
