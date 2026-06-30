import type { ModelMetric, TrendPoint, TokenUsage, AccountBalance, ModelId } from "@/types";
import { calcCost } from "@/types";

// 随机工具
export function rand(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

export function randInt(min: number, max: number): number {
  return Math.floor(rand(min, max + 1));
}

// 生成 24 小时趋势 (48 个 30 分钟点)
export function generateTrend(baseTokens: number, baseCost: number): TrendPoint[] {
  const points: TrendPoint[] = [];
  const now = new Date();
  for (let i = 47; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 30 * 60 * 1000);
    const hour = time.getHours();
    const dayFactor = hour >= 9 && hour <= 22 ? rand(0.6, 1.4) : rand(0.15, 0.45);
    const tokens = Math.floor((baseTokens / 48) * dayFactor);
    const cost = Number(((baseCost / 48) * dayFactor).toFixed(4));
    const requests = Math.floor(tokens / randInt(400, 1200));
    points.push({
      time: `${String(hour).padStart(2, "0")}:${String(time.getMinutes()).padStart(2, "0")}`,
      tokens,
      cost,
      requests,
    });
  }
  return points;
}

// 生成 token 用量明细
export function generateTokenUsage(totalTokens: number): TokenUsage {
  const cacheHitRatio = rand(0.45, 0.7); // 缓存命中率
  const cacheHit = Math.floor(totalTokens * cacheHitRatio * rand(0.3, 0.5));
  const remaining = totalTokens - cacheHit;
  const cacheMiss = Math.floor(remaining * rand(0.55, 0.7));
  const completion = remaining - cacheMiss;
  return { promptCacheHit: cacheHit, promptCacheMiss: cacheMiss, completion };
}

// 生成两个 V4 模型的监控数据
export function generateModels(): ModelMetric[] {
  const configs: Array<{
    id: ModelId;
    name: string;
    displayName: string;
    description: string;
    baseTokens: number;
    totalTokensAll: number;
    baseRequests: number;
    latency: number;
  }> = [
    {
      id: "deepseek-v4-flash",
      name: "deepseek-v4-flash",
      displayName: "DeepSeek V4 Flash",
      description: "轻量高效 · 2840亿参数 · 高并发场景",
      baseTokens: 18_500_000,   // 今日 ~18.5M tokens (流量更大)
      totalTokensAll: 720_000_000,
      baseRequests: 26000,
      latency: 160,
    },
    {
      id: "deepseek-v4-pro",
      name: "deepseek-v4-pro",
      displayName: "DeepSeek V4 Pro",
      description: "旗舰推理 · 1.6万亿参数 · 复杂任务",
      baseTokens: 5_200_000,    // 今日 ~5.2M tokens (单价高)
      totalTokensAll: 165_000_000,
      baseRequests: 3800,
      latency: 2100,
    },
  ];

  return configs.map((cfg) => {
    const todayTokens = generateTokenUsage(cfg.baseTokens);
    const totalTokens = generateTokenUsage(cfg.totalTokensAll);
    const todayCost = calcCost(todayTokens, cfg.id);
    const totalCost = calcCost(totalTokens, cfg.id);
    return {
      id: cfg.id,
      name: cfg.name,
      displayName: cfg.displayName,
      description: cfg.description,
      todayTokens,
      totalTokens,
      todayCost: Number(todayCost.toFixed(4)),
      totalCost: Number(totalCost.toFixed(2)),
      todayRequests: cfg.baseRequests,
      rps: Math.floor(cfg.baseRequests / 86400 * rand(0.5, 2)),
      avgLatency: cfg.latency,
      successRate: Number(rand(99.2, 99.98).toFixed(2)),
      trend: generateTrend(cfg.baseTokens, todayCost),
      status: "active" as const,
    };
  });
}

// 生成账户余额
export function generateBalance(totalUsed: number): AccountBalance {
  const total = 500; // 充值 500 元
  const freeCredits = 10; // 赠送 10 元
  return {
    total,
    used: Number(totalUsed.toFixed(2)),
    remaining: Number((total + freeCredits - totalUsed).toFixed(2)),
    freeCredits,
    warningThreshold: 50, // 剩余低于 50 元预警
  };
}

// 格式化 token 数
export function formatTokens(n: number): string {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(2) + "B";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return Math.floor(n).toString();
}

// 格式化费用 (元)
export function formatCost(n: number): string {
  if (n >= 1000) return n.toFixed(2);
  if (n >= 1) return n.toFixed(2);
  return n.toFixed(4);
}
