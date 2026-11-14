import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { toast } from "sonner";
import {
  QrCode,
  Check,
  Copy,
  Wallet,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
} from "lucide-react";
import {
  CreditPackage,
  formatVND,
  getFinalPrice,
  getDurationLabel,
} from "./subscription-cards";

export interface QRModalProps {
  open: boolean;
  onClose: () => void;
  pkg: CreditPackage | null;
  walletBalance: number;
  onSuccess?: () => void;
  onBack?: () => void;
}

interface SepayInitResult {
  orderId: string;
  orderCode: string;
  amountVnd: number;
  bankCode: string;
  accountNumber: string;
  accountName: string;
  qrUrl: string;
}

export function QRModal({
  open,
  onClose,
  pkg,
  walletBalance,
  onSuccess,
  onBack,
}: QRModalProps) {
  const [view, setView] = useState<"QR" | "WALLET_CONFIRM" | "SUCCESS">("QR");
  const [loading, setLoading] = useState(false);
  const [walletLoading, setWalletLoading] = useState(false);
  const [initResult, setInitResult] = useState<SepayInitResult | null>(null);
  const [copied, setCopied] = useState(false);

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  // Polling kiem tra trang thai don hang
  const startPolling = useCallback(
    (orderId: string, currentPkg: CreditPackage) => {
      stopPolling();
      pollingRef.current = setInterval(async () => {
        try {
          const res = await fetch(`/api/payment/order-status/${orderId}`, {
            credentials: "include",
          });
          const json = await res.json();
          if (json.success && json.data?.status === "SUCCESS") {
            stopPolling();
            setView("SUCCESS");
            toast.success(`Đăng ký ${currentPkg.name} thành công!`, {
              description: "Gói đã được kích hoạt. Chúc bạn học tốt!",
            });
            onSuccess?.();
            setTimeout(() => {
              onClose();
            }, 2500);
          }
        } catch {
          // Bo qua loi mang tam thoi trong qua trinh polling
        }
      }, 4000);
    },
    [stopPolling, onSuccess, onClose]
  );

  // Khoi tao thanh toan SePay khi mo modal
  useEffect(() => {
    if (open && pkg) {
      setView("QR");
      setLoading(true);
      setInitResult(null);

      fetch("/api/payment/sepay/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ packageId: pkg.id }),
      })
        .then((r) => r.json())
        .then((json) => {
          if (json.success && json.data) {
            setInitResult(json.data as SepayInitResult);
            startPolling(json.data.orderId, pkg);
          } else {
            throw new Error(json.message || "Không thể khởi tạo thanh toán");
          }
        })
        .catch((err: any) => {
          toast.error("Khởi tạo thanh toán thất bại", { description: err.message });
          onClose();
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      stopPolling();
      setInitResult(null);
      setView("QR");
    }

    return () => {
      stopPolling();
    };
  }, [open, pkg, startPolling, stopPolling, onClose]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // Thanh toan bang Vi LexiCore
  const handleWalletPay = async () => {
    if (!pkg) return;
    setWalletLoading(true);
    try {
      const res = await fetch("/api/payment/wallet/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ packageId: pkg.id }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);

      stopPolling();
      setView("SUCCESS");
      toast.success(`Đăng ký ${pkg.name} thành công qua Ví LexiCore!`);
      onSuccess?.();
      setTimeout(() => {
        onClose();
      }, 2500);
    } catch (err: any) {
      toast.error("Thanh toán ví thất bại", { description: err.message });
    } finally {
      setWalletLoading(false);
    }
  };

  if (!pkg) return null;

  const finalPrice = getFinalPrice(pkg);
  const remainingWallet = walletBalance - finalPrice;
  const canAffordWallet = remainingWallet >= 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className="max-w-[92vw] sm:max-w-xl md:max-w-2xl p-0 overflow-hidden bg-background border shadow-2xl rounded-2xl"
        aria-describedby={undefined}
      >
        {/* ===== HEADER ===== */}
        <div className="shrink-0 px-6 py-4 border-b bg-muted/20 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <QrCode className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-bold">
                Thanh toán đơn hàng
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Gói {pkg.name} {pkg.duration_days ? getDurationLabel(pkg.duration_days) : ""}
              </p>
            </div>
          </div>

          {onBack && view === "QR" && (
            <button
              onClick={() => {
                stopPolling();
                onClose();
                onBack();
              }}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-medium transition-colors px-2.5 py-1.5 rounded-lg border border-border hover:bg-muted"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Chọn gói khác
            </button>
          )}
        </div>

        {/* ===== BODY ===== */}
        <div className="p-6">
          {/* Loading state khi dang tao ma QR */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm font-medium">Đang tạo mã VietQR SePay...</p>
            </div>
          )}

          {/* VIEW 1: QUET MA QR SEPAY */}
          {!loading && view === "QR" && initResult && (
            <div className="flex flex-col md:grid md:grid-cols-2 gap-6 items-center">
              {/* Cot trai: Ma QR SePay */}
              <div className="flex flex-col items-center justify-center w-full bg-muted/30 rounded-2xl p-4 border border-border/60">
                <div className="p-2.5 bg-white rounded-xl shadow-sm border">
                  <img
                    src={initResult.qrUrl}
                    alt="Mã QR Chuyển khoản"
                    className="w-44 h-44 sm:w-48 sm:h-48 object-contain"
                  />
                </div>
                <div className="text-center mt-3">
                  <p className="text-xs font-semibold text-foreground">
                    Quét mã bằng ứng dụng ngân hàng
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Hệ thống tự động điền số tài khoản, số tiền và nội dung
                  </p>
                </div>
              </div>

              {/* Cot phai: Thong tin chuyen khoan */}
              <div className="flex flex-col justify-between w-full h-full space-y-4">
                <div className="bg-muted/40 rounded-xl p-3.5 space-y-2 border border-border/60 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Ngân hàng:</span>
                    <span className="font-bold text-foreground">{initResult.bankCode}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Số tài khoản:</span>
                    <span className="font-mono font-bold text-foreground">{initResult.accountNumber}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Chủ tài khoản:</span>
                    <span className="font-semibold text-foreground">{initResult.accountName}</span>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-border/60">
                    <span className="text-muted-foreground">Số tiền:</span>
                    <span className="font-bold text-primary text-sm">
                      {formatVND(initResult.amountVnd)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-border/60">
                    <span className="text-muted-foreground">Nội dung CK:</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-primary tracking-wider">
                        {initResult.orderCode}
                      </span>
                      <button
                        onClick={() => handleCopy(initResult.orderCode)}
                        className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                        title="Sao chép nội dung"
                      >
                        {copied ? (
                          <Check className="h-3.5 w-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Luu y va nut vi */}
                <div className="space-y-3">
                  <div className="text-[11px] text-muted-foreground leading-relaxed flex items-start gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                    <span>Hệ thống tự động kích hoạt ngay sau khi nhận được tiền (từ 1 đến 5 phút).</span>
                  </div>

                  <div className="relative flex items-center gap-2">
                    <div className="flex-1 border-t border-border/80" />
                    <span className="text-[11px] text-muted-foreground">hoặc</span>
                    <div className="flex-1 border-t border-border/80" />
                  </div>

                  <Button
                    variant="outline"
                    className="w-full h-9 text-xs font-semibold border-emerald-500/50 hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 gap-2"
                    onClick={() => setView("WALLET_CONFIRM")}
                  >
                    <Wallet className="h-4 w-4" />
                    Thanh toán bằng Ví LexiCore
                    <span className="ml-auto text-[11px] font-normal text-muted-foreground">
                      Ví: {formatVND(walletBalance)}
                    </span>
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* VIEW 2: XAC NHAN DUNG VI LEXICORE */}
          {view === "WALLET_CONFIRM" && (
            <div className="max-w-md mx-auto space-y-5 py-2">
              <div className="text-center">
                <div className="inline-flex p-3 rounded-2xl bg-emerald-500/10 text-emerald-600 mb-2">
                  <Wallet className="h-7 w-7" />
                </div>
                <h3 className="text-base font-bold">Xác nhận thanh toán bằng Ví</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Số tiền sẽ được trừ trực tiếp từ số dư Ví LexiCore của bạn
                </p>
              </div>

              <div className="bg-muted/50 rounded-xl p-4 space-y-2.5 text-xs sm:text-sm border">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Gói thanh toán:</span>
                  <span className="font-semibold">{pkg.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Số dư ví hiện tại:</span>
                  <span className="font-semibold">{formatVND(walletBalance)}</span>
                </div>
                <div className="flex justify-between text-rose-500">
                  <span>Số tiền thanh toán:</span>
                  <span className="font-bold">-{formatVND(finalPrice)}</span>
                </div>
                <div className="border-t pt-2 flex justify-between font-bold">
                  <span>Số dư còn lại:</span>
                  <span className={canAffordWallet ? "text-emerald-600" : "text-rose-500"}>
                    {formatVND(Math.max(remainingWallet, 0))}
                  </span>
                </div>
              </div>

              {!canAffordWallet && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 text-rose-600 text-xs border border-rose-500/20">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>Số dư ví không đủ để thanh toán. Vui lòng quay lại quét mã VietQR.</span>
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 text-xs"
                  onClick={() => setView("QR")}
                  disabled={walletLoading}
                >
                  <ArrowLeft className="h-3.5 w-3.5 mr-1" />
                  Quay lại quét QR
                </Button>
                <Button
                  className="flex-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                  onClick={handleWalletPay}
                  disabled={!canAffordWallet || walletLoading}
                >
                  {walletLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Xác nhận trừ tiền"
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* VIEW 3: THANH TOAN THANH CONG */}
          {view === "SUCCESS" && (
            <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
              <div className="p-3 rounded-full bg-emerald-500/10 text-emerald-500 mb-1">
                <CheckCircle2 className="h-14 w-14" />
              </div>
              <h3 className="text-xl font-black text-foreground">
                Thanh toán thành công!
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground max-w-xs">
                Gói <strong>{pkg.name}</strong> đã được kích hoạt thành công vào tài khoản của bạn.
              </p>
              <div className="text-[11px] text-muted-foreground mt-4 animate-pulse">
                Cửa sổ này sẽ tự động đóng sau giây lát...
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
