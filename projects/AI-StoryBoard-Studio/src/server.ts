import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { EventEmitter } from 'node:events';
import { DocParserEngine } from './engines/docParser.ts';
import { JianYingSrtEngine } from './engines/srtGenerator.ts';
import { PromptAdapterEngine } from './engines/promptAdapter.ts';
import { ExportFormatter } from './engines/exportFormatter.ts';
import { LLMStoryboardService } from './engines/llmService.ts';
import { WorkflowEngine } from './engines/workflowEngine.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UI_DIR = path.join(__dirname, 'ui');

const docEngine = new DocParserEngine();
const srtEngine = new JianYingSrtEngine();
const promptEngine = new PromptAdapterEngine();
const exportFormatter = new ExportFormatter();
const llmService = new LLMStoryboardService();
const workflowEngine = new WorkflowEngine();

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

    // API 路由: 基础解析
    if (pathname === '/api/v1/parse' && req.method === 'POST') {
      const { fileName, content, characters, aspectRatio } = await parseBody();
      const doc = docEngine.parseTextDocument(fileName || 'novel.txt', content || '');
      const outline = doc.chapters[0] ? docEngine.extractEpisodeOutline(doc.chapters[0]) : null;
      const shots = doc.chapters[0] ? docEngine.decomposeToShots(doc.chapters[0], characters || [], aspectRatio || '9:16') : [];

      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ code: 0, data: { doc, outline, shots } }));
      return;
    }

    // API 路由: 多智能体工作流全流程串行运行
    if (pathname === '/api/v1/workflow/run-all' && req.method === 'POST') {
      const body = await parseBody();
      let ctx = body.context;
      if (!ctx) {
        ctx = workflowEngine.createInitialContext(body.novelText || '', body.aspectRatio || '9:16');
        if (body.characters?.length) ctx.characters = body.characters;
        if (body.agentConfigs) ctx.agentConfigs = { ...ctx.agentConfigs, ...body.agentConfigs };
      }
      const resultCtx = await workflowEngine.runAll(ctx);
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ code: 0, data: resultCtx }));
      return;
    }

    // API 路由: 多智能体工作流单阶段独立运行
    if (pathname === '/api/v1/workflow/run-stage' && req.method === 'POST') {
      const body = await parseBody();
      const stage = body.stage;
      const ctx = body.context || workflowEngine.createInitialContext(body.novelText || '', body.aspectRatio || '9:16');
      if (body.agentConfigs) ctx.agentConfigs = { ...ctx.agentConfigs, ...body.agentConfigs };
      const resultCtx = await workflowEngine.runStage(ctx, stage);
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ code: 0, data: resultCtx }));
      return;
    }

    // API 路由: 增量重跑生图 Prompt (保护用户镜头动作对白)
    if (pathname === '/api/v1/workflow/incremental-prompts' && req.method === 'POST') {
      const body = await parseBody();
      const ctx = body.context;
      const resultCtx = await workflowEngine.runIncrementalPrompts(ctx);
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ code: 0, data: resultCtx }));
      return;
    }

    // API 路由: 大模型智能分镜拆解
    if (pathname === '/api/v1/ai-decompose' && req.method === 'POST') {
      const body = await parseBody();
      const result = await llmService.decompose({
        novelText: body.novelText || '',
        aspectRatio: body.aspectRatio || '9:16',
        characters: body.characters || [],
        llmConfig: body.llmConfig
      });

      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ code: 0, data: result }));
      return;
    }

    // API 路由: 单镜头 AI 润色
    if (pathname === '/api/v1/ai-refine' && req.method === 'POST') {
      const body = await parseBody();
      const refinedShot = await llmService.refineShot({
        shot: body.shot,
        userInstruction: body.userInstruction || '',
        characters: body.characters || [],
        aspectRatio: body.aspectRatio || '9:16',
        llmConfig: body.llmConfig
      });

      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ code: 0, data: { shot: refinedShot } }));
      return;
    }

    // API 路由: 剪映 SRT 导出
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
    req._bodyParsed = body;

    let statusCode = 200;
    const responseHeaders: Record<string, string> = {};
    let responseBody = '';

    const res = {
      setHeader(name: string, value: string) {
        responseHeaders[name.toLowerCase()] = value;
      },
      writeHead(code: number, headers?: Record<string, string>) {
        statusCode = code;
        if (headers) {
          Object.assign(responseHeaders, headers);
        }
      },
      end(data?: any) {
        if (data) {
          responseBody += Buffer.isBuffer(data) ? data.toString('utf-8') : String(data);
        }
        resolve({
          status: statusCode,
          headers: responseHeaders,
          text: responseBody,
          json: () => {
            try {
              return JSON.parse(responseBody);
            } catch {
              return null;
            }
          }
        });
      }
    };

    handler(req, res);
  });
}

// 命令行直接启动服务
if (process.argv[1] && process.argv[1].endsWith('server.ts')) {
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  const server = http.createServer(createRequestHandler());
  server.listen(PORT, () => {
    console.log(`🎬 [AI-StoryBoard-Studio] 服务已启动: http://localhost:${PORT}`);
  });
}
