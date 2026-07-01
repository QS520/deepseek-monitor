// DeepSeek Token 计数（估算模式）
// 使用字符级估算，无需加载 7.8MB 的 tokenizer.json
// 中文 ~1.5-2 字符/token，英文 ~4 字符/token

export async function encode(_text: string): Promise<number[]> {
  // 估算模式不支持精确编码，返回空数组
  return [];
}

export async function countTokens(text: string): Promise<number> {
  return estimateTokenCount(text);
}

export async function decode(_tokens: number[]): Promise<string> {
  return '';
}

export async function preloadTokenizer(): Promise<void> {
  // 估算模式无需预加载
}

function estimateTokenCount(text: string): number {
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
