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

  const todayTotalCost = models.reduce((sum, m) => sum + m.todayCost, 0);
  const todayTotalTokens = models.reduce((sum, m) => sum + sumTokens(m.todayTokens), 0);
  const todayTotalRequests = models.reduce((sum, m) => sum + m.todayRequests, 0);

  // 合并两个模型的 token 趋势
  const mergedTrend = models[0].trend.map((_, i) => ({
    time: models[0].trend[i].time,
    value: models.reduce((sum, m) => sum + m.trend[i].tokens, 0),
  }));

  const handleModelClick = (id: string) => {
    selectModel(id);
    navigate(`/model/${id}`);
  };

  return (
    <div className="flex flex-col min-h-screen">
      <TopBar />

      <main className="flex-1 px-4 py-4 space-y-4">
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
