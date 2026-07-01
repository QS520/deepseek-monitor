import { create } from "zustand";
import type { ModelMetric, AccountBalance, TokenUsage, ModelId } from "@/types";
import { calcCost } from "@/types";
import {
  fetchBalance,
  fetchUsageAmount,
  fetchUsageCost,
  validateApiKey,
} from "@/lib/deepseekApi";
import { registerPlugin } from "@capacitor/core";

// 模型显示信息映射（未知模型使用模型 ID 作为显示名）
const MODEL_INFO: Record<string, { displayName: string; description: string }> = {
  "deepseek-v4-flash": { displayName: "DeepSeek V4 Flash", description: "轻量高效 · 2840亿参数 · 高并发场景" },
  "deepseek-v4-pro": { displayName: "DeepSeek V4 Pro", description: "旗舰推理 · 1.6万亿参数 · 复杂任务" },
  "deepseek-chat": { displayName: "DeepSeek V3", description: "通用对话 · 快速响应" },
  "deepseek-reasoner": { displayName: "DeepSeek R1", description: "深度推理 · 思维链" },
};

// 注册原生 WidgetSync 插件（仅在原生 App 环境下可用，web 端调用会 reject）
interface WidgetSyncPlugin {
  saveData: (data: {
    apiKey: string;
    balance: string;
    totalUsed: string;
    todayUsed: string;
    flashTokens: string;
    proTokens: string;
    connected: string;
    lastUpdate: string;
  }) => Promise<any>;
}

const WidgetSync = registerPlugin<WidgetSyncPlugin>("WidgetSync");

// 同步数据到桌面小组件
function syncToWidget(state: MonitorState) {
  // 在原生 App 环境下才调用，web 端调用会被 catch 吞掉
  if (!WidgetSync) return;

  // 计算各模型的 token 总数（命中 + 未命中 + 补全）
  const modelTokens = state.models.map(
    (m) =>
      (m.totalTokens.promptCacheHit || 0) +
      (m.totalTokens.promptCacheMiss || 0) +
      (m.totalTokens.completion || 0)
  );

  // 第一个模型的 token 填到 flashTokens，第二个填到 proTokens，
  // 超过 2 个模型时多出的累加到 flashTokens
  let flashTokens = 0;
  let proTokens = 0;
  state.models.forEach((_, idx) => {
    const tokens = modelTokens[idx] || 0;
    if (idx === 0) {
      flashTokens += tokens;
    } else if (idx === 1) {
      proTokens += tokens;
    } else {
      flashTokens += tokens;
    }
  });

  // 今日总费用：所有模型 todayCost 之和
  const todayUsed = state.models.reduce((sum, m) => sum + m.todayCost, 0);

  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  WidgetSync.saveData({
    apiKey: state.apiKey,
    balance: state.balance.remaining.toFixed(2),
    totalUsed: state.balance.used.toFixed(2),
    todayUsed: todayUsed.toFixed(4),
    flashTokens: flashTokens.toLocaleString(),
    proTokens: proTokens.toLocaleString(),
    connected: state.connected ? "true" : "false",
    lastUpdate: timeStr,
  }).catch(() => {
    // web 或原生调用失败时忽略
  });
}

interface MonitorState {
  models: ModelMetric[];
  balance: AccountBalance;
  connected: boolean;
  lastUpdate: number;
  selectedModelId: string | null;
  apiKey: string;
  loading: boolean;
  error: string | null;

  tick: () => void;
  selectModel: (id: string | null) => void;
  updateWarningThreshold: (value: number) => void;
  setApiKey: (key: string) => void;
  refreshFromApi: () => Promise<void>;
}

// 默认空数据（未连接 API Key 时不显示假模型）
function emptyModels(): ModelMetric[] {
  return [];
}

function emptyBalance(): AccountBalance {
  return {
    total: 0,
    used: 0,
    remaining: 0,
    freeCredits: 0,
    warningThreshold: 50,
  };
}

// 从本地存储读取 API Key
function loadApiKey(): string {
  try {
    return localStorage.getItem("deepseek_api_key") || "";
  } catch {
    return "";
  }
}

