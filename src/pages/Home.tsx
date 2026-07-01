import { useNavigate } from "react-router-dom";
import { useMonitorStore } from "@/store/useMonitorStore";
import { useRealtimeData } from "@/hooks/useRealtimeData";
import { sumTokens } from "@/types";
import TopBar from "@/components/TopBar";
import BottomNav from "@/components/BottomNav";
import BalanceCard from "@/components/BalanceCard";
import ModelCard from "@/components/ModelCard";
import TrendChartCard from "@/components/TrendChartCard";
import { formatCost, formatTokens } from "@/lib/mockData";
import { Target } from "lucide-react";

const MODEL_COLORS: Record<string, string> = {
  "deepseek-v4-flash": "#4D6BFE",
  "deepseek-v4-pro": "#A855F7",
};

export default function Home() {
  useRealtimeData(2000);
  const navigate = useNavigate();
  const models = useMonitorStore((s) => s.models);
  const balance = useMonitorStore((s) => s.balance);
  const selectModel = useMonitorStore((s) => s.selectModel);
  const platformModels = useMonitorStore((s) => s.platformModels);
  const platformDays = useMonitorStore((s) => s.platformDays);
  const usageTokenReady = useMonitorStore((s) => s.usageTokenReady);

  const todayTotalCost = models.reduce((sum, m) => sum + m.todayCost, 0);
  const todayTotalTokens = models.reduce((sum, m) => sum + sumTokens(m.todayTokens), 0);
  const todayTotalRequests = models.reduce((sum, m) => sum + m.todayRequests, 0);

  // 合并所有模型的 token 趋势（优先使用平台 API 的按日数据）
  const mergedTrend =
    usageTokenReady && platformDays.length > 0
      ? platformDays.map((d) => ({
          time: d.date.slice(5),
          value: d.totalTokens,
        }))
      : models.length > 0 && models[0].trend.length > 0
        ? models[0].trend.map((_, i) => ({
            time: models[0].trend[i].time,
            value: models.reduce((sum, m) => sum + (m.trend[i]?.tokens || 0), 0),
          }))
        : [];

  // 平台 API 总体缓存命中率
  const totalHitAll = platformModels.reduce((s, m) => s + m.cacheHitTokens, 0);
  const totalMissAll = platformModels.reduce((s, m) => s + m.cacheMissTokens, 0);
  const totalHitRate = totalHitAll + totalMissAll > 0 ? totalHitAll / (totalHitAll + totalMissAll) : 0;

  const handleModelClick = (id: string) => {
    selectModel(id);
    navigate(`/model/${id}`);
  };

  return (
    <div className="flex flex-col h-full">
      <TopBar />

      <main className="flex-1 overflow-y-auto no-scrollbar px-4 py-4 space-y-4">
        {/* 余额卡片 */}
        <BalanceCard balance={balance} todayCost={todayTotalCost} />

        {/* 今日总览 */}
        <div className="glass-card rounded-2xl p-4">
          <h3 className="text-sm font-semibold text-white mb-3">今日总览</h3>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <p className="font-mono text-xl font-bold text-gradient-cyan">{formatTokens(todayTotalTokens)}</p>
              <p className="text-[9px] text-slate-500 mt-0.5">Token 总量</p>
            </div>
            <div className="text-center border-x border-white/5">
              <p className="font-mono text-xl font-bold text-neon-orange">¥{formatCost(todayTotalCost)}</p>
              <p className="text-[9px] text-slate-500 mt-0.5">费用消耗</p>
            </div>
            <div className="text-center">
              <p className="font-mono text-xl font-bold text-white">{formatTokens(todayTotalRequests)}</p>
              <p className="text-[9px] text-slate-500 mt-0.5">API 请求</p>
            </div>
          </div>
        </div>

        {/* 缓存命中率总览（来自平台 API） */}
        {usageTokenReady && platformModels.length > 0 && (
          <div className="glass-card rounded-2xl p-4 border border-neon-green/10">
            <div className="flex items-center gap-2 mb-3">
              <Target size={14} className="text-neon-green" />
              <h3 className="text-sm font-semibold text-white">缓存命中率</h3>
              <span className="ml-auto text-[10px] text-slate-500 font-mono">平台数据</span>
            </div>
            <div className="flex items-center justify-between mb-3">
              <span className="font-mono text-3xl font-extrabold" style={{ color: totalHitRate > 0.5 ? "#00D9A3" : "#FFD93D" }}>
                {(totalHitRate * 100).toFixed(0)}%
              </span>
              <span className="text-[10px] text-slate-500">本月全部模型</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {platformModels.map((pm) => (
                <div key={pm.model} className="p-2 rounded-lg bg-white/5">
                  <span className="text-[10px] text-slate-400 block truncate">{pm.displayName}</span>
                  <span className="font-mono text-lg font-bold" style={{ color: pm.cacheHitRate > 0.5 ? "#00D9A3" : "#FFD93D" }}>
                    {(pm.cacheHitRate * 100).toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Token 用量趋势 */}
        <TrendChartCard
          data={mergedTrend}
          title="Token 用量趋势"
          unit=""
          color="#4D6BFE"
          gradientId="home-trend"
        />

        {/* 模型卡片 */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-semibold text-white">模型监控</h3>
            <span className="text-[10px] text-slate-500 font-mono">{models.length} 个模型</span>
          </div>
          {models.map((model, idx) => (
            <div key={model.id} className="animate-slide-up" style={{ animationDelay: `${idx * 80}ms` }}>
              <ModelCard
                model={model}
                accentColor={MODEL_COLORS[model.id]}
                onClick={() => handleModelClick(model.id)}
              />
            </div>
          ))}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
