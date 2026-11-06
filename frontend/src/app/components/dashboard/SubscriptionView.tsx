import { useState } from "react";
import {
  Crown,
  Zap,
  Star,
  CircleDollarSign,
  Gem,
  Gift,
  CreditCard,
  Download,
  ShieldCheck,
  Bell,
  RefreshCw,
  CalendarDays,
  CalendarCheck2,
  CheckCircle2,
  Info,
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
import { SubscriptionModal } from "../global/SubscriptionModal";

// ============================================================
// Types
// ============================================================
type Tier = "FREE" | "STARTER" | "PRO" | "ELITE";

interface UserMembership {
  tier: Tier;
  startedAt: string | null;   // ISO date string
  expiresAt: string | null;   // ISO date string
  autoRenew: boolean;
  emailReminder: boolean;
  coinBalance: number;
  diamondBalance: number;
}

interface Transaction {
  id: string;
  date: string;
  description: string;        // e.g. "Gói Elite – 1 tháng"
  amountVnd: number;          // số tiền thực tế sau giảm giá
  status: "SUCCESS" | "PENDING" | "FAILED";
}

// ============================================================
// Mock data (sẽ được thay bằng API)
// ============================================================
const MOCK_MEMBERSHIP: UserMembership = {
  tier: "ELITE",
  startedAt: "2026-10-06",
  expiresAt: "2026-12-06",
  autoRenew: true,
  emailReminder: true,
  coinBalance: 3250,
  diamondBalance: 72,
};

const MOCK_TRANSACTIONS: Transaction[] = [
  {
    id: "TXN-20261006-001",
    date: "06/10/2026 14:32",
    description: "Gói Elite – 1 tháng",
    amountVnd: 159200,
    status: "SUCCESS",
  },
  {
    id: "TXN-20261006-002",
    date: "06/10/2026 14:28",
    description: "Nạp 60 Diamond",
    amountVnd: 89100,
    status: "SUCCESS",
  },
  {
    id: "TXN-20260906-001",
    date: "06/09/2026 09:15",
    description: "Gói Pro – 1 tháng",
    amountVnd: 99000,
    status: "SUCCESS",
  },
  {
    id: "TXN-20260820-001",
    date: "20/08/2026 21:40",
    description: "Nạp 2.000 Coin",
    amountVnd: 89000,
    status: "SUCCESS",
  },
  {
    id: "TXN-20260812-001",
    date: "12/08/2026 18:03",
    description: "Gói Starter – 1 tháng",
    amountVnd: 49000,
    status: "FAILED",
  },
];

// ============================================================
// Helpers
// ============================================================
function formatVND(amount: number): string {
  return new Intl.NumberFormat("vi-VN").format(amount) + "₫";
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const diff = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / 86400000));
}

// ============================================================
// Tier config
// ============================================================
const TIER_CONFIG: Record<Tier, {
  label: string;
  color: string;              // text color
  badgeClass: string;
  borderClass: string;
  bgGradient: string;
  icon: typeof Crown;
}> = {
  FREE: {
    label: "Free",
    color: "text-muted-foreground",
    badgeClass: "bg-muted text-muted-foreground border-border",
    borderClass: "border-border",
    bgGradient: "",
    icon: Star,
  },
  STARTER: {
    label: "Starter",
    color: "text-emerald-600",
    badgeClass: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
    borderClass: "border-emerald-500/50",
    bgGradient: "from-emerald-500/[0.07] via-card to-card",
    icon: Star,
  },
  PRO: {
    label: "Pro",
    color: "text-blue-600",
    badgeClass: "bg-blue-500/10 text-blue-700 border-blue-500/20",
    borderClass: "border-blue-500/50",
    bgGradient: "from-blue-500/[0.07] via-card to-card",
    icon: Zap,
  },
  ELITE: {
    label: "Elite",
    color: "text-amber-500",
    badgeClass: "bg-amber-500/10 text-amber-700 border-amber-500/20",
    borderClass: "border-amber-500/60",
    bgGradient: "from-amber-500/[0.08] via-card to-card",
    icon: Crown,
  },
};

// ============================================================
// StatusBadge
// ============================================================
function StatusBadge({ status }: { status: Transaction["status"] }) {
  if (status === "SUCCESS") {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full">
        <CheckCircle2 className="w-3 h-3" /> Thành công
      </span>
    );
  }
  if (status === "PENDING") {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-full">
        <RefreshCw className="w-3 h-3 animate-spin" /> Đang xử lý
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 bg-rose-500/10 px-2 py-0.5 rounded-full">
      Thất bại
    </span>
  );
}

