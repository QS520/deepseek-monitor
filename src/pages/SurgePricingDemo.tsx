import { useEffect, useState } from "react";
import { PRICING } from "@/types";
import {
  loadSurgeConfig,
  saveSurgeConfig,
  isSurgeTime,
  getEffectivePricing,
  calcCostWithSurge,
  getSurgeMinutesToday,
  timeToLabel,
  timeToMinutes,
  minutesToLabel,
  genRangeId,
  DEFAULT_SURGE_CONFIG,
  type SurgePricingConfig,
  type SurgeTimeRange,
  type TimeOfDay,
} from "@/lib/surgePricing";
import { Plus, Trash2, Clock } from "lucide-react";

// 生成 30 分钟粒度的时间选项（0:00 - 23:30，共 48 个）
const TIME_OPTIONS: TimeOfDay[] = (() => {
  const arr: TimeOfDay[] = [];
  for (let h = 0; h < 24; h++) {
    arr.push({ hour: h, minute: 0 });
    arr.push({ hour: h, minute: 30 });
  }
  return arr;
})();

// 调价方案演示页面 - 仅用于 web 端交互测试，正式 App 不集成
export default function SurgePricingDemo() {
  const [config, setConfig] = useState<SurgePricingConfig>(DEFAULT_SURGE_CONFIG);
  const [saved, setSaved] = useState(false);
  // 测试时刻（分钟数 0-1439，粒度 30）
  const [testMinutes, setTestMinutes] = useState(() => {
    const now = new Date();
    return Math.floor((now.getHours() * 60 + now.getMinutes()) / 30) * 30;
  });

  useEffect(() => {
    setConfig(loadSurgeConfig());
  }, []);

  // 用测试分钟构造一个 Date
  const testDate = new Date();
  testDate.setHours(Math.floor(testMinutes / 60), testMinutes % 60, 0, 0);

  const inSurge = isSurgeTime(testDate, config);
  const flashEffective = getEffectivePricing("deepseek-v4-flash", config, testDate);
  const proEffective = getEffectivePricing("deepseek-v4-pro", config, testDate);

  const sampleUsage = {
    promptCacheHit: 80000,
    promptCacheMiss: 15000,
    completion: 5000,
  };
  const flashCost = calcCostWithSurge(sampleUsage, "deepseek-v4-flash", config, testDate);
  const proCost = calcCostWithSurge(sampleUsage, "deepseek-v4-pro", config, testDate);
  const flashCostNormal = calcCostWithSurge(sampleUsage, "deepseek-v4-flash", { ...config, enabled: false }, testDate);
  const proCostNormal = calcCostWithSurge(sampleUsage, "deepseek-v4-pro", { ...config, enabled: false }, testDate);

  const surgeMinutes = getSurgeMinutesToday(config);

  const handleSave = () => {
    saveSurgeConfig(config);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => {
    setConfig(DEFAULT_SURGE_CONFIG);
    saveSurgeConfig(DEFAULT_SURGE_CONFIG);
  };

  // 时段操作
  const addRange = () => {
    const newRange: SurgeTimeRange = {
      id: genRangeId(),
      start: { hour: 14, minute: 0 },
      end: { hour: 18, minute: 0 },
    };
    setConfig({ ...config, ranges: [...config.ranges, newRange] });
  };

  const removeRange = (id: string) => {
    setConfig({ ...config, ranges: config.ranges.filter((r) => r.id !== id) });
  };

  const updateRange = (id: string, field: "start" | "end", value: TimeOfDay) => {
    setConfig({
      ...config,
      ranges: config.ranges.map((r) => (r.id === id ? { ...r, [field]: value } : r)),
    });
  };

  const updateRangeLabel = (id: string, label: string) => {
    setConfig({
      ...config,
      ranges: config.ranges.map((r) => (r.id === id ? { ...r, label } : r)),
    });
  };

  // 检查测试时刻是否落在某时段内（用于时段卡片高亮）
  const isRangeActive = (range: SurgeTimeRange): boolean => {
    if (!config.enabled) return false;
    const minutes = testMinutes;
    const startMin = timeToMinutes(range.start);
    const endMin = timeToMinutes(range.end);
    if (startMin === endMin) return false;
    if (startMin < endMin) {
      return minutes >= startMin && minutes < endMin;
    } else {
      return minutes >= startMin || minutes < endMin;
    }
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
          官方 7 月中旬起每天高峰期涨价 50%。此功能允许用户配置多个调价时段和涨幅，
          系统在计算费用时自动应用对应定价，让监控数据更贴近真实账单。
        </p>
        <ul className="text-[11px] text-slate-400 mt-2 space-y-1 list-disc list-inside">
          <li>支持多个时段（如 8:00-12:00 + 14:00-18:00）</li>
          <li>时间粒度 30 分钟（如 9:30 开始）</li>
          <li>支持跨天时段（如 22:00 - 06:00）</li>
          <li>统一涨幅百分比，应用于所有时段</li>
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

        {/* 时段列表 */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <label className="text-[11px] text-slate-400 flex items-center gap-1">
              <Clock size={12} /> 调价时段（共 {config.ranges.length} 个）
            </label>
            <button
              onClick={addRange}
              className="text-[11px] px-2 py-1 rounded-md bg-neon-cyan/10 text-neon-cyan hover:bg-neon-cyan/20 flex items-center gap-1"
            >
              <Plus size={11} /> 添加时段
            </button>
          </div>

          {config.ranges.length === 0 && (
            <p className="text-[11px] text-slate-500 text-center py-3">暂无时段，点击"添加时段"创建</p>
          )}

          <div className="space-y-2">
            {config.ranges.map((range, idx) => {
              const active = isRangeActive(range);
              return (
                <div
                  key={range.id}
                  className="p-2.5 rounded-lg border transition-colors"
                  style={{
                    background: active ? "#FF6B3510" : "rgba(255,255,255,0.03)",
                    borderColor: active ? "#FF6B3550" : "rgba(255,255,255,0.08)",
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-500 font-mono w-4">#{idx + 1}</span>
                    {/* 起始时间 */}
                    <select
                      value={timeToMinutes(range.start)}
                      onChange={(e) => {
                        const mins = Number(e.target.value);
                        updateRange(range.id, "start", {
                          hour: Math.floor(mins / 60),
                          minute: mins % 60,
                        });
                      }}
                      className="px-2 py-1 rounded bg-white/5 text-white text-xs border border-white/10 outline-none"
                    >
                      {TIME_OPTIONS.map((t) => (
                        <option key={`${t.hour}-${t.minute}`} value={timeToMinutes(t)} className="bg-slate-800">
                          {timeToLabel(t)}
                        </option>
                      ))}
                    </select>
                    <span className="text-slate-500 text-xs">→</span>
                    {/* 结束时间 */}
                    <select
                      value={timeToMinutes(range.end)}
                      onChange={(e) => {
                        const mins = Number(e.target.value);
                        updateRange(range.id, "end", {
                          hour: Math.floor(mins / 60),
                          minute: mins % 60,
                        });
                      }}
                      className="px-2 py-1 rounded bg-white/5 text-white text-xs border border-white/10 outline-none"
                    >
                      {TIME_OPTIONS.map((t) => (
                        <option key={`${t.hour}-${t.minute}`} value={timeToMinutes(t)} className="bg-slate-800">
                          {timeToLabel(t)}
                        </option>
                      ))}
                    </select>
                    {/* 删除按钮 */}
                    <button
                      onClick={() => removeRange(range.id)}
                      className="ml-auto p-1 rounded text-slate-500 hover:text-neon-orange hover:bg-neon-orange/10"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                  {/* 标签和状态 */}
                  <div className="flex items-center justify-between mt-1.5 pl-6">
                    <input
                      type="text"
                      value={range.label ?? ""}
                      onChange={(e) => updateRangeLabel(range.id, e.target.value)}
                      placeholder="备注（可选）"
                      className="text-[10px] bg-transparent text-slate-400 outline-none w-24 placeholder:text-slate-600"
                    />
                    <span
                      className="text-[9px] font-mono px-1.5 py-0.5 rounded"
                      style={{
                        color: active ? "#FF6B35" : "#64748B",
                        background: active ? "#FF6B3520" : "transparent",
                      }}
                    >
                      {active ? "● 当前生效" : "○ 未生效"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 总时长统计 */}
          {config.ranges.length > 0 && (
            <p className="text-[10px] text-slate-500 mt-2 text-right">
              每日调价总时长：<span className="text-neon-cyan font-mono">{Math.floor(surgeMinutes / 60)}h {surgeMinutes % 60}m</span>
            </p>
          )}
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

        {/* 测试时刻 - 30 分钟粒度 */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <label className="text-[11px] text-slate-400">模拟当前时刻</label>
            <span className="font-mono text-sm font-bold text-neon-cyan">
              {minutesToLabel(testMinutes)}
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={1410}
            step={30}
            value={testMinutes}
            onChange={(e) => setTestMinutes(Number(e.target.value))}
            className="w-full h-2 rounded-full appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(90deg, #4D6BFE 0%, #4D6BFE ${(testMinutes / 1410) * 100}%, rgba(255,255,255,0.1) ${(testMinutes / 1410) * 100}%)`,
            }}
          />
          <div className="flex justify-between mt-1">
            <span className="text-[9px] text-slate-600 font-mono">00:00</span>
            <span className="text-[9px] text-slate-600 font-mono">12:00</span>
            <span className="text-[9px] text-slate-600 font-mono">23:30</span>
          </div>
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
            {minutesToLabel(testMinutes)} · {config.ranges.length} 个时段 · {Math.floor(surgeMinutes / 60)}h {surgeMinutes % 60}m
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
