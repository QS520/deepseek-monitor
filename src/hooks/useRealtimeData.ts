import { useEffect } from "react";
import { useMonitorStore } from "@/store/useMonitorStore";

// 实时数据更新 Hook
// 首次挂载时自动拉取一次数据，之后每 60 秒刷新一次
export function useRealtimeData(intervalMs = 60000) {
  const refreshFromApi = useMonitorStore((s) => s.refreshFromApi);
  const apiKey = useMonitorStore((s) => s.apiKey);

  useEffect(() => {
    if (!apiKey) return;
    // 首次立即拉取
    refreshFromApi();
    // 定时刷新
    const timer = setInterval(() => {
      refreshFromApi();
    }, intervalMs);
    return () => clearInterval(timer);
  }, [refreshFromApi, apiKey, intervalMs]);
}
