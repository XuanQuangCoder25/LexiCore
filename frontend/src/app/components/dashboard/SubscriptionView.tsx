import { useState, useEffect } from "react";
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
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Switch } from "../ui/switch";
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
  SubscriptionFlipCard,
  TopupCard,
} from "../global/subscription-cards";
import { toast } from "sonner";

// ============================================================
// Types local
// ============================================================
type Tier = "FREE" | "STARTER" | "PRO" | "ELITE";

interface UserMembership {
  tier: Tier;
  startedAt: string | null;
  expiresAt: string | null;
  autoRenew: boolean;
  emailReminder: boolean;
  coinBalance: number;
  diamondBalance: number;
  walletBalanceVnd: number;    // Số dư ví LexiCore (VNĐ thật)
}

interface Transaction {
  id: string;
  date: string;
  description: string;
  amountVnd: number;
  status: "SUCCESS" | "PENDING" | "FAILED";
}

// ============================================================
// Mock data
// ============================================================
const MOCK_MEMBERSHIP: UserMembership = {
  tier: "ELITE",
  startedAt: "2026-10-06",
  expiresAt: new Date(Date.now() + 27 * 86400000 + 14 * 3600000).toISOString(),
  autoRenew: true,
  emailReminder: true,
  coinBalance: 3250,
  diamondBalance: 72,
  walletBalanceVnd: 350000,
};

