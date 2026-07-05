import { useState } from "react";
import { ChevronDown } from "lucide-react";
import BarChart from "@/components/BarChart";
import type { BarChartPoint } from "@/components/BarChart";

interface RangeTrendCardProps {
  /** 最近 30 天的完整数据（按时间升序）。组件内部会按选择的范围切片 */
  data: BarChartPoint[];
  title: string;
  unit?: string;
  color?: string;
  defaultRange?: "week" | "month";
}

// 趋势柱状图卡片（默认折叠，可切换 一周 / 一月）
export default function RangeTrendCard({
  data,
  title,
  unit = "",
  color = "#4D6BFE",
  defaultRange = "month",
}: RangeTrendCardProps) {
  const [collapsed, setCollapsed] = useState(true);
  const [range, setRange] = useState<"week" | "month">(defaultRange);

  const sliced = range === "week" ? data.slice(-7) : data.slice(-30);
  const peak = Math.max(...sliced.map((d) => d.value), 0);
  const avg = sliced.length > 0 ? sliced.reduce((s, d) => s + d.value, 0) / sliced.length : 0;
  const total = sliced.reduce((s, d) => s + d.value, 0);

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
            <span className="mx-1.5 text-slate-700">·</span>
            累计 <span className="font-mono text-slate-400">{Math.floor(total).toLocaleString()}{unit}</span>
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
        style={{ maxHeight: collapsed ? "0px" : "230px", opacity: collapsed ? 0 : 1 }}
      >
        {/* 范围切换 */}
        <div className="pt-3 flex items-center justify-between">
          <div className="inline-flex p-0.5 rounded-lg bg-white/5 border border-white/10">
            <button
              type="button"
              onClick={() => setRange("week")}
              className={`px-3 py-1 text-[11px] font-medium rounded-md transition-colors ${
                range === "week" ? "text-white" : "text-slate-500"
              }`}
              style={range === "week" ? { background: color } : {}}
            >
              一周
            </button>
            <button
              type="button"
              onClick={() => setRange("month")}
              className={`px-3 py-1 text-[11px] font-medium rounded-md transition-colors ${
                range === "month" ? "text-white" : "text-slate-500"
              }`}
              style={range === "month" ? { background: color } : {}}
            >
              一月
            </button>
          </div>
          <span className="text-[10px] text-slate-500 font-mono">
            {sliced.length} 天
          </span>
        </div>

        <div className="pt-2">
          <BarChart data={sliced} height={150} color={color} unit={unit} />
        </div>
      </div>
    </div>
  );
}
