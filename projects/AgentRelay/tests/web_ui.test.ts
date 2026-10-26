import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createRelayServer } from '../src/server/index.ts';

describe('Web UI & Server Multi-Task API 集成测试', () => {
  it('应当正确托管 React 静态资源与页面', async () => {
    const { server, port } = await createRelayServer({ port: 0 });
    try {
      const res = await fetch(`http://127.0.0.1:${port}/`);
      assert.equal(res.status, 200);
      const html = await res.text();
      assert.ok(html.includes('AgentRelay'));

      const cssRes = await fetch(`http://127.0.0.1:${port}/styles.css`);
      assert.equal(cssRes.status, 200);
      const css = await cssRes.text();
      assert.ok(css.includes('task-tabs-container'));
      assert.ok(css.includes('engine-tag'));
    } finally {
      server.close();
    }
  });

  it('应当支持获取所有多引擎任务列表', async () => {
    const { server, port } = await createRelayServer({ port: 0 });
    try {
      // 注册 Antigravity 任务
      await fetch(`http://127.0.0.1:${port}/api/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: 'task-ag',
          command: 'Antigravity PRD Auto-Gen',
          engine_id: 'antigravity'
        })
      });

      // 注册 dsh 任务
      await fetch(`http://127.0.0.1:${port}/api/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: 'task-dsh',
          command: 'dsh test runner',
          engine_id: 'dsh'
        })
      });

      const listRes = await fetch(`http://127.0.0.1:${port}/api/tasks`);
      assert.equal(listRes.status, 200);
      const list = await listRes.json();
      assert.equal(list.length, 2);
      assert.equal(list[0].engine_id, 'antigravity');
      assert.equal(list[1].engine_id, 'dsh');
    } finally {
      server.close();
    }
  });

  it('当任务非待确认状态下发输入时，应当返回 409 冲突状态码', async () => {
    const { server, port } = await createRelayServer({ port: 0 });
    try {
      await fetch(`http://127.0.0.1:${port}/api/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: 'task-conflict-1', command: 'test' })
      });

      // task 目前为 RUNNING，非 WAITING_CONFIRMATION
      const actionRes = await fetch(`http://127.0.0.1:${port}/api/tasks/task-conflict-1/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action_type: 'INPUT', payload: 'y' })
      });

      assert.equal(actionRes.status, 409);
    } finally {
      server.close();
    }
  });
});
