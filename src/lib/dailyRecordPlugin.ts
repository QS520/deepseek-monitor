import { registerPlugin } from "@capacitor/core";

// 原生每日记录插件接口
export interface DailyRecordPlugin {
  // 同步 apiKey 和 usageToken 到原生层（供 Worker 使用）
  syncConfig(options: { apiKey: string; usageToken: string }): Promise<void>;

  // 读取原生层存储的每日记录（Worker 在 23:59 存的数据）
  getRecords(options: { days: number; model?: string }): Promise<{
    records: Array<{
      date: string;
      model: string;
      tokens: number;
      cost: number;
      updatedAt: string;
    }>;
  }>;

  // 前端写入记录到原生层
  saveRecord(options: {
    date: string;
    model: string;
    tokens: number;
    cost: number;
  }): Promise<void>;

  // 立即触发 Worker 执行（测试用）
  triggerWorker(): Promise<void>;

  // 注册每日 23:55 的定时任务
  scheduleDailyTask(): Promise<{ delayMinutes: number }>;
}

const DailyRecord = registerPlugin<DailyRecordPlugin>("DailyRecord");

export default DailyRecord;
