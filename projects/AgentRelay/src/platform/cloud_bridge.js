/**
 * 零配置云端双向回传桥接器 (CloudActionBridge)
 * 基于高可用全球 Serverless 通道 (ntfy.sh)，免自建中继，零内网阻断
 */
export class CloudActionBridge {
  constructor(taskId) {
    this.topic = `wy_agentrelay_${taskId.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
    this.pubUrl = `https://ntfy.sh/${this.topic}`;
  }

  /**
   * 生成手机微信内一键点击回复的安全网页链接
   * @param {string} action 'y' | 'n' | 'KILL'
   * @returns {string} 包含自动回传逻辑的数据网页
   */
  getQuickActionUrl(action) {
    // 生成可直接在手机浏览器中打开并自动提交 POST 的极简 HTML 页面
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>AgentRelay</title><style>body{background:#0f172a;color:#f8fafc;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;text-align:center;padding:20px;}.box{background:#1e293b;padding:30px;border-radius:12px;border:1px solid #334155;max-width:360px;}.btn{display:inline-block;padding:12px 24px;background:#10b981;color:#fff;border-radius:8px;font-weight:bold;text-decoration:none;margin-top:20px;cursor:pointer;border:none;}</style></head><body><div class="box"><div id="icon" style="font-size:48px;">⏳</div><h2 id="msg" style="margin-top:10px;">正在将决策 [${action}] 送达电脑...</h2><p id="sub" style="color:#94a3b8;font-size:14px;">请稍候...</p></div><script>fetch('${this.pubUrl}',{method:'POST',body:'${action}'}).then(()=>{document.getElementById('icon').innerText='✅';document.getElementById('msg').innerText='决策 [${action}] 已送达！';document.getElementById('sub').innerText='工位电脑已自动注入并继续执行下一步。您可以关闭此页面。';}).catch(e=>{document.getElementById('icon').innerText='❌';document.getElementById('msg').innerText='发送失败';document.getElementById('sub').innerText=e.message;});</script></body></html>`;

    // 转换为 Base64 Data URL (所有现代手机浏览器及微信内置浏览器均原生秒开)
    const base64 = Buffer.from(html).toString('base64');
    return `data:text/html;base64,${base64}`;
  }

  /**
   * 获取会话云端查看网址
   */
  getTopicWebUrl() {
    return this.pubUrl;
  }

  /**
   * PC 端轮询检查手机端回传的指令
   * @returns {Promise<string|null>}
   */
  async pollAction() {
    try {
      const res = await fetch(`${this.pubUrl}/raw?poll=1`, {
        signal: AbortSignal.timeout(1200)
      });
      if (res.ok) {
        const text = await res.text();
        if (text && text.trim()) {
          return text.trim();
        }
      }
    } catch (e) {}
    return null;
  }
}
