import test from 'node:test';
import assert from 'node:assert/strict';
import { extractPublicUrl, TunnelManager } from '../src/platform/tunnel.js';

test('extractPublicUrl: 应当能从隧道输出日志中解析出 HTTPS 公网地址', () => {
  const logCloudflare = '2026-10-08T08:00:00Z INF +--------------------------------------------------------------------------------------------+\n2026-10-08T08:00:00Z INF |  Your quick Tunnel has been created! Visit it at (it may take some time to be reachable):  |\n2026-10-08T08:00:00Z INF |  https://happy-test-subdomain.trycloudflare.com                                            |\n2026-10-08T08:00:00Z INF +--------------------------------------------------------------------------------------------+';
  assert.equal(extractPublicUrl(logCloudflare), 'https://happy-test-subdomain.trycloudflare.com');

  const logLocalhostRun = '980b18214fa35a.lhrtunnel.link tunnel created\nConnect to https://980b18214fa35a.lhrtunnel.link to view.';
  assert.equal(extractPublicUrl(logLocalhostRun), 'https://980b18214fa35a.lhrtunnel.link');
});

test('TunnelManager: 支持配置固定自定义公网 URL', async () => {
  const manager = new TunnelManager({ customUrl: 'https://my-relay.example.com' });
  const url = await manager.getPublicUrl(3300);
  assert.equal(url, 'https://my-relay.example.com');
});
