interface PhoneFrameProps {
  children: React.ReactNode;
}

// 移动端手机外壳容器 (居中显示手机视口)
export default function PhoneFrame({ children }: PhoneFrameProps) {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-space-900 grid-bg p-0 sm:p-6">
      {/* 背景装饰光晕 */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div
          className="absolute -top-20 -left-20 w-96 h-96 rounded-full opacity-20 blur-3xl"
          style={{ background: "radial-gradient(circle, #00E5FF, transparent 70%)" }}
        />
        <div
          className="absolute -bottom-20 -right-20 w-96 h-96 rounded-full opacity-15 blur-3xl"
          style={{ background: "radial-gradient(circle, #A855F7, transparent 70%)" }}
        />
      </div>

      {/* 手机外壳 */}
      <div className="relative w-full max-w-[428px] h-screen sm:h-[860px] bg-space-800 sm:rounded-[2.5rem] overflow-hidden shadow-2xl border-0 sm:border-[10px] sm:border-space-900 sm:ring-1 sm:ring-white/10 flex flex-col">
        {/* 状态栏模拟 (iOS 风格) */}
        <div className="hidden sm:flex flex-shrink-0 absolute top-0 inset-x-0 z-50 h-7 items-center justify-between px-6 pointer-events-none">
          <span className="text-[11px] font-mono font-semibold text-white">9:41</span>
          <div className="flex items-center gap-1">
            <svg width="16" height="10" viewBox="0 0 16 10" fill="white"><rect x="0" y="6" width="2" height="4" rx="0.5"/><rect x="3.5" y="4" width="2" height="6" rx="0.5"/><rect x="7" y="2" width="2" height="8" rx="0.5"/><rect x="10.5" y="0" width="2" height="10" rx="0.5"/></svg>
            <svg width="14" height="10" viewBox="0 0 14 10" fill="white"><path d="M7 1.5C9 1.5 10.8 2.3 12 3.5L13 2.5C11.5 1 9.4 0 7 0S2.5 1 1 2.5L2 3.5C3.2 2.3 5 1.5 7 1.5Z"/><path d="M7 4C8.1 4 9.1 4.4 9.8 5.1L10.8 4.1C9.8 3.1 8.5 2.5 7 2.5S4.2 3.1 3.2 4.1L4.2 5.1C4.9 4.4 5.9 4 7 4Z"/><circle cx="7" cy="7.5" r="1.5"/></svg>
            <svg width="24" height="11" viewBox="0 0 24 11" fill="none"><rect x="0.5" y="0.5" width="20" height="10" rx="2.5" stroke="white" strokeOpacity="0.5"/><rect x="2" y="2" width="16" height="7" rx="1" fill="white"/><rect x="21.5" y="3.5" width="1.5" height="4" rx="0.5" fill="white" fillOpacity="0.5"/></svg>
          </div>
        </div>

        {/* 内容区域 - flex 布局，子页面自己管理滚动 */}
        <div className="relative flex-1 flex flex-col overflow-hidden pt-0 sm:pt-7">
          {children}
        </div>

        {/* 底部 Home Indicator */}
        <div className="hidden sm:flex flex-shrink-0 absolute bottom-1 inset-x-0 z-50 justify-center pointer-events-none">
          <div className="w-32 h-1 rounded-full bg-white/30" />
        </div>
      </div>
    </div>
  );
}
