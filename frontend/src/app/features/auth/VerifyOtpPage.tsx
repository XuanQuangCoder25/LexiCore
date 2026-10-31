import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation, Navigate } from "react-router-dom";
import { ArrowLeft, AlertCircle } from "lucide-react";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "../../components/ui/input-otp";
import { authService } from "../../services/auth-service";
import styles from "./AuthCommon.module.css";

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
    <div className="auth-form-container">
      {/* Back Button */}
      <div style={{ marginBottom: "20px" }}>
        <Link
          to={backLink}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            fontSize: "13.5px",
            color: "#717171",
            textDecoration: "none",
            fontWeight: 500,
            transition: "color 0.2s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#151515")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#717171")}
        >
          <ArrowLeft size={16} />
          <span>Quay lại</span>
        </Link>
      </div>

      {/* Heading */}
      <div className={styles.authHeader}>
        <h1 className={styles.authTitle}>Xác thực OTP</h1>
        <p className={styles.authSubtitle}>
          Vui lòng nhập mã xác thực gồm 6 chữ số đã được gửi đến{" "}
          <strong style={{ color: "#151515", fontWeight: 600 }}>{email}</strong>.
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className={styles.errorAlert} role="alert">
          <AlertCircle className={styles.errorIcon} />
          <span>{error}</span>
        </div>
      )}

      {/* Form */}
      <div className={styles.formBody}>
        {/* OTP Input */}
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>Mã xác thực</label>
          <InputOTP maxLength={6} value={otpCode} onChange={setOtpCode} containerClassName="w-full gap-2.5">
            <InputOTPGroup className="w-full gap-2.5 flex justify-between">
              {[0, 1, 2, 3, 4, 5].map((idx) => (
                <InputOTPSlot
                  key={idx}
                  index={idx}
                  className="flex-1 h-13 text-xl font-semibold text-[#151515] rounded-xl border border-[rgba(21,21,21,0.14)] bg-[#F9FAFB] transition-all focus:border-[#151515] focus:bg-white focus:ring-4 focus:ring-[rgba(153,182,210,0.25)] first:rounded-l-xl last:rounded-r-xl"
                />
              ))}
            </InputOTPGroup>
          </InputOTP>
        </div>

        {/* Submit Button */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isLoading || otpCode.length !== 6}
          className={styles.submitBtn}
        >
          {isLoading ? (
            <>
              <span className={styles.spinner} />
              <span>Đang xác thực...</span>
            </>
          ) : (
            <span>Xác nhận mã OTP</span>
          )}
        </button>
      </div>

      {/* Resend Link */}
      <p className={styles.footerText}>
        Chưa nhận được mã?{" "}
        {canResend ? (
          <button
            type="button"
            onClick={handleResend}
            className={styles.footerLink}
            style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
          >
            Gửi lại ngay
          </button>
        ) : (
          <span style={{ color: "#9CA3AF" }}>Gửi lại sau {countdown}s</span>
        )}
      </p>
    </div>
  );
}

export default VerifyOtpPage;
