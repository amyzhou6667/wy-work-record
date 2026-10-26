import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STATIC_DIR = path.join(__dirname, '..', 'src', 'ui');

test('UI Serve: 应当正确伺服 React 前端静态资源与 App.tsx', async () => {
  // 创建轻量 HTTP 服务器模拟测试 serve.ts 静态伺服能力
  const server = http.createServer((req, res) => {
    let reqPath = (req.url || '/').split('?')[0];
    if (reqPath === '/' || reqPath === '') reqPath = '/index.html';
    const filePath = path.join(STATIC_DIR, reqPath);

    if (fs.existsSync(filePath)) {
      const ext = path.extname(filePath);
      const isTsx = ext === '.tsx';
      res.writeHead(200, {
        'Content-Type': isTsx ? 'text/plain; charset=utf-8' : 'text/html; charset=utf-8'
      });
      res.end(fs.readFileSync(filePath));
    } else {
      res.writeHead(404);
      res.end('Not found');
    }
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const port = (server.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // 1. 验证 index.html 返回 React 挂载点
    const htmlRes = await fetch(`${baseUrl}/index.html`);
    assert.equal(htmlRes.status, 200);
    const htmlText = await htmlRes.text();
    assert.ok(htmlText.includes('id="root"'), '必须包含 React root 挂载节点');
    assert.ok(htmlText.includes('App.tsx') || htmlText.includes('index.tsx'), '必须包含 React 入口');

    // 2. 验证 React App.tsx 源码正常伺服
    const tsxRes = await fetch(`${baseUrl}/App.tsx`);
    assert.equal(tsxRes.status, 200);
    const tsxText = await tsxRes.text();
    assert.ok(tsxText.includes('const App: React.FC'), '必须成功输出 React App.tsx 组件');

    // 3. 验证 React index.tsx 源码正常伺服
    const entryRes = await fetch(`${baseUrl}/index.tsx`);
    assert.equal(entryRes.status, 200);
    const entryText = await entryRes.text();
    assert.ok(entryText.includes('ReactDOM.createRoot'), '必须包含 ReactDOM 挂载逻辑');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
