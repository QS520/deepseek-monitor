import { useEffect } from "react";
import { useMonitorStore } from "@/store/useMonitorStore";

// 实时数据更新 Hook
// 首次挂载时自动拉取一次数据，之后每 60 秒刷新一次
// 在 23:55-23:59 之间强制保存当日记录（兜底，忽略 5 分钟节流）
export function useRealtimeData(intervalMs = 60000) {
  const refreshFromApi = useMonitorStore((s) => s.refreshFromApi);
  const refreshFromPlatform = useMonitorStore((s) => s.refreshFromPlatform);
  const forceSaveToday = useMonitorStore((s) => s.forceSaveToday);
  const apiKey = useMonitorStore((s) => s.apiKey);
  const usageToken = useMonitorStore((s) => s.usageToken);

  useEffect(() => {
    if (!apiKey) return;
    // 首次立即拉取
    refreshFromApi();
    if (usageToken) refreshFromPlatform();
    // 定时刷新
    const timer = setInterval(() => {
      refreshFromApi();
      if (usageToken) refreshFromPlatform();

      // 23:55-23:59 之间强制保存当日记录（每天一次）
      const now = new Date();
      const hh = now.getHours();
      const mm = now.getMinutes();
      if (hh === 23 && mm >= 55) {
        forceSaveToday();
      }
    }, intervalMs);
    return () => clearInterval(timer);
  }, [refreshFromApi, refreshFromPlatform, forceSaveToday, apiKey, usageToken, intervalMs]);
}
