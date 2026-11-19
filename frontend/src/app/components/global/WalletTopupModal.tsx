import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import {
  Wallet,
  ArrowRight,
  ShieldCheck,
  WalletCards,
  AlertTriangle,
  RotateCcw,
  CheckCircle,
} from "lucide-react";
import { formatVND } from "./subscription-cards";

export interface WalletTopupModalProps {
  open: boolean;
  onClose: () => void;
  walletBalance: number;
  todayTopupVnd?: number;
  onProceedToQR: (amount: number) => void;
}

const PRESET_AMOUNTS = [20000, 50000, 100000, 200000, 500000, 1000000];

// Hạn mức khuyến nghị nạp trong 1 ngày (1.000.000 VNĐ)
export const DAILY_TOPUP_LIMIT_THRESHOLD = 1000000;

export function WalletTopupModal({
  open,
  onClose,
  walletBalance,
  todayTopupVnd = 0,
  onProceedToQR,
}: WalletTopupModalProps) {
  const [amount, setAmount] = useState<number>(100000);
  const [customInput, setCustomInput] = useState<string>("100.000");
  const [step, setStep] = useState<"SELECT" | "WARNING">("SELECT");

  // Reset về màn hình chọn số tiền mỗi khi modal mở lại
  useEffect(() => {
    if (open) {
      setStep("SELECT");
    }
  }, [open]);

  const handleSelectPreset = (val: number) => {
    setAmount(val);
    setCustomInput(new Intl.NumberFormat("vi-VN").format(val));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, "");
    if (!rawValue) {
      setAmount(0);
      setCustomInput("");
      return;
    }
    const num = parseInt(rawValue, 10);
    setAmount(num);
    setCustomInput(new Intl.NumberFormat("vi-VN").format(num));
  };

  const handleConfirm = () => {
    if (amount < 10000) return;

    const projectedTotal = todayTopupVnd + amount;

    // Nếu tổng tiền nạp hôm nay + số tiền sắp nạp vượt hạn mức khuyến nghị trong ngày
    if (projectedTotal >= DAILY_TOPUP_LIMIT_THRESHOLD && step === "SELECT") {
      setStep("WARNING");
      return;
    }

    // Trường hợp bình thường hoặc người dùng đã xác nhận bỏ qua cảnh báo
    onClose();
    onProceedToQR(amount);
  };

  const handleProceedAfterWarning = () => {
    onClose();
    onProceedToQR(amount);
  };

  const isInvalid = amount < 10000 || amount > 50000000;
  const projectedTotal = todayTopupVnd + amount;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className="max-w-[92vw] sm:max-w-md p-0 overflow-hidden bg-background border shadow-2xl rounded-2xl"
        aria-describedby={undefined}
      >
        {/* ============================================================ */}
        {/* VIEW 1: CHỌN SỐ TIỀN NẠP                                      */}
        {/* ============================================================ */}
        {step === "SELECT" && (
          <>
            {/* Header */}
            <div className="p-6 pb-4 border-b bg-muted/20">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600">
                  <Wallet className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-bold">Nạp tiền Ví LexiCore</DialogTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Số dư hiện tại: <span className="font-bold text-foreground">{formatVND(walletBalance)}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="p-6 space-y-5">
              {/* Preset Buttons */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-2 block">
                  Chọn nhanh số tiền nạp
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {PRESET_AMOUNTS.map((val) => {
                    const isSelected = amount === val;
                    return (
                      <button
                        key={val}
                        type="button"
                        onClick={() => handleSelectPreset(val)}
                        className={`py-2 px-1 text-xs font-bold rounded-xl border transition-all text-center
                          ${isSelected
                            ? "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shadow-sm"
                            : "border-border hover:border-muted-foreground/40 bg-card text-foreground"
                          }`}
                      >
                        {formatVND(val)}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Input */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-2 block">
                  Hoặc nhập số tiền khác (VNĐ)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={customInput}
                    onChange={handleInputChange}
                    placeholder="Nhập số tiền..."
                    className="w-full h-11 px-3.5 pr-14 text-sm font-bold rounded-xl border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                    VNĐ
                  </span>
                </div>
                {amount > 0 && amount < 10000 && (
                  <p className="text-[11px] text-rose-500 mt-1.5">
                    Số tiền nạp tối thiểu là 10.000 VNĐ.
                  </p>
                )}
                {amount > 50000000 && (
                  <p className="text-[11px] text-rose-500 mt-1.5">
                    Số tiền nạp tối đa mỗi lần là 50.000.000 VNĐ.
                  </p>
                )}
              </div>

              {/* Tips */}
              <div className="rounded-xl p-3 bg-muted/40 border border-border/60 space-y-1 text-[11px] text-muted-foreground">
                <div className="flex items-center gap-1.5 font-semibold text-foreground">
                  <WalletCards className="h-3.5 w-3.5 text-amber-500" />
                  Lợi ích khi nạp Ví LexiCore:
                </div>
                <ul className="space-y-0.5 list-disc list-inside">
                  <li>Thanh toán và nâng cấp gói hội viên ngay lập tức trong 1 click.</li>
                  <li>Hỗ trợ tính năng tự động gia hạn gói khi đến hạn.</li>
                  <li>Chuyển khoản VietQR tự động khớp 24/7 qua SePay.</li>
                </ul>
              </div>

              {/* Action Button */}
              <Button
                className="w-full h-11 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md shadow-emerald-500/20 gap-2"
                disabled={isInvalid}
                onClick={handleConfirm}
              >
                <span>Tạo mã QR nạp {amount >= 10000 ? formatVND(amount) : ""}</span>
                <ArrowRight className="h-4 w-4" />
              </Button>

              <p className="text-[11px] text-center text-muted-foreground flex items-center justify-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                Giao dịch ngân hàng bảo mật qua cổng SePay
              </p>
            </div>
          </>
        )}

        {/* ============================================================ */}
        {/* VIEW 2: CẢNH BÁO CHI TIÊU CÓ TRÁCH NHIỆM (RESPONSIBLE SPEND)  */}
        {/* ============================================================ */}
        {step === "WARNING" && (
          <>
            {/* Header Cảnh báo */}
            <div className="p-6 pb-4 border-b bg-amber-500/[0.08] dark:bg-amber-500/[0.12]">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-bold text-amber-700 dark:text-amber-300">
                    Nhắc nhở chi tiêu học tập
                  </DialogTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Cảnh báo hạn mức nạp tiền khuyến nghị trong ngày
                  </p>
                </div>
              </div>
            </div>

            {/* Body Cảnh báo */}
            <div className="p-6 space-y-4">
              {/* Thống kê chi tiết */}
              <div className="rounded-xl p-3.5 bg-muted/50 border border-border space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Đã nạp hôm nay:</span>
                  <span className="font-semibold text-foreground">{formatVND(todayTopupVnd)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Số tiền sắp nạp:</span>
                  <span className="font-semibold text-foreground">{formatVND(amount)}</span>
                </div>
                <div className="border-t border-border/80 pt-2 flex justify-between items-center text-xs">
                  <span className="font-bold text-foreground">Tổng nạp dự kiến trong ngày:</span>
                  <span className="font-black text-amber-600 dark:text-amber-400 text-sm">
                    {formatVND(projectedTotal)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[11px] text-muted-foreground pt-0.5">
                  <span>Hạn mức khuyến nghị:</span>
                  <span>{formatVND(DAILY_TOPUP_LIMIT_THRESHOLD)} / ngày</span>
                </div>
              </div>

              {/* Lời nhắn nhủ */}
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-800 dark:text-amber-300 leading-relaxed space-y-1.5">
                <p className="font-semibold">
                  Nếu bạn nạp thêm {formatVND(amount)}, tổng số tiền nạp trong ngày hôm nay sẽ là {formatVND(projectedTotal)} (vượt mức khuyến nghị {formatVND(DAILY_TOPUP_LIMIT_THRESHOLD)}/ngày).
                </p>
                <p className="text-[11px] text-muted-foreground dark:text-amber-300/80">
                  LexiCore luôn khuyến khích bạn cân nhắc nhu cầu học tập thực tế để có kế hoạch chi tiêu hợp lý nhất.
                </p>
              </div>

              {/* Hai nút hành động */}
              <div className="pt-2 flex flex-col sm:flex-row gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 h-11 text-xs font-semibold gap-1.5 border-border hover:bg-muted"
                  onClick={() => setStep("SELECT")}
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Cân nhắc lại</span>
                </Button>

                <Button
                  type="button"
                  className="flex-1 h-11 text-xs font-bold gap-1.5 bg-amber-600 hover:bg-amber-700 text-white shadow-md shadow-amber-500/20"
                  onClick={handleProceedAfterWarning}
                >
                  <CheckCircle className="h-3.5 w-3.5" />
                  <span>Tôi hiểu, tiếp tục nạp</span>
                </Button>
              </div>

              <p className="text-[11px] text-center text-muted-foreground">
                Bạn vẫn có thể tiếp tục nạp nếu có nhu cầu học tập dài hạn cho bản thân hoặc nhóm.
              </p>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
