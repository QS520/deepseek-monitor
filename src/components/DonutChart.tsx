import type { ChartSegment } from "@/types";

interface DonutChartProps {
  data: ChartSegment[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerValue?: string;
}

// SVG 环形图 (状态码分布)
export default function DonutChart({
  data,
  size = 140,
  thickness = 14,
  centerLabel = "",
  centerValue = "",
}: DonutChartProps) {
  const total = data.reduce((sum, d) => sum + d.count, 0) || 1;
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  let offset = 0;
  const segments = data.map((item) => {
    const ratio = item.count / total;
    const length = ratio * circumference;
    const segment = {
      ...item,
      ratio,
      dasharray: `${length} ${circumference - length}`,
      dashoffset: -offset,
      percentage: (ratio * 100).toFixed(1),
    };
    offset += length;
    return segment;
  });

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {/* 背景圆环 */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="rgba(255, 255, 255, 0.05)"
          strokeWidth={thickness}
        />
        {segments.map((seg, i) => (
          <circle
            key={i}
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={seg.color}
            strokeWidth={thickness}
            strokeDasharray={seg.dasharray}
            strokeDashoffset={seg.dashoffset}
            strokeLinecap="round"
            style={{
              transition: "stroke-dasharray 0.6s ease, stroke-dashoffset 0.6s ease",
              filter: `drop-shadow(0 0 4px ${seg.color}66)`,
            }}
          />
        ))}
      </svg>
      {(centerLabel || centerValue) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-2xl font-bold text-white">{centerValue}</span>
          <span className="text-[10px] text-slate-400 mt-0.5">{centerLabel}</span>
        </div>
      )}
    </div>
  );
}
