// 调价方案 - 高峰期临时调价模块（设计方案，暂未集成到正式计算流程）
//
// 背景：官方 7 月中旬起每天高峰期涨价 50%
// 支持每天多个时段（如 8:00-12:00 + 14:00-18:00），时间粒度 30 分钟
//
// 费用计算时，若当前时刻处于任一调价时段内，所有单价 × (1 + 涨幅/100)

import { PRICING, type ModelPricing, type TokenUsage, type ModelId } from "@/types";

// 时间点：分钟数（0-1439），粒度 30 分钟
// 例如 9:30 = 9*60+30 = 570
export interface TimeOfDay {
  hour: number;   // 0-23
  minute: number; // 0 或 30
}

// 单个调价时段
export interface SurgeTimeRange {
  id: string;          // 唯一 ID
  start: TimeOfDay;    // 起始时刻
  end: TimeOfDay;      // 结束时刻（不含）
  label?: string;      // 可选备注
}

// 调价配置
export interface SurgePricingConfig {
  enabled: boolean;        // 是否启用
  ranges: SurgeTimeRange[]; // 多个时段
  surgePercent: number;     // 涨幅百分比，默认 50
  note?: string;
}

export const DEFAULT_SURGE_CONFIG: SurgePricingConfig = {
  enabled: false,
  ranges: [
    { id: "default-1", start: { hour: 19, minute: 0 }, end: { hour: 23, minute: 0 }, label: "晚高峰" },
  ],
  surgePercent: 50,
  note: "7 月中旬起官方高峰期调价",
};

const STORAGE_KEY = "deepseek_surge_pricing_config";

// 时间点转分钟数
export function timeToMinutes(t: TimeOfDay): number {
  return t.hour * 60 + t.minute;
}

// 分钟数转 HH:MM 字符串
export function minutesToLabel(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

// TimeOfDay 转 HH:MM
export function timeToLabel(t: TimeOfDay): string {
  return minutesToLabel(timeToMinutes(t));
}

// 生成唯一 ID
export function genRangeId(): string {
  return `range-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

// 加载配置
export function loadSurgeConfig(): SurgePricingConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SURGE_CONFIG;
    const parsed = JSON.parse(raw);
    // 兼容旧格式（单时段）
    if (parsed.startHour !== undefined && !parsed.ranges) {
      return {
        enabled: parsed.enabled ?? false,
        ranges: [{
          id: "migrated",
          start: { hour: parsed.startHour, minute: 0 },
          end: { hour: parsed.endHour, minute: 0 },
        }],
        surgePercent: parsed.surgePercent ?? 50,
        note: parsed.note,
      };
    }
    return { ...DEFAULT_SURGE_CONFIG, ...parsed };
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

// 判断某时刻是否处于任一调价时段内
export function isSurgeTime(date: Date, config: SurgePricingConfig): boolean {
  if (!config.enabled || config.ranges.length === 0) return false;
  const minutes = date.getHours() * 60 + date.getMinutes();
  for (const range of config.ranges) {
    const startMin = timeToMinutes(range.start);
    const endMin = timeToMinutes(range.end);
    if (startMin === endMin) continue; // 空时段跳过
    if (startMin < endMin) {
      // 不跨天
      if (minutes >= startMin && minutes < endMin) return true;
    } else {
      // 跨天（如 22:00 - 06:00）
      if (minutes >= startMin || minutes < endMin) return true;
    }
  }
  return false;
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

// 今日所有时段总时长（分钟）
export function getSurgeMinutesToday(config: SurgePricingConfig): number {
  if (!config.enabled) return 0;
  let total = 0;
  for (const range of config.ranges) {
    const startMin = timeToMinutes(range.start);
    const endMin = timeToMinutes(range.end);
    if (startMin === endMin) continue;
    total += startMin < endMin ? (endMin - startMin) : (1440 - startMin + endMin);
  }
  return total;
}
