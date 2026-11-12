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
  Crown,
  Check,
  Zap,
  Star,
  Copy,
  Wallet,
  Info,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  FileText,
} from "lucide-react";
import {
  CreditPackage,
  GroupedPackages,
  MOCK_DATA,
  formatVND,
  getFinalPrice,
  getDurationLabel,
  SubscriptionFlipCard,
} from "./subscription-cards";

// ============================================================
// Types
// ============================================================
export interface SubscriptionModalProps {
  open: boolean;
  onClose: () => void;
  initialPackageId?: string;
  initialTab?: "subscription" | "info";
  autoCheckout?: boolean;
  onSuccess?: () => void;
}
export type PremiumModalProps = SubscriptionModalProps;

interface SepayInitResult {
  orderId: string;
  orderCode: string;
  amountVnd: number;
  bankCode: string;
  accountNumber: string;
  accountName: string;
  qrUrl: string;
}

// ============================================================
// WalletConfirmModal (modal nhỏ đè lên modal chính)
// ============================================================
interface WalletConfirmProps {
  open: boolean;
  pkg: CreditPackage;
  walletBalance: number;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}

function WalletConfirmModal({
  open,
  pkg,
  walletBalance,
  onConfirm,
  onCancel,
  loading,
}: WalletConfirmProps) {
  if (!open) return null;
  const price = getFinalPrice(pkg);
  const remaining = walletBalance - price;
  const canAfford = remaining >= 0;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onCancel}
      />
      <div className="relative z-10 bg-background border rounded-2xl shadow-2xl w-[90vw] max-w-sm p-6 flex flex-col gap-4">
        <div className="flex items-center gap-2 text-base font-bold">
          <Wallet className="h-5 w-5 text-emerald-500" />
          Xác nhận thanh toán bằng Ví LexiCore
        </div>

        <div className="bg-muted/50 rounded-xl p-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Gói đăng ký</span>
            <span className="font-medium">{pkg.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Số dư ví hiện tại</span>
            <span className="font-medium">{formatVND(walletBalance)}</span>
          </div>
          <div className="flex justify-between text-red-500">
            <span>Số tiền thanh toán</span>
            <span className="font-bold">-{formatVND(price)}</span>
          </div>
          <div className="border-t pt-2 flex justify-between font-bold">
            <span>Số dư còn lại</span>
            <span className={canAfford ? "text-emerald-600" : "text-red-500"}>
              {formatVND(Math.max(remaining, 0))}
            </span>
          </div>
        </div>

        {!canAfford && (
          <p className="text-xs text-red-500 text-center">
            Số dư ví không đủ. Vui lòng chọn phương thức chuyển khoản VietQR.
          </p>
        )}

        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={onCancel}
            disabled={loading}
          >
            Hủy
          </Button>
          <Button
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={onConfirm}
            disabled={!canAfford || loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Xác nhận thanh toán"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// QR Checkout Section (hiển thị khi chọn thanh toán gói)
// ============================================================
interface QRCheckoutProps {
  result: SepayInitResult;
  pkg: CreditPackage;
  walletBalance: number;
  onWalletPay: () => void;
  onBack: () => void;
  paymentDone: boolean;
}

function QRCheckoutSection({
  result,
  pkg,
  walletBalance,
  onWalletPay,
  onBack,
  paymentDone,
}: QRCheckoutProps) {
  const [copied, setCopied] = useState(false);

  const copy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (paymentDone) {
    return (
      <div className="flex flex-col items-center gap-4 py-8 px-6">
        <CheckCircle2 className="h-16 w-16 text-emerald-500" />
        <p className="text-lg font-bold text-center">Thanh toán thành công!</p>
        <p className="text-sm text-muted-foreground text-center">
          Gói {pkg.name} đã được kích hoạt. Chúc bạn học tốt!
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 p-6">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-fit"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Chọn gói khác
      </button>

      <div className="text-center">
        <p className="text-sm font-semibold text-muted-foreground mb-1">
          Quét mã QR để thanh toán
        </p>
        <p className="text-xs text-muted-foreground">
          Ứng dụng ngân hàng tự động điền sẵn số tài khoản, số tiền và nội dung
        </p>
      </div>

      {/* Ảnh QR SePay VietQR */}
      <div className="flex justify-center">
        <div className="rounded-2xl border-2 border-dashed border-muted p-3 bg-white">
          <img
            src={result.qrUrl}
            alt="Mã QR chuyển khoản"
            className="w-52 h-52 object-contain"
          />
        </div>
      </div>

      {/* Thông tin chuyển khoản */}
      <div className="bg-muted/50 rounded-xl p-4 space-y-2.5 text-sm">
        <InfoRow label="Ngân hàng" value={result.bankCode} />
        <InfoRow label="Số tài khoản" value={result.accountNumber} />
        <InfoRow label="Tên tài khoản" value={result.accountName} />
        <InfoRow
          label="Số tiền"
          value={formatVND(result.amountVnd)}
          highlight
        />
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Nội dung chuyển khoản</span>
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold tracking-wider text-primary">
              {result.orderCode}
            </span>
            <button
              onClick={() => copy(result.orderCode)}
              className="p-1 rounded hover:bg-muted transition-colors"
              title="Sao chép nội dung"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-emerald-500" />
              ) : (
                <Copy className="h-3.5 w-3.5 text-muted-foreground" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Lưu ý chuyển khoản */}
      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-3 text-xs text-amber-700 dark:text-amber-400 space-y-1">
        <p className="font-semibold">Lưu ý quan trọng:</p>
        <p>Nội dung chuyển khoản phải chính xác là <strong>{result.orderCode}</strong></p>
        <p>Hệ thống tự động xác nhận trong 1 đến 5 phút sau khi nhận được tiền.</p>
      </div>

      {/* Nút thanh toán bằng ví */}
      <div className="flex flex-col gap-2">
        <div className="relative flex items-center gap-2">
          <div className="flex-1 border-t border-muted" />
          <span className="text-xs text-muted-foreground">hoặc</span>
          <div className="flex-1 border-t border-muted" />
        </div>
        <Button
          variant="outline"
          className="w-full gap-2 border-emerald-500/50 hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400"
          onClick={onWalletPay}
        >
          <Wallet className="h-4 w-4" />
          Thanh toán bằng Ví LexiCore
          <span className="ml-auto text-xs text-muted-foreground">
            {formatVND(walletBalance)}
          </span>
        </Button>
      </div>
    </div>
  );
}

function InfoRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-medium ${highlight ? "text-primary font-bold" : ""}`}>
        {value}
      </span>
    </div>
  );
}

// ============================================================
// Tab Thông tin và chính sách content
// ============================================================
function InfoTabContent() {
  return (
    <div className="p-6 space-y-5 overflow-y-auto max-h-[calc(90vh-220px)]">
      <Section title="Bảng giá đăng ký các gói">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-muted/60">
              <th className="text-left p-2 rounded-tl-lg">Gói</th>
              <th className="text-right p-2">1 tuần</th>
              <th className="text-right p-2">30 ngày</th>
              <th className="text-right p-2 rounded-tr-lg">365 ngày</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            <tr>
              <td className="p-2 font-medium text-emerald-600">Starter</td>
              <td className="p-2 text-right">9.000đ</td>
              <td className="p-2 text-right">19.000đ</td>
              <td className="p-2 text-right">159.000đ</td>
            </tr>
            <tr>
              <td className="p-2 font-medium text-blue-600">Pro</td>
              <td className="p-2 text-right">15.000đ</td>
              <td className="p-2 text-right">35.000đ</td>
              <td className="p-2 text-right">269.000đ</td>
            </tr>
            <tr>
              <td className="p-2 font-medium text-amber-600">Elite</td>
              <td className="p-2 text-right">25.000đ</td>
              <td className="p-2 text-right">49.000đ</td>
              <td className="p-2 text-right">349.000đ</td>
            </tr>
          </tbody>
        </table>
      </Section>

      <Section title="Quy tắc nâng cấp gói">
        <ul className="space-y-1.5 text-xs text-muted-foreground">
          <li className="flex gap-2">
            <span className="text-emerald-500 mt-0.5">+</span>
            <span>
              <strong>Gia hạn:</strong> Mua cùng hạng và cùng chu kỳ thì hệ thống cộng dồn thêm số ngày vào
              hạn sử dụng hiện tại (không mất ngày nào).
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-blue-500 mt-0.5">+</span>
            <span>
              <strong>Nâng cấp:</strong> Số tiền cần trả = Giá gói mới - (Giá gói cũ / 30 x Số ngày còn lại).
              Hệ thống kích hoạt ngay hạn sử dụng mới kể từ ngày nâng cấp.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-red-500 mt-0.5">-</span>
            <span>
              <strong>Không hỗ trợ:</strong> Hạ cấp xuống gói thấp hơn gói hiện tại đang sử dụng.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-orange-500 mt-0.5">!</span>
            <span>
              <strong>Chu kỳ:</strong> Không thể nâng cấp lên gói có chu kỳ ngắn hơn gói đang dùng
              (ví dụ: đang dùng gói tháng thì không thể nâng lên gói tuần của hạng cao hơn).
            </span>
          </li>
        </ul>
      </Section>

      <Section title="Cách tính thời gian">
        <ul className="space-y-1.5 text-xs text-muted-foreground">
          <li>1 năm = 365 ngày</li>
          <li>1 tháng = 30 ngày</li>
          <li>1 tuần = 7 ngày</li>
          <li>Hạn sử dụng được tính bắt đầu từ thời điểm thanh toán thành công.</li>
        </ul>
      </Section>

      <Section title="Hướng dẫn thanh toán">
        <ol className="space-y-1.5 text-xs text-muted-foreground list-decimal list-inside">
          <li>Chọn gói muốn đăng ký và nhấn nút Mua gói.</li>
          <li>Quét mã QR bằng ứng dụng ngân hàng bất kỳ (VietQR).</li>
          <li>
            Nội dung chuyển khoản phải đúng chính xác mã đơn hàng (ví dụ: LC105). Ứng dụng ngân hàng
            sẽ tự động điền sẵn khi quét QR.
          </li>
          <li>Hệ thống tự động xác nhận trong 1 đến 5 phút sau khi nhận được tiền.</li>
          <li>Hoặc thanh toán tức thì bằng số dư Ví LexiCore.</li>
        </ol>
      </Section>

      <Section title="Gói dùng thử và khuyến mãi">
        <ul className="space-y-1.5 text-xs text-muted-foreground">
          <li>Mỗi tài khoản mới mặc định được kích hoạt gói Pro dùng thử 3 ngày miễn phí.</li>
          <li>
            Ban quản trị có thể ban hành các đợt khuyến mãi giảm giá hoặc gói dùng thử đặc biệt nhân dịp kỷ niệm.
          </li>
          <li>Mỗi người dùng chỉ được sử dụng 1 lần gói dùng thử.</li>
        </ul>
      </Section>

      <p className="text-xs text-center text-muted-foreground pb-2">
        Hỗ trợ thanh toán: support@lexicore.site
      </p>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-sm font-semibold mb-2">{title}</p>
      <div className="bg-muted/40 rounded-xl p-4">{children}</div>
    </div>
  );
}

// ============================================================
// Main Modal
// ============================================================
export function SubscriptionModal({
  open,
  onClose,
  initialPackageId,
  initialTab = "subscription",
  autoCheckout = false,
  onSuccess,
}: SubscriptionModalProps) {
  const [activeTab, setActiveTab] = useState<"subscription" | "info">(initialTab);
  const [packages, setPackages] = useState<GroupedPackages>(MOCK_DATA);
  const [selectedSubId, setSelectedSubId] = useState<string>("sub-elite");
  const [subLoadingId, setSubLoadingId] = useState<string | null>(null);

  // QR checkout state
  const [checkoutResult, setCheckoutResult] = useState<SepayInitResult | null>(null);
  const [checkoutPkg, setCheckoutPkg] = useState<CreditPackage | null>(null);
  const [paymentDone, setPaymentDone] = useState(false);

  // Ví LexiCore state
  const [walletBalance, setWalletBalance] = useState(0);
  const [walletConfirmOpen, setWalletConfirmOpen] = useState(false);
  const [walletLoading, setWalletLoading] = useState(false);

  const subScrollRef = useRef<HTMLDivElement>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const selectedSub =
    packages.subscription.find((p) => p.id === selectedSubId) ||
    packages.subscription[packages.subscription.length - 1];

  // Fetch packages từ backend
  useEffect(() => {
    if (!open) return;
    fetch("/api/payment/packages")
      .then((r) => r.json())
      .then((json) => {
        if (json.success && json.data) {
          setPackages(json.data);
          const sub = json.data.subscription;
          if (sub?.length && !initialPackageId) {
            setSelectedSubId(sub[sub.length - 1].id);
          }
        }
      })
      .catch(() => {});
  }, [open, initialPackageId]);

  // Fetch số dư ví
  useEffect(() => {
    if (!open) return;
    fetch("/api/payment/my-subscription", { credentials: "include" })
      .then((r) => r.json())
      .then((json) => {
        if (json.success && json.data) {
          setWalletBalance(json.data.walletBalanceVnd ?? 0);
        }
      })
      .catch(() => {});
  }, [open]);

  // Polling kiểm tra trạng thái đơn hàng
  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const startPolling = useCallback(
    (orderId: string, pkg: CreditPackage) => {
      stopPolling();
      pollingRef.current = setInterval(async () => {
        try {
          const res = await fetch(`/api/payment/order-status/${orderId}`, {
            credentials: "include",
          });
          const json = await res.json();
          if (json.success && json.data?.status === "SUCCESS") {
            stopPolling();
            setPaymentDone(true);
            toast.success(`Đăng ký ${pkg.name} thành công!`, {
              description: "Gói đã được kích hoạt. Chúc bạn học tốt!",
            });
            onSuccess?.();
            setTimeout(() => onClose(), 2500);
          }
        } catch {
          // Bỏ qua lỗi mạng tạm thời
        }
      }, 4000);
    },
    [stopPolling, onClose, onSuccess]
  );

  // Mua gói bằng SePay QR hoặc Nhận quà sự kiện
  const handleBuySub = useCallback(async (pkg: CreditPackage) => {
    // 1. Nếu là gói sự kiện quà tặng từ chiến dịch của Admin
    if (pkg.campaign_id) {
      setSubLoadingId(pkg.id);
      try {
        const res = await fetch("/api/payment/campaign/claim", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ campaignId: pkg.campaign_id }),
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.message);
        toast.success(`Nhận quà sự kiện "${pkg.name}" thành công!`, {
          description: `Bạn có ${pkg.duration_days} ngày trải nghiệm gói ${pkg.tier}.`,
        });
        onSuccess?.();
        onClose();
      } catch (err: any) {
        toast.error("Nhận quà thất bại", { description: err.message });
      } finally {
        setSubLoadingId(null);
      }
      return;
    }

    // 2. Nếu là gói dùng thử Pro 3 ngày mặc định (chào mừng)
    if (pkg.is_trial) {
      setSubLoadingId(pkg.id);
      try {
        const res = await fetch("/api/payment/trial/activate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ packageId: pkg.id }),
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.message);
        toast.success("Kích hoạt gói dùng thử thành công!", {
          description: "Chúc bạn học tốt!",
        });
        onSuccess?.();
        onClose();
      } catch (err: any) {
        toast.error("Kích hoạt thất bại", { description: err.message });
      } finally {
        setSubLoadingId(null);
      }
      return;
    }

    // Gói trả phí: gọi SePay init
    setSubLoadingId(pkg.id);
    try {
      const res = await fetch("/api/payment/sepay/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ packageId: pkg.id }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);

      setCheckoutResult(json.data as SepayInitResult);
      setCheckoutPkg(pkg);
      setActiveTab("subscription");
      startPolling(json.data.orderId, pkg);
    } catch (err: any) {
      toast.error("Khởi tạo thanh toán thất bại", { description: err.message });
    } finally {
      setSubLoadingId(null);
    }
  }, [startPolling, onClose, onSuccess]);

  // Thanh toán bằng Ví LexiCore
  const handleWalletConfirm = async () => {
    if (!checkoutPkg) return;
    setWalletLoading(true);
    try {
      const res = await fetch("/api/payment/wallet/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ packageId: checkoutPkg.id }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);

      stopPolling();
      setWalletConfirmOpen(false);
      setPaymentDone(true);
      toast.success(`Đăng ký ${checkoutPkg.name} thành công qua Ví LexiCore!`);
      onSuccess?.();
      setTimeout(() => onClose(), 2500);
    } catch (err: any) {
      toast.error("Thanh toán ví thất bại", { description: err.message });
    } finally {
      setWalletLoading(false);
    }
  };

  // Đồng bộ initialTab & initialPackageId & autoCheckout khi mở modal
  useEffect(() => {
    if (!open) {
      setCheckoutResult(null);
      setCheckoutPkg(null);
      setPaymentDone(false);
      stopPolling();
      return;
    }

    if (initialTab) {
      setActiveTab(initialTab);
    }

    if (initialPackageId) {
      setSelectedSubId(initialPackageId);
      const targetPkg = packages.subscription.find((p) => p.id === initialPackageId);
      if (targetPkg && autoCheckout) {
        handleBuySub(targetPkg);
      }
    }
  }, [open, initialTab, initialPackageId, autoCheckout, packages.subscription, handleBuySub, stopPolling]);

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (subScrollRef.current && Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      subScrollRef.current.scrollLeft += e.deltaY;
    }
  };

  const handleBack = () => {
    stopPolling();
    setCheckoutResult(null);
    setCheckoutPkg(null);
    setPaymentDone(false);
  };

  return (
    <>
      {/* Modal Ví xác nhận (đè lên modal chính) */}
      {checkoutPkg && (
        <WalletConfirmModal
          open={walletConfirmOpen}
          pkg={checkoutPkg}
          walletBalance={walletBalance}
          onConfirm={handleWalletConfirm}
          onCancel={() => setWalletConfirmOpen(false)}
          loading={walletLoading}
        />
      )}

      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent
          className="max-w-4xl sm:max-w-4xl w-[92vw] p-0 flex flex-col gap-0 overflow-hidden bg-background/95 backdrop-blur-md border shadow-2xl"
          aria-describedby={undefined}
        >
          {/* Header */}
          <div className="shrink-0 p-6 pb-4 border-b">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-2xl font-black">
                <Crown className="h-6 w-6 text-amber-500" />
                Nâng cấp LexiCore
              </DialogTitle>
            </DialogHeader>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Khám phá toàn bộ 9 gói theo chu kỳ tuần, tháng và năm kèm chính sách nâng cấp minh bạch.
            </p>

            {/* Tab chuyển đổi: Chỉ còn 2 tab như đã bàn */}
            <div className="flex mt-4 bg-muted rounded-xl p-1">
              <TabBtn
                active={activeTab === "subscription"}
                onClick={() => {
                  setCheckoutResult(null);
                  setActiveTab("subscription");
                }}
              >
                <Crown className="h-3.5 w-3.5 inline mr-1.5 text-amber-500" />
                Tất cả gói Hội viên
              </TabBtn>
              <TabBtn
                active={activeTab === "info"}
                onClick={() => {
                  setCheckoutResult(null);
                  setActiveTab("info");
                }}
              >
                <FileText className="h-3.5 w-3.5 inline mr-1.5 text-sky-500" />
                Thông tin và chính sách
              </TabBtn>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto">

            {/* Tab: Subscription (Tất cả các gói) */}
            {activeTab === "subscription" && (
              <div className="flex flex-col">
                {checkoutResult && checkoutPkg ? (
                  <QRCheckoutSection
                    result={checkoutResult}
                    pkg={checkoutPkg}
                    walletBalance={walletBalance}
                    onWalletPay={() => setWalletConfirmOpen(true)}
                    onBack={handleBack}
                    paymentDone={paymentDone}
                  />
                ) : (
                  <>
                    <div className="w-full min-w-0 overflow-hidden px-6">
                      <div
                        ref={subScrollRef}
                        onWheel={handleWheel}
                        className="w-full overflow-x-auto flex items-stretch gap-5 pt-8 pb-5 px-1.5 select-none scroll-smooth [&::-webkit-scrollbar]:h-2.5 [&::-webkit-scrollbar-track]:bg-muted/40 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-muted-foreground/30 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/50"
                        style={{ scrollbarWidth: "thin" }}
                      >
                        {packages.subscription.map((pkg) => (
                          <SubscriptionFlipCard
                            key={pkg.id}
                            pkg={pkg}
                            selected={selectedSubId === pkg.id}
                            onSelect={() => setSelectedSubId(pkg.id)}
                            onBuy={handleBuySub}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Footer thanh toán */}
                    <div className="shrink-0 px-6 py-4 bg-muted/40 border-t flex flex-col sm:flex-row items-center justify-between gap-3">
                      <p className="text-xs text-muted-foreground">
                        Thanh toán qua chuyển khoản VietQR (SePay) hoặc Ví LexiCore
                      </p>

                      {selectedSub && (
                        <Button
                          className={`h-10 px-6 text-xs font-bold transition-all shadow-md rounded-xl
                            ${selectedSub.is_trial
                              ? "bg-gradient-to-r from-blue-400 to-blue-500 hover:from-blue-500 hover:to-blue-600 text-white shadow-blue-400/25"
                              : selectedSub.tier === "ELITE"
                                ? "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-amber-500/25"
                                : selectedSub.tier === "PRO"
                                  ? "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-blue-500/25"
                                  : "bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-emerald-500/25"
                            }`}
                          disabled={subLoadingId === selectedSub.id}
                          onClick={() => handleBuySub(selectedSub)}
                        >
                          {subLoadingId === selectedSub.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              {selectedSub.is_trial && <Zap className="h-4 w-4 mr-1.5" />}
                              {!selectedSub.is_trial && selectedSub.tier === "ELITE" && (
                                <Crown className="h-4 w-4 mr-1.5" />
                              )}
                              {!selectedSub.is_trial && selectedSub.tier === "PRO" && (
                                <Zap className="h-4 w-4 mr-1.5" />
                              )}
                              {!selectedSub.is_trial && selectedSub.tier === "STARTER" && (
                                <Star className="h-4 w-4 mr-1.5" />
                              )}
                              {selectedSub.campaign_id
                                ? `Nhận quà sự kiện miễn phí (${selectedSub.duration_days} ngày)`
                                : selectedSub.is_trial
                                  ? "Dùng thử miễn phí 3 ngày"
                                  : `Mua gói ${selectedSub.name}: ${formatVND(getFinalPrice(selectedSub))} ${getDurationLabel(selectedSub.duration_days)}`}
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Tab: Thông tin và chính sách */}
            {activeTab === "info" && <InfoTabContent />}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 text-sm font-medium py-1.5 rounded-lg transition-all
        ${active
          ? "bg-background shadow-sm text-foreground"
          : "text-muted-foreground hover:text-foreground"
        }`}
    >
      {children}
    </button>
  );
}

// Backward compatibility alias
export { SubscriptionModal as PremiumModal };
