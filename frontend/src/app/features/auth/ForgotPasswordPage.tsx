import { Link } from "react-router-dom";
import { Mail, ArrowLeft } from "lucide-react";

export function ForgotPasswordPage() {
  return (
    <div className="space-y-8">
      {/* Back Button */}
      <div>
        <Link
          to="/login"
          className="inline-flex items-center text-sm font-medium text-indigo-400 hover:text-indigo-300 transition"
        >
          <ArrowLeft className="h-4 w-4 mr-2 text-indigo-400 hover:text-indigo-300" />
          Quay lại đăng nhập
        </Link>
      </div>

      {/* Heading */}
      <div className="space-y-2">
        <h2 className="text-4xl font-bold text-white">Quên mật khẩu?</h2>
        <p className="text-slate-400">
          Đừng lo lắng! Nhập email của bạn và chúng tôi sẽ gửi mã OTP để đặt lại mật khẩu.
        </p>
      </div>

      {/* Form */}
      <div className="space-y-5">
        {/* Email Field */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-slate-300">Email đã đăng ký</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input
              id="email"
              type="email"
              placeholder="davinci@gmail.com"
              className="w-full pl-10 pr-4 py-3 rounded-lg text-white placeholder-slate-500 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition"
              style={{ background: "#1f2937", border: "1px solid #374151" }}
            />
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="button"
          className="w-full py-3 rounded-lg font-semibold text-white text-sm transition hover:opacity-90 active:scale-95"
          style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
        >
          Gửi mã OTP
        </button>
      </div>
    </div>
  );
}
