import test from 'node:test';
import assert from 'node:assert/strict';
import { WechatWorkNotifier } from '../src/notifier/wechat_work.js';

test('WechatWorkNotifier: 应当生成符合企业微信官方规范的 Markdown 消息体', () => {
  const notifier = new WechatWorkNotifier({ webhookUrl: 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=mock-key' });
  
  const payload = notifier.formatPayload({
    command: 'claude',
    question: 'Allow write to database? [Y/n]',
    recent_logs: ['Scanning files...', 'Allow write to database? [Y/n]'],
    taskId: 'task_001',
    remoteUrl: 'https://relay.example.com/?task=task_001'
  });

  assert.equal(payload.msgtype, 'markdown');
  assert.ok(payload.markdown.content.includes('claude'), '必须包含任务命令');
  assert.ok(payload.markdown.content.includes('Allow write to database? [Y/n]'), '必须包含提问内容');
  assert.ok(payload.markdown.content.includes('https://relay.example.com/?task=task_001'), '必须包含手机端处理入口');
});
