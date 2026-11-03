import fs from 'node:fs';
import path from 'node:path';

export class JsonStore {
  private baseDir: string;

  constructor(baseDir: string = 'projects/LifeCompass/data') {
    this.baseDir = path.resolve(baseDir);
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  private getCollectionDir(collection: string): string {
    const dir = path.join(this.baseDir, collection);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
  }

  private getFilePath(collection: string, id: string): string {
    const safeId = id.replace(/[^a-zA-Z0-9_-]/g, '_');
    return path.join(this.getCollectionDir(collection), `${safeId}.json`);
  }

  async get<T>(collection: string, id: string): Promise<T | null> {
    const filePath = this.getFilePath(collection, id);
    if (!fs.existsSync(filePath)) {
      return null;
    }
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content) as T;
    } catch {
      return null;
    }
  }

  async set<T>(collection: string, id: string, data: T): Promise<void> {
    const filePath = this.getFilePath(collection, id);
    const content = JSON.stringify(data, null, 2);
    fs.writeFileSync(filePath, content, 'utf-8');
  }

  async list<T>(collection: string): Promise<T[]> {
    const dir = this.getCollectionDir(collection);
    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'));
    const results: T[] = [];
    for (const file of files) {
      const fullPath = path.join(dir, file);
      try {
        const content = fs.readFileSync(fullPath, 'utf-8');
        results.push(JSON.parse(content) as T);
      } catch {
        // ignore corrupted file
      }
    }
    return results;
  }

  async delete(collection: string, id: string): Promise<boolean> {
    const filePath = this.getFilePath(collection, id);
    if (!fs.existsSync(filePath)) {
      return false;
    }
    fs.unlinkSync(filePath);
    return true;
  }
}
