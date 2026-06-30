import AnimatedNumber from "@/components/AnimatedNumber";
import ProgressBar from "@/components/ProgressBar";
import type { AccountBalance } from "@/types";
import { formatCost } from "@/lib/mockData";
import { Wallet, TrendingDown } from "lucide-react";

interface BalanceCardProps {
  balance: AccountBalance;
  todayCost: number;
}

// 账户余额卡片
export default function BalanceCard({ balance, todayCost }: BalanceCardProps) {
  const totalFunds = balance.total + balance.freeCredits;
  const usedPercent = (balance.used / totalFunds) * 100;
  const lowBalance = balance.remaining < balance.warningThreshold;
  const accentColor = lowBalance ? "#FF6B35" : "#4D6BFE";

  return (
    <div className="relative glass-card rounded-2xl p-4 overflow-hidden">
      {/* 顶部光带 */}
      <div
        className="absolute top-0 inset-x-0 h-0.5"
        style={{ background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)` }}
      />
      <div
        className="absolute -top-10 -right-10 w-32 h-32 rounded-full opacity-15 blur-2xl"
        style={{ background: accentColor }}
      />

      <div className="relative flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <Wallet size={13} style={{ color: accentColor }} />
            <span className="text-[10px] text-slate-400 font-medium tracking-wide">账户余额</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="font-mono text-3xl font-bold" style={{ color: lowBalance ? "#FF6B35" : "#fff" }}>
              <AnimatedNumber value={balance.remaining} formatter={formatCost} flashOnUpdate />
            </span>
            <span className="text-sm text-slate-400">元</span>
          </div>
        </div>
        {lowBalance && (
          <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-neon-orange/15">
            <TrendingDown size={11} className="text-neon-orange" />
            <span className="text-[10px] text-neon-orange font-medium">余额不足</span>
          </div>
        )}
      </div>

      <ProgressBar value={balance.used} max={totalFunds} height={7} />

      <div className="flex items-center justify-between mt-2.5">
        <div className="flex items-center gap-3">
          <div>
            <span className="text-[9px] text-slate-500 block">已使用</span>
            <span className="font-mono text-xs text-slate-300">{formatCost(balance.used)} 元</span>
          </div>
          <div className="w-px h-7 bg-white/10" />
          <div>
            <span className="text-[9px] text-slate-500 block">今日消耗</span>
            <span className="font-mono text-xs text-neon-orange">{formatCost(todayCost)} 元</span>
          </div>
        </div>
        <div className="text-right">
          <span className="text-[9px] text-slate-500 block">使用率</span>
          <span className="font-mono text-xs font-bold" style={{ color: accentColor }}>
            {usedPercent.toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  );
}