const MOCK_TRANSACTIONS: Transaction[] = [
  { id: "TXN-20261006-001", date: "06/10/2026 14:32", description: "Gói Elite - 1 tháng", amountVnd: 159200, status: "SUCCESS" },
  { id: "TXN-20261006-002", date: "06/10/2026 14:28", description: "Nạp 60 Diamond", amountVnd: 89100, status: "SUCCESS" },
  { id: "TXN-20260906-001", date: "06/09/2026 09:15", description: "Gói Pro - 1 tháng", amountVnd: 99000, status: "SUCCESS" },
  { id: "TXN-20260820-001", date: "20/08/2026 21:40", description: "Nạp 2.000 Coin", amountVnd: 89000, status: "SUCCESS" },
  { id: "TXN-20260812-001", date: "12/08/2026 18:03", description: "Gói Starter - 1 tháng", amountVnd: 49000, status: "FAILED" },
];

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
      <RefreshCw className="w-3 h-3 animate-spin" />Đang xử lý
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
function MembershipCard({ membership }: { membership: UserMembership }) {
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
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                  isExpiringSoon
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
              className={`text-[10px] font-semibold px-2 py-0.5 ${
                isExpired
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
          <Button variant="outline" size="sm" className="h-6 text-[11px] px-2 shrink-0">Nạp</Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================
// MembershipDetails (phải)
// ============================================================
function MembershipDetails({
  membership,
  onToggleAutoRenew,
  onToggleEmailReminder,
}: {
  membership: UserMembership;
  onToggleAutoRenew: () => void;
  onToggleEmailReminder: () => void;
}) {
  const isFree = membership.tier === "FREE";
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
              <span className="text-sm font-semibold">{isFree ? "--" : formatDate(membership.startedAt)}</span>
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
                    <TooltipContent side="top" className="max-w-[200px] text-xs">
                      Hệ thống tự động gia hạn bằng số dư Ví LexiCore khi đến hạn.
                      Nếu không đủ số dư, gói sẽ về Free và bạn sẽ nhận email thông báo.
                    </TooltipContent>
                  </Tooltip>
                </div>
                <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">Trừ từ Ví LexiCore khi đến hạn</p>
              </div>
            </div>
            <Switch checked={membership.autoRenew} onCheckedChange={onToggleAutoRenew} disabled={isFree} className="shrink-0" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================
// TransactionTable
// ============================================================
function TransactionTable({ transactions }: { transactions: Transaction[] }) {
  const handleDownload = (txn: Transaction) => {
    const content = [
      `HÓA ĐƠN LEXICORE`,
      `------------------`,
      `Mã đơn:     ${txn.id}`,
      `Ngày:       ${txn.date}`,
      `Nội dung:   ${txn.description}`,
      `Số tiền:    ${formatVND(txn.amountVnd)}`,
      `Trạng thái: ${txn.status === "SUCCESS" ? "Thành công" : txn.status === "PENDING" ? "Đang xử lý" : "Thất bại"}`,
      ``,
      `Cảm ơn bạn đã sử dụng LexiCore!`,
    ].join("\n");
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `HoaDon_${txn.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary"><CreditCard className="h-4 w-4" /></div>
            <div>
              <CardTitle className="text-base">Lịch sử giao dịch</CardTitle>
              <CardDescription className="text-xs mt-0.5">Toàn bộ lịch sử thanh toán & nạp tiền tệ</CardDescription>
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
                <TableHead className="font-semibold text-xs text-right">Hoá đơn</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((txn) => (
                <TableRow key={txn.id} className="hover:bg-muted/40">
                  <TableCell className="font-mono text-xs font-semibold text-muted-foreground">#{txn.id}</TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{txn.date}</TableCell>
                  <TableCell className="text-xs font-medium">{txn.description}</TableCell>
                  <TableCell className="text-xs font-bold text-right whitespace-nowrap">{formatVND(txn.amountVnd)}</TableCell>
                  <TableCell className="text-center"><StatusBadge status={txn.status} /></TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => handleDownload(txn)}
                      disabled={txn.status !== "SUCCESS"}
                      className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground">
                      <Download className="h-3.5 w-3.5 mr-1" />Tải
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <p className="text-[11px] text-muted-foreground mt-3 flex items-start gap-1.5">
          <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          Hóa đơn beta dạng <code className="font-mono bg-muted px-1 rounded">.txt</code>.
          Hóa đơn VAT PDF sẽ hỗ trợ trong phiên bản chính thức.
        </p>
      </CardContent>
    </Card>
  );
}

// ============================================================
// Main View
// ============================================================
export function SubscriptionView() {
  const [membership, setMembership] = useState<UserMembership>(MOCK_MEMBERSHIP);
  const [packages, setPackages] = useState<GroupedPackages>(MOCK_DATA);
  const [selectedSubId, setSelectedSubId] = useState<string>("sub-elite");
  const [packLoading, setPackLoading] = useState<string | null>(null);
  const [transactions] = useState<Transaction[]>(MOCK_TRANSACTIONS);

  const isFree = membership.tier === "FREE";
  const cfg = TIER_CFG[membership.tier];

  const handleToggleAutoRenew = () => setMembership((m) => ({ ...m, autoRenew: !m.autoRenew }));
  const handleToggleEmailReminder = () => setMembership((m) => ({ ...m, emailReminder: !m.emailReminder }));

  // Mua gói subscription
  const handleBuySub = async (pkg: CreditPackage) => {
    // TODO: hien Checkout modal (se implement sau)
    toast.info(`Chọn gói: ${pkg.name}`, {
      description: pkg.is_trial ? "Đang kích hoạt dùng thử..." : `${formatVND(getFinalPrice(pkg))}/tháng`,
    });
  };

  // Mua topup pack
  const handleBuyPack = async (pkg: CreditPackage) => {
    setPackLoading(pkg.id);
    // TODO: hiện Checkout modal
    setTimeout(() => {
      toast.success(`Chọn gói: ${pkg.name}`, { description: `${formatVND(getFinalPrice(pkg))}` });
      setPackLoading(null);
    }, 600);
  };

  return (
    <TooltipProvider>
      <div className="space-y-8 max-w-5xl mx-auto">

        {/* ===== SECTION 1: Trạng thái hội viên ===== */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
          <MembershipCard membership={membership} />
          <MembershipDetails
            membership={membership}
            onToggleAutoRenew={handleToggleAutoRenew}
            onToggleEmailReminder={handleToggleEmailReminder}
          />
        </div>

        {/* ===== SECTION 2: Gói Hội viên - 4 card inline ===== */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Crown className="h-4 w-4 text-amber-500" />
              <h2 className="text-sm font-semibold">Gói Hội viên</h2>
            </div>
            <span className="text-xs text-muted-foreground">Bấm vào card để chọn - Lật thẻ xem quyền lợi</span>
          </div>

          {/* 4 cards: Trial + Starter + Pro + Elite - dàn ngang không scroll */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 pt-6 pb-2">
            {packages.subscription.map((pkg) => (
              <SubscriptionFlipCard
                key={pkg.id}
                pkg={pkg}
                selected={selectedSubId === pkg.id}
                onSelect={() => setSelectedSubId(pkg.id)}
                onBuy={handleBuySub}
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
              <Button
                variant="outline"
                size="sm"
                className="text-xs gap-1.5 font-medium"
                onClick={() => {
                  const sub = packages.subscription.find((p) => p.id === selectedSubId);
                  if (sub) handleBuySub(sub);
                }}
              >
                {(() => {
                  const sub = packages.subscription.find((p) => p.id === selectedSubId);
                  if (!sub) return "Chọn gói";
                  if (sub.is_trial) return <><Zap className="h-3.5 w-3.5" />Dùng thử miễn phí</>;
                  const TierIcon = sub.tier === "ELITE" ? Crown : sub.tier === "PRO" ? Zap : Star;
                  return <><TierIcon className="h-3.5 w-3.5" />Đăng ký {sub.name} ({formatVND(getFinalPrice(sub))})</>;
                })()}
              </Button>
            </div>
          </div>
        </div>

        {/* ===== SECTION 3: Nạp Coin ===== */}
        {packages.coin_packs.length > 0 && (
          <div className="space-y-3">
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
                />
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Coin & Diamond được cộng ngay vào ví sau khi thanh toán thành công.
            </p>
          </div>
        )}

        {/* ===== SECTION 5: Lịch sử giao dịch ===== */}
        <TransactionTable transactions={transactions} />

      </div>
    </TooltipProvider>
  );
}
