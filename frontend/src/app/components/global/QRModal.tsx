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
  ArrowRight,
  CircleChevronUp,
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
  SubscriptionActionInfo,
} from "./subscription-cards";

export interface QRModalProps {
  open: boolean;
  onClose: () => void;
  pkg: CreditPackage | null;
  walletBalance: number;
  onSuccess?: () => void;
  onBack?: () => void;
  upgradeInfo?: SubscriptionActionInfo | null;
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
  upgradeInfo,
}: QRModalProps) {
  const [view, setView] = useState<"QR" | "WALLET_CONFIRM" | "SUCCESS">("QR");
  const [loading, setLoading] = useState(false);
  const [walletLoading, setWalletLoading] = useState(false);
  const [initResult, setInitResult] = useState<SepayInitResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [countdown, setCountdown] = useState(10);

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoCloseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Dùng ref để polling callback luôn truy cập được giá trị mới nhất mà không làm useEffect chạy lại
  const onSuccessRef = useRef(onSuccess);
  const onCloseRef = useRef(onClose);
  useEffect(() => { onSuccessRef.current = onSuccess; }, [onSuccess]);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const clearAutoCloseTimeout = useCallback(() => {
    if (autoCloseTimeoutRef.current) {
      clearTimeout(autoCloseTimeoutRef.current);
      autoCloseTimeoutRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  }, []);

  const handleCloseModal = useCallback(() => {
    stopPolling();
    clearAutoCloseTimeout();
    onCloseRef.current?.();
  }, [stopPolling, clearAutoCloseTimeout]);

  // Bắt đầu đếm ngược 10 giây rồi tự đóng modal
  const startCountdown = useCallback((onDone: () => void) => {
    setCountdown(10);
    countdownIntervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownIntervalRef.current!);
          countdownIntervalRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    autoCloseTimeoutRef.current = setTimeout(() => {
      onDone();
    }, 10000);
  }, []);

  // Khởi tạo thanh toán SePay khi mở modal — chỉ chạy lại khi open/pkg thực sự thay đổi
  useEffect(() => {
    if (!open || !pkg) {
      stopPolling();
      clearAutoCloseTimeout();
      setInitResult(null);
      setView("QR");
      return;
    }

    setView("QR");
    setLoading(true);
    setInitResult(null);
    stopPolling();

    const isWalletTopup =
      pkg.id === "pkg_wallet_topup" ||
      pkg.slug === "wallet-topup" ||
      pkg.name === "Nạp tiền Ví LexiCore";

    const endpoint = isWalletTopup ? "/api/payment/wallet/topup" : "/api/payment/sepay/init";
    const requestBody = isWalletTopup
      ? { amountVnd: pkg.price_vnd }
      : { packageId: pkg.id };

    let cancelled = false;

    fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(requestBody),
    })
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        if (json.success && json.data) {
          const result = json.data as SepayInitResult;
          const capturedPkg = pkg;
          setInitResult(result);

          // Bắt đầu polling kiểm tra trạng thái đơn hàng mỗi 2.5 giây
          pollingRef.current = setInterval(async () => {
            try {
              const res = await fetch(`/api/payment/order-status/${result.orderId}`, {
                credentials: "include",
              });
              const statusJson = await res.json();
              if (statusJson.success && statusJson.data?.status === "SUCCESS") {
                stopPolling();
                clearAutoCloseTimeout();
                setView("SUCCESS");

                const isTopupPkg =
                  capturedPkg.id === "pkg_wallet_topup" ||
                  capturedPkg.slug === "wallet-topup" ||
                  capturedPkg.name === "Nạp tiền Ví LexiCore";

                toast.success(
                  isTopupPkg
                    ? "Nạp tiền vào Ví LexiCore thành công!"
                    : `Đăng ký ${capturedPkg.name} thành công!`,
                  {
                    description: isTopupPkg
                      ? "Số dư Ví LexiCore đã được cập nhật thành công."
                      : "Gói đã được kích hoạt. Chúc bạn học tốt!",
                  }
                );

                onSuccessRef.current?.();

                // Tự động đóng sau 10 giây với đếm ngược hiển thị
                startCountdown(() => {
                  onCloseRef.current?.();
                });
              }
            } catch {
              // Bỏ qua lỗi mạng tạm thời trong quá trình polling
            }
          }, 2500);
        } else {
          throw new Error(json.message || "Không thể khởi tạo thanh toán");
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : "Lỗi không xác định";
        toast.error("Khởi tạo thanh toán thất bại", { description: message });
        onCloseRef.current?.();
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      stopPolling();
      clearAutoCloseTimeout();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, pkg?.id]);

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
      clearAutoCloseTimeout();
      setView("SUCCESS");
      toast.success(`Đăng ký ${pkg.name} thành công qua Ví LexiCore!`);
      onSuccess?.();
      startCountdown(() => {
        handleCloseModal();
      });
    } catch (err: any) {
      toast.error("Thanh toán ví thất bại", { description: err.message });
    } finally {
      setWalletLoading(false);
    }
  };

  if (!pkg) return null;

  const isWalletTopup =
    pkg.id === "pkg_wallet_topup" ||
    pkg.slug === "wallet-topup" ||
    pkg.name === "Nạp tiền Ví LexiCore";

  const isUpgrade = upgradeInfo?.type === "UPGRADE";
  const displayPrice = isUpgrade && upgradeInfo?.finalPrice ? upgradeInfo.finalPrice : getFinalPrice(pkg);
  const remainingWallet = walletBalance - displayPrice;
  const canAffordWallet = remainingWallet >= 0;

  return (
    <Dialog open={open} onOpenChange={handleCloseModal}>
      <DialogContent
        className="max-w-[92vw] sm:max-w-xl md:max-w-2xl p-0 overflow-hidden bg-background border shadow-2xl rounded-2xl"
        aria-describedby={undefined}
      >
        {/* ===== HEADER ===== */}
        <div className="shrink-0 px-6 py-4 border-b bg-muted/20">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-2.5">
              <div className={`p-2 rounded-xl shrink-0 mt-0.5 ${isWalletTopup ? "bg-emerald-500/10 text-emerald-600" : isUpgrade ? "bg-amber-500/10 text-amber-600" : "bg-primary/10 text-primary"}`}>
                {isWalletTopup ? <Wallet className="h-5 w-5" /> : isUpgrade ? <CircleChevronUp className="h-5 w-5" /> : <QrCode className="h-5 w-5" />}
              </div>
              <div>
                <div className="flex items-center h-7 gap-2">
                  <DialogTitle className="text-base sm:text-lg font-bold leading-none">
                    {isWalletTopup
                      ? "Nạp tiền Ví LexiCore"
                      : isUpgrade
                        ? "Nâng cấp gói hội viên"
                        : "Thanh toán đơn hàng"}
                  </DialogTitle>
                  {isUpgrade && (
                    <span className="text-[10px] bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold px-2 py-0.5 rounded-full">
                      Bù trừ Prorated
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {isWalletTopup
                    ? `Số tiền nạp: ${formatVND(initResult?.amountVnd || pkg.price_vnd)}`
                    : isUpgrade
                      ? `Từ ${upgradeInfo.currentTier} lên ${pkg.name} (${pkg.duration_days ?? 30} ngày mới kể từ hôm nay)`
                      : `Gói ${pkg.name} ${pkg.duration_days ? getDurationLabel(pkg.duration_days) : ""}`}
                </p>
              </div>
            </div>

            {onBack && view === "QR" && (
              <button
                onClick={() => {
                  handleCloseModal();
                  onBack();
                }}
                className="mr-7 h-7 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-medium transition-colors px-2.5 rounded-lg border border-border hover:bg-muted"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Chọn gói khác
              </button>
            )}
          </div>
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
            <div>
              {/* Thẻ tóm tắt khấu trừ Prorated khi nâng cấp */}
              {isUpgrade && upgradeInfo && (
                <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs space-y-1.5">
                  <div className="flex items-center justify-between font-bold text-amber-600 dark:text-amber-400">
                    <span className="inline-flex items-center gap-1.5">
                      <span>Nâng cấp từ {upgradeInfo.currentTier}</span>
                      <ArrowRight className="h-3.5 w-3.5 shrink-0" />
                      <span>{pkg.name}</span>
                    </span>
                    <span className="text-[10px] bg-amber-500/20 px-2 py-0.5 rounded font-semibold">Khấu trừ Prorated</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground text-[11px]">
                    <span>Giá gốc gói mới:</span>
                    <span className="font-semibold text-foreground">{formatVND(upgradeInfo.originalPrice)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400 text-[11px]">
                    <span>Khấu trừ gói cũ ({upgradeInfo.remainingDays} ngày còn lại):</span>
                    <span className="font-semibold">- {formatVND(upgradeInfo.unusedOldValue)}</span>
                  </div>
                  <div className="flex justify-between font-bold border-t border-amber-500/20 pt-1 text-foreground text-xs">
                    <span>Số tiền chênh lệch cần thanh toán:</span>
                    <span className="text-sm font-extrabold text-primary">{formatVND(upgradeInfo.finalPrice)}</span>
                  </div>
                </div>
              )}

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
                      <span className="text-muted-foreground">{isUpgrade ? "Số tiền chênh lệch:" : "Số tiền:"}</span>
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
                      <span>
                        {isWalletTopup
                          ? "Hệ thống tự động cộng tiền vào Ví LexiCore ngay sau khi nhận được chuyển khoản (từ 1 đến 5 phút)."
                          : isUpgrade
                            ? `Gói ${pkg.name} sẽ được kích hoạt với thời hạn mới ${pkg.duration_days ?? 30} ngày ngay sau khi nhận được chuyển khoản.`
                            : "Hệ thống tự động kích hoạt ngay sau khi nhận được tiền (từ 1 đến 5 phút)."}
                      </span>
                    </div>

                    {!isWalletTopup && (
                      <>
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
                      </>
                    )}
                  </div>
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
                  {isUpgrade
                    ? "Số tiền chênh lệch nâng cấp sẽ được trừ trực tiếp từ số dư Ví LexiCore của bạn"
                    : "Số tiền sẽ được trừ trực tiếp từ số dư Ví LexiCore của bạn"}
                </p>
              </div>

              <div className="bg-muted/50 rounded-xl p-4 space-y-2.5 text-xs sm:text-sm border">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Gói thanh toán:</span>
                  <span className="font-semibold">{pkg.name} {isUpgrade ? "(Nâng cấp)" : ""}</span>
                </div>
                {isUpgrade && upgradeInfo && (
                  <>
                    <div className="flex justify-between text-muted-foreground text-xs">
                      <span>Giá gốc gói mới:</span>
                      <span>{formatVND(upgradeInfo.originalPrice)}</span>
                    </div>
                    <div className="flex justify-between text-emerald-600 dark:text-emerald-400 text-xs">
                      <span>Khấu trừ gói cũ ({upgradeInfo.remainingDays} ngày):</span>
                      <span>- {formatVND(upgradeInfo.unusedOldValue)}</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Số dư ví hiện tại:</span>
                  <span className="font-semibold">{formatVND(walletBalance)}</span>
                </div>
                <div className="flex justify-between text-rose-500">
                  <span>Số tiền thanh toán:</span>
                  <span className="font-bold">-{formatVND(displayPrice)}</span>
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
            <div className="flex flex-col items-center justify-center py-8 gap-3 text-center">
              <div className="p-3.5 rounded-full bg-emerald-500/10 text-emerald-500 mb-1">
                <CheckCircle2 className="h-16 w-16" />
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-foreground">
                {isWalletTopup ? "Nạp tiền thành công!" : "Thanh toán thành công!"}
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground max-w-sm leading-relaxed">
                {isWalletTopup ? (
                  <>
                    Đã nạp thành công{" "}
                    <strong className="text-foreground">
                      {formatVND(initResult?.amountVnd || pkg.price_vnd)}
                    </strong>{" "}
                    vào Ví LexiCore của bạn.
                  </>
                ) : (
                  <>
                    Gói <strong className="text-foreground">{pkg.name}</strong> đã được kích
                    hoạt thành công vào tài khoản của bạn.
                  </>
                )}
              </p>

              <div className="pt-2 flex flex-col items-center gap-2">
                <Button
                  onClick={handleCloseModal}
                  className="h-10 px-8 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md shadow-emerald-500/20 cursor-pointer"
                >
                  Hoàn tất
                </Button>
                <span className="text-[11px] text-muted-foreground">
                  (Tự động đóng sau {countdown} giây)
                </span>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
