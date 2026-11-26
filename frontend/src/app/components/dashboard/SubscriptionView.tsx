import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Crown,
  Zap,
  Star,
  CircleDollarSign,
  Gem,
  CreditCard,
  Download,
  ShieldCheck,
  Bell,
  RefreshCw,
  CalendarDays,
  CalendarCheck2,
  CheckCircle2,
  Info,
  Wallet,
  Clock,
  Sparkles,
  Gift,
  Loader2,
  X,
  CircleChevronUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Switch } from "../ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import {
  CreditPackage,
  GroupedPackages,
  MOCK_DATA,
  formatVND,
  getFinalPrice,
  getDurationLabel,
  SubscriptionFlipCard,
  TopupCard,
  getSubscriptionActionInfo,
  SubscriptionActionInfo,
  TIER_RANKS,
} from "../global/subscription-cards";
import { SubscriptionModal } from "../global/SubscriptionModal";
import { QRModal } from "../global/QRModal";
import { WalletTopupModal } from "../global/WalletTopupModal";
import { toast } from "sonner";
import { downloadInvoiceWithFallback } from "../../utils/invoiceGenerator";

// ============================================================
// Types local
// ============================================================
type Tier = "FREE" | "STARTER" | "PRO" | "ELITE";

interface UserMembership {
  tier: Tier;
  packageId?: string | null;
  durationDays?: number | null;
  startedAt: string | null;
  expiresAt: string | null;
  autoRenew: boolean;
  emailReminder: boolean;
  coinBalance: number;
  diamondBalance: number;
  walletBalanceVnd: number;    // Số dư ví LexiCore (VNĐ thật)
  todayTopupVnd?: number;      // Tổng số tiền đã nạp ví trong ngày hôm nay
  hasUsedTrial: boolean;
}

interface Transaction {
  id: string;        // payment_reference (mã đơn hiển thị, ví dụ: LC583421)
  orderId: string;   // UUID thực của đơn (dùng để gọi API huỷ)
  date: string;
  description: string;
  amountVnd: number;
  status: "SUCCESS" | "PENDING" | "FAILED" | "CANCELLED";
}

// ============================================================
// API helpers
// ============================================================
const API = "/api/payment";

async function apiFetch<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(API + path, { credentials: "include", ...opts });
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { message?: string };
    throw new Error(body.message ?? `HTTP ${res.status}`);
  }
  const json = await res.json() as { success: boolean; data: T };
  return json.data;
}

// ============================================================
// Helpers
// ============================================================
function formatDate(iso: string | null): string {
  if (!iso) return "--";
  return new Date(iso).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function calculateRemaining(expiresAt: string | null) {
  if (!expiresAt) {
    return { text: "--", isExpiringSoon: false, isExpired: false };
  }
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) {
    return { text: "Đã hết hạn", isExpiringSoon: false, isExpired: true };
  }

  const totalSec = Math.floor(diff / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;

  let text = "";
  if (days > 0) {
    text = `${days} ngày ${hours} giờ`;
  } else if (hours > 0) {
    text = `${hours} giờ ${minutes} phút`;
  } else {
    text = `${minutes} phút ${seconds} giây`;
  }

  // Dưới 3 ngày mới tính là sắp hết hạn
  const isExpiringSoon = diff < 3 * 24 * 3600 * 1000;

  return { text, isExpiringSoon, isExpired: false };
}

function useRemainingTime(expiresAt: string | null) {
  const [timeInfo, setTimeInfo] = useState(() => calculateRemaining(expiresAt));

  useEffect(() => {
    if (!expiresAt) return;
    const update = () => setTimeInfo(calculateRemaining(expiresAt));
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  return timeInfo;
}

function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000));
}

// ============================================================
// Tier config - Màu chủ đạo, border, glow và icon đồng bộ theo từng gói
// ============================================================
const TIER_CFG: Record<
  Tier,
  {
    label: string;
    color: string;
    badgeClass: string;
    borderClass: string;
    bgGrad: string;
    glowColor: string;
    iconBg: string;
    clockColor: string;
    clockBg: string;
    icon: typeof Crown;
  }
> = {
  FREE: {
    label: "Free",
    color: "text-muted-foreground",
    badgeClass: "bg-muted text-muted-foreground border-border",
    borderClass: "border-border",
    bgGrad: "",
    glowColor: "transparent",
    iconBg: "bg-muted",
    clockColor: "text-muted-foreground",
    clockBg: "bg-muted",
    icon: Star,
  },
  STARTER: {
    label: "Starter",
    color: "text-emerald-600 dark:text-emerald-400",
    badgeClass: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
    borderClass: "border-emerald-500/50",
    bgGrad: "from-emerald-500/[0.08] via-card to-card",
    glowColor: "#10b981",
    iconBg: "bg-emerald-500/15",
    clockColor: "text-emerald-600 dark:text-emerald-400",
    clockBg: "bg-emerald-500/10",
    icon: Star,
  },
  PRO: {
    label: "Pro",
    color: "text-blue-600 dark:text-blue-400",
    badgeClass: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20",
    borderClass: "border-blue-500/50",
    bgGrad: "from-blue-500/[0.08] via-card to-card",
    glowColor: "#3b82f6",
    iconBg: "bg-blue-500/15",
    clockColor: "text-blue-600 dark:text-blue-400",
    clockBg: "bg-blue-500/10",
    icon: Zap,
  },
  ELITE: {
    label: "Elite",
    color: "text-amber-500",
    badgeClass: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20",
    borderClass: "border-amber-500/60",
    bgGrad: "from-amber-500/[0.08] via-card to-card",
    glowColor: "#f59e0b",
    iconBg: "bg-amber-500/15",
    clockColor: "text-amber-500",
    clockBg: "bg-amber-500/10",
    icon: Crown,
  },
};

