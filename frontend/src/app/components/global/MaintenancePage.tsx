import React, { useState } from "react";
import { Clock, LogOut, ShieldAlert } from "lucide-react";
import { tokenStore } from "../../services/tokenStore";

interface MaintenancePageProps {
  title?: string;
  message?: string;
  estimatedEnd?: string | null;
}

export function MaintenancePage({
  title = "Hệ thống đang tạm bảo trì nâng cấp",
  message = "Chúng tôi đang nâng cấp máy chủ để phục vụ bạn tốt hơn. Xin lỗi bạn vì sự gián đoạn này!",
  estimatedEnd,
}: MaintenancePageProps) {
  const [switchingAccount, setSwitchingAccount] = useState(false);

  const handleSwitchAccount = async () => {
    if (switchingAccount) return;
    setSwitchingAccount(true);
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } catch {
      // ignore
    } finally {
      tokenStore.clear();
      localStorage.removeItem("lexicore_user_role");
      localStorage.removeItem("lexicore_user_tier");
      window.location.href = "/login";
    }
  };
  const formattedEnd = estimatedEnd
    ? new Date(estimatedEnd).toLocaleString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden bg-[#050b14] select-none">
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url('/maintenance.jpg')` }}
      />

      {/* Light Atmospheric Overlay (preserves crisp circuit details) */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-black/15 to-black/40" />

      {/* Content Box */}
      <div className="relative z-10 max-w-xl w-[92vw] mx-auto p-8 sm:p-10 rounded-3xl bg-zinc-950/75 backdrop-blur-md border border-cyan-500/20 shadow-[0_20px_60px_rgba(0,0,0,0.65)] text-center flex flex-col items-center">
        {/* Logo */}
        <div className="mb-6 flex items-center justify-center gap-3">
          <img
            src="/assets/logo_whale.png"
            alt="LexiCore"
            className="h-12 w-12 object-contain drop-shadow-[0_0_12px_rgba(34,211,238,0.35)]"
          />
          <span className="text-2xl font-black tracking-tight text-white">LexiCore</span>
        </div>

        {/* Shield Icon */}
        <div className="h-16 w-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 mb-6 shadow-inner">
          <ShieldAlert className="h-8 w-8" />
        </div>

        {/* Title */}
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-4">
          {title}
        </h1>

        {/* Message */}
        <p className="text-sm sm:text-base text-zinc-300 leading-relaxed max-w-md mb-6 whitespace-pre-line">
          {message}
        </p>

        {/* Estimated End Time */}
        {formattedEnd && (
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900/90 border border-zinc-800 text-xs sm:text-sm text-amber-400 font-medium mb-6">
            <Clock className="h-4 w-4 shrink-0" />
            <span>Dự kiến hoàn tất: {formattedEnd}</span>
          </div>
        )}

        {/* Status indicator */}
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping" />
          <span>Hệ thống sẽ tự động khôi phục ngay khi hoàn tất</span>
        </div>

        {/* Navigation links */}
        <div className="mt-6 pt-5 border-t border-zinc-800/80 w-full flex items-center justify-center gap-5 text-xs text-zinc-400">
          <a href="/" className="hover:text-white transition-colors">
            Về trang chủ
          </a>
          <span className="text-zinc-700">|</span>
          <button
            type="button"
            onClick={handleSwitchAccount}
            disabled={switchingAccount}
            className="inline-flex items-center gap-1.5 hover:text-cyan-300 transition-colors disabled:opacity-50"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>{switchingAccount ? "Đang chuyển..." : "Đăng nhập tài khoản khác"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
