import { create } from "zustand";
import type { ModelMetric, AccountBalance, TokenUsage, ModelId } from "@/types";
import type { ModelInfo } from "@/lib/deepseekApi";
import { calcCost, getPricing } from "@/types";
import {
  fetchBalance,
  fetchUsage,
  fetchModels,
  validateApiKey,
} from "@/lib/deepseekApi";
import {
  fetchPlatformAmount,
  fetchPlatformCost,
  aggregatePlatformData,
  type PlatformUsageResult,
} from "@/lib/platformApi";
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
  availableModels: ModelInfo[]; // 从 /models 接口获取的可用模型列表
  balance: AccountBalance;
  connected: boolean;
  lastUpdate: number;
  selectedModelId: string | null;
  apiKey: string;
  usageToken: string;          // 平台网页登录 Token
  usageTokenReady: boolean;    // Token 是否已验证
  platformModels: PlatformModel[];  // 本月的详细分类数据
  platformDays: PlatformDay[];      // 按日趋势含命中率
  loading: boolean;
  error: string | null;
  debugRaw: string | null; // 最近一次 API 调用的原始返回（用于调试用量接口）

  tick: () => void;
  selectModel: (id: string | null) => void;
  updateWarningThreshold: (value: number) => void;
  setApiKey: (key: string) => void;
  setUsageToken: (token: string) => void;
  refreshFromApi: () => Promise<void>;
  refreshFromPlatform: () => Promise<void>;
  fetchAvailableModels: () => Promise<void>;
}

// 基于平台 API 的模型数据结构
export interface PlatformModel {
  model: string;
  displayName: string;
  totalTokens: number;
  requestCount: number;
  cacheHitTokens: number;
  cacheMissTokens: number;
  responseTokens: number;
  cost: number;
  cacheHitRate: number;
}

