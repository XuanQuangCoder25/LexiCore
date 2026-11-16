import React from "react";
import { Clock, ShieldAlert } from "lucide-react";

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
    <div className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden bg-black select-none">
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat scale-105 filter blur-[2px]"
        style={{ backgroundImage: `url('/maintenance.jpg')` }}
      />

      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-black/75 backdrop-blur-md" />

      {/* Content Box */}
      <div className="relative z-10 max-w-xl w-[92vw] mx-auto p-8 sm:p-10 rounded-3xl bg-zinc-950/85 border border-zinc-800/80 shadow-2xl text-center flex flex-col items-center">
        {/* Logo */}
        <div className="mb-6 flex items-center justify-center gap-3">
          <img src="/logo.svg" alt="LexiCore Logo" className="h-10 w-10 object-contain drop-shadow" />
          <span className="text-2xl font-black tracking-tight text-white font-mono">LexiCore</span>
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
      </div>
    </div>
  );
}
