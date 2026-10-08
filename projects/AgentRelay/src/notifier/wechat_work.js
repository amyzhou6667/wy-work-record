/**
 * 企业微信群机器人推送器 (WechatWorkNotifier)
 * 100% 完全免费、免审批、官方原生弹窗支持
 */
export class WechatWorkNotifier {
  constructor(options = {}) {
    this.webhookUrl = options.webhookUrl || process.env.WECHAT_WORK_WEBHOOK || '';
  }

  /**
   * 格式化企业微信 Markdown 消息体
   * @param {object} data
   * @returns {object} 符合企业微信 Webhook 规范的 payload
   */
  formatPayload(data) {
    const { command, question, recent_logs, taskId, remoteUrl } = data;
    const logsText = (recent_logs || []).slice(-6).map(l => `> ${l}`).join('\n');

    let markdown = `### ⚠️ AI 任务需要人工确认\n` +
      `> **任务命令**：<font color="comment">${escapeMarkdown(command || 'AI Task')}</font>\n` +
      `> **会话 ID**：<font color="comment">${taskId}</font>\n\n` +
      `**提问详情**：\n` +
      `<font color="warning">${escapeMarkdown(question)}</font>\n\n`;

    if (logsText) {
      markdown += `**最近日志**：\n${logsText}\n\n`;
    }

    if (remoteUrl) {
      markdown += `👉 **[点此打开手机卡片端一键决策](${remoteUrl})**\n\n`;
    }

    markdown += `<font color="comment">工位电脑正保持防休眠挂起等待，请尽快处理。</font>`;

    return {
      msgtype: 'markdown',
      markdown: {
        content: markdown
      }
    };
  }

  /**
   * 向企业微信机器人发送通知
   */
  async send(data) {
    if (!this.webhookUrl) {
      return { ok: false, error: '未配置企业微信 Webhook 链接' };
    }

    const payload = this.formatPayload(data);

    try {
      const res = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await res.json();
      return { ok: result.errcode === 0, data: result };
    } catch (err) {
      console.error('[WechatWork] 发送企业微信通知失败:', err.message);
      return { ok: false, error: err.message };
    }
  }
}

function escapeMarkdown(str) {
  if (!str) return '';
  return str.replace(/[#*`]/g, '');
}
