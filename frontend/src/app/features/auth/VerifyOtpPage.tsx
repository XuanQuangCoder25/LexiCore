import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator,
} from "../../components/ui/input-otp";

export function VerifyOtpPage() {
  return (
    <div className="space-y-8">
      {/* Back Button */}
      <div>
        <Link
          to="/forgot-password"
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
          Vui lòng nhập mã gồm 6 chữ số vừa được gửi đến email của bạn.
        </p>
      </div>

      {/* Form */}
      <div className="space-y-6">
        {/* OTP Input */}
        <div className="flex flex-col gap-2 pt-2">
          <label className="text-sm font-medium text-slate-300">
            Mã xác thực
          </label>
          <InputOTP maxLength={6} containerClassName="w-full gap-3">
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
          className="w-full py-3 rounded-lg font-semibold text-white text-sm transition hover:opacity-90 active:scale-95"
          style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
        >
          Xác nhận
        </button>
      </div>

      {/* Resend Link */}
      <p className="text-center text-sm text-slate-400">
        Chưa nhận được mã?{" "}
        <button className="text-indigo-400 font-semibold hover:text-indigo-300 transition">
          Gửi lại
        </button>
      </p>
    </div>
  );
}
