import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { EventEmitter } from 'node:events';
import { OnboardingService } from './services/onboarding.ts';
import { GoalEngine } from './services/goal_engine.ts';
import { ResilienceGuard } from './services/resilience_guard.ts';
import { CheckinService } from './services/checkin.ts';
import { PivotService } from './services/pivot.ts';
import { JsonStore } from './storage/store.ts';
import type { Goal, ExperienceAsset, DailyAction } from './types/index.ts';

export interface ServerOptions {
  port?: number;
  dataDir?: string;
}

export function createRequestHandler(options: ServerOptions = {}) {
  const store = new JsonStore(options.dataDir || 'projects/LifeCompass/data');
  const onboardingService = new OnboardingService();
  const goalEngine = new GoalEngine();
  const resilienceGuard = new ResilienceGuard();
  const checkinService = new CheckinService();
  const pivotService = new PivotService();

  const uiDir = path.resolve('projects/LifeCompass/src/ui');

  return async (req: any, res: any) => {
    const url = new URL(req.url || '/', `http://${req.headers?.host || 'localhost'}`);
    const pathname = url.pathname;

    const sendJson = (statusCode: number, data: any) => {
      res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(data));
    };

    const parseBody = (): Promise<any> => {
      return new Promise((resolve) => {
        if (req._bodyParsed !== undefined) {
          return resolve(req._bodyParsed);
        }
        let body = '';
        req.on('data', (chunk: any) => (body += chunk));
        req.on('end', () => {
          try {
            resolve(body ? JSON.parse(body) : {});
          } catch {
            resolve({});
          }
        });
      });
    };

    // 1. Static UI routes
    if (req.method === 'GET') {
      if (pathname === '/' || pathname === '/index.html') {
        const filePath = path.join(uiDir, 'index.html');
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf-8');
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          return res.end(content);
        }
      }
      if (pathname === '/styles.css') {
        const filePath = path.join(uiDir, 'styles.css');
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf-8');
          res.writeHead(200, { 'Content-Type': 'text/css; charset=utf-8' });
          return res.end(content);
        }
      }
      if (pathname === '/app.tsx') {
        const filePath = path.join(uiDir, 'app.tsx');
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf-8');
          res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
          return res.end(content);
        }
      }
      if (pathname.startsWith('/vendor/')) {
        const vendorFile = path.join(uiDir, pathname);
        if (fs.existsSync(vendorFile)) {
          const content = fs.readFileSync(vendorFile);
          res.writeHead(200, { 'Content-Type': 'application/javascript; charset=utf-8' });
          return res.end(content);
        }
      }
    }

    // 2. REST API Routes
    if (pathname === '/api/onboarding/start' && req.method === 'POST') {
      const body = await parseBody();
      const result = await onboardingService.startSession(body.userId || 'user_default');
      return sendJson(200, result);
    }

    if (pathname === '/api/onboarding/respond' && req.method === 'POST') {
      const body = await parseBody();
      try {
        const result = await onboardingService.respond(body.sessionId, body.reply);
        if (result.profile) {
          await store.set('profiles', result.profile.userId, result.profile);
        }
        return sendJson(200, result);
      } catch (err: any) {
        return sendJson(400, { error: err.message });
      }
    }

    if (pathname === '/api/goals/create' && req.method === 'POST') {
      const body = await parseBody();
      const goal = goalEngine.createGoalFromTrack({
        userId: body.userId || 'user_default',
        trackName: body.trackName,
        customTarget: body.customTarget
      });
      await store.set('goals', goal.id, goal);
      return sendJson(200, { goal });
    }

    if (pathname === '/api/goals/active' && req.method === 'GET') {
      const goals = await store.list<Goal>('goals');
      const active = goals.find((g) => g.status === 'active') || goals[0] || null;
      return sendJson(200, { goal: active });
    }

    if (pathname.startsWith('/api/actions/') && pathname.endsWith('/checkin') && req.method === 'POST') {
      const actionId = pathname.split('/')[3];
      const body = await parseBody();
      const goal = await store.get<Goal>('goals', body.goalId);
      if (!goal) return sendJson(404, { error: 'Goal not found' });

      let targetAction: DailyAction | null = null;
      for (const ms of goal.milestones) {
        for (const act of ms.dailyActions) {
          if (act.id === actionId) {
            targetAction = act;
            break;
          }
        }
      }

      if (!targetAction) return sendJson(404, { error: 'Action not found' });

      const checkinResult = checkinService.executeCheckin({
        action: targetAction,
        summary: body.summary || '',
        actualMinutes: body.actualMinutes || 15
      });

      for (const ms of goal.milestones) {
        for (let i = 0; i < ms.dailyActions.length; i++) {
          if (ms.dailyActions[i].id === actionId) {
            ms.dailyActions[i] = checkinResult.updatedAction;
          }
        }
      }
      await store.set('goals', goal.id, goal);

      return sendJson(200, { action: checkinResult.updatedAction });
    }

    if (pathname.startsWith('/api/actions/') && pathname.endsWith('/reduce-load') && req.method === 'POST') {
      const actionId = pathname.split('/')[3];
      const body = await parseBody();
      const goal = await store.get<Goal>('goals', body.goalId);
      if (!goal) return sendJson(404, { error: 'Goal not found' });

      let updatedAction: DailyAction | null = null;
      for (const ms of goal.milestones) {
        for (let i = 0; i < ms.dailyActions.length; i++) {
          if (ms.dailyActions[i].id === actionId) {
            ms.dailyActions[i] = resilienceGuard.applyReducedLoad(ms.dailyActions[i]);
            updatedAction = ms.dailyActions[i];
          }
        }
      }

      if (!updatedAction) return sendJson(404, { error: 'Action not found' });
      await store.set('goals', goal.id, goal);

      return sendJson(200, { action: updatedAction });
    }

    if (pathname.startsWith('/api/goals/') && pathname.endsWith('/pivot') && req.method === 'POST') {
      const goalId = pathname.split('/')[3];
      const body = await parseBody();
      const goal = await store.get<Goal>('goals', goalId);
      if (!goal) return sendJson(404, { error: 'Goal not found' });

      const pivotResult = pivotService.executePivot({
        currentGoal: goal,
        request: {
          goalId,
          reason: body.reason,
          lessonLearned: body.lessonLearned,
          newDirection: body.newDirection
        }
      });

      await store.set('goals', goal.id, pivotResult.archivedGoal);
      await store.set('goals', pivotResult.newGoal.id, pivotResult.newGoal);
      await store.set('assets', pivotResult.experienceAsset.id, pivotResult.experienceAsset);

      return sendJson(200, pivotResult);
    }

    if (pathname === '/api/assets' && req.method === 'GET') {
      const assets = await store.list<ExperienceAsset>('assets');
      return sendJson(200, { assets });
    }

    sendJson(404, { error: 'Not Found' });
  };
}

export async function createLifeCompassServer(options: ServerOptions = {}) {
  const handler = createRequestHandler(options);
  const port = options.port ?? 3000;
  const server = http.createServer(handler);

  return new Promise<{ server: http.Server; port: number }>((resolve) => {
    server.listen(port, () => {
      const addr = server.address();
      const actualPort = typeof addr === 'object' && addr ? addr.port : port;
      resolve({ server, port: actualPort });
    });
  });
}

/**
 * Socket-free request simulation helper for 100% reliable offline/sandboxed test execution
 */
export async function simulateRequest(
  handler: (req: any, res: any) => Promise<any> | void,
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

const isMain = process.argv[1]?.endsWith('server.ts');
if (isMain) {
  const portArg = process.argv.includes('--port') ? parseInt(process.argv[process.argv.indexOf('--port') + 1], 10) : 3000;
  createLifeCompassServer({ port: portArg }).then(({ port }) => {
    console.log(`🧭 LifeCompass Server running at http://localhost:${port}`);
  });
}
