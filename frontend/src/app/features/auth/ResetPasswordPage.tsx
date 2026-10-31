import React, { useState } from "react";
import { Link, useNavigate, useLocation, Navigate } from "react-router-dom";
import { Eye, EyeOff, Lock, ArrowLeft, AlertCircle } from "lucide-react";
import { authService } from "../../services/auth-service";
import styles from "./AuthCommon.module.css";

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

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSubmit();
    }
  };

  return (
    <div className="auth-form-container">
      {/* Back Button */}
      <div style={{ marginBottom: "20px" }}>
        <Link
          to="/login"
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
          <span>Quay lại đăng nhập</span>
        </Link>
      </div>

      {/* Heading */}
      <div className={styles.authHeader}>
        <h1 className={styles.authTitle}>Đặt lại mật khẩu</h1>
        <p className={styles.authSubtitle}>
          Nhập mật khẩu mới cho tài khoản{" "}
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
      <form onSubmit={handleSubmit} className={styles.formBody}>
        {/* New Password Field */}
        <div className={styles.fieldGroup}>
          <label htmlFor="newPassword" className={styles.fieldLabel}>
            Mật khẩu mới
          </label>
          <div className={styles.inputWrapper}>
            <Lock className={styles.inputIcon} />
            <input
              id="newPassword"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Ít nhất 6 ký tự"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              onKeyDown={handleKeyDown}
              className={`${styles.inputField} ${styles.inputFieldWithAction}`}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className={styles.eyeBtn}
              aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {/* Confirm Password Field */}
        <div className={styles.fieldGroup}>
          <label htmlFor="confirmPassword" className={styles.fieldLabel}>
            Xác nhận mật khẩu
          </label>
          <div className={styles.inputWrapper}>
            <Lock className={styles.inputIcon} />
            <input
              id="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Nhập lại mật khẩu mới"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onKeyDown={handleKeyDown}
              className={`${styles.inputField} ${styles.inputFieldWithAction}`}
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className={styles.eyeBtn}
              aria-label={showConfirmPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              tabIndex={-1}
            >
              {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className={styles.submitBtn}
        >
          {isLoading ? (
            <>
              <span className={styles.spinner} />
              <span>Đang xử lý...</span>
            </>
          ) : (
            <span>Lưu mật khẩu mới</span>
          )}
        </button>
      </form>
    </div>
  );
}

export default ResetPasswordPage;
