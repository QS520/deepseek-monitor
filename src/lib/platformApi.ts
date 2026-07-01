// platform.deepseek.com API - 用量详情和费用明细
// 需要使用网页登录 Token（非 API Key）进行认证
// 参考: DeepSeekMonitorWindows 项目的 fetch_usage 实现

import { Capacitor, CapacitorHttp } from "@capacitor/core";
import type { HttpOptions, HttpResponse } from "@capacitor/core";

const PLATFORM_BASE = "https://platform.deepseek.com";

// 检测是否运行在 Capacitor 原生环境中
const isNative = Capacitor.isNativePlatform();

// 统一的原生/网页请求封装
async function httpRequest<T>(options: HttpOptions): Promise<T> {
  if (isNative) {
    // 走原生网络栈，绕过 WebView 的 CORS/WAF 限制
    const resp: HttpResponse = await CapacitorHttp.request(options);
    return resp.data as T;
  }
  // Web 开发环境回退到 fetch
  const query = options.params ? "?" + new URLSearchParams(options.params as Record<string, string>).toString() : "";
  const url = `${options.url}${query}`;
  const resp = await fetch(url, {
    method: options.method || "GET",
    headers: options.headers as Record<string, string>,
    body: options.data ? JSON.stringify(options.data) : undefined,
  });
  return (await resp.json()) as T;
}
// ---- 类型定义 ----

// 单条用量条目（来自 API 原始格式）
export interface UsageEntry {
  type: string;   // REQUEST | PROMPT_CACHE_HIT_TOKEN | PROMPT_CACHE_MISS_TOKEN | RESPONSE_TOKEN
  amount: string;  // 字符串数字
}

// 每模型汇总
export interface ModelUsageTotal {
  model: string;
  usage: UsageEntry[];
}

// 按日用量
export interface DayUsageItem {
  date: string;
  data: ModelUsageTotal[];
}

// /api/v0/usage/amount 响应
export interface PlatformAmountResponse {
  data?: {
    biz_data?: {
      total?: ModelUsageTotal[];
      days?: DayUsageItem[];
    };
  };
}

// /api/v0/usage/cost 费用条目
export interface CostEntry {
  type: string;
  amount: string;
}

export interface ModelCostTotal {
  model: string;
  usage: CostEntry[];
}

export interface DayCostItem {
  date: string;
  data: ModelCostTotal[];
}

export interface PlatformCostResponse {
  data?: {
    biz_data?: {
      total?: ModelCostTotal[];
      days?: DayCostItem[];
    };
  };
}

// ---- Token 分类解析结果 ----

export interface TokenBreakdown {
  totalTokens: number;
  requestCount: number;
  cacheHitTokens: number;
  cacheMissTokens: number;
  responseTokens: number;
}

// ---- 核心函数：token 分类聚合 ----
// 对应 Windows 项目 Rust 端的 token_breakdown()
export function tokenBreakdown(entries: UsageEntry[]): TokenBreakdown {
  let requestCount = 0;
  let cacheHit = 0;
  let cacheMiss = 0;
  let response = 0;
  let total = 0;

  for (const entry of entries) {
    const val = parseInt(entry.amount, 10) || 0;
    switch (entry.type) {
      case "REQUEST":
        requestCount += val;
        break;
      case "PROMPT_CACHE_HIT_TOKEN":
        cacheHit += val;
        total += val;
        break;
      case "PROMPT_CACHE_MISS_TOKEN":
        cacheMiss += val;
        total += val;
        break;
      case "RESPONSE_TOKEN":
        response += val;
        total += val;
        break;
      case "PROMPT_TOKEN":
        // 旧版未分类的输入 token，计入 total 但不区分命中
        total += val;
        break;
    }
  }

  return {
    totalTokens: total,
    requestCount,
    cacheHitTokens: cacheHit,
    cacheMissTokens: cacheMiss,
    responseTokens: response,
  };
}

// 计算缓存命中率
export function calcCacheHitRate(hit: number, miss: number): number {
  const total = hit + miss;
  return total > 0 ? hit / total : 0;
}

// 费用汇总
export function costSum(entries: CostEntry[]): number {
  let sum = 0;
  for (const entry of entries) {
    if (entry.type === "REQUEST") continue;
    sum += parseFloat(entry.amount) || 0;
  }
  return sum;
}

// ---- API 调用 ----

