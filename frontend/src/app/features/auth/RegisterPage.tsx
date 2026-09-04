import { useState } from "react";
import { Link } from "react-router-dom";
import { Eye, EyeOff, Mail, Lock, User } from "lucide-react";

export function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  return (
    <div className="space-y-8">
      {/* Heading */}
      <div className="space-y-2">
        <h2 className="text-4xl font-bold text-white">Đăng ký</h2>
        <p className="text-slate-400">Tạo tài khoản để bắt đầu hành trình học tập.</p>
      </div>

      {/* Form */}
      <div className="space-y-5">

        {/* Username Field */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-slate-300">Tên hiển thị</label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input
              id="username"
              type="text"
              placeholder="Davinci Albert"
              className="w-full pl-10 pr-4 py-3 rounded-lg text-white placeholder-slate-500 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition"
              style={{ background: "#1f2937", border: "1px solid #374151" }}
            />
          </div>
        </div>

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
        </div>

        {/* Confirm Password Field */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-slate-300">Xác nhận mật khẩu</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input
              id="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              placeholder="••••••••"
              className="w-full pl-10 pr-10 py-3 rounded-lg text-white placeholder-slate-500 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition"
              style={{ background: "#1f2937", border: "1px solid #374151" }}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition"
            >
              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="button"
          className="w-full py-3 mt-4 rounded-lg font-semibold text-white text-sm transition hover:opacity-90 active:scale-95"
          style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
        >
          Đăng ký
        </button>
      </div>

      {/* Login Link */}
      <p className="text-center text-sm text-slate-400">
        Đã có tài khoản?{" "}
        <Link to="/login" className="text-indigo-400 font-semibold hover:text-indigo-300 transition">
          Đăng nhập
        </Link>
      </p>
    </div>
  );
}
