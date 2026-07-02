import { useState } from "react";
import { ChevronDown } from "lucide-react";
import LineChart from "@/components/LineChart";
import type { LineChartPoint } from "@/components/LineChart";

interface TrendChartCardProps {
  data: LineChartPoint[];
  title: string;
  unit?: string;
  color?: string;
  gradientId?: string;
}

// 趋势图表卡片（默认折叠，点击展开）
export default function TrendChartCard({
  data,
  title,
  unit = "",
  color = "#4D6BFE",
  gradientId = "trend-gradient",
}: TrendChartCardProps) {
  const [collapsed, setCollapsed] = useState(true);
  const sliced = data.slice(-30);
  const peak = Math.max(...sliced.map((d) => d.value), 0);
  const avg = sliced.length > 0 ? sliced.reduce((s, d) => s + d.value, 0) / sliced.length : 0;

  return (
    <div className="glass-card rounded-2xl p-4 relative overflow-hidden">
      <button
        type="button"
        className="flex items-center justify-between w-full text-left"
        onClick={() => setCollapsed(!collapsed)}
      >
        <div>
          <h3 className="text-sm font-semibold text-white">{title}</h3>
          <p className="text-[10px] text-slate-500 mt-0.5">
            峰值 <span className="font-mono" style={{ color }}>{peak.toLocaleString()}{unit}</span>
            <span className="mx-1.5 text-slate-700">·</span>
            均值 <span className="font-mono text-slate-400">{Math.floor(avg).toLocaleString()}{unit}</span>
          </p>
        </div>
        <ChevronDown
          size={18}
          className="text-slate-500 transition-transform duration-200 shrink-0"
          style={{ transform: collapsed ? "rotate(-90deg)" : "rotate(0deg)" }}
        />
      </button>

      <div
        className="overflow-hidden transition-all duration-300"
        style={{ maxHeight: collapsed ? "0px" : "200px", opacity: collapsed ? 0 : 1 }}
      >
        <div className="pt-3">
          <LineChart data={sliced} height={130} showAxis color={color} gradientId={gradientId} />
        </div>
      </div>

      <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
        <div className="scan-line" />
      </div>
    </div>
  );
}
