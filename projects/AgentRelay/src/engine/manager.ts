import fs from 'node:fs';
import path from 'node:path';
import type { IEngineAdapter, EnginePluginConfig, EnginesConfigFile } from '../types/engine.ts';

export class EngineManager {
  private configPath: string | null = null;
  private currentConfig: EnginesConfigFile = { engines: [] };
  private adapters: Map<string, IEngineAdapter> = new Map();
  private watchHandle: fs.FSWatcher | null = null;

  loadFromFile(filePath: string): EnginesConfigFile {
    this.configPath = path.resolve(filePath);
    if (!fs.existsSync(this.configPath)) {
      throw new Error(`Engines config file not found: ${this.configPath}`);
    }
    const raw = fs.readFileSync(this.configPath, 'utf-8');
    const parsed = JSON.parse(raw) as EnginesConfigFile;
    if (!parsed || !Array.isArray(parsed.engines)) {
      throw new Error(`Invalid engines config format in ${this.configPath}`);
    }
    this.currentConfig = parsed;
    return this.currentConfig;
  }

  getEnabledEngines(): EnginePluginConfig[] {
    return this.currentConfig.engines.filter((e) => e.enabled);
  }

  registerAdapter(adapter: IEngineAdapter): void {
    this.adapters.set(adapter.id, adapter);
  }

  getAdapter(id: string): IEngineAdapter | undefined {
    return this.adapters.get(id);
  }

  getAllAdapters(): IEngineAdapter[] {
    return Array.from(this.adapters.values());
  }

  async autoDetect(projectPath: string): Promise<IEngineAdapter | null> {
    for (const adapter of this.adapters.values()) {
      const isMatch = await adapter.detect(projectPath);
      if (isMatch) {
        return adapter;
      }
    }
    return null;
  }

  enableHotReload(onReload?: (config: EnginesConfigFile) => void): void {
    if (!this.configPath) {
      return;
    }
    this.stopHotReload();
    try {
      this.watchHandle = fs.watch(this.configPath, (event) => {
        if (event === 'change' || event === 'rename') {
          try {
            if (this.configPath && fs.existsSync(this.configPath)) {
              this.loadFromFile(this.configPath);
              if (onReload) {
                onReload(this.currentConfig);
              }
            }
          } catch {
            // 忽略写入未完结时的偶发解析异常
          }
        }
      });
    } catch (err) {
      console.warn(`[EngineManager] Failed to watch ${this.configPath}:`, err);
    }
  }

  stopHotReload(): void {
    if (this.watchHandle) {
      this.watchHandle.close();
      this.watchHandle = null;
    }
  }
}
