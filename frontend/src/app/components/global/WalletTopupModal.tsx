import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Wallet, ArrowRight, ShieldCheck, WalletCards } from "lucide-react";
import { formatVND } from "./subscription-cards";

export interface WalletTopupModalProps {
  open: boolean;
  onClose: () => void;
  walletBalance: number;
  onProceedToQR: (amount: number) => void;
}

const PRESET_AMOUNTS = [20000, 50000, 100000, 200000, 500000, 1000000];

export function WalletTopupModal({
  open,
  onClose,
  walletBalance,
  onProceedToQR,
}: WalletTopupModalProps) {
  const [amount, setAmount] = useState<number>(100000);
  const [customInput, setCustomInput] = useState<string>("100.000");

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
    onClose();
    onProceedToQR(amount);
  };

  const isInvalid = amount < 10000 || amount > 50000000;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className="max-w-[92vw] sm:max-w-md p-0 overflow-hidden bg-background border shadow-2xl rounded-2xl"
        aria-describedby={undefined}
      >
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
      </DialogContent>
    </Dialog>
  );
}
