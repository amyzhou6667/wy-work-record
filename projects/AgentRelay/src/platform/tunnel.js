import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

// 优先匹配国内备案节点 (cpolar.top, cpolar.cn, cpolar.io) 以及其他穿透域名
const DOMESTIC_TUNNEL_REGEX = /https:\/\/[a-zA-Z0-9-.]+\.(?:cpolar\.top|cpolar\.cn|cpolar\.io|trycloudflare\.com|lhr\.life)[a-zA-Z0-9-_/]*/;

/**
 * 从控制台日志中提取穿透公网域名
 * @param {string} text
 * @returns {string|null}
 */
export function extractPublicUrl(text) {
  if (!text) return null;
  const match = text.match(DOMESTIC_TUNNEL_REGEX);
  return match ? match[0] : null;
}

/**
 * 寻找本地可能安装的 cpolar 可执行程序路径
 */
function findCpolarExecutable() {
  const commonPaths = [
    'cpolar', // PATH 中
    'cpolar.exe',
    path.join(os.homedir(), 'cpolar', 'cpolar.exe'),
    path.join(os.homedir(), 'AppData', 'Local', 'cpolar', 'cpolar.exe'),
    'C:\\Program Files\\cpolar\\cpolar.exe',
    'C:\\Program Files (x86)\\cpolar\\cpolar.exe'
  ];

  for (const p of commonPaths) {
    if (p.includes(path.sep) && fs.existsSync(p)) {
      return p;
    }
  }
  return 'cpolar';
}

/**
 * 穿透通道管理器 (优先国内 cpolar 与自建国内云服务器)
 */
export class TunnelManager {
  constructor(options = {}) {
    this.customUrl = options.customUrl || process.env.DOMESTIC_RELAY_URL || process.env.RELAY_PUBLIC_URL || null;
    this.process = null;
    this.publicUrl = this.customUrl;
  }

  /**
   * 启动穿透并获取国内可访问的 HTTPS 域名
   * @param {number} port 本地端口
   * @param {number} timeoutMs
   * @returns {Promise<string|null>}
   */
  async getPublicUrl(port, timeoutMs = 6000) {
    if (this.publicUrl) {
      return this.publicUrl;
    }

    // 1. 首选：检测并尝试调用国内 cpolar 穿透
    const cpolarBin = findCpolarExecutable();
    const cpolarUrl = await this.tryLaunchCpolar(cpolarBin, port);
    if (cpolarUrl) {
      this.publicUrl = cpolarUrl;
      return cpolarUrl;
    }

    return null;
  }

  /**
   * 尝试运行 cpolar http <port> 并读取本地 API
   */
  async tryLaunchCpolar(cpolarBin, port) {
    return new Promise((resolve) => {
      try {
        this.process = spawn(cpolarBin, ['http', String(port)], {
          stdio: ['ignore', 'pipe', 'pipe'],
          windowsHide: true
        });

        // 监听输出日志看是否有直接打印的 URL
        this.process.stdout.on('data', (chunk) => {
          const url = extractPublicUrl(chunk.toString());
          if (url) resolve(url);
        });

        // cpolar 启动后会在 127.0.0.1:4040 开启 Web 状态 API
        let attempts = 0;
        const interval = setInterval(async () => {
          attempts++;
          try {
            const res = await fetch('http://127.0.0.1:4040/api/tunnels', {
              signal: AbortSignal.timeout(800)
            });
            if (res.ok) {
              const data = await res.json();
              if (data && data.tunnels && data.tunnels.length > 0) {
                const httpsTunnel = data.tunnels.find(t => t.public_url && t.public_url.startsWith('https://'));
                if (httpsTunnel) {
                  clearInterval(interval);
                  resolve(httpsTunnel.public_url);
                  return;
                }
              }
            }
          } catch (e) {}

          if (attempts >= 6) {
            clearInterval(interval);
            resolve(null);
          }
        }, 800);

        this.process.on('error', () => {
          clearInterval(interval);
          resolve(null);
        });
      } catch (e) {
        resolve(null);
      }
    });
  }

  /**
   * 关闭穿透进程
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
