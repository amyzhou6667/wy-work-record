import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { EngineManager } from '../src/engine/manager.ts';
import type { IEngineAdapter, EnginePluginConfig, RelaySession, DecisionCommand } from '../src/types/engine.ts';

class MockAdapter implements IEngineAdapter {
  id: string;
  name: string;
  matchPath: string;

  constructor(id: string, name: string, matchPath: string) {
    this.id = id;
    this.name = name;
    this.matchPath = matchPath;
  }
  async init(_config: EnginePluginConfig): Promise<void> {}
  async detect(targetPath: string): Promise<boolean> {
    return targetPath.includes(this.matchPath);
  }
  startWatch(_targetPath: string, _onUpdate: (session: RelaySession) => void): void {}
  stopWatch(): void {}
  async injectDecision(_taskId: string, _command: DecisionCommand): Promise<boolean> {
    return true;
  }
  async killTask(_taskId: string): Promise<boolean> {
    return true;
  }
}

describe('EngineManager - 可插拔引擎管理器与热重载测试', () => {
  it('应当正确加载并解析 engines.json 配置', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'engine-mgr-'));
    const configPath = path.join(tmpDir, 'engines.json');
    const sampleConfig = {
      engines: [
        { id: 'eng1', name: 'Engine 1', enabled: true, type: 'transcript_file', config: {} },
        { id: 'eng2', name: 'Engine 2', enabled: false, type: 'process_pty', config: {} }
      ]
    };
    fs.writeFileSync(configPath, JSON.stringify(sampleConfig, null, 2), 'utf-8');

    const mgr = new EngineManager();
    const config = mgr.loadFromFile(configPath);

    assert.equal(config.engines.length, 2);
    const enabled = mgr.getEnabledEngines();
    assert.equal(enabled.length, 1);
    assert.equal(enabled[0].id, 'eng1');

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('应当支持注册适配器并实现 autoDetect 自动嗅探', async () => {
    const mgr = new EngineManager();
    const adapterA = new MockAdapter('antigravity', 'Antigravity', 'brain');
    const adapterB = new MockAdapter('claude', 'Claude Code', 'claude-proj');

    mgr.registerAdapter(adapterA);
    mgr.registerAdapter(adapterB);

    const detectedA = await mgr.autoDetect('D:/some/brain/workspace');
    assert.ok(detectedA);
    assert.equal(detectedA.id, 'antigravity');

    const detectedB = await mgr.autoDetect('D:/some/claude-proj/workspace');
    assert.ok(detectedB);
    assert.equal(detectedB.id, 'claude');

    const detectedNone = await mgr.autoDetect('D:/other/empty');
    assert.equal(detectedNone, null);
  });

  it('应当支持监听配置文件变更并触发热重载回调', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'engine-reload-'));
    const configPath = path.join(tmpDir, 'engines.json');
    const sampleConfig = {
      engines: [
        { id: 'eng1', name: 'Engine 1', enabled: true, type: 'transcript_file', config: {} }
      ]
    };
    fs.writeFileSync(configPath, JSON.stringify(sampleConfig), 'utf-8');

    const mgr = new EngineManager();
    mgr.loadFromFile(configPath);

    let reloaded = false;
    mgr.enableHotReload(() => {
      reloaded = true;
    });

    // 触发更新
    sampleConfig.engines.push({
      id: 'eng2',
      name: 'Engine 2',
      enabled: true,
      type: 'process_pty',
      config: {}
    });
    fs.writeFileSync(configPath, JSON.stringify(sampleConfig), 'utf-8');

    // 稍作等待以响应 fs.watch
    await new Promise((resolve) => setTimeout(resolve, 300));
    mgr.stopHotReload();

    assert.ok(reloaded, '应触发热重载回调');
    assert.equal(mgr.getEnabledEngines().length, 2);

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});
