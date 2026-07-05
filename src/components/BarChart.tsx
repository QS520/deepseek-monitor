import { useMemo, useState } from "react";

export interface BarChartPoint {
  time: string;
  value: number;
}

interface BarChartProps {
  data: BarChartPoint[];
  height?: number;
  color?: string;
  unit?: string;
  className?: string;
}

// 纯 SVG 柱状图组件（带触摸高亮）
export default function BarChart({
  data,
  height = 130,
  color = "#4D6BFE",
  unit = "",
  className = "",
}: BarChartProps) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const width = 320;
  const padding = { top: 8, right: 6, bottom: 18, left: 6 };

  const { bars, maxVal, peakIdx, avg } = useMemo(() => {
    if (data.length === 0) return { bars: [], maxVal: 0, peakIdx: -1, avg: 0 };
    const values = data.map((d) => d.value);
    const max = Math.max(...values, 1);
    const sum = values.reduce((s, v) => s + v, 0);
    const avgVal = sum / values.length;
    let peak = 0;
    for (let i = 1; i < values.length; i++) {
      if (values[i] > values[peak]) peak = i;
    }
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;
    const gap = data.length > 1 ? Math.min(4, chartW / data.length * 0.2) : 0;
    const barW = (chartW - gap * (data.length - 1)) / data.length;

    const pts = data.map((d, i) => {
      const x = padding.left + i * (barW + gap);
      const barHeight = (d.value / max) * chartH;
      const y = padding.top + chartH - barHeight;
      return { x, y, w: barW, h: barHeight, ...d };
    });

    return { bars: pts, maxVal: max, peakIdx: peak, avg: avgVal };
  }, [data, height, padding.top, padding.right, padding.bottom, padding.left]);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center text-slate-600 text-xs" style={{ height }}>
        暂无数据
      </div>
    );
  }

  // X 轴标签：稀疏显示，避免重叠
  const labelStep = Math.max(1, Math.floor(data.length / 6));

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={`w-full ${className}`}
      preserveAspectRatio="none"
      onMouseLeave={() => setHoverIdx(null)}
    >
      <defs>
        <linearGradient id={`bar-grad-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="1" />
          <stop offset="100%" stopColor={color} stopOpacity="0.35" />
        </linearGradient>
      </defs>

      {/* 网格线 */}
      {[0.25, 0.5, 0.75].map((r) => (
        <line
          key={r}
          x1={padding.left}
          x2={width - padding.right}
          y1={padding.top + (height - padding.top - padding.bottom) * r}
          y2={padding.top + (height - padding.top - padding.bottom) * r}
          stroke="rgba(148, 163, 184, 0.06)"
          strokeWidth="1"
          strokeDasharray="4 4"
        />
      ))}

      {/* 平均线 */}
      {avg > 0 && (
        <line
          x1={padding.left}
          x2={width - padding.right}
          y1={padding.top + (height - padding.top - padding.bottom) * (1 - avg / maxVal)}
          y2={padding.top + (height - padding.top - padding.bottom) * (1 - avg / maxVal)}
          stroke="rgba(148, 163, 184, 0.3)"
          strokeWidth="1"
          strokeDasharray="2 3"
        />
      )}

      {/* 柱子 */}
      {bars.map((b, i) => {
        const isHover = hoverIdx === i;
        const isPeak = i === peakIdx;
        return (
          <g key={i}>
            <rect
              x={b.x}
              y={b.y}
              width={b.w}
              height={Math.max(b.h, 0.5)}
              rx={Math.min(b.w / 3, 2)}
              fill={`url(#bar-grad-${color.replace("#", "")})`}
              opacity={isHover ? 1 : isPeak ? 0.95 : 0.7}
              style={{ transition: "opacity 0.15s" }}
            />
            {/* hover 高亮顶部 */}
            {isHover && (
              <circle cx={b.x + b.w / 2} cy={b.y} r={3} fill={color} />
            )}
          </g>
        );
      })}

      {/* 触摸层 */}
      {bars.map((b, i) => (
        <rect
          key={`touch-${i}`}
          x={b.x}
          y={0}
          width={b.w}
          height={height}
          fill="transparent"
          onMouseEnter={() => setHoverIdx(i)}
          onTouchStart={() => setHoverIdx(i)}
        />
      ))}

      {/* hover 提示 */}
      {hoverIdx !== null && bars[hoverIdx] && (
        <g pointerEvents="none">
          <rect
            x={Math.max(padding.left, Math.min(bars[hoverIdx].x + bars[hoverIdx].w / 2 - 30, width - padding.right - 60))}
            y={Math.max(0, bars[hoverIdx].y - 18)}
            width={60}
            height={14}
            rx={3}
            fill="rgba(0, 0, 0, 0.75)"
          />
          <text
            x={Math.max(padding.left + 30, Math.min(bars[hoverIdx].x + bars[hoverIdx].w / 2, width - padding.right - 30))}
            y={Math.max(10, bars[hoverIdx].y - 8)}
            fill="#F1F5F9"
            fontSize="8"
            textAnchor="middle"
            className="font-mono"
          >
            {bars[hoverIdx].value.toLocaleString()}{unit}
          </text>
        </g>
      )}

      {/* X 轴标签 */}
      {bars.map((b, i) =>
        i % labelStep === 0 || i === bars.length - 1 ? (
          <text
            key={`label-${i}`}
            x={b.x + b.w / 2}
            y={height - 4}
            fill="rgba(148, 163, 184, 0.6)"
            fontSize="8"
            textAnchor="middle"
            className="font-mono"
          >
            {b.time}
          </text>
        ) : null
      )}
    </svg>
  );
}
