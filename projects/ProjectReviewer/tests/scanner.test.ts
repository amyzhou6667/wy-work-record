import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { ProjectScanner } from '../src/services/scanner.ts';

describe('ProjectScanner 模块测试', () => {
  const scanner = new ProjectScanner();

  it('当指定路径不存在时，应当拦截报错', async () => {
    const invalidPath = path.join(os.tmpdir(), `non-existent-proj-${Date.now()}`);
    await assert.rejects(
      async () => await scanner.scanProject(invalidPath),
      /路径不存在/
    );
  });

  it('当指定路径为空目录时，应当提示未检测到有效项目', async () => {
    const emptyDir = path.join(os.tmpdir(), `empty-proj-${Date.now()}`);
    fs.mkdirSync(emptyDir, { recursive: true });
    try {
      await assert.rejects(
        async () => await scanner.scanProject(emptyDir),
        /未在目录中检测到有效代码工程/
      );
    } finally {
      fs.rmSync(emptyDir, { recursive: true, force: true });
    }
  });

  it('应当正确扫描标准工程，提取元数据并忽略 .git/node_modules/dist 目录', async () => {
    const mockDir = path.join(os.tmpdir(), `mock-proj-${Date.now()}`);
    fs.mkdirSync(mockDir, { recursive: true });
    
    try {
      // 模拟工程结构
      fs.writeFileSync(path.join(mockDir, 'package.json'), JSON.stringify({
        name: 'test-order-service',
        dependencies: {
          express: '^4.19.0',
          ioredis: '^5.3.0'
        }
      }, null, 2));

      fs.writeFileSync(path.join(mockDir, 'README.md'), '# Test Order Service\n高并发订单支付与超时结算系统');
      
      const srcDir = path.join(mockDir, 'src');
      fs.mkdirSync(srcDir, { recursive: true });
      fs.writeFileSync(path.join(srcDir, 'orderController.ts'), 'export class OrderController { /* logic */ }');
      fs.writeFileSync(path.join(srcDir, 'redisLock.ts'), 'export function acquireLock() { /* redis lock */ }');

      // 模拟应该被忽略的目录
      const ignoredNodeModules = path.join(mockDir, 'node_modules', 'some-pkg');
      fs.mkdirSync(ignoredNodeModules, { recursive: true });
      fs.writeFileSync(path.join(ignoredNodeModules, 'index.js'), 'module.exports = {}');

      const metadata = await scanner.scanProject(mockDir);

      assert.strictEqual(metadata.projectName, 'test-order-service');
      assert.strictEqual(metadata.sourceType, 'local');
      assert.ok(metadata.languages.includes('TypeScript'));
      assert.ok('ioredis' in metadata.dependencies);
      assert.ok('express' in metadata.dependencies);
      assert.ok(metadata.fileCount >= 3); // package.json, README.md, orderController.ts, redisLock.ts
      
      // 验证忽略项未进入 keyFiles
      const hasNodeModules = metadata.keyFiles.some(f => f.includes('node_modules'));
      assert.strictEqual(hasNodeModules, false);

      // 测试获取文件片段
      const snippet = await scanner.getFileSnippet(mockDir, 'src/orderController.ts', 10);
      assert.ok(snippet.includes('OrderController'));
    } finally {
      fs.rmSync(mockDir, { recursive: true, force: true });
    }
  });

  it('应当支持识别 GitHub 公开仓库 URL 格式并提取仓库名', () => {
    const url = 'https://github.com/facebook/react';
    assert.strictEqual(scanner.isGitHubUrl(url), true);
    assert.strictEqual(scanner.extractGitHubRepoName(url), 'react');
  });
});
