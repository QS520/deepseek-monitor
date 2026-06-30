import { useEffect, useState } from "react";
import { useMonitorStore } from "@/store/useMonitorStore";
import { Wifi, AlertTriangle } from "lucide-react";

interface TopBarProps {
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
}

// 顶部状态栏
export default function TopBar({ title = "DeepSeek Monitor", showBack = false, onBack }: TopBarProps) {
  const [now, setNow] = useState(new Date());
  const connected = useMonitorStore((s) => s.connected);
  const balance = useMonitorStore((s) => s.balance);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
  const lowBalance = balance.remaining < balance.warningThreshold;

  return (
    <header className="sticky top-0 z-30 backdrop-blur-xl bg-space-900/80 border-b border-white/5">
      <div className="px-4 pt-3 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {showBack && (
              <button
                onClick={onBack}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5 transition-colors"
                aria-label="返回"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            <div className="flex items-center gap-2">
              <div className="relative w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, #4D6BFE, #6366F1)" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  <path d="M22 4 12 14.01l-3-3" />
                </svg>
              </div>
              <div className="flex flex-col leading-none">
                <span className="font-mono text-sm font-bold text-white">{title}</span>
                <span className="text-[9px] text-slate-500">API 用量监控</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/5">
              <Wifi size={12} className={connected ? "text-neon-green" : "text-slate-500"} />
              <span className={`text-[10px] font-mono ${connected ? "text-neon-green" : "text-slate-500"}`}>
                {connected ? "LIVE" : "OFF"}
              </span>
            </div>
            {lowBalance && (
              <div className="flex items-center gap-1 px-1.5 py-1 rounded-md bg-neon-orange/10">
                <AlertTriangle size={11} className="text-neon-orange" />
                <span className="text-[10px] text-neon-orange font-medium">余额低</span>
              </div>
            )}
            <span className="font-mono text-xs text-slate-400 tabular-nums">{timeStr}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
