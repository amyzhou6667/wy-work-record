import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const HTML_PATH = path.join(__dirname, '../web/index.html');

/**
 * 创建轻量中继 HTTP 服务器
 * @param {object} options
 * @returns {Promise<{server: http.Server, port: number}>}
 */
export function createRelayServer(options = {}) {
  const port = options.port !== undefined ? options.port : 3300;
  const tasks = new Map();
  const pendingCommands = new Map();

  const server = http.createServer((req, res) => {
    // 允许跨域
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
    const pathname = parsedUrl.pathname;

    // 1. 静态手机端 H5 页面
    if (pathname === '/' || pathname === '/index.html') {
      try {
        const html = fs.readFileSync(HTML_PATH, 'utf-8');
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(html);
      } catch (err) {
        res.writeHead(500);
        res.end('Failed to load mobile web UI');
      }
      return;
    }

    // 2. 收集 JSON Body
    let bodyText = '';
    req.on('data', chunk => { bodyText += chunk; });
    req.on('end', () => {
      let body = {};
      if (bodyText) {
        try { body = JSON.parse(bodyText); } catch (e) {}
      }

      // API: POST /api/tasks (注册任务)
      if (pathname === '/api/tasks' && req.method === 'POST') {
        const taskId = body.taskId || `task_${Date.now()}`;
        const task = {
          _id: taskId,
          command: body.command || 'unknown',
          status: 'RUNNING',
          created_at: Date.now(),
          updated_at: Date.now(),
          last_heartbeat: Date.now()
        };
        tasks.set(taskId, task);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(task));
        return;
      }

      // API: GET /api/tasks/:id (查询任务)
      const getTaskMatch = pathname.match(/^\/api\/tasks\/([^/]+)$/);
      if (getTaskMatch && req.method === 'GET') {
        const id = getTaskMatch[1];
        let task = tasks.get(id);
        // 如果未指定 ID 且有正在运行的任务，默认返回最新任务
        if (!task && (!id || id === '')) {
          task = Array.from(tasks.values()).pop();
        }
        if (!task && tasks.size > 0) {
          task = Array.from(tasks.values()).pop();
        }

        if (!task) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Task not found' }));
          return;
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(task));
        return;
      }

      // API: POST /api/tasks/:id/prompt (上报阻断提问)
      const promptMatch = pathname.match(/^\/api\/tasks\/([^/]+)\/prompt$/);
      if (promptMatch && req.method === 'POST') {
        const id = promptMatch[1];
        const task = tasks.get(id);
        if (!task) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Task not found' }));
          return;
        }

        task.status = 'WAITING_CONFIRMATION';
        task.prompt_data = {
          question: body.question,
          recent_logs: body.recent_logs || [],
          suggested_options: body.suggested_options || [],
          triggered_at: Date.now()
        };
        task.updated_at = Date.now();

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(task));
        return;
      }

      // API: POST /api/tasks/:id/logs (增量更新日志流)
      const logsMatch = pathname.match(/^\/api\/tasks\/([^/]+)\/logs$/);
      if (logsMatch && req.method === 'POST') {
        const id = logsMatch[1];
        const task = tasks.get(id);
        if (task) {
          if (!task.prompt_data) task.prompt_data = {};
          task.prompt_data.recent_logs = body.logs || [];
          task.updated_at = Date.now();
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
        return;
      }

      // API: POST /api/tasks/:id/action (手机端提交确认/中止决策)
      const actionMatch = pathname.match(/^\/api\/tasks\/([^/]+)\/action$/);
      if (actionMatch && req.method === 'POST') {
        const id = actionMatch[1];
        const task = tasks.get(id);
        if (!task) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Task not found' }));
          return;
        }

        const cmd = {
          _id: `cmd_${Date.now()}`,
          task_id: id,
          action_type: body.action_type || 'INPUT',
          payload: body.payload || '',
          status: 'PENDING',
          created_at: Date.now()
        };

        if (!pendingCommands.has(id)) {
          pendingCommands.set(id, []);
        }
        pendingCommands.get(id).push(cmd);

        if (cmd.action_type === 'INPUT') {
          task.status = 'RUNNING';
          delete task.prompt_data;
        } else if (cmd.action_type === 'KILL') {
          task.status = 'ABORTED';
        }
        task.updated_at = Date.now();

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, command_id: cmd._id }));
        return;
      }

      // API: GET /api/tasks/:id/poll (PC 端拉取指令)
      const pollMatch = pathname.match(/^\/api\/tasks\/([^/]+)\/poll$/);
      if (pollMatch && req.method === 'GET') {
        const id = pollMatch[1];
        const queue = pendingCommands.get(id) || [];
        const nextCmd = queue.shift() || null;

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ command: nextCmd }));
        return;
      }

      // 404
      res.writeHead(404);
      res.end('Not found');
    });
  });

  return new Promise((resolve, reject) => {
    server.listen(port, '0.0.0.0', () => {
      const actualPort = server.address().port;
      resolve({ server, port: actualPort });
    });
    server.on('error', reject);
  });
}
