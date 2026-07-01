import { useParams, useNavigate } from "react-router-dom";
import { useMonitorStore } from "@/store/useMonitorStore";
import { useRealtimeData } from "@/hooks/useRealtimeData";
import { sumTokens, PRICING } from "@/types";
import TopBar from "@/components/TopBar";
import DonutChart from "@/components/DonutChart";
import TrendChartCard from "@/components/TrendChartCard";
import AnimatedNumber from "@/components/AnimatedNumber";
import { formatTokens, formatCost } from "@/lib/mockData";
import type { ChartSegment } from "@/types";
import { Coins, Zap, Activity, Clock, TrendingUp } from "lucide-react";

const MODEL_COLORS: Record<string, string> = {
  "deepseek-v4-flash": "#4D6BFE",
  "deepseek-v4-pro": "#A855F7",
};

export default function ModelDetail() {
  useRealtimeData(2000);
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const model = useMonitorStore((s) => s.models.find((m) => m.id === id));

  if (!model) {
    return (
      <div className="flex flex-col min-h-screen">
        <TopBar showBack onBack={() => navigate("/")} title="模型详情" />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-slate-500">未找到该模型</p>
        </div>
      </div>
    );
  }

  const accentColor = MODEL_COLORS[model.id] || "#4D6BFE";
  const todayTokens = sumTokens(model.todayTokens);
  const totalTokens = sumTokens(model.totalTokens);

  // Token 分布数据 (用于环形图)
  const tokenDistribution: ChartSegment[] = [
    { code: 1, count: model.todayTokens.promptCacheHit, label: "缓存命中", color: "#00D9A3" },
    { code: 2, count: model.todayTokens.promptCacheMiss, label: "缓存未命中", color: "#FFD93D" },
    { code: 3, count: model.todayTokens.completion, label: "输出", color: accentColor },
  ];

  // 费用明细 (按类型, 使用当前模型的定价)
  const modelPricing = PRICING[model.id];
  const costBreakdown = [
    {
      label: "缓存命中输入",
      tokens: model.todayTokens.promptCacheHit,
      price: modelPricing.promptCacheHit,
      cost: (model.todayTokens.promptCacheHit / 1_000_000) * modelPricing.promptCacheHit,
      color: "#00D9A3",
    },
    {
      label: "缓存未命中输入",
      tokens: model.todayTokens.promptCacheMiss,
      price: modelPricing.promptCacheMiss,
      cost: (model.todayTokens.promptCacheMiss / 1_000_000) * modelPricing.promptCacheMiss,
      color: "#FFD93D",
    },
    {
      label: "输出 Completion",
      tokens: model.todayTokens.completion,
      price: modelPricing.completion,
      cost: (model.todayTokens.completion / 1_000_000) * modelPricing.completion,
      color: accentColor,
    },
  ];

  const trendData = model.trend.length > 0 ? model.trend.map((t) => ({ time: t.time, value: t.tokens })) : [];
  const costTrendData = model.trend.length > 0 ? model.trend.map((t) => ({ time: t.time, value: Number((t.cost * 1000).toFixed(2)) })) : [];

  return (
    <div className="flex flex-col min-h-screen">
      <TopBar showBack onBack={() => navigate("/")} title="模型详情" />

      <main className="flex-1 px-4 py-4 space-y-4">
        {/* 模型标题卡 */}
        <div className="glass-card rounded-2xl p-4 relative overflow-hidden animate-slide-up">
          <div
            className="absolute top-0 inset-x-0 h-0.5"
            style={{ background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)` }}
          />
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="relative flex w-2 h-2">
                  <span className="absolute inline-flex w-full h-full rounded-full opacity-75 animate-ping" style={{ background: "#00D9A3" }} />
                  <span className="relative inline-flex w-2 h-2 rounded-full" style={{ background: "#00D9A3" }} />
                </span>
                <span className="text-[10px] font-mono text-neon-green font-semibold tracking-widest">ACTIVE</span>
              </div>
              <h2 className="text-lg font-bold text-white">{model.displayName}</h2>
              <p className="text-[11px] text-slate-500 font-mono mt-0.5">{model.name}</p>
              <p className="text-[10px] text-slate-400 mt-1">{model.description}</p>
            </div>
            <div className="text-right">
              <AnimatedNumber
                value={model.rps}
                formatter={(n) => Math.floor(n).toString()}
                flashOnUpdate
                className="font-mono text-2xl font-bold"
              />
              <span className="text-[10px] text-slate-500 block" style={{ color: accentColor }}>req/s</span>
            </div>
          </div>
        </div>

        {/* 今日核心指标 */}
        <div className="grid grid-cols-2 gap-3">
          <div className="glass-card rounded-2xl p-3.5">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Zap size={12} style={{ color: accentColor }} />
              <span className="text-[10px] text-slate-400">今日 Token</span>
            </div>
            <AnimatedNumber
              value={todayTokens}
              formatter={formatTokens}
              flashOnUpdate
              className="font-mono text-xl font-bold text-white"
            />
          </div>
          <div className="glass-card rounded-2xl p-3.5">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Coins size={12} className="text-neon-orange" />
              <span className="text-[10px] text-slate-400">今日费用</span>
            </div>
            <div className="flex items-baseline gap-0.5">
              <span className="text-xs text-slate-500">¥</span>
              <AnimatedNumber
                value={model.todayCost}
                formatter={formatCost}
                flashOnUpdate
                className="font-mono text-xl font-bold text-neon-orange"
              />
            </div>
          </div>
          <div className="glass-card rounded-2xl p-3.5">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Activity size={12} className="text-neon-cyan" />
              <span className="text-[10px] text-slate-400">请求数</span>
            </div>
            <AnimatedNumber
              value={model.todayRequests}
              formatter={formatTokens}
              flashOnUpdate
              className="font-mono text-xl font-bold text-white"
            />
          </div>
          <div className="glass-card rounded-2xl p-3.5">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Clock size={12} className="text-neon-purple" />
              <span className="text-[10px] text-slate-400">平均延迟</span>
            </div>
            <div className="flex items-baseline gap-0.5">
              <AnimatedNumber
                value={model.avgLatency}
                formatter={(n) => Math.floor(n).toString()}
                flashOnUpdate
                className="font-mono text-xl font-bold text-neon-purple"
              />
              <span className="text-xs text-slate-500">ms</span>
            </div>
          </div>
        </div>

        {/* Token 用量趋势 */}
        <TrendChartCard
          data={trendData}
          title="Token 用量趋势"
          color={accentColor}
          gradientId="model-token-trend"
        />

        {/* 费用趋势 */}
        <TrendChartCard
          data={costTrendData}
          title="费用消耗趋势"
          unit=" 厘"
          color="#FF6B35"
          gradientId="model-cost-trend"
        />

        {/* Token 分布 */}
        <div className="glass-card rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={14} style={{ color: accentColor }} />
            <span className="text-sm font-semibold text-white">今日 Token 分布</span>
          </div>
          <div className="flex items-center gap-4">
            <DonutChart
              data={tokenDistribution}
              size={120}
              thickness={12}
              centerValue={formatTokens(todayTokens)}
              centerLabel="今日总量"
            />
            <div className="flex-1 space-y-2">
              {tokenDistribution.map((item) => {
                const percent = todayTokens > 0 ? (item.count / todayTokens) * 100 : 0;
                return (
                  <div key={item.code} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ background: item.color, boxShadow: `0 0 6px ${item.color}` }} />
                      <span className="text-xs text-slate-300">{item.label}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-mono text-white">{formatTokens(item.count)}</span>
                      <span className="text-[10px] text-slate-500 ml-1.5">{percent.toFixed(1)}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 费用明细 */}
        <div className="glass-card rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Coins size={14} className="text-neon-orange" />
            <span className="text-sm font-semibold text-white">费用明细</span>
            <span className="text-[9px] text-slate-500 ml-auto">官方定价 · 元/百万tokens</span>
          </div>
          <div className="space-y-3">
            {costBreakdown.map((item) => (
              <div key={item.label} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ background: item.color }} />
                  <div>
                    <span className="text-xs text-slate-200 block">{item.label}</span>
                    <span className="text-[9px] text-slate-500 font-mono">¥{item.price} / 1M tokens</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-mono text-slate-400 block">{formatTokens(item.tokens)} tokens</span>
                  <span className="text-xs font-mono font-bold" style={{ color: item.color }}>¥{formatCost(item.cost)}</span>
                </div>
              </div>
            ))}
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs font-semibold text-white">今日合计</span>
              <span className="font-mono text-sm font-bold text-neon-orange">¥{formatCost(model.todayCost)}</span>
            </div>
          </div>
        </div>

        {/* 累计统计 */}
        <div className="glass-card rounded-2xl p-4">
          <h3 className="text-sm font-semibold text-white mb-3">累计统计</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center p-2 rounded-lg bg-white/5">
              <p className="font-mono text-lg font-bold text-white">{formatTokens(totalTokens)}</p>
              <p className="text-[9px] text-slate-500 mt-0.5">累计 Token</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-white/5">
              <p className="font-mono text-lg font-bold text-neon-orange">¥{formatCost(model.totalCost)}</p>
              <p className="text-[9px] text-slate-500 mt-0.5">累计费用</p>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-[10px] text-slate-500">
            <span>成功率</span>
            <span className="font-mono text-neon-green">{model.successRate}%</span>
          </div>
        </div>
      </main>
    </div>
  );
}