// ============================================================
// StatusBadge
// ============================================================
function StatusBadge({ status }: { status: Transaction["status"] }) {
  if (status === "SUCCESS") return (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full">
      <CheckCircle2 className="w-3 h-3" />Thành công
    </span>
  );
  if (status === "PENDING") return (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-full">
      <RefreshCw className="w-3 h-3 animate-spin" />Chờ thanh toán
    </span>
  );
  if (status === "CANCELLED") return (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
      <X className="w-3 h-3" />Đã huỷ
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 bg-rose-500/10 px-2 py-0.5 rounded-full">
      Thất bại
    </span>
  );
}

// ============================================================
// MembershipCard (trái)
// ============================================================
function MembershipCard({
  membership,
  onTopup,
}: {
  membership: UserMembership;
  onTopup?: () => void;
}) {
  const cfg = TIER_CFG[membership.tier];
  const TierIcon = cfg.icon;
  const { text: remainingText, isExpiringSoon, isExpired } = useRemainingTime(membership.expiresAt);
  const isFree = membership.tier === "FREE";

  return (
    <Card className={`relative overflow-hidden border-2 bg-gradient-to-b ${cfg.borderClass} ${cfg.bgGrad} h-full flex flex-col justify-between`}>
      {!isFree && (
        <div
          className="absolute -top-10 -right-10 w-40 h-40 rounded-full blur-3xl pointer-events-none opacity-25"
          style={{ background: cfg.glowColor }}
        />
      )}
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <div className={`p-2.5 rounded-xl shrink-0 ${cfg.iconBg}`}>
            <TierIcon className={`h-5 w-5 ${cfg.color}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="text-base font-bold">Gói Hội viên</CardTitle>
              <Badge variant="outline" className={`text-[10px] font-black px-2 py-0 tracking-wider ${cfg.badgeClass}`}>
                {cfg.label.toUpperCase()}
              </Badge>
            </div>
            <CardDescription className="mt-1 text-xs text-muted-foreground">
              {isFree
                ? "Bạn đang sử dụng các tính năng cơ bản miễn phí"
                : `Đang kích hoạt đầy đủ đặc quyền gói ${cfg.label}`}
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 pt-0 flex-1 flex flex-col justify-between">
        {/* Khối hiển thị số ngày còn lại (2 thông số, màu đồng hồ theo tier, dưới 3 ngày cảnh báo đỏ) */}
        {!isFree && membership.expiresAt ? (
          <div className="rounded-xl bg-muted/40 p-2.5 border border-border/60 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${isExpiringSoon
                  ? "bg-rose-500/10 text-rose-500"
                  : `${cfg.clockBg} ${cfg.clockColor}`
                  }`}
              >
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground font-medium leading-none">Thời hạn sử dụng</p>
                <p className="text-xs font-bold text-foreground mt-1">
                  {isExpired ? "Đã hết hạn sử dụng" : `Còn lại ${remainingText}`}
                </p>
              </div>
            </div>
            <Badge
              variant="outline"
              className={`text-[10px] font-semibold px-2 py-0.5 ${isExpired
                ? "bg-muted text-muted-foreground border-border"
                : isExpiringSoon
                  ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                  : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                }`}
            >
              {isExpired ? "Hết hạn" : isExpiringSoon ? "Sắp hết hạn" : "Đang hiệu lực"}
            </Badge>
          </div>
        ) : isFree ? (
          <div className="rounded-xl bg-muted/30 p-2.5 border border-dashed border-border flex items-center gap-2 text-xs text-muted-foreground">
            <Info className="w-4 h-4 text-primary shrink-0" />
            <span>Nâng cấp để mở khóa đặc quyền học tập không giới hạn</span>
          </div>
        ) : null}

        {/* Coin & Diamond */}
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2">
            <CircleDollarSign className="h-4 w-4 text-emerald-600 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground leading-none mb-0.5">Coin</p>
              <p className="text-sm font-bold">{membership.coinBalance.toLocaleString()}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2">
            <Gem className="h-4 w-4 text-fuchsia-500 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground leading-none mb-0.5">Diamond</p>
              <p className="text-sm font-bold">{membership.diamondBalance}</p>
            </div>
          </div>
        </div>

        {/* Ví LexiCore */}
        <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2">
          <Wallet className="h-4 w-4 text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground leading-none mb-0.5">Ví LexiCore</p>
            <p className="text-sm font-bold">{formatVND(membership.walletBalanceVnd)}</p>
          </div>
          <Button
            size="sm"
            onClick={onTopup}
            className="h-7 px-6 min-w-[72px] text-xs font-bold rounded-full shrink-0 text-white shadow-xs border-none bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 transition-all cursor-pointer"
          >
            Nạp
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================
// AutoRenewConfirmModal
// ============================================================
interface AutoRenewConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  packageName: string;
  priceVnd: number;
  durationDays: number;
  walletBalance: number;
  expiresAt: string | null;
  loading: boolean;
}