export interface PlatformDay {
  date: string;
  totalTokens: number;
  cacheHit: number;
  cacheMiss: number;
  response: number;
  cost: number;
  cacheHitRate: number;
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

// 从本地存储读取用量 Token
function loadUsageToken(): string {
  try {
    return localStorage.getItem("deepseek_usage_token") || "";
  } catch {
    return "";
  }
}

export const useMonitorStore = create<MonitorState>((set, get) => ({
  models: emptyModels(),
  availableModels: [],
  balance: emptyBalance(),
  connected: false,
  lastUpdate: Date.now(),
  selectedModelId: null,
  apiKey: loadApiKey(),
  usageToken: loadUsageToken(),
  usageTokenReady: false,
  platformModels: [],
  platformDays: [],
  loading: false,
  error: null,
  debugRaw: null,

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

  setUsageToken: (token) => {
    try {
      localStorage.setItem("deepseek_usage_token", token);
    } catch {
      // localStorage 不可用时忽略
    }
    set({ usageToken: token, usageTokenReady: !!token });
    // 保存后立即拉取平台数据
    if (token) {
      get().refreshFromPlatform();
    }
  },

  // 从 platform.deepseek.com 拉取详细用量（含缓存命中率）
  refreshFromPlatform: async () => {
    const { usageToken } = get();
    if (!usageToken) return;

    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    // 并行拉取 amount 和 cost
    const [amountResp, costResp] = await Promise.all([
      fetchPlatformAmount(usageToken, month, year),
      fetchPlatformCost(usageToken, month, year),
    ]);

    if (!amountResp) {
      set({ usageTokenReady: false });
      return;
    }

    const result = aggregatePlatformData(amountResp, costResp);

    // 构建平台模型列表
    const ptModels: PlatformModel[] = result.models.map((m) => ({
      model: m.model,
      displayName: m.model.replace("deepseek-", "").toUpperCase(),
      totalTokens: m.totalTokens,
      requestCount: m.requestCount,
      cacheHitTokens: m.cacheHitTokens,
      cacheMissTokens: m.cacheMissTokens,
      responseTokens: m.responseTokens,
      cost: m.cost,
      cacheHitRate: m.cacheHitTokens + m.cacheMissTokens > 0
        ? m.cacheHitTokens / (m.cacheHitTokens + m.cacheMissTokens)
        : 0,
    }));

    // 构建按日趋势
    const ptDays: PlatformDay[] = result.days.map((d) => ({
      date: d.date,
      totalTokens: d.totalTokens,
      cacheHit: d.cacheHit,
      cacheMiss: d.cacheMiss,
      response: d.response,
      cost: d.cost,
      cacheHitRate: d.cacheHit + d.cacheMiss > 0
        ? d.cacheHit / (d.cacheHit + d.cacheMiss)
        : 0,
    }));

    set({
      platformModels: ptModels,
      platformDays: ptDays,
      usageTokenReady: true,
    });
  },

  refreshFromApi: async () => {
    const { apiKey, fetchAvailableModels } = get();
    if (!apiKey) {
      set({ connected: false, error: "请先设置 API Key" });
      return;
    }

    set({ loading: true, error: null });

    // 同时获取模型列表（非阻塞）
    fetchAvailableModels().catch(() => {});

    try {
      // 日期范围：本月1日到今天
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;
      const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
      const endDate = `${year}-${String(month).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
      const todayStr = `${year}-${String(month).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

      // 并行请求余额和用量
      const [balanceResp, usageResp] = await Promise.all([
        fetchBalance(apiKey),
        fetchUsage(apiKey, startDate, endDate),
      ]);

      // 把原始返回存入 debugRaw（截断到 1500 字符防止过长）
      const debugRaw = JSON.stringify({ balance: balanceResp, usage: usageResp }, null, 2).slice(0, 1500);

      if (!balanceResp) {
        set({ loading: false, connected: false, error: "API Key 无效或网络错误", debugRaw });
        return;
      }

      // 解析余额
      const cnyInfo = balanceResp.balance_infos?.find((b) => b.currency === "CNY");
      const totalBalance = cnyInfo ? parseFloat(cnyInfo.total_balance) : 0;
      const grantedBalance = cnyInfo ? parseFloat(cnyInfo.granted_balance) : 0;
      const toppedUp = cnyInfo ? parseFloat(cnyInfo.topped_up_balance) : 0;

      // 容错解析 usageResp，尝试多种可能的返回结构
      // 可能结构 A: { data: [{model, prompt_tokens, completion_tokens, timestamp, ...}, ...] }
      // 可能结构 B: [{model, prompt_tokens, completion_tokens, ...}, ...]
      // 可能结构 C: { data: { usage: [...] } }
      // 可能结构 D: { data: { amount: [...] } } (旧假设)
      let usageList: any[] = [];
      if (Array.isArray(usageResp)) {
        usageList = usageResp;
      } else if (usageResp && typeof usageResp === "object") {
        if (Array.isArray(usageResp.data)) {
          usageList = usageResp.data;
        } else if (usageResp.data && Array.isArray(usageResp.data.usage)) {
          usageList = usageResp.data.usage;
        } else if (usageResp.data && Array.isArray(usageResp.data.amount)) {
          usageList = usageResp.data.amount;
        } else if (Array.isArray(usageResp.usage)) {
          usageList = usageResp.usage;
        }
      }

      // 聚合按模型：月度总量 + 今日
      const emptyAgg = () => ({
        promptCacheHit: 0,
        promptCacheMiss: 0,
        completion: 0,
        requests: 0,
      });
      const monthAgg: Record<string, ReturnType<typeof emptyAgg>> = {};
      const todayAgg: Record<string, ReturnType<typeof emptyAgg>> = {};
      const dayTokensMap: Record<string, number> = {}; // 按日期聚合 token（用于趋势）

      for (const item of usageList) {
        if (!item || typeof item !== "object") continue;
        // 提取模型 ID，可能字段名是 model 或 model_id
        const modelId: string = item.model || item.model_id || "unknown";
        // 提取 token 数，可能字段名有多种
        const promptTokens = Number(item.prompt_tokens || item.prompt || 0);
        const completionTokens = Number(item.completion_tokens || item.completion || 0);
        const cacheHit = Number(item.prompt_cache_hit_tokens || item.cache_hit_tokens || 0);
        const cacheMiss = Number(item.prompt_cache_miss_tokens || item.cache_miss_tokens || 0);
        // 缓存未命中 = prompt - cacheHit（如果没单独给字段）
        const cacheMissFinal = cacheMiss > 0 ? cacheMiss : Math.max(0, promptTokens - cacheHit);
        // 提取日期/时间戳
        const ts: string = item.timestamp || item.date || item.created_at || "";

        if (!monthAgg[modelId]) monthAgg[modelId] = emptyAgg();
        monthAgg[modelId].promptCacheHit += cacheHit;
        monthAgg[modelId].promptCacheMiss += cacheMissFinal;
        monthAgg[modelId].completion += completionTokens;
        monthAgg[modelId].requests += 1;

        // 今日数据
        if (ts && ts.startsWith(todayStr)) {
          if (!todayAgg[modelId]) todayAgg[modelId] = emptyAgg();
          todayAgg[modelId].promptCacheHit += cacheHit;
          todayAgg[modelId].promptCacheMiss += cacheMissFinal;
          todayAgg[modelId].completion += completionTokens;
          todayAgg[modelId].requests += 1;
        }

        // 趋势：按日期聚合 token
        const dayKey = ts ? ts.slice(0, 10) : "";
        if (dayKey) {
          dayTokensMap[dayKey] = (dayTokensMap[dayKey] || 0) + cacheHit + cacheMissFinal + completionTokens;
        }
      }

      // 构建趋势数据（最近 7 天）
      const allDays = Object.keys(dayTokensMap).sort();
      const recentDays = allDays.slice(-7);
      const trend = recentDays.map((day) => ({
        time: day.slice(5),
        tokens: dayTokensMap[day],
        cost: 0,
        requests: 0,
      }));

      // 构建模型数据
      const modelIds = Object.keys(monthAgg);
      const updatedModels: ModelMetric[] = modelIds.map((modelId) => {
        const monthData = monthAgg[modelId];
        const todayData = todayAgg[modelId] || emptyAgg();
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
        // 用定价算费用
        const todayCost = calcCost(todayTokens, modelId);
        const totalCost = calcCost(totalTokens, modelId);
        return {
          id: modelId as ModelId,
          name: modelId,
          displayName: info?.displayName ?? modelId,
          description: info?.description ?? "",
          todayTokens,
          totalTokens,
          todayCost: Number(todayCost.toFixed(4)),
          totalCost: Number(totalCost.toFixed(2)),
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

      // 判断连接状态：有余额就算连接成功，即使用量为空
      const isConnected = totalBalance > 0 || updatedModels.length > 0;

      set({
        models: updatedModels,
        balance: updatedBalance,
        connected: isConnected,
        loading: false,
        error: null,
        lastUpdate: Date.now(),
        debugRaw,
      });

      // 同步数据到桌面小组件
      syncToWidget(get());

      // 有用量 Token 时同步拉取平台详细数据
      if (get().usageToken) {
        get().refreshFromPlatform();
      }
    } catch (err) {
      set({
        loading: false,
        connected: false,
        error: err instanceof Error ? err.message : "未知错误",
      });
    }
  },

  fetchAvailableModels: async () => {
    const { apiKey } = get();
    if (!apiKey) {
      return;
    }

    try {
      const modelsResp = await fetchModels(apiKey);
      if (modelsResp && Array.isArray(modelsResp.data)) {
        set({ availableModels: modelsResp.data });
      }
    } catch (err) {
      console.error("获取模型列表失败:", err);
    }
  },
}));

// App 启动时立即同步一次当前状态到桌面小组件
// （将上次的数据或空状态推送到 widget，避免 widget 显示空白）
syncToWidget(useMonitorStore.getState());

// App 启动时有用量 Token 就自动拉取平台数据
const startupToken = loadUsageToken();
if (startupToken) {
  useMonitorStore.getState().refreshFromPlatform();
}

