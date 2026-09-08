import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./app/App.tsx";
import { AuthLayout } from "./app/features/auth/AuthLayout";
import { LoginPage } from "./app/features/auth/LoginPage";
import { RegisterPage } from "./app/features/auth/RegisterPage";
import { ForgotPasswordPage } from "./app/features/auth/ForgotPasswordPage";
import { VerifyOtpPage } from "./app/features/auth/VerifyOtpPage";
import { ResetPasswordPage } from "./app/features/auth/ResetPasswordPage";
import ProtectedRoute from "./app/components/ProtectedRoute";
import "./styles/index.css";

createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <Routes>
      {/* Route Dashboard - Bảo vệ bởi ProtectedRoute */}
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<App />} />
      </Route>

      {/* Các Route dành cho Auth */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/verify-otp" element={<VerifyOtpPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
      </Route>
    </Routes>
  </BrowserRouter>
);