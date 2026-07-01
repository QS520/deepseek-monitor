// DeepSeek Tokenizer Loader
// 从 public/deepseek-tokenizer/tokenizer.json 加载官方 tokenizer
// 实现 BPE (Byte Pair Encoding) 分词

interface TokenizerJSON {
  version: string;
  truncation: unknown;
  padding: unknown;
  added_tokens: Array<{
    id: number;
    content: string;
    special: boolean;
  }>;
  model: {
    type: string;
    vocab: Record<string, number>;
    merges: string[];
  };
}

interface TokenizerInstance {
  encode(text: string): number[];
  countTokens(text: string): number;
  decode(tokens: number[]): string;
}

// 全局缓存的 tokenizer 实例
let cachedTokenizer: TokenizerInstance | null = null;
let tokenizerPromise: Promise<TokenizerInstance> | null = null;

// BPE Tokenizer 类
class BPETokenizer implements TokenizerInstance {
  private vocab: Map<string, number>;
  private merges: Map<string, number>;
  private addedTokens: Map<number, string>;

  constructor(data: TokenizerJSON) {
    // 构建词汇表
    this.vocab = new Map<string, number>();
    for (const [token, id] of Object.entries(data.model.vocab)) {
      this.vocab.set(token, id);
    }

    // 构建 merges 表（按优先级排序）
    this.merges = new Map<string, number>();
    for (let i = 0; i < data.model.merges.length; i++) {
      const merge = data.model.merges[i];
      this.merges.set(merge, i);
    }

    // 构建特殊 token 映射
    this.addedTokens = new Map<number, string>();
    for (const token of data.added_tokens) {
      this.addedTokens.set(token.id, token.content);
    }
  }

  encode(text: string): number[] {
    if (!text) return [];

    // 简化的 BPE 编码实现
    // 将文本转换为字节，然后应用 BPE merges
    const tokens: number[] = [];

    // 按空格分割单词（简化版）
    const words = text.split(/(\s+)/);
    
    for (const word of words) {
      if (!word) continue;
      
      // 将单词转换为初始字符 tokens
      let wordTokens = this.tokenizeWord(word);
      tokens.push(...wordTokens);
    }

    return tokens;
  }

  private tokenizeWord(word: string): number[] {
    // 简化的 word tokenization
    // 实际 BPE 需要将单词拆分为字节，然后递归合并
    
    // 尝试直接查找整个词
    const fullWord = '▁' + word; // SentencePiece 风格的前缀
    if (this.vocab.has(fullWord)) {
      return [this.vocab.get(fullWord)!];
    }

    // 回退：按 UTF-8 字节编码
    const bytes = new TextEncoder().encode(word);
    const tokens: number[] = [];
    
    for (const byte of bytes) {
      const tokenStr = `<0x${byte.toString(16).padStart(2, '0')}>`;
      if (this.vocab.has(tokenStr)) {
        tokens.push(this.vocab.get(tokenStr)!);
      } else {
        // 回退到未知 token
        const unkToken = this.vocab.get('<unk>') ?? this.vocab.get('<UNK>');
        if (unkToken !== undefined) {
          tokens.push(unkToken);
        }
      }
    }

    return tokens;
  }

  countTokens(text: string): number {
    return this.encode(text).length;
  }

  decode(tokens: number[]): string {
    // 简化版解码
    let text = '';
    for (const token of tokens) {
      const added = this.addedTokens.get(token);
      if (added) {
        text += added;
      } else {
        // 查找 token id 对应的字符串
        for (const [str, id] of this.vocab.entries()) {
          if (id === token) {
            text += str.replace('▁', ' ');
            break;
          }
        }
      }
    }
    return text.trim();
  }
}

// 加载 tokenizer.json 并创建 tokenizer 实例
async function loadTokenizer(): Promise<TokenizerInstance> {
  if (cachedTokenizer) {
    return cachedTokenizer;
  }

  if (tokenizerPromise) {
    return tokenizerPromise;
  }

  tokenizerPromise = (async () => {
    const response = await fetch('/deepseek-tokenizer/tokenizer.json');
    if (!response.ok) {
      throw new Error(`Failed to load tokenizer: ${response.status}`);
    }

    const data: TokenizerJSON = await response.json();
    const tokenizer = new BPETokenizer(data);
    cachedTokenizer = tokenizer;
    return tokenizer;
  })();

  return tokenizerPromise;
}

// 导出 API
export async function encode(text: string): Promise<number[]> {
  const tokenizer = await loadTokenizer();
  return tokenizer.encode(text);
}

export async function countTokens(text: string): Promise<number> {
  try {
    const tokenizer = await loadTokenizer();
    return tokenizer.countTokens(text);
  } catch (err) {
    console.error('Failed to use official tokenizer, falling back to estimate:', err);
    // 回退到估算
    return estimateTokenCount(text);
  }
}

export async function decode(tokens: number[]): Promise<string> {
  const tokenizer = await loadTokenizer();
  return tokenizer.decode(tokens);
}

// 估算函数（回退方案）
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

// 预加载 tokenizer（在应用启动时调用）
export async function preloadTokenizer(): Promise<void> {
  try {
    await loadTokenizer();
    console.log('✓ DeepSeek Tokenizer 加载成功');
  } catch (err) {
    console.warn('DeepSeek Tokenizer 加载失败，将使用估算模式:', err);
  }
}

