import { useNavigate, useLocation } from "react-router-dom";
import { LayoutDashboard, Settings } from "lucide-react";

// 底部导航栏
export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  const tabs = [
    { path: "/", label: "监控", icon: LayoutDashboard },
    { path: "/settings", label: "设置", icon: Settings },
  ];

  return (
    <nav className="sticky bottom-0 z-30 backdrop-blur-xl bg-space-900/90 border-t border-white/5 px-2 pb-5 pt-2">
      <div className="flex items-center justify-around">
        {tabs.map((tab) => {
          const active = location.pathname === tab.path;
          const Icon = tab.icon;
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className="relative flex flex-col items-center gap-1 px-6 py-1.5 transition-colors"
            >
              <Icon
                size={22}
                className={active ? "text-[#4D6BFE]" : "text-slate-500"}
                style={active ? { filter: "drop-shadow(0 0 6px rgba(77,107,254,0.6))" } : {}}
              />
              <span className={`text-[10px] font-medium ${active ? "text-[#4D6BFE]" : "text-slate-500"}`}>
                {tab.label}
              </span>
              {active && (
                <span className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-[#4D6BFE]" style={{ boxShadow: "0 0 6px #4D6BFE" }} />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
