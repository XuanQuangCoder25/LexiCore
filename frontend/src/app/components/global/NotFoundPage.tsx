import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Compass, Home, LogIn } from "lucide-react";

export function NotFoundPage() {
  const location = useLocation();
  const attemptedPath = `${location.pathname}${location.search}` || "/";

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden bg-[#050b16] select-none px-4 py-6">
      {/* Custom Weightless Floating Animations */}
      <style>{`
        @keyframes lexiFloatWhale {
          0%, 100% {
            transform: translateY(0px) rotate(-2deg);
          }
          50% {
            transform: translateY(-14px) rotate(2deg);
          }
        }
        @keyframes lexiFloatSlow {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-8px);
          }
        }
        @keyframes lexiOrbitSpin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        @keyframes lexiPulseHalo {
          0%, 100% {
            opacity: 0.45;
            transform: scale(0.95);
          }
          50% {
            opacity: 0.85;
            transform: scale(1.06);
          }
        }
        .animate-lexi-whale {
          animation: lexiFloatWhale 4.8s ease-in-out infinite;
        }
        .animate-lexi-float {
          animation: lexiFloatSlow 6s ease-in-out infinite;
        }
        .animate-lexi-orbit {
          animation: lexiOrbitSpin 18s linear infinite;
        }
        .animate-lexi-halo {
          animation: lexiPulseHalo 4.8s ease-in-out infinite;
        }
      `}</style>

      {/* Custom LexiCore Aurora & Constellation Background */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/not-found-bg.jpg')" }}
      />

      {/* Light Atmospheric Vignette (preserves cyan & lavender aurora edges) */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#040814]/25 via-transparent to-[#040814]/60 pointer-events-none" />

      {/* Center Floating Glass Stage */}
      <div className="relative z-10 max-w-xl w-full mx-auto p-7 sm:p-10 rounded-3xl bg-zinc-950/65 backdrop-blur-xl border border-cyan-400/20 shadow-[0_24px_80px_rgba(0,0,0,0.72),0_0_50px_rgba(34,211,238,0.08)] text-center flex flex-col items-center animate-lexi-float">
        {/* Decorative Corner Glows inside card */}
        <div className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 w-64 h-32 rounded-full bg-gradient-to-r from-cyan-500/20 via-indigo-500/20 to-violet-500/20 blur-3xl" />

        {/* 404 Hero with Floating Whale Emblem as the Center Orbit */}
        <div className="relative flex items-center justify-center gap-3 sm:gap-5 mb-5">
          <span className="text-6xl sm:text-8xl font-black tracking-tighter bg-gradient-to-b from-white via-cyan-100 to-cyan-400/70 bg-clip-text text-transparent drop-shadow-[0_6px_24px_rgba(34,211,238,0.28)]">
            4
          </span>

          {/* Floating Orbital Whale */}
          <div className="relative flex items-center justify-center w-24 h-24 sm:w-32 sm:h-32">
            {/* Ambient Pulse Halo */}
            <div className="absolute inset-1 rounded-full bg-gradient-to-tr from-cyan-500/25 via-sky-400/15 to-violet-500/25 blur-xl animate-lexi-halo" />

            {/* Subtle Orbital Ring */}
            <div className="absolute inset-0 rounded-full border border-dashed border-cyan-400/35 animate-lexi-orbit">
              <span className="absolute -top-1 left-1/2 -translate-x-1/2 h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_10px_#22d3ee]" />
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-1.5 w-1.5 rounded-full bg-violet-300 shadow-[0_0_8px_#a78bfa]" />
            </div>

            {/* Inner Frosted Medallion + Whale Logo */}
            <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-slate-900/75 border border-cyan-400/30 shadow-inner flex items-center justify-center animate-lexi-whale">
              <img
                src="/assets/logo_whale.png"
                alt="LexiCore Whale"
                className="w-14 h-14 sm:w-16 sm:h-16 object-contain drop-shadow-[0_6px_16px_rgba(34,211,238,0.45)]"
              />
            </div>
          </div>

          <span className="text-6xl sm:text-8xl font-black tracking-tighter bg-gradient-to-b from-white via-violet-100 to-violet-400/75 bg-clip-text text-transparent drop-shadow-[0_6px_24px_rgba(167,139,250,0.28)]">
            4
          </span>
        </div>

        {/* Mistyped Path Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-slate-700/70 text-xs text-cyan-300/90 font-mono max-w-full mb-5">
          <Compass className="h-3.5 w-3.5 shrink-0 text-cyan-400" />
          <span className="truncate" title={attemptedPath}>
            {attemptedPath}
          </span>
        </div>

        {/* Heading */}
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-3">
          Ối! Bạn đang lạc giữa vùng biển lạ
        </h1>

        {/* Friendly Description */}
        <p className="text-sm sm:text-base text-slate-300/90 leading-relaxed max-w-md mb-7">
          Đường dẫn bạn vừa truy cập không tồn tại hoặc đã được di chuyển. Hãy để cá voi LexiCore đưa bạn quay lại lộ trình học tập nhé!
        </p>

        {/* Action Buttons */}
        <div className="w-full flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm text-slate-950 bg-gradient-to-r from-cyan-300 via-sky-300 to-violet-300 hover:brightness-110 shadow-[0_8px_28px_rgba(34,211,238,0.28)] transition-all active:scale-[0.98]"
          >
            <Home className="h-4 w-4 shrink-0" />
            <span>Về Trang chủ</span>
          </Link>

          <Link
            to="/login"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm text-white bg-zinc-900/85 hover:bg-zinc-800/90 border border-slate-700/80 hover:border-cyan-400/50 transition-all active:scale-[0.98]"
          >
            <LogIn className="h-4 w-4 shrink-0 text-cyan-300" />
            <span>Đến trang Đăng nhập</span>
          </Link>
        </div>

        {/* Subtle Footer Tag */}
        <p className="mt-6 text-[11px] text-slate-400">
          Lỗi 404 — Không tìm thấy trang trên LexiCore
        </p>
      </div>
    </div>
  );
}
