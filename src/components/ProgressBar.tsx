interface ProgressBarProps {
  value: number;
  max: number;
  height?: number;
  showLabel?: boolean;
  warningThreshold?: number;
  criticalThreshold?: number;
}

// 配额进度条
export default function ProgressBar({
  value,
  max,
  height = 6,
  warningThreshold = 0.8,
  criticalThreshold = 0.95,
}: ProgressBarProps) {
  const ratio = Math.min(value / max, 1);
  const percent = ratio * 100;

  let color = "#00E5FF";
  if (ratio >= criticalThreshold) color = "#FF4757";
  else if (ratio >= warningThreshold) color = "#FF6B35";

  return (
    <div
      className="w-full rounded-full overflow-hidden bg-white/5 relative"
      style={{ height }}
    >
      <div
        className="h-full rounded-full transition-all duration-500 ease-out relative"
        style={{
          width: `${percent}%`,
          background: `linear-gradient(90deg, ${color}aa, ${color})`,
          boxShadow: `0 0 8px ${color}80`,
        }}
      >
        {/* 流光效果 */}
        <div
          className="absolute inset-0 opacity-50"
          style={{
            background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)",
            backgroundSize: "200% 100%",
            animation: "shimmer 2.5s linear infinite",
          }}
        />
      </div>
    </div>
  );
}
