import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ClaudeAdapter } from '../src/engine/adapters/claude.ts';
import type { EnginePluginConfig, RelaySession } from '../src/types/engine.ts';

describe('ClaudeAdapter - Claude Code 插件适配器测试', () => {
  it('应当正确初始化并具备标准元数据', async () => {
    const adapter = new ClaudeAdapter();
    assert.equal(adapter.id, 'claude');
    assert.equal(adapter.name, 'Claude Code');

    const config: EnginePluginConfig = {
      id: 'claude',
      name: 'Claude Code',
      enabled: true,
      type: 'transcript_file',
      config: { logPathPattern: '~/.claude/projects/*/*.jsonl' }
    };
    await adapter.init(config);
  });

  it('应当能计算项目映射目录名', () => {
    const adapter = new ClaudeAdapter();
    const folderName = adapter.resolveProjectFolderName('D:\\hyper-v\\share\\proj\\opendeck');
    assert.ok(folderName.includes('D--hyper-v-share-proj-opendeck') || folderName.includes('opendeck'));
  });

  it('应当接收 Watcher 事件并向上游回调 RelaySession 状态', () => {
    const adapter = new ClaudeAdapter();
    let updatedSession: RelaySession | null = null;

    adapter.handleWatcherPrompt({
      question: 'Allow file modification? [y/n]',
      options: ['y', 'n'],
      fullText: 'Allow file modification? [y/n]',
      timestamp: new Date().toISOString()
    }, (session) => {
      updatedSession = session;
    });

    assert.ok(updatedSession);
    assert.equal(updatedSession.status, 'pending');
    assert.equal(updatedSession.engineId, 'claude');
    assert.ok(updatedSession.currentDecision);
    assert.equal(updatedSession.currentDecision.question, 'Allow file modification? [y/n]');
  });
});
