// 调价方案 - 高峰期临时调价模块（设计方案，暂未集成到正式计算流程）
//
// 背景：官方 7 月中旬起每天高峰期涨价 50%
// 设计目标：在设置页提供"高峰期调价"开关，可自定义：
//   1. 调价时间段（默认 19:00 - 23:00）
//   2. 涨幅百分比（默认 50%）
//   3. 启用/禁用
//
// 费用计算时，若当前时间在调价时段内，所有单价 × (1 + 涨幅/100)

import { PRICING, type ModelPricing, type TokenUsage, type ModelId } from "@/types";

// 调价配置
export interface SurgePricingConfig {
  enabled: boolean;        // 是否启用
  startHour: number;      // 起始小时（0-23），默认 19
  endHour: number;        // 结束小时（0-23），默认 23
  surgePercent: number;   // 涨幅百分比，默认 50（即 +50%）
  note?: string;          // 备注
}

// 默认配置（7 月中旬官方计划）
export const DEFAULT_SURGE_CONFIG: SurgePricingConfig = {
  enabled: false,
  startHour: 19,
  endHour: 23,
  surgePercent: 50,
  note: "7 月中旬起官方高峰期调价",
};

// 本地存储 key
const STORAGE_KEY = "deepseek_surge_pricing_config";

// 加载配置
export function loadSurgeConfig(): SurgePricingConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SURGE_CONFIG;
    const parsed = { ...DEFAULT_SURGE_CONFIG, ...JSON.parse(raw) };
    return parsed;
  } catch {
    return DEFAULT_SURGE_CONFIG;
  }
}

// 保存配置
export function saveSurgeConfig(config: SurgePricingConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    // ignore
  }
}

// 判断某时刻是否处于高峰期
export function isSurgeTime(date: Date, config: SurgePricingConfig): boolean {
  if (!config.enabled) return false;
  const hour = date.getHours();
  if (config.startHour <= config.endHour) {
    // 不跨天：例如 19-23
    return hour >= config.startHour && hour < config.endHour;
  } else {
    // 跨天：例如 22-6
    return hour >= config.startHour || hour < config.endHour;
  }
}

// 获取当前生效的某模型定价（考虑调价）
export function getEffectivePricing(
  modelId: ModelId,
  config: SurgePricingConfig,
  now: Date = new Date()
): ModelPricing {
  const base = PRICING[modelId] || {
    promptCacheHit: 0.1,
    promptCacheMiss: 1,
    completion: 2,
  };
  if (!isSurgeTime(now, config)) return base;

  const multiplier = 1 + config.surgePercent / 100;
  return {
    promptCacheHit: Number((base.promptCacheHit * multiplier).toFixed(4)),
    promptCacheMiss: Number((base.promptCacheMiss * multiplier).toFixed(4)),
    completion: Number((base.completion * multiplier).toFixed(4)),
  };
}

// 带调价计算的费用
export function calcCostWithSurge(
  usage: TokenUsage,
  modelId: ModelId,
  config: SurgePricingConfig,
  now: Date = new Date()
): number {
  const p = getEffectivePricing(modelId, config, now);
  return (
    (usage.promptCacheHit / 1_000_000) * p.promptCacheHit +
    (usage.promptCacheMiss / 1_000_000) * p.promptCacheMiss +
    (usage.completion / 1_000_000) * p.completion
  );
}

// 计算给定小时下，今日预计进入高峰期的总时长（小时）
export function getSurgeHoursToday(config: SurgePricingConfig): number {
  if (!config.enabled) return 0;
  if (config.startHour <= config.endHour) {
    return config.endHour - config.startHour;
  } else {
    return 24 - config.startHour + config.endHour;
  }
}
