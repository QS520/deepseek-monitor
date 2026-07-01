// DeepSeek API 监控相关类型定义

// 模型 ID (支持 deepseek-v4-flash / deepseek-v4-pro)
export type ModelId = string;

// Token 用量明细 (按计费类型拆分)
export interface TokenUsage {
  promptCacheHit: number;   // 输入 - 缓存命中 tokens
  promptCacheMiss: number;  // 输入 - 缓存未命中 tokens
  completion: number;       // 输出 tokens
}

// 单个模型的监控数据
export interface ModelMetric {
  id: ModelId;
  name: string;
  displayName: string;
  description: string;
  todayTokens: TokenUsage;
  totalTokens: TokenUsage;      // 累计
  todayCost: number;            // 今日费用 (元)
  totalCost: number;            // 累计费用 (元)
  todayRequests: number;        // 今日请求数
  rps: number;                  // 实时每秒请求数
  avgLatency: number;           // 平均延迟 ms
  successRate: number;          // 成功率
  trend: TrendPoint[];          // 24h 趋势
  status: "active" | "idle";
}

// 趋势数据点
export interface TrendPoint {
  time: string;
  tokens: number;
  cost: number;
  requests: number;
}

// 图表分段数据 (用于环形图等)
export interface ChartSegment {
  code: number;
  count: number;
  label: string;
  color: string;
}

// 账户余额信息
export interface AccountBalance {
  total: number;        // 总充值 (元)
  used: number;         // 已使用 (元)
  remaining: number;    // 剩余 (元)
  freeCredits: number;  // 赠送余额 (元)
  warningThreshold: number; // 预警阈值 (元)
}

// 各模型官方定价 (元/百万tokens)
export interface ModelPricing {
  promptCacheHit: number;
  promptCacheMiss: number;
  completion: number;
}

export const PRICING: Record<string, ModelPricing> = {
  // V4 Flash: 缓存命中 0.02, 未命中 1, 输出 2
  "deepseek-v4-flash": {
    promptCacheHit: 0.02,
    promptCacheMiss: 1,
    completion: 2,
  },
  // V4 Pro: 缓存命中 0.025, 未命中 3, 输出 6
  "deepseek-v4-pro": {
    promptCacheHit: 0.025,
    promptCacheMiss: 3,
    completion: 6,
  },
};

// 默认定价 (未知模型使用)
const DEFAULT_PRICING: ModelPricing = {
  promptCacheHit: 0.1,
  promptCacheMiss: 1,
  completion: 2,
};

// 获取模型定价，未知模型返回默认定价
export function getPricing(modelId: string): ModelPricing {
  return PRICING[modelId] || DEFAULT_PRICING;
}

// 计算 token 用量的费用 (元)
export function calcCost(usage: TokenUsage, modelId: ModelId): number {
  const p = getPricing(modelId);
  return (
    (usage.promptCacheHit / 1_000_000) * p.promptCacheHit +
    (usage.promptCacheMiss / 1_000_000) * p.promptCacheMiss +
    (usage.completion / 1_000_000) * p.completion
  );
}

// 合并 token 用量
export function sumTokens(usage: TokenUsage): number {
  return usage.promptCacheHit + usage.promptCacheMiss + usage.completion;
}
