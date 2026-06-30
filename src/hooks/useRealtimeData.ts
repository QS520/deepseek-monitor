import { useEffect } from "react";
import { useMonitorStore } from "@/store/useMonitorStore";

// 实时数据更新 Hook - 每 2 秒 tick 一次
export function useRealtimeData(intervalMs = 2000) {
  const tick = useMonitorStore((s) => s.tick);

  useEffect(() => {
    const timer = setInterval(() => {
      tick();
    }, intervalMs);
    return () => clearInterval(timer);
  }, [tick, intervalMs]);
}
