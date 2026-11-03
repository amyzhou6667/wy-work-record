import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { EventEmitter } from 'node:events';
import { DocParserEngine } from './engines/docParser.ts';
import { JianYingSrtEngine } from './engines/srtGenerator.ts';
import { PromptAdapterEngine } from './engines/promptAdapter.ts';
import { ExportFormatter } from './engines/exportFormatter.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UI_DIR = path.join(__dirname, 'ui');

const docEngine = new DocParserEngine();
const srtEngine = new JianYingSrtEngine();
const promptEngine = new PromptAdapterEngine();
const exportFormatter = new ExportFormatter();

const MIME_MAP: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.tsx': 'text/plain; charset=utf-8',
  '.ts': 'text/plain; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml'
};

export function createRequestHandler() {
  return async (req: any, res: any) => {
    const url = new URL(req.url || '/', `http://${req.headers?.host || 'localhost'}`);
    const pathname = url.pathname;

    res.setHeader?.('Access-Control-Allow-Origin', '*');
    res.setHeader?.('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader?.('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const parseBody = (): Promise<any> => {
      return new Promise((resolve) => {
        if (req._bodyParsed !== undefined) {
          return resolve(req._bodyParsed);
        }
        let body = '';
        req.on('data', (chunk: any) => { body += chunk; });
        req.on('end', () => {
          try {
            resolve(body ? JSON.parse(body) : {});
          } catch {
            resolve({});
          }
        });
      });
    };

    // API 路由
    if (pathname === '/api/v1/parse' && req.method === 'POST') {
      const { fileName, content } = await parseBody();
      const doc = docEngine.parseTextDocument(fileName || 'novel.txt', content || '');
      const outline = doc.chapters[0] ? docEngine.extractEpisodeOutline(doc.chapters[0]) : null;
      const shots = doc.chapters[0] ? docEngine.decomposeToShots(doc.chapters[0]) : [];

      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ code: 0, data: { doc, outline, shots } }));
      return;
    }

    if (pathname === '/api/v1/srt' && req.method === 'POST') {
      const { shots, config } = await parseBody();
      const result = srtEngine.generateSubtitles(shots || [], config);
      const srtText = srtEngine.toSrtString(result.items);

      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ code: 0, data: { ...result, srtText } }));
      return;
    }

    // 静态文件服务
    const relativePath = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
    const filePath = path.join(UI_DIR, relativePath);

    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const ext = path.extname(filePath).toLowerCase();
      const mime = MIME_MAP[ext] || 'application/octet-stream';
      const fileContent = fs.readFileSync(filePath);
      res.writeHead(200, { 'Content-Type': mime });
      res.end(fileContent);
      return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('404 Not Found');
  };
}

export function simulateRequest(
  handler: (req: any, res: any) => Promise<void> | void,
  method: string,
  pathname: string,
  body?: any
): Promise<{ status: number; headers: Record<string, string>; text: string; json: () => any }> {
  return new Promise((resolve) => {
    const req = new EventEmitter() as any;
    req.method = method;
    req.url = pathname;
    req.headers = { host: 'localhost' };
    if (body !== undefined) {
      req._bodyParsed = body;
    }

    const resHeaders: Record<string, string> = {};
    let statusCode = 200;
    let responseBody = '';

    const res = {
      writeHead: (code: number, headers?: Record<string, string>) => {
        statusCode = code;
        if (headers) {
          Object.assign(resHeaders, headers);
        }
      },
      setHeader: (key: string, val: string) => {
        resHeaders[key] = val;
      },
      end: (data?: any) => {
        if (data) {
          responseBody += typeof data === 'string' ? data : data.toString('utf-8');
        }
        resolve({
          status: statusCode,
          headers: resHeaders,
          text: responseBody,
          json: () => JSON.parse(responseBody)
        });
      }
    };

    Promise.resolve(handler(req, res)).catch((err) => {
      resolve({
        status: 500,
        headers: {},
        text: err.message,
        json: () => ({ error: err.message })
      });
    });

    if (body !== undefined) {
      req.emit('data', JSON.stringify(body));
    }
    req.emit('end');
  });
}

export function createServer() {
  const handler = createRequestHandler();
  return http.createServer(handler);
}

// 直接运行启动
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3200;
  const server = createServer();
  server.listen(PORT, () => {
    console.log(`[AI-StoryBoard-Studio] Server running at http://localhost:${PORT}`);
  });
}
