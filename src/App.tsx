import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import PhoneFrame from "@/components/PhoneFrame";
import Home from "@/pages/Home";
import ModelDetail from "@/pages/ModelDetail";
import Settings from "@/pages/Settings";
import SurgePricingDemo from "@/pages/SurgePricingDemo";

export default function App() {
  return (
    <Router>
      <Routes>
        {/* 调价方案演示页面（独立全屏，不带手机外框） */}
        <Route path="/surge-pricing-demo" element={<SurgePricingDemo />} />
        {/* 主 App 路由 */}
        <Route
          path="*"
          element={
            <PhoneFrame>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/model/:id" element={<ModelDetail />} />
                <Route path="/settings" element={<Settings />} />
              </Routes>
            </PhoneFrame>
          }
        />
      </Routes>
    </Router>
  );
}
