import { useState } from "react";
import LineChart from "@/components/LineChart";
import type { LineChartPoint } from "@/components/LineChart";

interface TrendChartCardProps {
  data: LineChartPoint[];
  title: string;
  unit?: string;
  color?: string;
  gradientId?: string;
}

type TimeRange = "1h" | "6h" | "24h";

// 趋势图表卡片
export default function TrendChartCard({
  data,
  title,
  unit = "",
  color = "#4D6BFE",
  gradientId = "trend-gradient",
}: TrendChartCardProps) {
  const [range, setRange] = useState<TimeRange>("24h");

  const sliceMap: Record<TimeRange, number> = { "1h": 2, "6h": 12, "24h": 48 };
  const sliced = data.slice(-sliceMap[range]);
  const peak = Math.max(...sliced.map((d) => d.value), 0);
  const avg = sliced.length > 0 ? sliced.reduce((s, d) => s + d.value, 0) / sliced.length : 0;

  return (
    <div className="glass-card rounded-2xl p-4 relative overflow-hidden">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-white">{title}</h3>
          <p className="text-[10px] text-slate-500 mt-0.5">
            峰值 <span className="font-mono" style={{ color }}>{peak.toLocaleString()}{unit}</span>
            <span className="mx-1.5 text-slate-700">·</span>
            均值 <span className="font-mono text-slate-400">{Math.floor(avg).toLocaleString()}{unit}</span>
          </p>
        </div>
        <div className="flex items-center gap-1 p-0.5 rounded-lg bg-white/5">
          {(["1h", "6h", "24h"] as TimeRange[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-2 py-1 text-[10px] font-mono font-semibold rounded-md transition-all ${
                range === r ? "bg-white/10" : "text-slate-500 hover:text-slate-300"
              }`}
              style={range === r ? { color, background: `${color}20` } : {}}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <LineChart data={sliced} height={130} showAxis color={color} gradientId={gradientId} />

      <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
        <div className="scan-line" />
      </div>
    </div>
  );
}
