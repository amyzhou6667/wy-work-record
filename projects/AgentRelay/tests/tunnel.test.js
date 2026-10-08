import test from 'node:test';
import assert from 'node:assert/strict';
import { extractPublicUrl, TunnelManager } from '../src/platform/tunnel.js';

test('extractPublicUrl: 应当识别国内 cpolar 域名与常见穿透域名', () => {
  const cpolarLog = 'Tunnel established at https://9b3c1a2d.cpolar.top -> 127.0.0.1:3300';
  assert.equal(extractPublicUrl(cpolarLog), 'https://9b3c1a2d.cpolar.top');

  const cpolarCnLog = 'Forwarding https://my-workstation.cpolar.cn -> http://localhost:3300';
  assert.equal(extractPublicUrl(cpolarCnLog), 'https://my-workstation.cpolar.cn');
});

test('TunnelManager: 支持配置固定国内云服务器或自建穿透域名', async () => {
  const manager = new TunnelManager({ customUrl: 'https://relay.my-domestic-server.com' });
  const url = await manager.getPublicUrl(3300);
  assert.equal(url, 'https://relay.my-domestic-server.com');
});
