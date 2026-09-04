import { Outlet } from "react-router-dom";
import { Brain } from "lucide-react";

export function AuthLayout() {
  return (
    <div className="min-h-screen flex" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

      {/* ===== LEFT PART: BRANDING ===== */}
      <div
        className="hidden md:flex flex-col w-1/2 p-12 text-white relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #0f0c29, #302b63, #24243e)",
        }}
      >
        {/* Decorative blur blobs */}
        <div className="absolute top-[-100px] left-[-100px] w-80 h-80 rounded-full opacity-20 blur-3xl"
          style={{ background: "radial-gradient(circle, #6366f1, transparent)" }} />
        <div className="absolute bottom-[-80px] right-[-80px] w-72 h-72 rounded-full opacity-20 blur-3xl"
          style={{ background: "radial-gradient(circle, #8b5cf6, transparent)" }} />

        {/* Logo */}
        <div className="flex items-center gap-2 z-10">
          <Brain className="h-8 w-8 text-indigo-400" />
          <span className="text-2xl font-bold">
            Lexi<span className="text-indigo-400">Core</span>
          </span>
        </div>

        {/* Hero Text */}
        <div className="flex-1 flex flex-col justify-center z-10 max-w-lg">
          <div className="space-y-5 text-left">
            <h1 className="text-5xl font-extrabold leading-tight tracking-tight">
              Học tiếng Anh <br />
              <span className="text-indigo-400">thông minh hơn</span> mỗi ngày.
            </h1>
            <p className="text-slate-300 text-lg leading-relaxed">
              Nắm vững từ vựng với phương pháp Spaced Repetition khoa học.
              Hàng nghìn người học đang tiến bộ từng ngày cùng LexiCore.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-sm text-slate-500 z-10">
          © {new Date().getFullYear()} LexiCore Inc. All rights reserved.
        </div>
      </div>

      {/* ===== RIGHT PART: FORM ===== */}
      <div
        className="flex flex-1 items-center justify-center p-8"
        style={{ background: "#111827" }}
      >
        <div className="w-full max-w-md">
          <Outlet />
        </div>
      </div>

    </div>
  );
}
