import { useEffect, useState } from "react";
import { PRICING } from "@/types";
import {
  loadSurgeConfig,
  saveSurgeConfig,
  isSurgeTime,
  getEffectivePricing,
  calcCostWithSurge,
  DEFAULT_SURGE_CONFIG,
  type SurgePricingConfig,
} from "@/lib/surgePricing";

// 调价方案演示页面 - 仅用于 web 端交互测试，正式 App 不集成
export default function SurgePricingDemo() {
  const [config, setConfig] = useState<SurgePricingConfig>(DEFAULT_SURGE_CONFIG);
  const [saved, setSaved] = useState(false);
  const [testHour, setTestHour] = useState(new Date().getHours());

  useEffect(() => {
    setConfig(loadSurgeConfig());
  }, []);

  // 用测试小时构造一个 Date 对象
  const testDate = new Date();
  testDate.setHours(testHour, 30, 0, 0);

  const inSurge = isSurgeTime(testDate, config);
  const flashEffective = getEffectivePricing("deepseek-v4-flash", config, testDate);
  const proEffective = getEffectivePricing("deepseek-v4-pro", config, testDate);

  // 演示数据：模拟一段 100K 输入的请求
  const sampleUsage = {
    promptCacheHit: 80000,
    promptCacheMiss: 15000,
    completion: 5000,
  };
  const flashCost = calcCostWithSurge(sampleUsage, "deepseek-v4-flash", config, testDate);
  const proCost = calcCostWithSurge(sampleUsage, "deepseek-v4-pro", config, testDate);
  const flashCostNormal = calcCostWithSurge(sampleUsage, "deepseek-v4-flash", { ...config, enabled: false }, testDate);
  const proCostNormal = calcCostWithSurge(sampleUsage, "deepseek-v4-pro", { ...config, enabled: false }, testDate);

  const handleSave = () => {
    saveSurgeConfig(config);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => {
    setConfig(DEFAULT_SURGE_CONFIG);
    saveSurgeConfig(DEFAULT_SURGE_CONFIG);
  };

  return (
    <div className="min-h-screen bg-[#050810] text-white p-6 max-w-2xl mx-auto">
      <header className="mb-6">
        <h1 className="text-2xl font-bold mb-1">高峰期调价方案</h1>
        <p className="text-sm text-slate-400">设计方案 · Web 测试版本 · 未集成到正式 App</p>
      </header>

      {/* 方案说明 */}
      <section className="glass-card rounded-2xl p-4 mb-4 border border-neon-cyan/20">
        <h2 className="text-sm font-semibold text-neon-cyan mb-2">方案背景</h2>
        <p className="text-xs text-slate-300 leading-relaxed">
          官方 7 月中旬起每天高峰期涨价 50%。此功能允许用户配置调价时段和涨幅，
          系统在计算费用时自动应用对应定价，让监控数据更贴近真实账单。
        </p>
        <ul className="text-[11px] text-slate-400 mt-2 space-y-1 list-disc list-inside">
          <li>支持自定义起始/结束小时（可跨天，如 22-6）</li>
          <li>支持自定义涨幅百分比（默认 50%）</li>
          <li>影响 calcCost 计算，应用于费用明细、趋势图、Widget 全链路</li>
          <li>配置保存在 localStorage，可随时启用/禁用</li>
        </ul>
      </section>

      {/* 配置区 */}
      <section className="glass-card rounded-2xl p-4 mb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold">配置</h2>
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <span className="text-xs text-slate-400">启用</span>
            <div
              className="relative w-10 h-5 rounded-full transition-colors"
              style={{ background: config.enabled ? "#00D9A3" : "#334155" }}
              onClick={() => setConfig({ ...config, enabled: !config.enabled })}
            >
              <div
                className="absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform"
                style={{ transform: config.enabled ? "translateX(20px)" : "translateX(2px)" }}
              />
            </div>
          </label>
        </div>

        {/* 时段 */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="text-[11px] text-slate-400 block mb-1">起始小时</label>
            <select
              value={config.startHour}
              onChange={(e) => setConfig({ ...config, startHour: Number(e.target.value) })}
              className="w-full px-3 py-2 rounded-lg bg-white/5 text-white text-xs border border-white/10 outline-none"
            >
              {Array.from({ length: 24 }, (_, i) => (
                <option key={i} value={i} className="bg-slate-800">{i}:00</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[11px] text-slate-400 block mb-1">结束小时</label>
            <select
              value={config.endHour}
              onChange={(e) => setConfig({ ...config, endHour: Number(e.target.value) })}
              className="w-full px-3 py-2 rounded-lg bg-white/5 text-white text-xs border border-white/10 outline-none"
            >
              {Array.from({ length: 24 }, (_, i) => (
                <option key={i} value={i} className="bg-slate-800">{i}:00</option>
              ))}
            </select>
          </div>
        </div>

        {/* 涨幅 */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <label className="text-[11px] text-slate-400">涨幅百分比</label>
            <span
              className="font-mono text-sm font-bold px-2 py-0.5 rounded"
              style={{ color: "#FF6B35", background: "#FF6B3515" }}
            >
              +{config.surgePercent}%
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={200}
            step={5}
            value={config.surgePercent}
            onChange={(e) => setConfig({ ...config, surgePercent: Number(e.target.value) })}
            className="w-full h-2 rounded-full appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(90deg, #FF6B35 0%, #FF6B35 ${config.surgePercent / 2}%, rgba(255,255,255,0.1) ${config.surgePercent / 2}%)`,
            }}
          />
          <div className="flex justify-between mt-1">
            <span className="text-[9px] text-slate-600 font-mono">0%</span>
            <span className="text-[9px] text-slate-600 font-mono">100%</span>
            <span className="text-[9px] text-slate-600 font-mono">200%</span>
          </div>
        </div>

        {/* 测试小时 */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <label className="text-[11px] text-slate-400">模拟当前时刻（用于测试）</label>
            <span className="font-mono text-sm font-bold text-neon-cyan">
              {String(testHour).padStart(2, "0")}:30
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={23}
            step={1}
            value={testHour}
            onChange={(e) => setTestHour(Number(e.target.value))}
            className="w-full h-2 rounded-full appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(90deg, #4D6BFE 0%, #4D6BFE ${(testHour / 23) * 100}%, rgba(255,255,255,0.1) ${(testHour / 23) * 100}%)`,
            }}
          />
        </div>

        {/* 当前状态 */}
        <div
          className="p-3 rounded-lg mb-4 flex items-center justify-between"
          style={{
            background: inSurge ? "#FF6B3515" : "#00D9A315",
            border: `1px solid ${inSurge ? "#FF6B3540" : "#00D9A340"}`,
          }}
        >
          <span className="text-xs">
            {config.enabled ? (inSurge ? "🔥 当前处于高峰期" : "💤 当前为平峰期") : "调价已禁用"}
          </span>
          <span className="text-[10px] font-mono text-slate-400">
            时段 {String(config.startHour).padStart(2, "0")}:00 - {String(config.endHour).padStart(2, "0")}:00
          </span>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleReset}
            className="flex-1 py-2.5 rounded-xl bg-white/5 text-slate-300 text-xs font-medium hover:bg-white/10"
          >
            重置默认
          </button>
          <button
            onClick={handleSave}
            className="flex-[2] py-2.5 rounded-xl text-xs font-bold text-white"
            style={{
              background: saved
                ? "linear-gradient(135deg, #00D9A3, #00E5FF)"
                : "linear-gradient(135deg, #4D6BFE, #6366F1)",
            }}
          >
            {saved ? "已保存" : "保存配置"}
          </button>
        </div>
      </section>

      {/* 价格对比 */}
      <section className="glass-card rounded-2xl p-4 mb-4">
        <h2 className="text-sm font-semibold mb-3">价格对比（元 / 百万 tokens）</h2>
        <div className="grid grid-cols-3 gap-2 text-[10px] text-slate-500 px-2 pb-2 border-b border-white/10 mb-2">
          <span>计费类型</span>
          <span className="text-right text-[#4D6BFE]">V4 Flash</span>
          <span className="text-right text-[#A855F7]">V4 Pro</span>
        </div>
        {[
          { label: "缓存命中", key: "promptCacheHit" as const },
          { label: "缓存未命中", key: "promptCacheMiss" as const },
          { label: "输出", key: "completion" as const },
        ].map((row) => {
          const baseFlash = PRICING["deepseek-v4-flash"][row.key];
          const basePro = PRICING["deepseek-v4-pro"][row.key];
          const effFlash = flashEffective[row.key];
          const effPro = proEffective[row.key];
          const isChanged = config.enabled && inSurge && (effFlash !== baseFlash || effPro !== basePro);
          return (
            <div key={row.label} className="grid grid-cols-3 gap-2 px-2 py-2 border-b border-white/5 items-center">
              <span className="text-xs text-slate-200">{row.label}</span>
              <div className="text-right">
                <div className="font-mono text-xs font-bold text-[#4D6BFE]">¥{effFlash}</div>
                {isChanged && (
                  <div className="text-[9px] text-slate-500 line-through font-mono">¥{baseFlash}</div>
                )}
              </div>
              <div className="text-right">
                <div className="font-mono text-xs font-bold text-[#A855F7]">¥{effPro}</div>
                {isChanged && (
                  <div className="text-[9px] text-slate-500 line-through font-mono">¥{basePro}</div>
                )}
              </div>
            </div>
          );
        })}
      </section>

      {/* 费用计算示例 */}
      <section className="glass-card rounded-2xl p-4 mb-4">
        <h2 className="text-sm font-semibold mb-1">费用计算示例</h2>
        <p className="text-[10px] text-slate-500 mb-3">
          模拟请求：缓存命中 80K · 未命中 15K · 输出 5K
        </p>
        <div className="space-y-2">
          <div className="flex items-center justify-between p-2 rounded-lg bg-white/5">
            <div>
              <div className="text-xs text-[#4D6BFE] font-semibold">V4 Flash</div>
              <div className="text-[9px] text-slate-500">平峰 ¥{flashCostNormal.toFixed(4)}</div>
            </div>
            <div className="text-right">
              <div className="font-mono text-sm font-bold text-white">¥{flashCost.toFixed(4)}</div>
              {config.enabled && inSurge && (
                <div className="text-[9px] text-neon-orange">+{((flashCost / flashCostNormal - 1) * 100).toFixed(0)}%</div>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between p-2 rounded-lg bg-white/5">
            <div>
              <div className="text-xs text-[#A855F7] font-semibold">V4 Pro</div>
              <div className="text-[9px] text-slate-500">平峰 ¥{proCostNormal.toFixed(4)}</div>
            </div>
            <div className="text-right">
              <div className="font-mono text-sm font-bold text-white">¥{proCost.toFixed(4)}</div>
              {config.enabled && inSurge && (
                <div className="text-[9px] text-neon-orange">+{((proCost / proCostNormal - 1) * 100).toFixed(0)}%</div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 集成计划 */}
      <section className="glass-card rounded-2xl p-4 border border-neon-purple/20">
        <h2 className="text-sm font-semibold text-neon-purple mb-2">集成计划</h2>
        <ol className="text-[11px] text-slate-300 space-y-1.5 list-decimal list-inside">
          <li>在 Settings 页新增"高峰期调价"卡片</li>
          <li>修改 calcCost 调用点（store/trend/widget）替换为 calcCostWithSurge</li>
          <li>Worker 同步使用调价计算当日费用</li>
          <li>趋势图根据历史时段判断当时是否高峰期，应用对应价格</li>
          <li>Widget 显示当前实际价格 + 高峰期标识</li>
        </ol>
        <p className="text-[10px] text-slate-500 mt-3">此方案确认无误后再正式集成到 App。</p>
      </section>
    </div>
  );
}
