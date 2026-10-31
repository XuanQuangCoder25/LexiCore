import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Mail, Lock, User, AlertCircle } from "lucide-react";
import { authService } from "../../services/auth-service";
import styles from "./AuthCommon.module.css";

export function RegisterPage() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError("");

    if (!fullName || !email || !password || !confirmPassword) {
      setError("Vui lòng điền đầy đủ thông tin.");
      return;
    }
    if (fullName.length < 2) {
      setError("Tên hiển thị phải có ít nhất 2 ký tự.");
      return;
    }
    if (password.length < 6) {
      setError("Mật khẩu phải có ít nhất 6 ký tự.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }

    setIsLoading(true);
    try {
      await authService.register({ full_name: fullName, email, password });
      navigate("/verify-otp", { state: { email, mode: "REGISTER" } });
    } catch (err: any) {
      setError(err.message || "Đăng ký thất bại.");
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
        <Link to="/login" className={styles.segmentBtn}>
          Đăng nhập
        </Link>
        <button
          type="button"
          className={`${styles.segmentBtn} ${styles.segmentBtnActive}`}
          aria-current="page"
        >
          Đăng ký
        </button>
      </div>

      {/* Header */}
      <div className={styles.authHeader}>
        <h1 className={styles.authTitle}>Tạo tài khoản mới</h1>
        <p className={styles.authSubtitle}>
          Bắt đầu hành trình làm chủ từ vựng cùng AI và đấu trường PvP.
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
        {/* Full Name Field */}
        <div className={styles.fieldGroup}>
          <label htmlFor="fullName" className={styles.fieldLabel}>
            Tên hiển thị
          </label>
          <div className={styles.inputWrapper}>
            <User className={styles.inputIcon} />
            <input
              id="fullName"
              type="text"
              autoComplete="name"
              placeholder="Davinci Albert"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              onKeyDown={handleKeyDown}
              className={styles.inputField}
              required
            />
          </div>
        </div>

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
              autoComplete="new-password"
              placeholder="Ít nhất 6 ký tự"
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
              placeholder="Nhập lại mật khẩu"
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
            <span>Đăng ký tài khoản</span>
          )}
        </button>
      </form>

      {/* Footer Switcher */}
      <p className={styles.footerText}>
        Đã có tài khoản?{" "}
        <Link to="/login" className={styles.footerLink}>
          Đăng nhập ngay
        </Link>
      </p>
    </div>
  );
}

export default RegisterPage;