// 验证用量 Token 是否有效
export async function verifyUsageToken(token: string): Promise<boolean> {
  try {
    const now = new Date();
    const resp = await httpRequest<PlatformAmountResponse>({
      url: `${PLATFORM_BASE}/api/v0/usage/amount`,
      method: "GET",
      params: {
        month: String(now.getMonth() + 1),
        year: String(now.getFullYear()),
      },
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        "x-app-version": "1.0.0",
      },
    });
    return true; // httpRequest 不抛异常即认为有效
  } catch {
    return false;
  }
}

// 查询月度 Token 用量（platform.deepseek.com）
export async function fetchPlatformAmount(
  usageToken: string,
  month: number,
  year: number
): Promise<PlatformAmountResponse | null> {
  try {
    const resp = await httpRequest<PlatformAmountResponse>({
      url: `${PLATFORM_BASE}/api/v0/usage/amount`,
      method: "GET",
      params: { month: String(month), year: String(year) },
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${usageToken}`,
        "x-app-version": "1.0.0",
      },
    });
    return resp;
  } catch (err) {
    console.error("查询平台用量失败:", err);
    return null;
  }
}

// 查询月度费用（platform.deepseek.com）
export async function fetchPlatformCost(
  usageToken: string,
  month: number,
  year: number
): Promise<PlatformCostResponse | null> {
  try {
    const resp = await httpRequest<PlatformCostResponse>({
      url: `${PLATFORM_BASE}/api/v0/usage/cost`,
      method: "GET",
      params: { month: String(month), year: String(year) },
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${usageToken}`,
        "x-app-version": "1.0.0",
      },
    });
    return resp;
  } catch (err) {
    console.error("查询平台费用失败:", err);
    return null;
  }
}

// ---- 聚合结果类型（给 Store 使用） ----

export interface PlatformModelSummary {
  model: string;
  totalTokens: number;
  requestCount: number;
  cacheHitTokens: number;
  cacheMissTokens: number;
  responseTokens: number;
  cost: number;
}

export interface PlatformDaySummary {
  date: string;
  totalTokens: number;
  cacheHit: number;
  cacheMiss: number;
  response: number;
  cost: number;
}

export interface PlatformUsageResult {
  models: PlatformModelSummary[];
  days: PlatformDaySummary[];
  monthCost: number;
}

// 聚合 amount + cost 数据为统一结构
export function aggregatePlatformData(
  amountResp: PlatformAmountResponse | null,
  costResp: PlatformCostResponse | null
): PlatformUsageResult {
  const models: PlatformModelSummary[] = [];
  const days: PlatformDaySummary[] = [];
  let monthCost = 0;

  // 构建 cost lookup: model -> cost
  const modelCost: Record<string, number> = {};
  if (costResp?.data?.biz_data?.total) {
    for (const item of costResp.data.biz_data.total) {
      modelCost[item.model] = costSum(item.usage);
      monthCost += modelCost[item.model];
    }
  }

  // 解析 amount 数据
  const bizData = amountResp?.data?.biz_data;

  // 按模型汇总
  if (bizData?.total) {
    for (const item of bizData.total) {
      const breakdown = tokenBreakdown(item.usage);
      models.push({
        model: item.model,
        totalTokens: breakdown.totalTokens,
        requestCount: breakdown.requestCount,
        cacheHitTokens: breakdown.cacheHitTokens,
        cacheMissTokens: breakdown.cacheMissTokens,
        responseTokens: breakdown.responseTokens,
        cost: modelCost[item.model] || 0,
      });
    }
  }

  // 按日汇总：跨所有 model 合并
  if (bizData?.days) {
    const dayMap: Record<string, { hit: number; miss: number; response: number }> = {};

    for (const day of bizData.days) {
      for (const modelItem of day.data) {
        if (!dayMap[day.date]) {
          dayMap[day.date] = { hit: 0, miss: 0, response: 0 };
        }
        const breakdown = tokenBreakdown(modelItem.usage);
        dayMap[day.date].hit += breakdown.cacheHitTokens;
        dayMap[day.date].miss += breakdown.cacheMissTokens;
        dayMap[day.date].response += breakdown.responseTokens;
      }
    }

    // 转为数组（保留排序）
    const sortedDays = Object.keys(dayMap).sort();
    for (const date of sortedDays) {
      const d = dayMap[date];
      days.push({
        date,
        totalTokens: d.hit + d.miss + d.response,
        cacheHit: d.hit,
        cacheMiss: d.miss,
        response: d.response,
        cost: 0,
      });
    }
  }

  return { models, days, monthCost };
}

