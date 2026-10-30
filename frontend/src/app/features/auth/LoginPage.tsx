import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Eye, EyeOff, Mail, Lock, AlertCircle } from "lucide-react";
import { authService } from "../../services/auth-service";
import { disconnectChatSocket } from "../social/chat-socket";
import styles from "./AuthCommon.module.css";

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Vui lòng nhập email và mật khẩu.");
      return;
    }

    setIsLoading(true);
    try {
      await authService.login({ email, password });
      disconnectChatSocket();
      const redirectTab = (location.state as any)?.redirectTab;
      if (redirectTab) {
        navigate("/dashboard", { state: { tab: redirectTab } });
      } else {
        navigate("/app");
      }
    } catch (err: any) {
      if (err.status === 403) {
        navigate("/verify-otp", { state: { email, mode: "REGISTER" } });
        return;
      }
      setError(err.message || "Đăng nhập thất bại.");
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
      {/* Segmented Pill Switcher */}
      <div className={styles.segmentedControl}>
        <button
          type="button"
          className={`${styles.segmentBtn} ${styles.segmentBtnActive}`}
          aria-current="page"
        >
          Đăng nhập
        </button>
        <Link to="/register" className={styles.segmentBtn}>
          Đăng ký
        </Link>
      </div>

      {/* Header */}
      <div className={styles.authHeader}>
        <h1 className={styles.authTitle}>Chào mừng trở lại</h1>
        <p className={styles.authSubtitle}>
          Đăng nhập để tiếp tục lộ trình học từ vựng cùng LexiCore.
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className={styles.errorAlert} role="alert">
          <AlertCircle className={styles.errorIcon} />
          <span>{error}</span>
        </div>
      )}

      {/* Form Body */}
      <form onSubmit={handleSubmit} className={styles.formBody}>
        {/* Email Field */}
        <div className={styles.fieldGroup}>
          <label htmlFor="email" className={styles.fieldLabel}>
            Email
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

        {/* Password Field */}
        <div className={styles.fieldGroup}>
          <label htmlFor="password" className={styles.fieldLabel}>
            Mật khẩu
          </label>
          <div className={styles.inputWrapper}>
            <Lock className={styles.inputIcon} />
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
          <div className={styles.fieldExtra}>
            <Link to="/forgot-password" className={styles.forgotLink}>
              Quên mật khẩu?
            </Link>
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
            <span>Đăng nhập</span>
          )}
        </button>
      </form>

      {/* Footer Switcher */}
      <p className={styles.footerText}>
        Chưa có tài khoản?{" "}
        <Link to="/register" className={styles.footerLink}>
          Tạo tài khoản ngay
        </Link>
      </p>
    </div>
  );
}

export default LoginPage;
