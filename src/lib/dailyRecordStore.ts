// 每日记录存储
// 数据结构：{ date, model, tokens, cost, updatedAt }
// 同一天同一模型，更新已有记录（不重复添加）
//
// 存储策略：
// - 原生层（SharedPreferences）：Worker 在 23:59 自动存储，即使 App 不在前台
// - 前端 localStorage：App 运行时每 5 分钟存储，作为备份
// - 读取时合并两者，原生层优先（因为 23:59 的数据更准确）

import DailyRecord from "@/lib/dailyRecordPlugin";
import { Capacitor } from "@capacitor/core";

export interface DailyRecord {
  date: string;        // "2026-07-02"
  model: string;       // "deepseek-v4-flash" | "deepseek-v4-pro"
  tokens: number;      // 当日 token 总数
  cost: number;        // 当日费用（元）
  updatedAt: string;  // ISO 时间戳
}

const STORAGE_KEY = "deepseek_daily_records";
const MAX_DAYS = 90; // 最多保留 90 天
const SAVE_INTERVAL_MS = 5 * 60 * 1000; // 5 分钟节流

// 上次保存时间（内存变量，用于节流）
let lastSaveTime = 0;

// 读取所有记录（前端 localStorage）
export function loadDailyRecords(): DailyRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

// 保存所有记录（前端 localStorage）
function saveAllRecords(records: DailyRecord[]): void {
  try {
    // 清理超过 MAX_DAYS 的旧记录
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - MAX_DAYS);
    const cutoffStr = cutoff.toISOString().slice(0, 10);
    const filtered = records.filter((r) => r.date >= cutoffStr);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch {
    // localStorage 不可用时忽略
  }
}

// 保存或更新当日某模型记录
// 同一天同一模型，覆盖更新（tokens/cost 是当日累计值，直接覆盖）
export function saveDailyRecord(
  date: string,
  model: string,
  tokens: number,
  cost: number
): void {
  const records = loadDailyRecords();
  const idx = records.findIndex(
    (r) => r.date === date && r.model === model
  );
  const record: DailyRecord = {
    date,
    model,
    tokens,
    cost,
    updatedAt: new Date().toISOString(),
  };
  if (idx >= 0) {
    records[idx] = record;
  } else {
    records.push(record);
  }
  saveAllRecords(records);
}

// 批量保存当日多个模型的记录
// 带 5 分钟节流：距离上次保存不足 5 分钟则跳过
// force=true 时强制保存（用于 23:59 兜底）
// 同时写入前端 localStorage 和原生层（如果可用）
export async function saveDailyRecordsBatch(
  date: string,
  items: Array<{ model: string; tokens: number; cost: number }>,
  force: boolean = false
): Promise<void> {
  const now = Date.now();
  if (!force && now - lastSaveTime < SAVE_INTERVAL_MS) {
    return; // 节流：5 分钟内不重复保存
  }
  lastSaveTime = now;

  // 1. 写入前端 localStorage
  const records = loadDailyRecords();
  for (const item of items) {
    const idx = records.findIndex(
      (r) => r.date === date && r.model === item.model
    );
    const record: DailyRecord = {
      date,
      model: item.model,
      tokens: item.tokens,
      cost: item.cost,
      updatedAt: new Date().toISOString(),
    };
    if (idx >= 0) {
      records[idx] = record;
    } else {
      records.push(record);
    }
  }
  saveAllRecords(records);

  // 2. 写入原生层（如果运行在原生 App 中）
  if (Capacitor.isNativePlatform()) {
    try {
      for (const item of items) {
        await DailyRecord.saveRecord({
          date,
          model: item.model,
          tokens: item.tokens,
          cost: item.cost,
        });
      }
    } catch {
      // 原生调用失败时忽略，前端 localStorage 已保存
    }
  }
}

// 获取某模型最近 N 天的记录（包含没有数据的天，填 0）
// 优先从原生层读取（包含 23:59 Worker 存的数据），合并前端 localStorage
export async function getModelDailyRecords(
  model: string,
  days: number = 30
): Promise<DailyRecord[]> {
  // 1. 从前端 localStorage 读取
  const localRecords = loadDailyRecords().filter((r) => r.model === model);

  // 2. 从原生层读取（如果可用）
  let nativeRecords: DailyRecord[] = [];
  if (Capacitor.isNativePlatform()) {
    try {
      const result = await DailyRecord.getRecords({ days, model });
      nativeRecords = result.records.map((r) => ({
        date: r.date,
        model: r.model,
        tokens: r.tokens,
        cost: r.cost,
        updatedAt: r.updatedAt,
      }));
    } catch {
      // 原生调用失败时只用 localStorage
    }
  }

  // 3. 合并：以原生层为主，localStorage 补充
  const merged: Record<string, DailyRecord> = {};
  for (const r of localRecords) {
    merged[r.date] = r;
  }
  for (const r of nativeRecords) {
    // 原生层有数据则覆盖（原生层 23:59 的数据更准确）
    if (r.tokens > 0 || r.cost > 0) {
      merged[r.date] = r;
    }
  }

  // 4. 生成最近 N 天的日期列表，填充缺失的天
  const result: DailyRecord[] = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const record = merged[dateStr];
    if (record) {
      result.push(record);
    } else {
      result.push({
        date: dateStr,
        model,
        tokens: 0,
        cost: 0,
        updatedAt: "",
      });
    }
  }
  return result;
}

// 获取某天的所有模型记录
export function getDayRecords(date: string): DailyRecord[] {
  return loadDailyRecords().filter((r) => r.date === date);
}

// 清空所有记录
export function clearDailyRecords(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

// 获取今天的日期字符串
export function getTodayStr(): string {
  return new Date().toISOString().slice(0, 10);
}