export const useMonitorStore = create<MonitorState>((set, get) => ({
  models: emptyModels(),
  balance: emptyBalance(),
  connected: false,
  lastUpdate: Date.now(),
  selectedModelId: null,
  apiKey: loadApiKey(),
  loading: false,
  error: null,

  tick: () => {
    // 仅在有连接时做轻微模拟增量（保持趋势图活跃）
    const state = get();
    if (!state.connected) return;
    // 真实数据由 refreshFromApi 定时拉取，tick 不再修改数据
  },

  selectModel: (id) => set({ selectedModelId: id }),

  updateWarningThreshold: (value) =>
    set((state) => ({
      balance: { ...state.balance, warningThreshold: value },
    })),

  setApiKey: (key) => {
    try {
      localStorage.setItem("deepseek_api_key", key);
    } catch {
      // localStorage 不可用时忽略
    }
    set({ apiKey: key });
  },

  refreshFromApi: async () => {
    const { apiKey } = get();
    if (!apiKey) {
      set({ connected: false, error: "请先设置 API Key" });
      return;
    }

    set({ loading: true, error: null });

    try {
      // 并行请求余额和用量
      const now = new Date();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();

      const [balanceResp, amountResp, costResp] = await Promise.all([
        fetchBalance(apiKey),
        fetchUsageAmount(apiKey, month, year),
        fetchUsageCost(apiKey, month, year),
      ]);

      if (!balanceResp) {
        set({ loading: false, connected: false, error: "API Key 无效或网络错误" });
        return;
      }

      // 解析余额
      const cnyInfo = balanceResp.balance_infos?.find((b) => b.currency === "CNY");
      const totalBalance = cnyInfo ? parseFloat(cnyInfo.total_balance) : 0;
      const grantedBalance = cnyInfo ? parseFloat(cnyInfo.granted_balance) : 0;
      const toppedUp = cnyInfo ? parseFloat(cnyInfo.topped_up_balance) : 0;

      // 解析本月用量和费用
      const amountData = amountResp?.data?.amount || [];
      const costData = costResp?.data?.cost || [];

      // 用 Set 收集所有出现过的模型 ID（不再硬编码 deepseek-v4-flash / deepseek-v4-pro）
      const modelIdSet = new Set<string>();
      for (const day of amountData) {
        if (day.data) {
          for (const id of Object.keys(day.data)) {
            modelIdSet.add(id);
          }
        }
      }
      for (const day of costData) {
        if (day.data) {
          for (const id of Object.keys(day.data)) {
            modelIdSet.add(id);
          }
        }
      }
      const modelIds: string[] = Array.from(modelIdSet);

      // 创建一个空的聚合对象
      const emptyAgg = (): TokenUsage & { cost: number; requests: number } => ({
        promptCacheHit: 0,
        promptCacheMiss: 0,
        completion: 0,
        cost: 0,
        requests: 0,
      });

      // 聚合本月各模型数据
      const modelAgg: Record<string, TokenUsage & { cost: number; requests: number }> = {};
      for (const id of modelIds) {
        modelAgg[id] = emptyAgg();
      }

      // 累加每日用量
      for (const day of amountData) {
        const dayData = day.data;
        if (!dayData) continue;
        for (const modelId of modelIds) {
          const entries = dayData[modelId];
          if (entries && Array.isArray(entries)) {
            for (const e of entries) {
              const agg = modelAgg[modelId];
              agg.promptCacheHit += e.cache_hit_tokens || 0;
              agg.promptCacheMiss += e.cache_miss_tokens || 0;
              agg.completion += e.completion_tokens || 0;
              agg.requests += 1;
            }
          }
        }
      }

      // 累加每日费用
      for (const day of costData) {
        const dayData = day.data;
        if (!dayData) continue;
        for (const modelId of modelIds) {
          const entries = dayData[modelId];
          if (entries && Array.isArray(entries)) {
            for (const e of entries) {
              modelAgg[modelId].cost += e.total_cost || 0;
            }
          }
        }
      }

      // 今天的数据
      const todayStr = `${year}-${String(month).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
      const todayAmount = amountData.find((d) => d.date === todayStr);
      const todayCostEntry = costData.find((d) => d.date === todayStr);

      // 聚合今日各模型数据
      const todayAgg: Record<string, TokenUsage & { cost: number; requests: number }> = {};
      for (const id of modelIds) {
        todayAgg[id] = emptyAgg();
      }

      if (todayAmount?.data) {
        for (const modelId of modelIds) {
          const entries = todayAmount.data[modelId];
          if (entries && Array.isArray(entries)) {
            for (const e of entries) {
              const agg = todayAgg[modelId];
              agg.promptCacheHit += e.cache_hit_tokens || 0;
              agg.promptCacheMiss += e.cache_miss_tokens || 0;
              agg.completion += e.completion_tokens || 0;
              agg.requests += 1;
            }
          }
        }
      }

      if (todayCostEntry?.data) {
        for (const modelId of modelIds) {
          const entries = todayCostEntry.data[modelId];
          if (entries && Array.isArray(entries)) {
            for (const e of entries) {
              todayAgg[modelId].cost += e.total_cost || 0;
            }
          }
        }
      }

      // 构建趋势数据（最近 7 天），遍历所有模型 ID
      const trend: Array<{ time: string; tokens: number; cost: number; requests: number }> = [];
      const recentDays = amountData.slice(-7);
      for (const day of recentDays) {
        if (!day.data) continue;
        let dayTokens = 0;
        let dayCost = 0;
        let dayRequests = 0;
        for (const modelId of modelIds) {
          const entries = day.data[modelId];
          if (entries && Array.isArray(entries)) {
            for (const e of entries) {
              dayTokens += (e.cache_hit_tokens || 0) + (e.cache_miss_tokens || 0) + (e.completion_tokens || 0);
              dayRequests += 1;
            }
          }
        }
        // 对应费用
        const dayCostEntry = costData.find((c) => c.date === day.date);
        if (dayCostEntry?.data) {
          for (const modelId of modelIds) {
            const entries = dayCostEntry.data[modelId];
            if (entries && Array.isArray(entries)) {
              for (const e of entries) {
                dayCost += e.total_cost || 0;
              }
            }
          }
        }
        trend.push({
          time: day.date?.slice(5) || "",
          tokens: dayTokens,
          cost: Number(dayCost.toFixed(4)),
          requests: dayRequests,
        });
      }

      // 构建更新后的模型数据，遍历所有模型 ID，用 MODEL_INFO 获取显示名
      const updatedModels: ModelMetric[] = modelIds.map((modelId) => {
        const monthData = modelAgg[modelId];
        const todayData = todayAgg[modelId];
        const info = MODEL_INFO[modelId];
        const totalTokens: TokenUsage = {
          promptCacheHit: monthData.promptCacheHit,
          promptCacheMiss: monthData.promptCacheMiss,
          completion: monthData.completion,
        };
        const todayTokens: TokenUsage = {
          promptCacheHit: todayData.promptCacheHit,
          promptCacheMiss: todayData.promptCacheMiss,
          completion: todayData.completion,
        };
        return {
          id: modelId as ModelId,
          name: modelId,
          displayName: info?.displayName ?? modelId,
          description: info?.description ?? "",
          todayTokens,
          totalTokens,
          todayCost: Number(todayData.cost.toFixed(4)),
          totalCost: Number(monthData.cost.toFixed(2)),
          todayRequests: todayData.requests,
          rps: 0,
          avgLatency: 0,
          successRate: 100,
          trend,
          status: todayData.requests > 0 ? ("active" as const) : ("idle" as const),
        };
      });

      // 计算总用量
      const totalUsed = updatedModels.reduce((sum, m) => sum + m.totalCost, 0);

      const updatedBalance: AccountBalance = {
        total: toppedUp,
        used: Number(totalUsed.toFixed(2)),
        remaining: Number(totalBalance.toFixed(2)),
        freeCredits: grantedBalance,
        warningThreshold: get().balance.warningThreshold,
      };

      set({
        models: updatedModels,
        balance: updatedBalance,
        connected: true,
        loading: false,
        error: null,
        lastUpdate: Date.now(),
      });

      // 同步数据到桌面小组件
      syncToWidget(get());
    } catch (err) {
      set({
        loading: false,
        connected: false,
        error: err instanceof Error ? err.message : "未知错误",
      });
    }
  },
}));

// App 启动时立即同步一次当前状态到桌面小组件
// （将上次的数据或空状态推送到 widget，避免 widget 显示空白）
syncToWidget(useMonitorStore.getState());
