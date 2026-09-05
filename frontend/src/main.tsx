import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./app/App.tsx";
import { AuthLayout } from "./app/features/auth/AuthLayout";
import { LoginPage } from "./app/features/auth/LoginPage";
import { RegisterPage } from "./app/features/auth/RegisterPage";
import { ForgotPasswordPage } from "./app/features/auth/ForgotPasswordPage";
import { VerifyOtpPage } from "./app/features/auth/VerifyOtpPage";
import "./styles/index.css";

createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <Routes>
      {/* Route Dashboard */}
      <Route path="/" element={<App />} />

      {/* Các Route dành cho Auth */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/verify-otp" element={<VerifyOtpPage />} />
      </Route>
    </Routes>
  </BrowserRouter>
);