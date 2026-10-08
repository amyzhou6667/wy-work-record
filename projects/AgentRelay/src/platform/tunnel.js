import { spawn } from 'node:child_process';

const URL_REGEX = /https:\/\/[a-zA-Z0-9-.]+\.(?:trycloudflare\.com|lhrtunnel\.link|pinggy\.link|serveo\.net)[a-zA-Z0-9-_/]*/;

/**
 * 从隧道控制台输出中提取 HTTPS 公网域名
 * @param {string} text
 * @returns {string|null}
 */
export function extractPublicUrl(text) {
  if (!text) return null;
  const match = text.match(URL_REGEX);
  return match ? match[0] : null;
}

/**
 * 公网隧道管理器
 * 支持自定义公网域名与自动 SSH 穿透模式
 */
export class TunnelManager {
  constructor(options = {}) {
    this.customUrl = options.customUrl || process.env.RELAY_PUBLIC_URL || null;
    this.process = null;
    this.publicUrl = this.customUrl;
  }

  /**
   * 获取或启动公网隧道访问链接
   * @param {number} port 本地端口
   * @returns {Promise<string|null>}
   */
  async getPublicUrl(port) {
    if (this.publicUrl) {
      return this.publicUrl;
    }

    // 尝试启动内置轻量 SSH 穿透通道 (零安装，Windows 内置 OpenSSH)
    return new Promise((resolve) => {
      let resolved = false;
      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          resolve(null); // 超时自动降级
        }
      }, 5000);

      try {
        // 使用 localhost.run 的无需密钥免密反向隧道
        this.process = spawn('ssh', [
          '-o', 'StrictHostKeyChecking=no',
          '-o', 'ServerAliveInterval=30',
          '-R', `80:localhost:${port}`,
          'nokey@localhost.run'
        ], { stdio: ['ignore', 'pipe', 'pipe'] });

        const handleOutput = (chunk) => {
          const text = chunk.toString();
          const detected = extractPublicUrl(text);
          if (detected && !resolved) {
            resolved = true;
            clearTimeout(timeout);
            this.publicUrl = detected;
            resolve(detected);
          }
        };

        this.process.stdout.on('data', handleOutput);
        this.process.stderr.on('data', handleOutput);

        this.process.on('error', () => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timeout);
            resolve(null);
          }
        });
      } catch (e) {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          resolve(null);
        }
      }
    });
  }

  /**
   * 关闭隧道
   */
  close() {
    if (this.process) {
      try {
        this.process.kill();
      } catch (e) {}
      this.process = null;
    }
  }
}
