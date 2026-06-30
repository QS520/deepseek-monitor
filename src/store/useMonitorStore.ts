import { create } from "zustand";
import type { ModelMetric, AccountBalance, TokenUsage } from "@/types";
import { calcCost } from "@/types";
import { generateModels, generateBalance, randInt, rand } from "@/lib/mockData";

interface MonitorState {
  models: ModelMetric[];
  balance: AccountBalance;
  connected: boolean;
  lastUpdate: number;
  selectedModelId: string | null;

  tick: () => void;
  selectModel: (id: string | null) => void;
  updateWarningThreshold: (value: number) => void;
}

const initialModels = generateModels();
const totalUsed = initialModels.reduce((sum, m) => sum + m.totalCost, 0);
const initialBalance = generateBalance(totalUsed);

export const useMonitorStore = create<MonitorState>((set, get) => ({
  models: initialModels,
  balance: initialBalance,
  connected: true,
  lastUpdate: Date.now(),
  selectedModelId: null,

  tick: () => {
    const state = get();
    let costIncrementTotal = 0;

    const updatedModels = state.models.map((model) => {
      // 模拟实时请求增量
      const newRequests = randInt(model.rps - 1, model.rps + 3);
      const reqIncrement = Math.max(0, newRequests);

      // 每个 request 消耗的 tokens (flash 约 600, pro 约 1600)
      const tokensPerReq = model.id === "deepseek-v4-flash" ? randInt(300, 1000) : randInt(800, 2800);
      const cacheHitRatio = rand(0.4, 0.65);
      const addedTokens = tokensPerReq * reqIncrement;

      const addedUsage: TokenUsage = {
        promptCacheHit: Math.floor(addedTokens * cacheHitRatio * rand(0.3, 0.5)),
        promptCacheMiss: Math.floor(addedTokens * (1 - cacheHitRatio) * rand(0.5, 0.65)),
        completion: Math.floor(addedTokens * rand(0.25, 0.4)),
      };

      const newTodayTokens: TokenUsage = {
        promptCacheHit: model.todayTokens.promptCacheHit + addedUsage.promptCacheHit,
        promptCacheMiss: model.todayTokens.promptCacheMiss + addedUsage.promptCacheMiss,
        completion: model.todayTokens.completion + addedUsage.completion,
      };
      const newTotalTokens: TokenUsage = {
        promptCacheHit: model.totalTokens.promptCacheHit + addedUsage.promptCacheHit,
        promptCacheMiss: model.totalTokens.promptCacheMiss + addedUsage.promptCacheMiss,
        completion: model.totalTokens.completion + addedUsage.completion,
      };

      const addedCost = calcCost(addedUsage, model.id);
      costIncrementTotal += addedCost;

      // 更新趋势最后一个点
      const newTrend = [...model.trend];
      const last = newTrend[newTrend.length - 1];
      newTrend[newTrend.length - 1] = {
        ...last,
        tokens: last.tokens + addedUsage.promptCacheHit + addedUsage.promptCacheMiss + addedUsage.completion,
        cost: Number((last.cost + addedCost).toFixed(4)),
        requests: last.requests + reqIncrement,
      };

      return {
        ...model,
        todayTokens: newTodayTokens,
        totalTokens: newTotalTokens,
        todayCost: Number((model.todayCost + addedCost).toFixed(4)),
        totalCost: Number((model.totalCost + addedCost).toFixed(2)),
        todayRequests: model.todayRequests + reqIncrement,
        rps: Math.max(0, model.rps + randInt(-1, 1)),
        avgLatency: Math.max(50, Math.floor(model.avgLatency + rand(-15, 20))),
        successRate: Number(Math.min(99.99, Math.max(98.5, model.successRate + rand(-0.08, 0.08))).toFixed(2)),
        trend: newTrend,
      };
    });

    // 更新余额
    const updatedBalance: AccountBalance = {
      ...state.balance,
      used: Number((state.balance.used + costIncrementTotal).toFixed(4)),
      remaining: Number((state.balance.remaining - costIncrementTotal).toFixed(4)),
    };

    set({
      models: updatedModels,
      balance: updatedBalance,
      lastUpdate: Date.now(),
    });
  },

  selectModel: (id) => set({ selectedModelId: id }),

  updateWarningThreshold: (value) =>
    set((state) => ({
      balance: { ...state.balance, warningThreshold: value },
    })),
}));
