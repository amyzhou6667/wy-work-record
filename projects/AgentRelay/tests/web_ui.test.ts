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

  it('应当确保移动端 H5 页面具备免裸模块依赖兼容性，杜绝首屏死锁', async () => {
    const { server, port } = await createRelayServer({ port: 0 });
    try {
      const res = await fetch(`http://127.0.0.1:${port}/`);
      assert.equal(res.status, 200);
      const html = await res.text();

      // 验证不能存在导致浏览器报 Failed to resolve module specifier "react" 的裸导入 module 标签
      assert.ok(!html.includes('data-type="module"'), '页面不应包含引发裸模块解析崩溃的 data-type="module"');
      assert.ok(html.includes('index.tsx'), '页面应加载 index.tsx 入口');

      // 验证入口文件正确伺服且包含挂载逻辑
      const entryRes = await fetch(`http://127.0.0.1:${port}/index.tsx`);
      assert.equal(entryRes.status, 200);
      const entryCode = await entryRes.text();
      assert.ok(entryCode.includes('ReactDOMObj') || entryCode.includes('createRoot'), '入口必须包含 ReactDOM 根挂载逻辑');
    } finally {
      server.close();
    }
  });

  it('应当确保 index.tsx 经 Babel 编译后无非 module 的 export 语法，能在浏览器无 SyntaxError 运行', async () => {
    const fs = await import('node:fs');
    const vm = await import('node:vm');
    const path = await import('node:path');
    const babelPath = path.resolve('projects/AgentRelay/src/web/vendor/babel.min.js');
    const indexPath = path.resolve('projects/AgentRelay/src/web/index.tsx');

    const babelCode = fs.readFileSync(babelPath, 'utf-8');
    const indexTsx = fs.readFileSync(indexPath, 'utf-8');

    const sandbox: any = { window: {}, console };
    sandbox.window = sandbox;
    sandbox.self = sandbox;
    vm.createContext(sandbox);
    vm.runInContext(babelCode, sandbox);
    const Babel = sandbox.Babel || sandbox.window.Babel;

    const transpiled = Babel.transform(indexTsx, { filename: 'index.tsx', presets: ['react', 'typescript'] });
    // 断言产物中绝对不能存在 export 语句，否则在非 module script 中报 SyntaxError: Unexpected token 'export'
    assert.equal(transpiled.code.includes('export '), false, '转译后产物不得包含导致浏览器报 SyntaxError 的 export 语句');
  });
});
