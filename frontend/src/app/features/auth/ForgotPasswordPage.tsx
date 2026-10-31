import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, ArrowLeft, AlertCircle } from "lucide-react";
import { authService } from "../../services/auth-service";
import styles from "./AuthCommon.module.css";

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError("");

    if (!email) {
      setError("Vui lòng nhập email.");
      return;
    }

    setIsLoading(true);
    try {
      await authService.forgotPassword({ email });
      navigate("/verify-otp", { state: { email, mode: "FORGOT_PASSWORD" } });
    } catch (err: any) {
      setError(err.message || "Có lỗi xảy ra.");
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
      {/* Back to login */}
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

      {/* Header */}
      <div className={styles.authHeader}>
        <h1 className={styles.authTitle}>Quên mật khẩu?</h1>
        <p className={styles.authSubtitle}>
          Đừng lo! Nhập email của bạn và chúng tôi sẽ gửi mã OTP để thiết lập lại mật khẩu mới.
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
        <div className={styles.fieldGroup}>
          <label htmlFor="email" className={styles.fieldLabel}>
            Email đã đăng ký
          </label>
          <div className={styles.inputWrapper}>
            <Mail className={styles.inputIcon} />
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="tenban@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={handleKeyDown}
              className={styles.inputField}
              required
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className={styles.submitBtn}
        >
          {isLoading ? (
            <>
              <span className={styles.spinner} />
              <span>Đang gửi mã...</span>
            </>
          ) : (
            <span>Gửi mã xác thực OTP</span>
          )}
        </button>
      </form>
    </div>
  );
}

export default ForgotPasswordPage;
