import { useState } from "react";
import { Link } from "react-router-dom";
import { Eye, EyeOff, Mail, Lock } from "lucide-react";

export function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="space-y-8">
      {/* Heading */}
      <div className="space-y-2">
        <h2 className="text-4xl font-bold text-white">Đăng nhập</h2>
        <p className="text-slate-400">Chào mừng trở lại! Vui lòng nhập thông tin của bạn.</p>
      </div>

      {/* Form */}
      <div className="space-y-5">

        {/* Email Field */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-slate-300">Email</label>
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

        {/* Password Field */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-slate-300">Mật khẩu</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              className="w-full pl-10 pr-10 py-3 rounded-lg text-white placeholder-slate-500 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition"
              style={{ background: "#1f2937", border: "1px solid #374151" }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <div className="flex justify-end pt-1">
            <Link to="/forgot-password" className="text-sm font-medium text-indigo-400 hover:text-indigo-300 transition">
              Quên mật khẩu?
            </Link>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="button"
          className="w-full py-3 rounded-lg font-semibold text-white text-sm transition hover:opacity-90 active:scale-95"
          style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
        >
          Đăng nhập
        </button>
      </div>

      {/* Signup Link */}
      <p className="text-center text-sm text-slate-400">
        Chưa có tài khoản?{" "}
        <Link to="/register" className="text-indigo-400 font-semibold hover:text-indigo-300 transition">
          Tạo ngay
        </Link>
      </p>
    </div>
  );
}
