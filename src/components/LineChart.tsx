import { useMemo, useState } from "react";

export interface LineChartPoint {
  time: string;
  value: number;
}

interface LineChartProps {
  data: LineChartPoint[];
  height?: number;
  color?: string;
  gradientId?: string;
  showAxis?: boolean;
  showDots?: boolean;
  className?: string;
}

// 纯 SVG 折线图组件 (带渐变填充和触摸高亮)
export default function LineChart({
  data,
  height = 120,
  color = "#00E5FF",
  gradientId = "line-gradient",
  showAxis = false,
  showDots = false,
  className = "",
}: LineChartProps) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const width = 320; // viewBox 宽度
  const padding = { top: 8, right: 8, bottom: showAxis ? 20 : 8, left: 8 };

  const { points, areaPath, maxVal, minVal } = useMemo(() => {
    if (data.length === 0) return { points: [], areaPath: "", maxVal: 0, minVal: 0 };
    const values = data.map((d) => d.value);
    const max = Math.max(...values, 1);
    const min = Math.min(...values, 0);
    const range = max - min || 1;

    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    const pts = data.map((d, i) => {
      const x = padding.left + (i / Math.max(data.length - 1, 1)) * chartW;
      const y = padding.top + chartH - ((d.value - min) / range) * chartH;
      return { x, y, ...d };
    });

    const linePath = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
    const areaP = `${linePath} L ${pts[pts.length - 1].x} ${padding.top + chartH} L ${pts[0].x} ${padding.top + chartH} Z`;

    return { points: pts, areaPath: areaP, maxVal: max, minVal: min };
  }, [data, height, padding.top, padding.right, padding.bottom, padding.left]);

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={`w-full ${className}`}
      preserveAspectRatio="none"
      onMouseLeave={() => setHoverIdx(null)}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.4" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
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
          stroke="rgba(0, 229, 255, 0.06)"
          strokeWidth="1"
          strokeDasharray="4 4"
        />
      ))}

      {/* 渐变填充区域 */}
      {areaPath && <path d={areaPath} fill={`url(#${gradientId})`} />}

      {/* 折线 */}
      {linePath && (
        <path
          d={linePath}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ filter: `drop-shadow(0 0 4px ${color}80)` }}
        />
      )}

      {/* 数据点 */}
      {showDots &&
        points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={hoverIdx === i ? 4 : 2}
            fill={color}
            style={{ transition: "r 0.15s" }}
          />
        ))}

      {/* hover 高亮 */}
      {hoverIdx !== null && points[hoverIdx] && (
        <>
          <line
            x1={points[hoverIdx].x}
            x2={points[hoverIdx].x}
            y1={padding.top}
            y2={height - padding.bottom}
            stroke={color}
            strokeWidth="1"
            strokeDasharray="3 3"
            opacity="0.5"
          />
          <circle cx={points[hoverIdx].x} cy={points[hoverIdx].y} r="5" fill={color} />
          <circle cx={points[hoverIdx].x} cy={points[hoverIdx].y} r="9" fill={color} opacity="0.2" />
        </>
      )}

      {/* 触摸层 */}
      {points.map((p, i) => (
        <rect
          key={i}
          x={p.x - (width / data.length) / 2}
          y={0}
          width={width / data.length}
          height={height}
          fill="transparent"
          onMouseEnter={() => setHoverIdx(i)}
          onTouchStart={() => setHoverIdx(i)}
        />
      ))}

      {/* X 轴标签 */}
      {showAxis && (
        <>
          <text x={padding.left} y={height - 4} fill="rgba(148, 163, 184, 0.5)" fontSize="9" className="font-mono">
            {data[0]?.time}
          </text>
          <text x={width - padding.right} y={height - 4} fill="rgba(148, 163, 184, 0.5)" fontSize="9" textAnchor="end" className="font-mono">
            {data[data.length - 1]?.time}
          </text>
        </>
      )}
    </svg>
  );
}
