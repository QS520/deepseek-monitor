// Token 计数器
// 优先使用官方 DeepSeek Tokenizer，回退到估算

import {
  countTokens as countTokensOfficial,
  preloadTokenizer,
  encode as encodeOfficial,
} from "./deepseekTokenizer";

/**
 * 简易 Token 计数估算（回退方案）
 * 中文：~1.5-2 字符/token
 * 英文：~4 字符/token
 */
export function estimateTokenCount(text: string): number {
  if (!text) return 0;

  const chineseChars = (text.match(/[\u4e00-\u9fff\u3400-\u4dbf]/g) || []).length;
  const totalChars = text.length;

  if (chineseChars / totalChars > 0.5) {
    return Math.ceil(totalChars / 1.8);
  } else {
    const words = text.split(/\s+/).length;
    return Math.ceil(words * 1.3 + totalChars / 4);
  }
}

/**
 * 从消息数组估算 token 数
 */
export function estimateMessagesTokens(
  messages: Array<{ role: string; content: string }>
): number {
  const PER_MESSAGE_OVERHEAD = 4;
  const FORMAT_OVERHEAD = 3;

  let total = FORMAT_OVERHEAD;
  for (const msg of messages) {
    total += PER_MESSAGE_OVERHEAD + estimateTokenCount(msg.content);
  }
  return total;
}

/**
 * 使用官方 DeepSeek Tokenizer 计数
 * 如果官方 tokenizer 加载失败，回退到估算值
 */
export async function countTokensWithOfficialTokenizer(
  text: string
): Promise<number> {
  return countTokensOfficial(text);
}

/**
 * 预加载官方 tokenizer
 * 在应用启动时调用
 */
export async function initTokenizer(): Promise<void> {
  await preloadTokenizer();
}

/**
 * 使用官方 tokenizer 编码文本为 token IDs
 */
export async function encodeText(text: string): Promise<number[]> {
  try {
    return await encodeOfficial(text);
  } catch {
    return [];
  }
}

// 导出默认 token 计数函数（自动选择官方或估算）
export async function countTokens(text: string): Promise<number> {
  return countTokensOfficial(text);
}