// ============================================================
// MembershipCard — phần trái: gói hiện tại
// ============================================================
function MembershipCard({ membership }: { membership: UserMembership }) {
  const cfg = TIER_CONFIG[membership.tier];
  const TierIcon = cfg.icon;
  const days = daysUntil(membership.expiresAt);
  const isFree = membership.tier === "FREE";

  return (
    <Card className={`relative overflow-hidden border-2 bg-gradient-to-b ${cfg.borderClass} ${cfg.bgGradient}`}>
      {/* Background glow decoration */}
      {!isFree && (
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full blur-3xl pointer-events-none opacity-30"
          style={{ background: membership.tier === "ELITE" ? "#f59e0b" : membership.tier === "PRO" ? "#3b82f6" : "#10b981" }}
        />
      )}

      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <div className={`p-2.5 rounded-xl shrink-0 ${
            isFree ? "bg-muted" :
            membership.tier === "ELITE" ? "bg-amber-500/15" :
            membership.tier === "PRO" ? "bg-blue-500/15" : "bg-emerald-500/15"
          }`}>
            <TierIcon className={`h-5 w-5 ${cfg.color}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="text-base">Gói Hội viên</CardTitle>
              <Badge variant="outline" className={`text-[10px] font-black px-2 py-0 tracking-wider ${cfg.badgeClass}`}>
                {cfg.label.toUpperCase()}
              </Badge>
              {!isFree && days !== null && days <= 7 && (
                <Badge variant="outline" className="text-[10px] font-semibold px-2 py-0 bg-rose-500/10 text-rose-600 border-rose-500/20">
                  Còn {days} ngày
                </Badge>
              )}
            </div>
            <CardDescription className="mt-0.5 text-xs">
              {isFree
                ? "Bạn đang sử dụng các tính năng cơ bản miễn phí"
                : `Hội viên ${cfg.label} · ${days !== null && days > 0 ? `Còn ${days} ngày` : "Đã hết hạn"}`}
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 pt-0">
        {/* Coin & Diamond balance */}
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

        {/* CTA */}
        {isFree && (
          <p className="text-xs text-muted-foreground">
            Nâng cấp để mở khóa AI Voice Recognition, Coin & Diamond hàng tháng và nhiều hơn nữa!
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================
// MembershipDetails — phần phải: thông tin gói & toggles
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
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          Thông tin gói
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        {/* Dates */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">Bắt đầu</p>
            <div className="flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-sm font-semibold">{isFree ? "—" : formatDate(membership.startedAt)}</span>
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

        {/* Toggle: Nhắc mail */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-start gap-2 flex-1 min-w-0">
            <Bell className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-medium leading-tight">Nhắc nhở qua email</p>
              <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                Gửi mail 3 ngày trước khi gói hết hạn
              </p>
            </div>
          </div>
          <Switch
            checked={membership.emailReminder}
            onCheckedChange={onToggleEmailReminder}
            disabled={isFree}
            className="shrink-0"
          />
        </div>

        {/* Toggle: Tự động gia hạn */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-start gap-2 flex-1 min-w-0">
            <RefreshCw className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-medium leading-tight">Tự động gia hạn</p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[200px] text-xs">
                      Hệ thống sẽ tự động gia hạn gói của bạn khi đến hạn bằng số dư ví LexiCore.
                      Bạn cần nạp sẵn số dư tương đương giá gói.
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                Trừ từ số dư ví khi đến hạn
              </p>
            </div>
          </div>
          <Switch
            checked={membership.autoRenew}
            onCheckedChange={onToggleAutoRenew}
            disabled={isFree}
            className="shrink-0"
          />
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================
// TransactionTable — lịch sử giao dịch
// ============================================================
function TransactionTable({ transactions }: { transactions: Transaction[] }) {
  const handleDownload = (txn: Transaction) => {
    // TODO: gọi API tải hoá đơn PDF
    // Tạm thời mock bằng link data URL
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
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <CreditCard className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-base">Lịch sử giao dịch</CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Toàn bộ lịch sử thanh toán & nạp tiền tệ
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            Thanh toán an toàn SSL 256-bit
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
                  <TableCell className="font-mono text-xs font-semibold text-muted-foreground">
                    #{txn.id}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {txn.date}
                  </TableCell>
                  <TableCell className="text-xs font-medium">
                    {txn.description}
                  </TableCell>
                  <TableCell className="text-xs font-bold text-right whitespace-nowrap">
                    {formatVND(txn.amountVnd)}
                  </TableCell>
                  <TableCell className="text-center">
                    <StatusBadge status={txn.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDownload(txn)}
                      disabled={txn.status !== "SUCCESS"}
                      className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                    >
                      <Download className="h-3.5 w-3.5 mr-1" />
                      Tải
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Disclaimer format hoá đơn */}
        <p className="text-[11px] text-muted-foreground mt-3 flex items-start gap-1.5">
          <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          Hóa đơn được tải về dưới dạng file <code className="font-mono bg-muted px-1 rounded">.txt</code> (giai đoạn beta).
          Hóa đơn VAT định dạng PDF sẽ được hỗ trợ trong phiên bản chính thức.
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
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [transactions] = useState<Transaction[]>(MOCK_TRANSACTIONS);
  const isFree = membership.tier === "FREE";
  const cfg = TIER_CONFIG[membership.tier];

  const handleToggleAutoRenew = () => {
    setMembership((m) => ({ ...m, autoRenew: !m.autoRenew }));
  };
  const handleToggleEmailReminder = () => {
    setMembership((m) => ({ ...m, emailReminder: !m.emailReminder }));
  };

  return (
    <TooltipProvider>
      <div className="space-y-6 max-w-5xl mx-auto">

        {/* ===== SECTION 1: HEADER — Card gói hiện tại + thông tin ===== */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
          <MembershipCard membership={membership} />
          <MembershipDetails
            membership={membership}
            onToggleAutoRenew={handleToggleAutoRenew}
            onToggleEmailReminder={handleToggleEmailReminder}
          />
        </div>

        {/* CTA nút — nằm giữa hai section */}
        <div className="flex items-center gap-3">
          {isFree ? (
            <Button
              onClick={() => setShowUpgradeModal(true)}
              className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold shadow-md shadow-amber-500/20 gap-2"
            >
              <Crown className="h-4 w-4" />
              Nâng cấp Hội viên
            </Button>
          ) : (
            <>
              <Button
                onClick={() => setShowUpgradeModal(true)}
                className={`font-semibold gap-2 ${
                  membership.tier === "ELITE"
                    ? "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-amber-500/20"
                    : membership.tier === "PRO"
                    ? "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-blue-500/20"
                    : "bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-emerald-500/20"
                } shadow-md`}
              >
                {cfg.icon && <cfg.icon className="h-4 w-4" />}
                Nâng cấp / Gia hạn
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowUpgradeModal(true)}
                className="gap-2 font-medium"
              >
                <Gift className="h-4 w-4 text-fuchsia-500" />
                Nạp Coin & Diamond
              </Button>
            </>
          )}
        </div>

        {/* ===== SECTION 2: PACKAGES — 2-tab card UI (tái sử dụng từ SubscriptionModal) ===== */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-foreground">Gói Hội viên & Nạp tiền tệ</h2>
            <Badge variant="secondary" className="text-[10px] font-medium">Chọn gói để nâng cấp</Badge>
          </div>

          {/* Embed SubscriptionModal content inline — dùng lại bằng cách mở modal khi click card */}
          <Card className="overflow-hidden border">
            <CardContent className="p-0">
              {/* Ta nhúng SubscriptionModal dưới dạng inline fragment bằng cách
                  render nội dung bên trong một div với chiều cao cố định, không có
                  dialog wrapper. Vì SubscriptionModal dùng Dialog nên ta sẽ chỉ
                  mở nó qua nút CTA bên trên — đây là placeholder cho thấy nội dung.
                  Trong production, ta sẽ trích xuất các component card thành
                  shared components để render ở cả modal lẫn trang này. */}
              <div className="p-6 flex flex-col items-center justify-center gap-3 py-10 text-center">
                <div className="p-4 rounded-2xl bg-muted">
                  <Crown className="h-8 w-8 text-amber-500" />
                </div>
                <div>
                  <p className="font-semibold text-sm">Xem tất cả gói Hội viên</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    So sánh Starter · Pro · Elite và các gói Nạp Coin & Diamond
                  </p>
                </div>
                <Button
                  onClick={() => setShowUpgradeModal(true)}
                  className="mt-1 gap-2 font-semibold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-md shadow-amber-500/20"
                >
                  <Crown className="h-4 w-4" />
                  Mở bảng gói & giá
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ===== SECTION 3: TRANSACTION HISTORY ===== */}
        <TransactionTable transactions={transactions} />

        {/* Upgrade Modal */}
        <SubscriptionModal
          open={showUpgradeModal}
          onClose={() => setShowUpgradeModal(false)}
        />
      </div>
    </TooltipProvider>
  );
}