function AutoRenewConfirmModal({
  open,
  onClose,
  onConfirm,
  packageName,
  priceVnd,
  durationDays,
  walletBalance,
  expiresAt,
  loading,
}: AutoRenewConfirmModalProps) {
  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className="max-w-[92vw] sm:max-w-md p-0 overflow-hidden bg-background border shadow-2xl rounded-2xl"
        aria-describedby={undefined}
      >
        <div className="p-6 pb-4 border-b bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <RefreshCw className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-bold">
                Xác nhận tự động gia hạn
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Duy trì quyền lợi hội viên liên tục bằng Ví LexiCore
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-muted/40 rounded-xl p-4 space-y-2.5 border border-border/60 text-xs sm:text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Gói gia hạn:</span>
              <span className="font-bold text-foreground">{packageName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Chu kỳ gia hạn:</span>
              <span className="font-semibold text-foreground">{durationDays} ngày</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Số tiền trừ từ Ví:</span>
              <span className="font-bold text-primary">{formatVND(priceVnd)}</span>
            </div>
            <div className="flex justify-between pt-1 border-t border-border/60">
              <span className="text-muted-foreground">Số dư Ví hiện tại:</span>
              <span className="font-semibold text-foreground">{formatVND(walletBalance)}</span>
            </div>
            {expiresAt && (
              <div className="flex justify-between pt-1 border-t border-border/60">
                <span className="text-muted-foreground">Thời điểm gia hạn tiếp theo:</span>
                <span className="font-semibold text-foreground">{formatDate(expiresAt)}</span>
              </div>
            )}
          </div>

          <div className="p-3 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs border border-amber-500/20 space-y-1">
            <p className="font-semibold">Cơ chế hoạt động:</p>
            <p>
              Hệ thống sẽ <strong>chỉ trừ tiền từ Ví LexiCore vào đúng thời điểm gói hết hạn</strong> để gia hạn chính xác gói này cho bạn (cộng nối tiếp số ngày, không bị mất ngày nào).
            </p>
            <p>
              Nếu số dư Ví không đủ khi đến hạn, gói sẽ tự động trở về Miễn phí mà không phát sinh thêm bất kỳ chi phí nào. Bạn có thể tắt tính năng này bất cứ lúc nào.
            </p>
          </div>

          <div className="flex gap-2 pt-1">
            <Button
              variant="outline"
              className="flex-1 text-xs"
              onClick={onClose}
              disabled={loading}
            >
              Hủy
            </Button>
            <Button
              className="flex-1 text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-bold"
              onClick={onConfirm}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Xác nhận kích hoạt"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// MembershipDetails (phải)
// ============================================================
function MembershipDetails({
  membership,
  currentPackage,
  onToggleAutoRenew,
  onToggleEmailReminder,
}: {
  membership: UserMembership;
  currentPackage?: CreditPackage;
  onToggleAutoRenew: () => void;
  onToggleEmailReminder: () => void;
}) {
  const isFree = membership.tier === "FREE";
  const isTrial = Boolean(currentPackage?.is_trial);
  const disableAutoRenew = isFree || isTrial;

  return (
    <Card className="h-full flex flex-col justify-between">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          Thông tin và cài đặt gói
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-0 flex-1 flex flex-col justify-between">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">Bắt đầu</p>
            <div className="flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-sm font-semibold">{isFree ? "Từ lúc tạo tài khoản" : formatDate(membership.startedAt)}</span>
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">Hết hạn</p>
            <div className="flex items-center gap-1.5">
              <CalendarCheck2 className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-sm font-semibold">{isFree ? "Vĩnh viễn" : formatDate(membership.expiresAt)}</span>
            </div>
          </div>
        </div>

        <div className="border-t" />

        <div className="space-y-3">
          {/* Toggle: Nhắc mail */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-start gap-2 flex-1 min-w-0">
              <Bell className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-medium leading-tight">Nhắc nhở qua email</p>
                <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">Gửi mail 3 ngày trước khi hết hạn</p>
              </div>
            </div>
            <Switch checked={membership.emailReminder} onCheckedChange={onToggleEmailReminder} disabled={isFree} className="shrink-0" />
          </div>

          {/* Toggle: Tự động gia hạn */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-start gap-2 flex-1 min-w-0">
              <RefreshCw className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-medium leading-tight">Tự động gia hạn</p>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[220px] text-xs">
                      {isTrial
                        ? "Gói dùng thử không áp dụng tính năng tự động gia hạn."
                        : isFree
                          ? "Chỉ áp dụng khi bạn đang sử dụng gói hội viên trả phí."
                          : "Hệ thống tự động gia hạn gói đang dùng bằng số dư Ví LexiCore khi đến hạn. Nếu không đủ số dư, gói sẽ về Free."}
                    </TooltipContent>
                  </Tooltip>
                </div>
                <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">Trừ từ Ví LexiCore khi đến hạn</p>
              </div>
            </div>
            <Switch checked={membership.autoRenew} onCheckedChange={onToggleAutoRenew} disabled={disableAutoRenew} className="shrink-0" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================
// TransactionTable
// ============================================================
function TransactionTable({
  transactions,
  customerInfo,
  onCancel,
}: {
  transactions: Transaction[];
  customerInfo?: { name?: string; email?: string };
  onCancel: (orderId: string) => Promise<void>;
}) {
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const handleDownload = async (txn: Transaction) => {
    setDownloadingId(txn.id);
    try {
      await downloadInvoiceWithFallback(
        {
          id: txn.id,
          date: txn.date,
          description: txn.description,
          amountVnd: txn.amountVnd,
          status: txn.status,
        },
        customerInfo
      );
    } finally {
      setDownloadingId(null);
    }
  };

  const handleCancel = async (txn: Transaction) => {
    if (cancellingId) return;
    setCancellingId(txn.orderId);
    try {
      await onCancel(txn.orderId);
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary"><CreditCard className="h-4 w-4" /></div>
            <div>
              <CardTitle className="text-base">Lịch sử giao dịch</CardTitle>
              <CardDescription className="text-xs mt-0.5">Toàn bộ lịch sử thanh toán & nạp tiền</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />Thanh toán an toàn SSL 256-bit
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="rounded-xl border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold text-xs">Mã đơn</TableHead>
                <TableHead className="font-semibold text-xs">Thời gian</TableHead>
                <TableHead className="font-semibold text-xs">Nội dung</TableHead>
                <TableHead className="font-semibold text-xs text-right">Số tiền</TableHead>
                <TableHead className="font-semibold text-xs text-center">Trạng thái</TableHead>
                <TableHead className="font-semibold text-xs text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((txn) => (
                <TableRow key={txn.orderId} className="hover:bg-muted/40">
                  <TableCell className="font-mono text-xs font-semibold text-muted-foreground">#{txn.id}</TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{txn.date}</TableCell>
                  <TableCell className="text-xs font-medium">{txn.description}</TableCell>
                  <TableCell className="text-xs font-bold text-right whitespace-nowrap">{formatVND(txn.amountVnd)}</TableCell>
                  <TableCell className="text-center"><StatusBadge status={txn.status} /></TableCell>
                  <TableCell className="text-right">
                    {txn.status === "PENDING" ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCancel(txn)}
                        disabled={cancellingId === txn.orderId}
                        className="h-7 px-2 text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
                      >
                        {cancellingId === txn.orderId ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <><X className="h-3.5 w-3.5 mr-1" />Huỷ</>
                        )}
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownload(txn)}
                        disabled={txn.status !== "SUCCESS" || downloadingId === txn.id}
                        className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                      >
                        {downloadingId === txn.id ? (
                          <><Loader2 className="h-3.5 w-3.5 mr-1 animate-spin text-primary" />Đang xuất...</>
                        ) : (
                          <><Download className="h-3.5 w-3.5 mr-1" />Tải</>
                        )}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <p className="text-[11px] text-muted-foreground mt-3 flex items-start gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
          Hoá đơn điện tử chính thức định dạng <code className="font-mono bg-muted px-1 rounded font-semibold text-foreground">.pdf</code> (có hỗ trợ tự động sao lưu <code className="font-mono bg-muted px-1 rounded">.txt</code> khi thiết bị không hỗ trợ).
        </p>
      </CardContent>
    </Card>
  );
}

// ============================================================
// Main View
// ============================================================
export function SubscriptionView() {
  const cachedTier = (typeof window !== "undefined"
    ? (localStorage.getItem("lexicore_user_tier") as Tier | null)
    : null) || "FREE";

  const [membership, setMembership] = useState<UserMembership>({
    tier: cachedTier,
    startedAt: null,
    expiresAt: null,
    autoRenew: false,
    emailReminder: true,
    coinBalance: 0,
    diamondBalance: 0,
    walletBalanceVnd: 0,
    hasUsedTrial: false,
  });
  const [packages, setPackages] = useState<GroupedPackages>(MOCK_DATA);
  const [selectedSubId, setSelectedSubId] = useState<string>("");
  const [activeTopupId, setActiveTopupId] = useState<string | null>(null);
  const [packLoading, setPackLoading] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [customerInfo, setCustomerInfo] = useState<{ name?: string; email?: string }>({});
  const [loading, setLoading] = useState(true);

  // Lấy thông tin user để hiển thị trên hóa đơn PDF (dùng fetch an toàn, không phụ thuộc httpClient)
  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: any) => {
        if (data) {
          setCustomerInfo({
            name: data.full_name || data.name || data.username,
            email: data.email,
          });
        }
      })
      .catch(() => { });
  }, []);

  // State cho SubscriptionModal (Xem tất cả các gói & bảng giá)
  const [modalOpen, setModalOpen] = useState(false);
  const [modalPackageId, setModalPackageId] = useState<string | undefined>(undefined);
  const [modalTab, setModalTab] = useState<"subscription" | "info">("subscription");
  const [modalInfoSection, setModalInfoSection] = useState<"comparison" | null>(null);

  // State cho QRModal (Thanh toán đơn hàng SePay VietQR / Ví LexiCore)
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrModalPkg, setQrModalPkg] = useState<CreditPackage | null>(null);
  const [qrUpgradeInfo, setQrUpgradeInfo] = useState<SubscriptionActionInfo | null>(null);
  const [qrFromSubModal, setQrFromSubModal] = useState(false);

  // State cho WalletTopupModal (Nạp tiền Ví LexiCore)
  const [walletTopupOpen, setWalletTopupOpen] = useState(false);

  const handleOpenQRModal = (pkg: CreditPackage, fromSubModal = false) => {
    const actionInfo = getSubscriptionActionInfo(membership, pkg, packages.subscription);
    setQrUpgradeInfo(actionInfo);
    setQrModalPkg(pkg);
    setQrFromSubModal(fromSubModal);
    if (fromSubModal) {
      setModalOpen(false); // Tạm ẩn SubscriptionModal để tránh modal chồng modal
    }
    setQrModalOpen(true);
  };

  const handleProceedWalletTopup = (amountVnd: number) => {
    const topupPkg: CreditPackage = {
      id: "pkg_wallet_topup",
      name: "Nạp tiền Ví LexiCore",
      slug: "wallet-topup",
      package_type: "BUNDLE",
      tier: null,
      price_vnd: amountVnd,
      price_usd: 0,
      coin_amount: 0,
      diamond_amount: 0,
      duration_days: null,
      sale_percent: 0,
      sale_ends_at: null,
      features: ["Nạp tiền vào số dư Ví LexiCore"],
      display_order: 999,
    };
    handleOpenQRModal(topupPkg, false);
  };

  const handleCloseModal = useCallback(() => setModalOpen(false), []);

  // ── Fetch dữ liệu ──────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    try {
      const [subData, pkgData, txData] = await Promise.all([
        apiFetch<{
          tier: string;
          packageId?: string | null;
          durationDays?: number | null;
          startedAt: string | null;
          expiresAt: string | null;
          autoRenew: boolean;
          emailReminder: boolean;
          coinBalance: number;
          diamondBalance: number;
          walletBalanceVnd: number;
          hasUsedTrial?: boolean;
        }>("/my-subscription"),
        apiFetch<GroupedPackages>("/packages"),
        apiFetch<Transaction[]>("/my-transactions"),
      ]);

      const realTier = (subData.tier ?? "FREE") as Tier;

      setMembership({
        tier: realTier,
        packageId: subData.packageId ?? null,
        durationDays: subData.durationDays ?? null,
        startedAt: subData.startedAt,
        expiresAt: subData.expiresAt,
        autoRenew: subData.autoRenew,
        emailReminder: subData.emailReminder,
        coinBalance: subData.coinBalance,
        diamondBalance: subData.diamondBalance,
        walletBalanceVnd: subData.walletBalanceVnd,
        hasUsedTrial: Boolean(subData.hasUsedTrial),
      });

      // Đồng bộ tier lên sidebar và toàn bộ ứng dụng CHỈ KHI có dữ liệu thật từ backend
      window.dispatchEvent(
        new CustomEvent("membership-tier-change", {
          detail: { tier: realTier === "FREE" ? null : realTier },
        })
      );

      setPackages(pkgData);
      // Backend trả về mảng transactions có thể thiếu orderId riêng, đảm bảo luôn có
      setTransactions((txData as any[]).map((t) => ({
        ...t,
        orderId: t.orderId ?? t.id,
      })));

      // Chọn mặc định card subscription đầu tiên nếu chưa chọn
      if (pkgData.subscription.length > 0 && !selectedSubId) {
        setSelectedSubId(pkgData.subscription[0].id);
      }
    } catch (err) {
      console.error("[SubscriptionView] Fetch error:", err);
      toast.error("Không thể tải dữ liệu. Vui lòng thử lại sau.");
    } finally {
      setLoading(false);
    }
  }, [selectedSubId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Huỷ đơn PENDING do user chủ động yêu cầu
  const handleCancelOrder = useCallback(async (orderId: string) => {
    try {
      await apiFetch(`/order/${orderId}`, { method: "DELETE" });
      toast.success("Đã huỷ đơn hàng thành công.");
      // Xoá hẳn dòng đó khỏi bảng lịch sử giao dịch để giao diện gọn gàng
      setTransactions((prev) => prev.filter((t) => t.orderId !== orderId));
    } catch (err: any) {
      toast.error(err?.message ?? "Không thể huỷ đơn, vui lòng thử lại.");
    }
  }, []);

  const isFree = membership.tier === "FREE";
  const cfg = TIER_CFG[membership.tier];

  // Gói đang sử dụng hiện tại
  const currentPackage = useMemo(() => {
    if (!membership.packageId) return undefined;
    return packages.subscription.find((p) => p.id === membership.packageId);
  }, [packages.subscription, membership.packageId]);

  const [autoRenewModalOpen, setAutoRenewModalOpen] = useState(false);
  const [autoRenewLoading, setAutoRenewLoading] = useState(false);

  const handleToggleAutoRenew = () => {
    // Nếu đang BẬT -> bấm để TẮT trực tiếp
    if (membership.autoRenew) {
      setMembership((m) => ({ ...m, autoRenew: false }));
      apiFetch("/my-subscription", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ auto_renew: false }),
      })
        .then(() => {
          toast.success("Đã tắt tính năng tự động gia hạn.");
        })
        .catch(() => {
          setMembership((m) => ({ ...m, autoRenew: true }));
          toast.error("Không thể cập nhật cài đặt. Vui lòng thử lại.");
        });
      return;
    }

    // Nếu đang TẮT -> bấm để BẬT: kiểm tra điều kiện
    if (isFree || Boolean(currentPackage?.is_trial)) {
      toast.warning("Tính năng tự động gia hạn chỉ áp dụng cho các gói hội viên trả phí chính thức.");
      return;
    }

    // Mở modal xác nhận trước khi kích hoạt
    setAutoRenewModalOpen(true);
  };

  const handleConfirmAutoRenew = async () => {
    setAutoRenewLoading(true);
    try {
      await apiFetch("/my-subscription", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ auto_renew: true }),
      });
      setMembership((m) => ({ ...m, autoRenew: true }));
      toast.success("Đã kích hoạt tự động gia hạn thành công!", {
        description: `Gói ${currentPackage?.name || membership.tier} sẽ được tự động gia hạn bằng Ví LexiCore khi đến hạn.`,
      });
      setAutoRenewModalOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Lỗi không xác định";
      toast.error(msg);
    } finally {
      setAutoRenewLoading(false);
    }
  };

  const handleToggleEmailReminder = async () => {
    const next = !membership.emailReminder;
    setMembership((m) => ({ ...m, emailReminder: next }));
    try {
      await apiFetch("/my-subscription", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email_reminder: next }),
      });
    } catch {
      setMembership((m) => ({ ...m, emailReminder: !next }));
      toast.error("Không thể cập nhật cài đặt. Vui lòng thử lại.");
    }
  };

  // Mua gói subscription (Campaign / Trial: kích hoạt trực tiếp; trả phí: mở modal thanh toán thật)
  const handleBuySub = async (pkg: CreditPackage) => {
    // 1. Gói sự kiện quà tặng từ chiến dịch của Admin
    if (pkg.campaign_id) {
      const currentRank = TIER_RANKS[membership.tier?.toUpperCase()] ?? 0;
      const targetRank = TIER_RANKS[pkg.tier?.toUpperCase()] ?? 1;
      if (currentRank > targetRank) {
        toast.error(`Bạn đang sử dụng gói ${membership.tier} cao hơn gói sự kiện (${pkg.tier}). Đặc quyền đã bao gồm trong tài khoản.`);
        return;
      }
      setPackLoading(pkg.id);
      try {
        await apiFetch("/campaign/claim", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ campaignId: pkg.campaign_id }),
        });
        toast.success(`Nhận quà sự kiện "${pkg.name}" thành công!`, {
          description: `Bạn có ${pkg.duration_days} ngày trải nghiệm đầy đủ đặc quyền gói ${pkg.tier}.`,
        });
        fetchAll();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Lỗi không xác định";
        toast.error(msg);
      } finally {
        setPackLoading(null);
      }
      return;
    }

    // 2. Gói dùng thử Pro 3 ngày mặc định (chào mừng)
    if (pkg.is_trial) {
      if (membership.tier !== "FREE") {
        toast.error(`Bạn đang sử dụng gói hội viên ${membership.tier}. Gói dùng thử chỉ áp dụng cho tài khoản Miễn phí.`);
        return;
      }
      setPackLoading(pkg.id);
      try {
        await apiFetch("/trial/activate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ packageId: pkg.id }),
        });
        toast.success("Kích hoạt gói dùng thử thành công!", {
          description: "Bạn có 3 ngày trải nghiệm đầy đủ tính năng Pro.",
        });
        fetchAll();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Lỗi không xác định";
        toast.error(msg);
      } finally {
        setPackLoading(null);
      }
      return;
    }

    // 3. Gói trả phí: Mở QRModal thanh toán SePay VietQR trực tiếp
    handleOpenQRModal(pkg, false);
  };

  // Mua gói Coin hoặc Diamond (Mở QRModal thanh toán SePay VietQR trực tiếp)
  const handleBuyPack = async (pkg: CreditPackage) => {
    handleOpenQRModal(pkg, false);
  };

  // Lọc chỉ 3 gói tháng đại diện (Starter, Pro, Elite chu kỳ 30 ngày)
  // và gói Trial ở vị trí đầu tiên (nếu có trial và user chưa dùng trial) -> hiển thị 3 hoặc 4 card
  const featuredSubs = useMemo(() => {
    const subs = packages.subscription;
    const list: CreditPackage[] = [];

    // 1. Gói Trial ở vị trí đầu tiên nếu có VÀ user là FREE chưa dùng trial (hoặc gói campaign của admin)
    const trialPkg = subs.find((p) => p.is_trial);
    if (trialPkg) {
      const canShowTrial = trialPkg.campaign_id ? true : (!membership.hasUsedTrial && membership.tier === "FREE");
      if (canShowTrial) {
        list.push(trialPkg);
      }
    }

    // 2. 3 gói tháng đại diện: Starter, Pro, Elite (chu kỳ 30 ngày)
    const tiers: ("STARTER" | "PRO" | "ELITE")[] = ["STARTER", "PRO", "ELITE"];
    tiers.forEach((t) => {
      const monthly = subs.find(
        (p) => !p.is_trial && p.tier === t && (p.duration_days === 30 || !p.duration_days)
      );
      if (monthly) {
        list.push(monthly);
      } else {
        const anyTierPkg = subs.find((p) => !p.is_trial && p.tier === t);
        if (anyTierPkg) list.push(anyTierPkg);
      }
    });

    return list;
  }, [packages.subscription, membership.hasUsedTrial]);

  // Tự động chọn gói hợp lệ trong featuredSubs nếu selectedSubId chưa có hoặc không nằm trong featuredSubs
  useEffect(() => {
    if (featuredSubs.length > 0) {
      const exists = featuredSubs.some((p) => p.id === selectedSubId);
      if (!exists) {
        const proPkg = featuredSubs.find((p) => p.tier === "PRO" && !p.is_trial);
        setSelectedSubId(proPkg ? proPkg.id : featuredSubs[0].id);
      }
    }
  }, [featuredSubs, selectedSubId]);

  return (
    <TooltipProvider>
      <div className="space-y-8 max-w-5xl mx-auto">
        {loading && (
          <div className="flex items-center justify-center py-20 text-sm text-muted-foreground gap-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            Đang tải dữ liệu...
          </div>
        )}
        {!loading && (<>

          {/* ===== SECTION 1: Trạng thái hội viên ===== */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
            <MembershipCard
              membership={membership}
              onTopup={() => setWalletTopupOpen(true)}
            />
            <MembershipDetails
              membership={membership}
              currentPackage={currentPackage}
              onToggleAutoRenew={handleToggleAutoRenew}
              onToggleEmailReminder={handleToggleEmailReminder}
            />
          </div>

          {/* ===== SECTION 2: Gói Hội viên - Căn đều 3 hoặc 4 thẻ đại diện ===== */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Crown className="h-4 w-4 text-amber-500" />
                <h2 className="text-sm font-semibold">Gói Hội viên</h2>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-muted-foreground hidden md:inline mr-1">
                  Bấm vào thẻ để chọn hoặc lật thẻ xem quyền lợi
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-7 px-2.5 font-medium text-muted-foreground hover:text-foreground gap-1"
                  onClick={() => {
                    setModalPackageId(selectedSubId);
                    setModalTab("info");
                    setModalInfoSection("comparison");
                    setModalOpen(true);
                  }}
                >
                  <Info className="h-3.5 w-3.5" />
                  So sánh quyền lợi
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-7 px-2.5 font-medium"
                  onClick={() => {
                    setModalPackageId(selectedSubId);
                    setModalTab("subscription");
                    setModalInfoSection(null);
                    setModalOpen(true);
                  }}
                >
                  Xem tất cả các gói
                </Button>
              </div>
            </div>

            {/* Hiển thị 3 card (căn đều 3 cột) hoặc 4 card (căn đều 4 cột) cân xứng */}
            <div
              className={`w-full pt-6 pb-2 ${featuredSubs.length === 3
                ? "grid grid-cols-1 md:grid-cols-3 gap-6"
                : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5"
                }`}
            >
              {featuredSubs.map((pkg) => (
                <SubscriptionFlipCard
                  key={pkg.id}
                  pkg={pkg}
                  selected={selectedSubId === pkg.id}
                  onSelect={() => setSelectedSubId(pkg.id)}
                  onBuy={handleBuySub}
                  onOpenComparison={() => {
                    setModalPackageId(pkg.id);
                    setModalTab("info");
                    setModalInfoSection("comparison");
                    setModalOpen(true);
                  }}
                  widthClass="w-full"
                />
              ))}
            </div>

            {/* CTA bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-muted/40 rounded-xl border mt-2">
              <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-start">
                <Wallet className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-xs text-muted-foreground">
                  Số dư Ví: <span className="font-bold text-foreground">{formatVND(membership.walletBalanceVnd)}</span>
                </span>
                <span className="text-xs text-muted-foreground mx-1">|</span>
                <span className="text-xs text-muted-foreground">Thanh toán 1 lần hoặc dùng Ví LexiCore</span>
              </div>
              <div className="flex gap-2">
                {(() => {
                  const sub = packages.subscription.find((p) => p.id === selectedSubId);
                  const isSubLoading = packLoading === sub?.id;
                  if (!sub) {
                    return (
                      <Button size="sm" className="h-9 px-5 text-xs font-bold rounded-xl" disabled>
                        Chọn gói
                      </Button>
                    );
                  }

                  const action = getSubscriptionActionInfo(membership, sub, packages.subscription);

                  const btnColor = action.disabled
                    ? "bg-muted text-muted-foreground border border-border cursor-not-allowed hover:bg-muted"
                    : action.type === "UPGRADE"
                      ? "bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600 hover:from-amber-600 hover:via-rose-600 hover:to-purple-700 text-white shadow-amber-500/25"
                      : sub.tier === "ELITE"
                        ? "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-amber-500/25"
                        : sub.tier === "PRO"
                          ? "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-blue-500/25"
                          : sub.is_trial && !sub.campaign_id
                            ? "bg-gradient-to-r from-blue-400 to-blue-500 hover:from-blue-500 hover:to-blue-600 text-white shadow-blue-400/25"
                            : "bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-emerald-500/25";

                  return (
                    <Button
                      size="sm"
                      className={`h-9 px-5 text-xs font-bold transition-all shadow-md rounded-xl border-none gap-1.5 ${btnColor}`}
                      disabled={action.disabled || isSubLoading}
                      onClick={() => {
                        if (sub && !action.disabled) handleBuySub(sub);
                      }}
                    >
                      {isSubLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : action.disabled ? (
                        action.buttonText
                      ) : action.type === "UPGRADE" ? (
                        <>
                          <CircleChevronUp className="h-4 w-4" />
                          {action.buttonText}
                        </>
                      ) : sub.campaign_id ? (
                        <>
                          <Gift className="h-4 w-4" />
                          {action.buttonText}
                        </>
                      ) : sub.is_trial ? (
                        <>
                          <Gift className="h-4 w-4" />
                          {action.buttonText}
                        </>
                      ) : (
                        <>
                          {sub.tier === "ELITE" && <Crown className="h-4 w-4" />}
                          {sub.tier === "PRO" && <Zap className="h-4 w-4" />}
                          {sub.tier === "STARTER" && <Star className="h-4 w-4" />}
                          {action.buttonText}
                        </>
                      )}
                    </Button>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* ===== SECTION 3: Nạp Coin ===== */}
          {packages.coin_packs.length > 0 && (
            <div id="topup-section" className="space-y-3">
              <div className="flex items-center gap-2">
                <CircleDollarSign className="h-4 w-4 text-emerald-600" />
                <h2 className="text-sm font-semibold">Nạp Coin</h2>
              </div>
              <div className="flex flex-wrap gap-3 pt-4 pb-1">
                {packages.coin_packs.map((pkg) => (
                  <TopupCard
                    key={pkg.id}
                    pkg={pkg}
                    icon={CircleDollarSign}
                    colorClass="text-emerald-600"
                    unit="Coin"
                    onBuy={handleBuyPack}
                    loading={packLoading}
                    selected={activeTopupId === pkg.id}
                    onSelect={() => setActiveTopupId(pkg.id)}
                    onMouseEnter={() => {
                      if (activeTopupId && activeTopupId !== pkg.id) {
                        setActiveTopupId(null);
                      }
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ===== SECTION 4: Nạp Diamond ===== */}
          {packages.diamond_packs.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Gem className="h-4 w-4 text-fuchsia-500" />
                <h2 className="text-sm font-semibold">Nạp Diamond</h2>
              </div>
              <div className="flex flex-wrap gap-3 pt-4 pb-1">
                {packages.diamond_packs.map((pkg) => (
                  <TopupCard
                    key={pkg.id}
                    pkg={pkg}
                    icon={Gem}
                    colorClass="text-fuchsia-500"
                    unit="Diamond"
                    onBuy={handleBuyPack}
                    loading={packLoading}
                    selected={activeTopupId === pkg.id}
                    onSelect={() => setActiveTopupId(pkg.id)}
                    onMouseEnter={() => {
                      if (activeTopupId && activeTopupId !== pkg.id) {
                        setActiveTopupId(null);
                      }
                    }}
                  />
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Coin & Diamond được cộng ngay vào ví sau khi thanh toán thành công.
              </p>
            </div>
          )}

          {/* ===== SECTION 5: Lịch sử giao dịch ===== */}
          <TransactionTable transactions={transactions} customerInfo={customerInfo} onCancel={handleCancelOrder} />

        </>)}
      </div>

      {/* Modal xem tất cả gói & bảng giá */}
      <SubscriptionModal
        open={modalOpen}
        onClose={handleCloseModal}
        initialPackageId={modalPackageId}
        initialTab={modalTab}
        initialInfoSection={modalInfoSection}
        hasUsedTrial={membership.hasUsedTrial}
        membership={membership}
        onBuyPackage={(pkg) => handleOpenQRModal(pkg, true)}
        onSuccess={fetchAll}
      />

      {/* Modal thanh toán SePay VietQR / Ví LexiCore */}
      <QRModal
        open={qrModalOpen}
        onClose={() => setQrModalOpen(false)}
        pkg={qrModalPkg}
        upgradeInfo={qrUpgradeInfo}
        walletBalance={membership.walletBalanceVnd}
        onSuccess={fetchAll}
        onBack={
          qrFromSubModal
            ? () => {
              setQrModalOpen(false);
              setModalOpen(true);
            }
            : undefined
        }
      />

      {/* Modal chọn số tiền nạp vào Ví LexiCore */}
      <WalletTopupModal
        open={walletTopupOpen}
        onClose={() => setWalletTopupOpen(false)}
        walletBalance={membership.walletBalanceVnd}
        todayTopupVnd={membership.todayTopupVnd ?? 0}
        onProceedToQR={handleProceedWalletTopup}
      />

      {/* Modal xác nhận tự động gia hạn */}
      <AutoRenewConfirmModal
        open={autoRenewModalOpen}
        onClose={() => setAutoRenewModalOpen(false)}
        onConfirm={handleConfirmAutoRenew}
        packageName={currentPackage?.name || `Gói ${membership.tier}`}
        priceVnd={currentPackage ? getFinalPrice(currentPackage) : 0}
        durationDays={currentPackage?.duration_days || membership.durationDays || 30}
        walletBalance={membership.walletBalanceVnd}
        expiresAt={membership.expiresAt}
        loading={autoRenewLoading}
      />
    </TooltipProvider>
  );
}
