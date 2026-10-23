/**
 * ANSI 转义字符清洗与敏感数据脱敏工具 (TypeScript)
 */

// 匹配终端色彩与控制序列正则
const ANSI_REGEX = /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g;

// 常见敏感数据匹配正则
const EMAIL_REGEX = /[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/g;
const SECRET_REGEX = /(?:sk-|ghp_|gho_|xox[baprs]-)[a-zA-Z0-9]{16,}/g;

/**
 * 剥除终端 ANSI 颜色与光标控制符
 * @param text 原始文本
 * @returns 纯文本
 */
export function stripAnsi(text: string): string {
  if (typeof text !== 'string') return '';
  return text.replace(ANSI_REGEX, '');
}

/**
 * 脱敏敏感凭证与邮箱
 * @param text 待脱敏文本
 * @returns 脱敏后文本
 */
export function desensitize(text: string): string {
  if (typeof text !== 'string') return '';
  return text
    .replace(EMAIL_REGEX, '[REDACTED_EMAIL]')
    .replace(SECRET_REGEX, '[REDACTED_SECRET]');
}
