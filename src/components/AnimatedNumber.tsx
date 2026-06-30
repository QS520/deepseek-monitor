import { useEffect, useRef, useState } from "react";
import { formatTokens } from "@/lib/mockData";

interface AnimatedNumberProps {
  value: number;
  duration?: number;
  className?: string;
  formatter?: (n: number) => string;
  flashOnUpdate?: boolean;
}

// 带平滑滚动动画的数字组件
export default function AnimatedNumber({
  value,
  duration = 600,
  className = "",
  formatter = formatTokens,
  flashOnUpdate = false,
}: AnimatedNumberProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const startValueRef = useRef(value);
  const rafRef = useRef<number | null>(null);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    const start = startValueRef.current;
    const end = value;
    if (start === end) return;

    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutQuart
      const eased = 1 - Math.pow(1 - progress, 4);
      const current = start + (end - start) * eased;
      setDisplayValue(current);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        startValueRef.current = end;
        setDisplayValue(end);
        if (flashOnUpdate) {
          setFlash(true);
          setTimeout(() => setFlash(false), 600);
        }
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [value, duration, flashOnUpdate]);

  return (
    <span className={`${className} ${flash ? "data-flash" : ""}`}>
      {formatter(displayValue)}
    </span>
  );
}
