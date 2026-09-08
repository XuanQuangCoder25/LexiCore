import { useState } from "react";
import { Link, useNavigate, useLocation, Navigate } from "react-router-dom";
import { Eye, EyeOff, Lock, ArrowLeft } from "lucide-react";
import { authService } from "../../services/auth-service";

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const email = location.state?.email as string;
  const otpCode = location.state?.otp_code as string;

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  if (!email || !otpCode) {
    return <Navigate to="/login" replace />;
  }

  const handleSubmit = async () => {
    setError("");

    if (!newPassword || !confirmPassword) {
      setError("Vui lòng điền đầy đủ thông tin.");
      return;
    }
    if (newPassword.length < 6) {
      setError("Mật khẩu phải có ít nhất 6 ký tự.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }

    setIsLoading(true);
    try {
      await authService.resetPassword({
        email,
        otp_code: otpCode,
        new_password: newPassword,
      });
      navigate("/login", { state: { resetSuccess: true } });
    } catch (err: any) {
      setError(err.message || "Đặt lại mật khẩu thất bại.");
    } finally {
      setIsLoading(false);
    }
  };

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
        <h2 className="text-4xl font-bold text-white">Đặt lại mật khẩu</h2>
        <p className="text-slate-400">
          Nhập mật khẩu mới cho tài khoản{" "}
          <span className="text-indigo-400 font-medium">{email}</span>.
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Form */}
      <div className="space-y-5">
        {/* New Password Field */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-slate-300">Mật khẩu mới</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input
              id="newPassword"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
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
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
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
          onClick={handleSubmit}
          disabled={isLoading}
          className="w-full py-3 rounded-lg font-semibold text-white text-sm transition hover:opacity-90 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
        >
          {isLoading ? "Đang xử lý..." : "Đặt lại mật khẩu"}
        </button>
      </div>
    </div>
  );
}
