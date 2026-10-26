import test from 'node:test';
import assert from 'node:assert/strict';
import { createRelayServer } from '../src/server/index.ts';

test('RelayServer: 应当支持任务注册、提问上报与手机端决策回传闭环', async () => {
  const { server, port } = await createRelayServer({ port: 0 }); // 随机可用端口
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // 1. PC 端注册任务
    const regRes = await fetch(`${baseUrl}/api/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId: 'test_task_1', command: 'claude-code' })
    });
    const regData: any = await regRes.json();
    assert.equal(regData.status, 'RUNNING');

    // 2. PC 端上报阻断提问
    const promptRes = await fetch(`${baseUrl}/api/tasks/test_task_1/prompt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: 'Allow write to file? [Y/n]',
        recent_logs: ['log 1', 'Allow write to file? [Y/n]'],
        suggested_options: ['Y', 'N']
      })
    });
    const promptData: any = await promptRes.json();
    assert.equal(promptData.status, 'WAITING_CONFIRMATION');

    // 3. 手机端拉取当前任务状态
    const getRes = await fetch(`${baseUrl}/api/tasks/test_task_1`);
    const taskState: any = await getRes.json();
    assert.equal(taskState.status, 'WAITING_CONFIRMATION');
    assert.equal(taskState.prompt_data.question, 'Allow write to file? [Y/n]');

    // 4. 手机端点击回传确认 "y"
    const actionRes = await fetch(`${baseUrl}/api/tasks/test_task_1/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action_type: 'INPUT', payload: 'y' })
    });
    const actionData: any = await actionRes.json();
    assert.equal(actionData.ok, true);

    // 5. PC 端拉取并消费指令
    const pollRes = await fetch(`${baseUrl}/api/tasks/test_task_1/poll`);
    const polledCmd: any = await pollRes.json();
    assert.ok(polledCmd.command, '必须拉取到手机端下发的指令');
    assert.equal(polledCmd.command.payload, 'y');

    // 6. 验证移动端页面 HTML 正常返回且为 React 架构
    const htmlRes = await fetch(`${baseUrl}/`);
    const htmlText = await htmlRes.text();
    assert.ok(htmlText.includes('AgentRelay'), '应当能访问手机端 H5 页面');
    assert.ok(htmlText.includes('id="root"'), '应当包含 React 挂载根节点');
    assert.ok(htmlText.includes('index.tsx'), '应当加载 React TypeScript 入口');

    // 7. 验证 React 组件与样式静态伺服
    const tsxRes = await fetch(`${baseUrl}/App.tsx`);
    assert.equal(tsxRes.status, 200);
    const tsxText = await tsxRes.text();
    assert.ok(tsxText.includes('export const App: React.FC'), '应当能成功伺服 React App.tsx 源码');

    const cssRes = await fetch(`${baseUrl}/styles.css`);
    assert.equal(cssRes.status, 200);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
