import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation, Navigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "../../components/ui/input-otp";
import { authService } from "../../services/auth-service";

export function VerifyOtpPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const email = location.state?.email as string;
  const mode = location.state?.mode as "REGISTER" | "FORGOT_PASSWORD";

  const [otpCode, setOtpCode] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const [canResend, setCanResend] = useState(false);

  if (!email || !mode) {
    return <Navigate to="/login" replace />;
  }

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [countdown]);

  const handleSubmit = async () => {
    setError("");
    if (otpCode.length !== 6) {
      setError("Vui lòng nhập đủ 6 chữ số.");
      return;
    }

    if (mode === "REGISTER") {
      setIsLoading(true);
      try {
        await authService.verifyEmail({ email, otp_code: otpCode });
        navigate("/login", { state: { verified: true } });
      } catch (err: any) {
        setError(err.message || "Xác thực thất bại.");
      } finally {
        setIsLoading(false);
      }
    } else {
      setIsLoading(true);
      try {
        await authService.verifyOtp({ email, otp_code: otpCode, mode: "FORGOT_PASSWORD" });
        navigate("/reset-password", { state: { email, otp_code: otpCode } });
      } catch (err: any) {
        setError(err.message || "Mã OTP không hợp lệ hoặc đã hết hạn.");
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleResend = async () => {
    setError("");
    setCanResend(false);
    setCountdown(30);

    try {
      await authService.resendOtp({ email, mode });
    } catch (err: any) {
      setError(err.message || "Không thể gửi lại OTP.");
    }
  };

  const backLink = mode === "REGISTER" ? "/register" : "/forgot-password";

  return (
    <div className="space-y-8">
      {/* Back Button */}
      <div>
        <Link
          to={backLink}
          className="inline-flex items-center text-sm font-medium text-indigo-400 hover:text-indigo-300 transition"
        >
          <ArrowLeft className="h-4 w-4 mr-2 text-indigo-400 hover:text-indigo-300" />
          Quay lại
        </Link>
      </div>

      {/* Heading */}
      <div className="space-y-2">
        <h2 className="text-4xl font-bold text-white">Xác thực OTP</h2>
        <p className="text-slate-400">
          Vui lòng nhập mã gồm 6 chữ số vừa được gửi đến{" "}
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
      <div className="space-y-6">
        {/* OTP Input */}
        <div className="flex flex-col gap-2 pt-2">
          <label className="text-sm font-medium text-slate-300">
            Mã xác thực
          </label>
          <InputOTP maxLength={6} value={otpCode} onChange={setOtpCode} containerClassName="w-full gap-3">
            <InputOTPGroup className="w-full gap-3">
              <InputOTPSlot index={0} className="flex-1 h-14 text-lg font-bold text-white rounded-lg border border-slate-700 bg-slate-800 first:rounded-l-lg last:rounded-r-lg" />
              <InputOTPSlot index={1} className="flex-1 h-14 text-lg font-bold text-white rounded-lg border border-slate-700 bg-slate-800 first:rounded-l-lg last:rounded-r-lg" />
              <InputOTPSlot index={2} className="flex-1 h-14 text-lg font-bold text-white rounded-lg border border-slate-700 bg-slate-800 first:rounded-l-lg last:rounded-r-lg" />
              <InputOTPSlot index={3} className="flex-1 h-14 text-lg font-bold text-white rounded-lg border border-slate-700 bg-slate-800 first:rounded-l-lg last:rounded-r-lg" />
              <InputOTPSlot index={4} className="flex-1 h-14 text-lg font-bold text-white rounded-lg border border-slate-700 bg-slate-800 first:rounded-l-lg last:rounded-r-lg" />
              <InputOTPSlot index={5} className="flex-1 h-14 text-lg font-bold text-white rounded-lg border border-slate-700 bg-slate-800 first:rounded-l-lg last:rounded-r-lg" />
            </InputOTPGroup>
          </InputOTP>
        </div>

        {/* Submit Button */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isLoading}
          className="w-full py-3 rounded-lg font-semibold text-white text-sm transition hover:opacity-90 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
        >
          {isLoading ? "Đang xác thực..." : "Xác nhận"}
        </button>
      </div>

      {/* Resend Link */}
      <p className="text-center text-sm text-slate-400">
        Chưa nhận được mã?{" "}
        {canResend ? (
          <button
            onClick={handleResend}
            className="text-indigo-400 font-semibold hover:text-indigo-300 transition"
          >
            Gửi lại
          </button>
        ) : (
          <span className="text-slate-500">Gửi lại sau {countdown}s</span>
        )}
      </p>
    </div>
  );
}

