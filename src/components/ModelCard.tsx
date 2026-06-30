import type { ModelMetric } from "@/types";
import { sumTokens } from "@/types";
import AnimatedNumber from "@/components/AnimatedNumber";
import { formatTokens, formatCost } from "@/lib/mockData";
import { ChevronRight, Zap, Coins, Activity } from "lucide-react";

interface ModelCardProps {
  model: ModelMetric;
  accentColor: string;
  onClick?: () => void;
}

// 单个模型用量卡片
export default function ModelCard({ model, accentColor, onClick }: ModelCardProps) {
  const todayTokens = sumTokens(model.todayTokens);

  return (
    <button
      onClick={onClick}
      className="w-full glass-card rounded-2xl p-4 text-left hover:border-white/15 transition-all active:scale-[0.98] group relative overflow-hidden"
    >
      {/* 左侧色条 */}
      <div
        className="absolute left-0 top-3 bottom-3 w-1 rounded-full"
        style={{ background: accentColor, boxShadow: `0 0 8px ${accentColor}` }}
      />

      <div className="flex items-start justify-between mb-3 pl-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-white">{model.displayName}</span>
            <span className="relative flex w-1.5 h-1.5">
              <span className="absolute inline-flex w-full h-full rounded-full opacity-75 animate-ping" style={{ background: "#00D9A3" }} />
              <span className="relative inline-flex w-1.5 h-1.5 rounded-full" style={{ background: "#00D9A3" }} />
            </span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">{model.name}</span>
        </div>
        <ChevronRight size={16} className="text-slate-600 group-hover:text-slate-400 transition-colors mt-1" />
      </div>

      {/* 今日 Token 用量 */}
      <div className="pl-2 mb-3">
        <div className="flex items-center gap-1.5 mb-1">
          <Zap size={11} style={{ color: accentColor }} />
          <span className="text-[10px] text-slate-400">今日 Token 用量</span>
        </div>
        <AnimatedNumber
          value={todayTokens}
          formatter={formatTokens}
          flashOnUpdate
          className="font-mono text-2xl font-bold text-white"
        />
      </div>

      {/* Token 明细条 */}
      <div className="pl-2 mb-3">
        <div className="flex h-1.5 rounded-full overflow-hidden bg-white/5">
          <div
            className="h-full transition-all duration-500"
            style={{
              width: `${(model.todayTokens.promptCacheHit / todayTokens) * 100}%`,
              background: "#00D9A3",
            }}
          />
          <div
            className="h-full transition-all duration-500"
            style={{
              width: `${(model.todayTokens.promptCacheMiss / todayTokens) * 100}%`,
              background: "#FFD93D",
            }}
          />
          <div
            className="h-full transition-all duration-500"
            style={{
              width: `${(model.todayTokens.completion / todayTokens) * 100}%`,
              background: accentColor,
            }}
          />
        </div>
        <div className="flex items-center gap-3 mt-1.5">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-neon-green" />
            <span className="text-[9px] text-slate-500">缓存命中 {formatTokens(model.todayTokens.promptCacheHit)}</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-neon-yellow" />
            <span className="text-[9px] text-slate-500">未命中 {formatTokens(model.todayTokens.promptCacheMiss)}</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: accentColor }} />
            <span className="text-[9px] text-slate-500">输出 {formatTokens(model.todayTokens.completion)}</span>
          </span>
        </div>
      </div>

      {/* 底部指标 */}
      <div className="pl-2 grid grid-cols-3 gap-2">
        <div className="flex items-center gap-1.5">
          <Coins size={11} className="text-neon-orange" />
          <div>
            <span className="text-[9px] text-slate-500 block">今日费用</span>
            <AnimatedNumber
              value={model.todayCost}
              formatter={formatCost}
              flashOnUpdate
              className="font-mono text-xs font-bold text-neon-orange"
            />
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Activity size={11} className="text-neon-cyan" />
          <div>
            <span className="text-[9px] text-slate-500 block">请求数</span>
            <AnimatedNumber
              value={model.todayRequests}
              formatter={(n) => formatTokens(n)}
              flashOnUpdate
              className="font-mono text-xs font-bold text-white"
            />
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Zap size={11} className="text-neon-purple" />
          <div>
            <span className="text-[9px] text-slate-500 block">实时 rps</span>
            <AnimatedNumber
              value={model.rps}
              formatter={(n) => Math.floor(n).toString()}
              flashOnUpdate
              className="font-mono text-xs font-bold text-neon-purple"
            />
          </div>
        </div>
      </div>
    </button>
  );
}
