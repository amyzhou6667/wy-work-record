/**
 * ToneRelay - 本地轻量 Web 预览静态服务器 (纯 Node 原生 TypeScript 运行时支持)
 * 支持原生 TypeScript 文件即时 stripTypes 伺服至移动端 H5 浏览器
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import moduleApi from 'node:module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 8088;
const STATIC_DIR = path.join(__dirname, 'src', 'ui');

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.ts': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml'
};

const LOG_PATH = path.join(__dirname, 'server.log');
function logMessage(...args: any[]) {
  const msg = `[${new Date().toISOString()}] ${args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')}`;
  try {
    fs.appendFileSync(LOG_PATH, msg + '\n');
  } catch {}
  console.log(...args);
}

const server = http.createServer((req, res) => {
  req.on('error', (err) => {
    logMessage('⚠️ Request error:', err.message);
  });
  res.on('error', (err) => {
    logMessage('⚠️ Response error:', err.message);
  });

  let reqPath = (req.url || '/').split('?')[0];
  if (reqPath === '/' || reqPath === '') {
    reqPath = '/index.html';
  }

  let filePath = path.join(STATIC_DIR, reqPath);
  let ext = path.extname(filePath).toLowerCase();

  // 若请求 .js 但本地存在同名 .ts，则自动映射到 .ts
  if (ext === '.js' && !fs.existsSync(filePath)) {
    const tsPath = filePath.slice(0, -3) + '.ts';
    if (fs.existsSync(tsPath)) {
      filePath = tsPath;
      ext = '.ts';
    }
  }

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('404 Not Found');
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('500 Server Internal Error: ' + err.code);
      }
      return;
    }

    let body: string | Buffer = content;
    let contentType = MIME_TYPES[ext] || 'application/octet-stream';

    // 若伺服 .ts 源码至浏览器，动态通过 Node 内置 stripTypeScriptTypes 转换为浏览器可直接执行的 JavaScript
    if (ext === '.ts') {
      contentType = 'application/javascript; charset=utf-8';
      try {
        const rawTs = content.toString('utf8');
        const stripFn = (moduleApi as any).stripTypeScriptTypes;
        if (typeof stripFn === 'function') {
          body = stripFn(rawTs);
        } else {
          body = rawTs.replace(/:\s*[A-Za-z0-9_<>\[\]|&]+/g, '');
        }
      } catch (stripErr: any) {
        logMessage('⚠️ stripTypeScriptTypes error for ' + reqPath + ':', stripErr?.message);
        body = content.toString('utf8');
      }
    }

    try {
      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      });
      res.end(body);
    } catch (sendErr: any) {
      logMessage('⚠️ Error sending response for ' + reqPath + ':', sendErr?.message);
    }
  });
});

function getLocalIPs(): string[] {
  const interfaces = os.networkInterfaces();
  const ips: string[] = [];
  for (const name of Object.keys(interfaces)) {
    const netList = interfaces[name];
    if (netList) {
      for (const iface of netList) {
        if (iface.family === 'IPv4' && !iface.internal) {
          ips.push(iface.address);
        }
      }
    }
  }
  return ips;
}

server.on('error', (err: any) => {
  logMessage('❌ Server error:', err.message, err.stack);
});

process.on('uncaughtException', (err) => {
  logMessage('❌ Uncaught exception:', err.message, err.stack);
});

process.on('unhandledRejection', (reason: any) => {
  logMessage('❌ Unhandled rejection:', reason);
});

process.on('exit', (code) => {
  logMessage('ℹ️ Process exiting with code:', code);
});

// 定时保活心跳，保持事件循环持续活跃防止 Windows 子进程空闲退出
setInterval(() => {}, 30000);

server.listen(PORT, '0.0.0.0', () => {
  const ips = getLocalIPs();
  logMessage('=======================================================');
  logMessage('🎨 ToneRelay 本地静态体验服务已成功启动 (TypeScript 引擎)！');
  logMessage(`💻 本机电脑访问地址: http://localhost:${PORT}`);
  if (ips.length > 0) {
    logMessage(`📱 手机/局域网设备访问地址:`);
    ips.forEach(ip => logMessage(`   👉 http://${ip}:${PORT}`));
  }
  logMessage('=======================================================');
});
