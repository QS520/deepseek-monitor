import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import PhoneFrame from "@/components/PhoneFrame";
import Home from "@/pages/Home";
import ModelDetail from "@/pages/ModelDetail";
import Settings from "@/pages/Settings";

export default function App() {
  return (
    <Router>
      <PhoneFrame>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/model/:id" element={<ModelDetail />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </PhoneFrame>
    </Router>
  );
}
