import { useState } from "react";
import { useMonitorStore } from "@/store/useMonitorStore";
import { PRICING } from "@/types";
import TopBar from "@/components/TopBar";
import BottomNav from "@/components/BottomNav";
import { Sliders, Save, RotateCcw, Wallet, Info } from "lucide-react";

export default function Settings() {
  const balance = useMonitorStore((s) => s.balance);
  const updateWarningThreshold = useMonitorStore((s) => s.updateWarningThreshold);

  const [threshold, setThreshold] = useState(balance.warningThreshold);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    updateWarningThreshold(threshold);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => {
    setThreshold(50);
    updateWarningThreshold(50);
  };

  return (
    <div className="flex flex-col min-h-screen">
      <TopBar title="设置" />

      <main className="flex-1 px-4 py-4 space-y-4">
        {/* 余额预警配置 */}
        <div className="glass-card rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Sliders size={14} className="text-neon-cyan" />
            <h3 className="text-sm font-semibold text-white">余额预警阈值</h3>
          </div>
          <p className="text-[11px] text-slate-400 mb-4 leading-relaxed">
            当账户剩余余额低于此值时，将在顶部状态栏显示"余额低"预警提示。
          </p>

          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-slate-400">预警线</span>
            <span
              className="font-mono text-xl font-bold px-2.5 py-0.5 rounded-md"
              style={{ color: "#FF6B35", background: "#FF6B3515" }}
            >
              ¥{threshold}
            </span>
          </div>

          <input
            type="range"
            min={5}
            max={200}
            step={5}
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
            className="w-full h-2 rounded-full appearance-none cursor-pointer outline-none"
            style={{
              background: `linear-gradient(90deg, #FF6B35 0%, #FF6B35 ${((threshold - 5) / 195) * 100}%, rgba(255,255,255,0.1) ${((threshold - 5) / 195) * 100}%)`,
            }}
          />
          <div className="flex justify-between mt-1">
            <span className="text-[9px] text-slate-600 font-mono">¥5</span>
            <span className="text-[9px] text-slate-600 font-mono">¥200</span>
          </div>

          {/* 当前余额状态 */}
          <div className="mt-4 p-3 rounded-lg bg-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wallet size={14} className="text-slate-400" />
              <span className="text-xs text-slate-400">当前剩余</span>
            </div>
            <span className={`font-mono text-sm font-bold ${balance.remaining < threshold ? "text-neon-orange" : "text-white"}`}>
              ¥{balance.remaining.toFixed(2)}
            </span>
          </div>

          <div className="flex gap-3 mt-4">
            <button
              onClick={handleReset}
              className="flex-1 py-2.5 rounded-xl bg-white/5 text-slate-300 text-xs font-medium hover:bg-white/10 transition-colors flex items-center justify-center gap-1.5"
            >
              <RotateCcw size={13} />
              重置
            </button>
            <button
              onClick={handleSave}
              className="flex-[2] py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
              style={{
                background: saved ? "linear-gradient(135deg, #00D9A3, #00E5FF)" : "linear-gradient(135deg, #4D6BFE, #6366F1)",
                color: "#fff",
                boxShadow: "0 0 16px rgba(77, 107, 254, 0.3)",
              }}
            >
              <Save size={13} />
              {saved ? "已保存" : "保存配置"}
            </button>
          </div>
        </div>

        {/* 官方定价 */}
        <div className="glass-card rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Info size={14} className="text-neon-cyan" />
            <h3 className="text-sm font-semibold text-white">DeepSeek V4 官方定价</h3>
          </div>
          <p className="text-[10px] text-slate-500 mb-3">单位: 元 / 百万 tokens</p>

          {/* 表头 */}
          <div className="grid grid-cols-[1fr_auto_auto] gap-2 px-2 pb-2 mb-1 border-b border-white/10">
            <span className="text-[9px] text-slate-500 font-medium">计费类型</span>
            <span className="text-[9px] text-[#4D6BFE] font-mono font-semibold text-right w-16">V4 Flash</span>
            <span className="text-[9px] text-[#A855F7] font-mono font-semibold text-right w-16">V4 Pro</span>
          </div>
          {/* 行 */}
          {[
            { label: "输入 · 缓存命中", flash: PRICING["deepseek-v4-flash"].promptCacheHit, pro: PRICING["deepseek-v4-pro"].promptCacheHit },
            { label: "输入 · 缓存未命中", flash: PRICING["deepseek-v4-flash"].promptCacheMiss, pro: PRICING["deepseek-v4-pro"].promptCacheMiss },
            { label: "输出 Completion", flash: PRICING["deepseek-v4-flash"].completion, pro: PRICING["deepseek-v4-pro"].completion },
          ].map((row) => (
            <div key={row.label} className="grid grid-cols-[1fr_auto_auto] gap-2 px-2 py-2 border-b border-white/5 last:border-0 items-center">
              <span className="text-xs text-slate-200">{row.label}</span>
              <span className="font-mono text-xs font-bold text-[#4D6BFE] text-right w-16">¥{row.flash}</span>
              <span className="font-mono text-xs font-bold text-[#A855F7] text-right w-16">¥{row.pro}</span>
            </div>
          ))}

          <div className="mt-3 p-2.5 rounded-lg bg-neon-cyan/5 border border-neon-cyan/10">
            <p className="text-[10px] text-slate-400 leading-relaxed">
              <span className="text-neon-cyan font-medium">缓存命中</span> 可大幅节省输入费用。V4 Pro 单价为 Flash 的 3 倍，适合复杂推理任务。
            </p>
          </div>
        </div>

        {/* 关于 */}
        <div className="glass-card rounded-2xl p-4 text-center">
          <p className="text-xs text-slate-400">DeepSeek API Monitor</p>
          <p className="text-[10px] text-slate-600 mt-1">实时监控 deepseek-v4-flash 与 deepseek-v4-pro 的用量和费用</p>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
