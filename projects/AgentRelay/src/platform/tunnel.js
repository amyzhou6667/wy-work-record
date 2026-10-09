import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

// 匹配 cpolar 域名与国际穿透域名 (支持 http 与 https)
const TUNNEL_REGEX = /https?:\/\/[a-zA-Z0-9-.]+\.(?:cpolar\.top|cpolar\.cn|cpolar\.io|cpolar\.com|r6\.cpolar\.cn|lhr\.life|trycloudflare\.com|pinggy\.link)[a-zA-Z0-9-_/]*/;

/**
 * 从控制台日志中提取穿透公网域名
 * @param {string} text
 * @returns {string|null}
 */
export function extractPublicUrl(text) {
  if (!text) return null;
  const match = text.match(TUNNEL_REGEX);
  return match ? match[0] : null;
}

/**
 * 寻找本地可能安装的 cpolar 可执行程序路径
 */
function findCpolarExecutable() {
  const commonPaths = [
    'cpolar',
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
  return null;
}

/**
 * 穿透通道管理器 (优先读取运行中的 cpolar 隧道，免安装自动回退到 OpenSSH 隧道)
 */
export class TunnelManager {
  constructor(options = {}) {
    this.customUrl = options.customUrl || process.env.DOMESTIC_RELAY_URL || process.env.RELAY_PUBLIC_URL || null;
    this.process = null;
    this.publicUrl = this.customUrl;
  }

  /**
   * 启动穿透并获取可访问的公网域名
   * @param {number} port 本地端口
   * @param {number} timeoutMs
   * @returns {Promise<string|null>}
   */
  async getPublicUrl(port, timeoutMs = 4000) {
    if (this.publicUrl) {
      return this.publicUrl;
    }

    // 1. 优先探测当前系统中已经在运行的 cpolar 服务 (Web 后台 9200 / API 4040)
    const activeCpolarUrl = await this.detectRunningCpolarTunnel(port);
    if (activeCpolarUrl) {
      this.publicUrl = activeCpolarUrl;
      return activeCpolarUrl;
    }

    // 2. 若未检测到后台运行中的隧道，但本机有 cpolar.exe，尝试临时拉起
    const cpolarBin = findCpolarExecutable();
    if (cpolarBin) {
      const cpolarUrl = await this.tryLaunchCpolar(cpolarBin, port);
      if (cpolarUrl) {
        this.publicUrl = cpolarUrl;
        return cpolarUrl;
      }
    }

    // 3. 兜底回退：调用 Windows 自带的 OpenSSH 隧道
    const sshUrl = await this.tryLaunchSshTunnel(port, timeoutMs);
    if (sshUrl) {
      this.publicUrl = sshUrl;
      return sshUrl;
    }

    return null;
  }

  /**
   * 探测已经在运行的 cpolar 服务的本地 API (4040 或 9200)
   */
  async detectRunningCpolarTunnel(port) {
    const apiEndpoints = [
      'http://127.0.0.1:4040/api/tunnels',
      'http://localhost:4040/api/tunnels'
    ];

    for (const url of apiEndpoints) {
      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(500) });
        if (res.ok) {
          const data = await res.json();
          if (data && data.tunnels && data.tunnels.length > 0) {
            // 找到指向本地对应端口的隧道，或者第一个有效公网隧道
            const matched = data.tunnels.find(t => 
              t.config && t.config.addr && t.config.addr.includes(String(port))
            ) || data.tunnels[0];

            if (matched && matched.public_url) {
              return matched.public_url;
            }
          }
        }
      } catch (e) {}
    }
    return null;
  }

  /**
   * 尝试运行 cpolar http <port>
   */
  async tryLaunchCpolar(cpolarBin, port) {
    return new Promise((resolve) => {
      try {
        this.process = spawn(cpolarBin, ['http', String(port)], {
          stdio: ['ignore', 'pipe', 'pipe'],
          windowsHide: true
        });

        this.process.stdout.on('data', (chunk) => {
          const url = extractPublicUrl(chunk.toString());
          if (url) resolve(url);
        });

        let attempts = 0;
        const interval = setInterval(async () => {
          attempts++;
          try {
            const res = await fetch('http://127.0.0.1:4040/api/tunnels', {
              signal: AbortSignal.timeout(600)
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

          if (attempts >= 4) {
            clearInterval(interval);
            resolve(null);
          }
        }, 600);

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
   * 自动回退：启动 Windows 内置 OpenSSH 隧道 (localhost.run)
   */
  async tryLaunchSshTunnel(port, timeoutMs) {
    return new Promise((resolve) => {
      let resolved = false;
      const timer = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          resolve(null);
        }
      }, timeoutMs);

      try {
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
            clearTimeout(timer);
            resolve(detected);
          }
        };

        this.process.stdout.on('data', handleOutput);
        this.process.stderr.on('data', handleOutput);

        this.process.on('error', () => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timer);
            resolve(null);
          }
        });
      } catch (e) {
        if (!resolved) {
          resolved = true;
          clearTimeout(timer);
          resolve(null);
        }
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
