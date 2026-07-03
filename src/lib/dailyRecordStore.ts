// 每日记录存储
// 数据结构：{ date, model, tokens, cost, updatedAt }
// 同一天同一模型，更新已有记录（不重复添加）

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

// 读取所有记录
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

// 保存所有记录
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
export function saveDailyRecordsBatch(
  date: string,
  items: Array<{ model: string; tokens: number; cost: number }>,
  force: boolean = false
): void {
  const now = Date.now();
  if (!force && now - lastSaveTime < SAVE_INTERVAL_MS) {
    return; // 节流：5 分钟内不重复保存
  }
  lastSaveTime = now;

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
}

// 获取某模型最近 N 天的记录（包含没有数据的天，填 0）
export function getModelDailyRecords(
  model: string,
  days: number = 30
): DailyRecord[] {
  const records = loadDailyRecords().filter((r) => r.model === model);
  const result: DailyRecord[] = [];

  // 生成最近 N 天的日期列表
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const record = records.find((r) => r.date === dateStr);
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
