import React, { useState, useEffect, useRef } from "react";
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
  Mic,
  Brain,
  BarChart3,
  Users,
  CircleDollarSign,
  Gem,
  Sparkles,
  Gift,
  CreditCard,
  Star,
  Clock,
  Info,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
} from "lucide-react";

// ============================================================
// Types
// ============================================================
interface CreditPackage {
  id: string;
  name: string;
  slug: string;
  package_type: "SUBSCRIPTION" | "COIN_PACK" | "DIAMOND_PACK" | "BUNDLE";
  tier: "STARTER" | "PRO" | "ELITE" | null;
  price_vnd: number;
  price_usd: number;
  coin_amount: number;
  diamond_amount: number;
  duration_days: number | null;
  sale_percent: number;
  sale_ends_at: string | null;
  features: string[] | null;
  display_order: number;
}

interface GroupedPackages {
  subscription: CreditPackage[];
  coin_packs: CreditPackage[];
  diamond_packs: CreditPackage[];
  bundles: CreditPackage[];
}

interface PremiumModalProps {
  open: boolean;
  onClose: () => void;
}

// ============================================================
// Mock data
// ============================================================
const MOCK_DATA: GroupedPackages = {
  subscription: [
    {
      id: "sub-starter",
      name: "Starter",
      slug: "sub-starter-monthly",
      package_type: "SUBSCRIPTION",
      tier: "STARTER",
      price_vnd: 49000,
      price_usd: 1.99,
      coin_amount: 200,
      diamond_amount: 5,
      duration_days: 30,
      sale_percent: 0,
      sale_ends_at: null,
      display_order: 1,
      features: [
        "Không quảng cáo",
        "200 Coin/tháng",
        "5 Diamond/tháng",
        "Truy cập từ vựng Arena",
      ],
    },
    {
      id: "sub-pro",
      name: "Pro",
      slug: "sub-pro-monthly",
      package_type: "SUBSCRIPTION",
      tier: "PRO",
      price_vnd: 99000,
      price_usd: 3.99,
      coin_amount: 500,
      diamond_amount: 15,
      duration_days: 30,
      sale_percent: 0,
      sale_ends_at: null,
      display_order: 2,
      features: [
        "Tất cả tính năng Starter",
        "AI Voice Recognition",
        "Analytics chi tiết",
        "500 Coin/tháng",
        "15 Diamond/tháng",
        "Badge Pro độc quyền",
      ],
    },
    {
      id: "sub-elite",
      name: "Elite",
      slug: "sub-elite-monthly",
      package_type: "SUBSCRIPTION",
      tier: "ELITE",
      price_vnd: 199000,
      price_usd: 7.99,
      coin_amount: 1500,
      diamond_amount: 50,
      duration_days: 30,
      sale_percent: 20,
      sale_ends_at: new Date(
        Date.now() + 3 * 24 * 3600 * 1000
      ).toISOString(),
      display_order: 3,
      features: [
        "Tất cả tính năng Pro",
        "Unlimited AI feedback",
        "Priority support",
        "1500 Coin/tháng",
        "50 Diamond/tháng",
        "Elite frame + badge",
        "Early access tính năng mới",
      ],
    },
  ],
  coin_packs: [
    {
      id: "coin-xs",
      name: "Coin Mini",
      slug: "coin-xs",
      package_type: "COIN_PACK",
      tier: null,
      price_vnd: 9000,
      price_usd: 0.39,
      coin_amount: 100,
      diamond_amount: 0,
      duration_days: null,
      sale_percent: 0,
      sale_ends_at: null,
      display_order: 9,
      features: null,
    },
    {
      id: "coin-s",
      name: "Túi Coin Nhỏ",
      slug: "coin-small",
      package_type: "COIN_PACK",
      tier: null,
      price_vnd: 15000,
      price_usd: 0.59,
      coin_amount: 200,
      diamond_amount: 0,
      duration_days: null,
      sale_percent: 0,
      sale_ends_at: null,
      display_order: 10,
      features: null,
    },
    {
      id: "coin-m",
      name: "Túi Coin Vừa",
      slug: "coin-medium",
      package_type: "COIN_PACK",
      tier: null,
      price_vnd: 29000,
      price_usd: 1.19,
      coin_amount: 500,
      diamond_amount: 0,
      duration_days: null,
      sale_percent: 0,
      sale_ends_at: null,
      display_order: 11,
      features: null,
    },
    {
      id: "coin-l",
      name: "Túi Coin Lớn",
      slug: "coin-large",
      package_type: "COIN_PACK",
      tier: null,
      price_vnd: 49000,
      price_usd: 1.99,
      coin_amount: 1000,
      diamond_amount: 0,
      duration_days: null,
      sale_percent: 15,
      sale_ends_at: null,
      display_order: 12,
      features: null,
    },
    {
      id: "coin-xl",
      name: "Rương Coin",
      slug: "coin-xl",
      package_type: "COIN_PACK",
      tier: null,
      price_vnd: 89000,
      price_usd: 3.59,
      coin_amount: 2000,
      diamond_amount: 0,
      duration_days: null,
      sale_percent: 0,
      sale_ends_at: null,
      display_order: 13,
      features: null,
    },
    {
      id: "coin-xxl",
      name: "Kho Coin",
      slug: "coin-xxl",
      package_type: "COIN_PACK",
      tier: null,
      price_vnd: 149000,
      price_usd: 5.99,
      coin_amount: 4000,
      diamond_amount: 0,
      duration_days: null,
      sale_percent: 20,
      sale_ends_at: null,
      display_order: 14,
      features: null,
    },
  ],
  diamond_packs: [
    {
      id: "dia-xs",
      name: "Diamond Mini",
      slug: "diamond-xs",
      package_type: "DIAMOND_PACK",
      tier: null,
      price_vnd: 15000,
      price_usd: 0.59,
      coin_amount: 0,
      diamond_amount: 5,
      duration_days: null,
      sale_percent: 0,
      sale_ends_at: null,
      display_order: 19,
      features: null,
    },
    {
      id: "dia-s",
      name: "Hộp Diamond Nhỏ",
      slug: "diamond-small",
      package_type: "DIAMOND_PACK",
      tier: null,
      price_vnd: 25000,
      price_usd: 0.99,
      coin_amount: 0,
      diamond_amount: 10,
      duration_days: null,
      sale_percent: 0,
      sale_ends_at: null,
      display_order: 20,
      features: null,
    },
    {
      id: "dia-m",
      name: "Hộp Diamond Vừa",
      slug: "diamond-medium",
      package_type: "DIAMOND_PACK",
      tier: null,
      price_vnd: 59000,
      price_usd: 2.39,
      coin_amount: 0,
      diamond_amount: 30,
      duration_days: null,
      sale_percent: 0,
      sale_ends_at: null,
      display_order: 21,
      features: null,
    },
    {
      id: "dia-l",
      name: "Hộp Diamond Lớn",
      slug: "diamond-large",
      package_type: "DIAMOND_PACK",
      tier: null,
      price_vnd: 99000,
      price_usd: 3.99,
      coin_amount: 0,
      diamond_amount: 60,
      duration_days: null,
      sale_percent: 10,
      sale_ends_at: null,
      display_order: 22,
      features: null,
    },
    {
      id: "dia-xl",
      name: "Rương Diamond",
      slug: "diamond-xl",
      package_type: "DIAMOND_PACK",
      tier: null,
      price_vnd: 179000,
      price_usd: 7.19,
      coin_amount: 0,
      diamond_amount: 120,
      duration_days: null,
      sale_percent: 20,
      sale_ends_at: null,
      display_order: 23,
      features: null,
    },
    {
      id: "dia-xxl",
      name: "Kho Diamond",
      slug: "diamond-xxl",
      package_type: "DIAMOND_PACK",
      tier: null,
      price_vnd: 299000,
      price_usd: 11.99,
      coin_amount: 0,
      diamond_amount: 250,
      duration_days: null,
      sale_percent: 25,
      sale_ends_at: null,
      display_order: 24,
      features: null,
    },
  ],
  bundles: [],
};

// ============================================================
// Helpers
// ============================================================
function formatVND(amount: number): string {
  return new Intl.NumberFormat("vi-VN").format(amount) + "₫";
}

function getFinalPrice(pkg: CreditPackage): number {
  if (
    pkg.sale_percent > 0 &&
    pkg.sale_ends_at &&
    new Date(pkg.sale_ends_at) > new Date()
  ) {
    return Math.round(pkg.price_vnd * (1 - pkg.sale_percent / 100));
  }
  if (pkg.sale_percent > 0 && !pkg.sale_ends_at) {
    // Sale vô thời hạn
    return Math.round(pkg.price_vnd * (1 - pkg.sale_percent / 100));
  }
  return pkg.price_vnd;
}

// ============================================================
// Countdown
// ============================================================
function Countdown({ endsAt }: { endsAt: string }) {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    const calc = () => {
      const diff = new Date(endsAt).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft("Hết hạn");
        return;
      }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${h}g ${m}p ${s}s`);
    };
    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, [endsAt]);

  return (
    <span className="inline-flex items-center gap-1 text-xs text-orange-500 font-semibold">
      <Clock className="h-3 w-3" /> {timeLeft}
    </span>
  );
}

// ============================================================
// Flip Card (Subscription)
// 240×330px — same width as ArenaRankModal cards
// ============================================================
const TIER_FEATURES_MAP: Record<
  string,
  { icon: typeof Zap; label: string }[]
> = {
  STARTER: [
    { icon: Zap, label: "Không quảng cáo" },
    { icon: CircleDollarSign, label: "200 Coin / tháng" },
    { icon: Gem, label: "5 Diamond / tháng" },
    { icon: Brain, label: "Truy cập từ vựng Arena" },
  ],
  PRO: [
    { icon: Zap, label: "Không quảng cáo" },
    { icon: Mic, label: "AI Voice Recognition" },
    { icon: Brain, label: "Unlimited AI feedback" },
    { icon: BarChart3, label: "Analytics chi tiết" },
    { icon: CircleDollarSign, label: "500 Coin / tháng" },
    { icon: Gem, label: "15 Diamond / tháng" },
    { icon: Crown, label: "Badge Pro độc quyền" },
  ],
  ELITE: [
    { icon: Zap, label: "Không quảng cáo" },
    { icon: Mic, label: "AI Voice Recognition" },
    { icon: Brain, label: "Unlimited AI feedback" },
    { icon: BarChart3, label: "Analytics chi tiết" },
    { icon: Users, label: "Priority support" },
    { icon: CircleDollarSign, label: "1500 Coin / tháng" },
    { icon: Gem, label: "50 Diamond / tháng" },
    { icon: Crown, label: "Elite frame + badge" },
    { icon: Sparkles, label: "Early access" },
  ],
};

function SubscriptionFlipCard({
  pkg,
  selected,
  onSelect,
}: {
  pkg: CreditPackage;
  selected: boolean;
  onSelect: () => void;
}) {
  const [flipped, setFlipped] = useState(false);
  const isElite = pkg.tier === "ELITE";
  const isPro = pkg.tier === "PRO";
  const finalPrice = getFinalPrice(pkg);
  const hasSale =
    pkg.sale_percent > 0 &&
    pkg.sale_ends_at &&
    new Date(pkg.sale_ends_at) > new Date();
  const features = pkg.tier ? TIER_FEATURES_MAP[pkg.tier] ?? [] : [];

  // Màu chủ đạo cho 3 gói
  const tierColor = isElite
    ? "text-amber-500"
    : isPro
      ? "text-blue-500"
      : "text-emerald-500";

  const tierBg = isElite
    ? "bg-amber-500/15"
    : isPro
      ? "bg-blue-500/15"
      : "bg-emerald-500/15";

  const tierCheckBg = isElite
    ? "bg-amber-500"
    : isPro
      ? "bg-blue-500"
      : "bg-emerald-500";

  // Border & glow khi được chọn
  const tierBorderActive = isElite
    ? "border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.4)]"
    : isPro
      ? "border-blue-500 shadow-[0_0_18px_rgba(59,130,246,0.35)]"
      : "border-emerald-500 shadow-[0_0_18px_rgba(16,185,129,0.35)]";

  const tierBorderIdle =
    "border-border hover:border-muted-foreground";

  return (
    // Perspective wrapper — cùng kích thước card như ArenaRankModal (240px)
    <div
      className="w-[240px] min-w-[240px] shrink-0"
      style={{ perspective: "1000px", height: "330px" }}
    >
      <div
        className="relative w-full h-full transition-transform duration-500"
        style={{
          transformStyle: "preserve-3d",
          transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
        }}
      >
        {/* ===== FRONT FACE ===== */}
        <div
          onClick={onSelect}
          className={`absolute inset-0 rounded-2xl border-2 p-5 flex flex-col cursor-pointer transition-all duration-200
            ${selected ? tierBorderActive : tierBorderIdle}
            bg-card`}
          style={{ backfaceVisibility: "hidden" }}
        >
          {/* Selected checkmark */}
          {selected && (
            <div
              className={`absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center ${tierCheckBg}`}
            >
              <Check className="h-3 w-3 text-white" />
            </div>
          )}

          {/* Tier icon */}
          <div
            className={`w-11 h-11 rounded-2xl flex items-center justify-center mb-3 mt-1 ${tierBg}`}
          >
            {isElite ? (
              <Crown className="h-6 w-6 text-amber-500" />
            ) : isPro ? (
              <Zap className="h-6 w-6 text-blue-500" />
            ) : (
              <Star className="h-6 w-6 text-emerald-500" />
            )}
          </div>

          {/* Name - màu đồng bộ với màu chủ đạo của gói */}
          <p className={`font-black text-xl mb-1 ${tierColor}`}>{pkg.name}</p>

          {/* Price */}
          <div className="flex flex-col mb-2">
            {hasSale && (
              <span className="text-xs text-muted-foreground line-through">
                {formatVND(pkg.price_vnd)}
              </span>
            )}
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-extrabold tracking-tight">
                {formatVND(finalPrice)}
              </span>
              <span className="text-xs text-muted-foreground font-medium">/tháng</span>
            </div>
          </div>

          {/* Sale countdown */}
          {hasSale && pkg.sale_ends_at && (
            <div className="mb-2">
              <Countdown endsAt={pkg.sale_ends_at} />
            </div>
          )}

          {/* Spacer */}
          <div className="flex-1" />

          {/* Detail button — lật thẻ xem quyền lợi */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setFlipped(true);
            }}
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border border-border bg-muted/50 hover:bg-muted text-xs font-medium text-muted-foreground hover:text-foreground transition-all"
          >
            <Info className="h-3.5 w-3.5" />
            Chi tiết
          </button>
        </div>

        {/* ===== BACK FACE ===== */}
        <div
          onClick={onSelect}
          className={`absolute inset-0 rounded-2xl border-2 p-5 flex flex-col cursor-pointer transition-all duration-200
            ${selected ? tierBorderActive : tierBorderIdle}
            bg-card`}
          style={{
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
          }}
        >
          {/* Back header */}
          <div className="flex items-center justify-between mb-3">
            <p className="font-bold text-sm">
              <span className={tierColor}>{pkg.name}</span>{" "}
              — Quyền lợi
            </p>
          </div>

          {/* Features list */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 select-none">
            {features.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2 text-xs">
                <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <Icon className="h-3 w-3" />
                </div>
                <span>{label}</span>
              </div>
            ))}
          </div>

          {/* Back button — lật về mặt trước */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setFlipped(false);
            }}
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border border-border bg-muted/50 hover:bg-muted text-xs font-medium text-muted-foreground hover:text-foreground transition-all"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Quay lại
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Small topup card (Coin / Diamond) — 2 rows layout
// ============================================================
function TopupCard({
  pkg,
  icon: Icon,
  colorClass,
  unit,
  onBuy,
  loading,
}: {
  pkg: CreditPackage;
  icon: typeof CircleDollarSign;
  colorClass: string;
  unit: string;
  onBuy: (pkg: CreditPackage) => void;
  loading: string | null;
}) {
  const finalPrice = getFinalPrice(pkg);
  const hasSale = pkg.sale_percent > 0;
  const amount = pkg.coin_amount || pkg.diamond_amount;

  return (
    <div
      className="relative flex-shrink-0 w-[150px] min-w-[150px] rounded-2xl border border-border bg-card p-3.5 flex flex-col items-center gap-1.5"
      style={{ scrollSnapAlign: "start" }}
    >
      {/* Icon */}
      <div
        className={`w-9 h-9 rounded-xl flex items-center justify-center mt-1`}
        style={{ background: "rgba(0,0,0,0.05)" }}
      >
        <Icon className={`h-5 w-5 ${colorClass}`} />
      </div>

      {/* Amount */}
      <p className={`text-lg font-extrabold ${colorClass}`}>
        {amount.toLocaleString()}
      </p>
      <p className="text-[10px] text-muted-foreground -mt-1">{unit}</p>

      {/* Price */}
      <div className="flex flex-col items-center">
        {hasSale && (
          <span className="text-[10px] text-muted-foreground line-through">
            {formatVND(pkg.price_vnd)}
          </span>
        )}
        <span className="text-sm font-bold">{formatVND(finalPrice)}</span>
      </div>

      <Button
        size="sm"
        className="w-full h-7 text-xs mt-0.5 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-blue-500/25"
        disabled={loading === pkg.id}
        onClick={() => onBuy(pkg)}
      >
        {loading === pkg.id ? "..." : "Mua ngay"}
      </Button>
    </div>
  );
}

// ============================================================
// Horizontal scroll row with arrow buttons
// ============================================================
function HScrollRow({
  children,
}: {
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const scroll = (dir: "left" | "right") => {
    ref.current?.scrollBy({ left: dir === "left" ? -170 : 170, behavior: "smooth" });
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (ref.current && Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      ref.current.scrollLeft += e.deltaY;
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => scroll("left")}
        className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 z-10 bg-background border rounded-full p-1 shadow-sm hover:bg-muted transition-colors"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
      </button>
      <button
        onClick={() => scroll("right")}
        className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 z-10 bg-background border rounded-full p-1 shadow-sm hover:bg-muted transition-colors"
      >
        <ChevronRight className="h-3.5 w-3.5" />
      </button>
      <div
        ref={ref}
        onWheel={handleWheel}
        className="flex gap-3 overflow-x-auto pb-1 px-1 select-none scroll-smooth [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:bg-muted/40 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-muted-foreground/30 [&::-webkit-scrollbar-thumb]:rounded-full"
        style={{ scrollbarWidth: "thin", scrollSnapType: "x mandatory" }}
      >
        {children}
      </div>
    </div>
  );
}

// ============================================================
// Main Modal
// ============================================================
export function PremiumModal({ open, onClose }: PremiumModalProps) {
  const [activeTab, setActiveTab] = useState<"subscription" | "topup">(
    "subscription"
  );
  const [packages, setPackages] = useState<GroupedPackages>(MOCK_DATA);
  const [selectedSubId, setSelectedSubId] = useState<string>("sub-elite");
  const [gateway, setGateway] = useState<"MOCK" | "VNPAY">("MOCK");
  const [packLoading, setPackLoading] = useState<string | null>(null);
  const [subLoadingId, setSubLoadingId] = useState<string | null>(null);

  const selectedSub =
    packages.subscription.find((p) => p.id === selectedSubId) ||
    packages.subscription[packages.subscription.length - 1];

  // Scroll container ref cho subscription (ngang như Arena)
  const subScrollRef = useRef<HTMLDivElement>(null);

  // Fetch packages từ backend
  useEffect(() => {
    if (!open) return;
    fetch("/api/payment/packages")
      .then((r) => r.json())
      .then((json) => {
        if (json.success && json.data) {
          setPackages(json.data);
          const sub = json.data.subscription;
          if (sub?.length) setSelectedSubId(sub[sub.length - 1].id);
        }
      })
      .catch(() => { });
  }, [open]);

  // Mua pack (coin/diamond)
  const handleBuyPack = async (pkg: CreditPackage) => {
    setPackLoading(pkg.id);
    try {
      if (gateway === "MOCK") {
        const initRes = await fetch("/api/payment/mock/init", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ packageId: pkg.id }),
        });
        const initJson = await initRes.json();
        if (!initJson.success) throw new Error(initJson.message);

        const confirmRes = await fetch(
          `/api/payment/mock/confirm?orderId=${initJson.data.orderId}`,
          { method: "POST", credentials: "include" }
        );
        const confirmJson = await confirmRes.json();
        if (!confirmJson.success) throw new Error(confirmJson.message);

        toast.success(
          `Mua thành công! +${confirmJson.data.coinEarned} Coin, +${confirmJson.data.diamondEarned} Diamond`,
          { description: `Mã GD: ${confirmJson.data.txnId}` }
        );
      } else {
        const initRes = await fetch("/api/payment/vnpay/init", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ packageId: pkg.id }),
        });
        const initJson = await initRes.json();
        if (!initJson.success) throw new Error(initJson.message);
        window.location.href = initJson.data.payUrl;
      }
    } catch (err: any) {
      toast.error("Thanh toán thất bại", { description: err.message });
    } finally {
      setPackLoading(null);
    }
  };

  // Mua subscription
  const handleBuySub = async (pkg: CreditPackage) => {
    setSubLoadingId(pkg.id);
    try {
      if (gateway === "MOCK") {
        const initRes = await fetch("/api/payment/mock/init", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ packageId: pkg.id }),
        });
        const initJson = await initRes.json();
        if (!initJson.success) throw new Error(initJson.message);

        const confirmRes = await fetch(
          `/api/payment/mock/confirm?orderId=${initJson.data.orderId}`,
          { method: "POST", credentials: "include" }
        );
        const confirmJson = await confirmRes.json();
        if (!confirmJson.success) throw new Error(confirmJson.message);

        toast.success(`Đăng ký ${pkg.name} thành công!`, {
          description: `+${confirmJson.data.coinEarned} Coin, +${confirmJson.data.diamondEarned} Diamond đã vào ví.`,
        });
        onClose();
      } else {
        const initRes = await fetch("/api/payment/vnpay/init", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ packageId: pkg.id }),
        });
        const initJson = await initRes.json();
        if (!initJson.success) throw new Error(initJson.message);
        window.location.href = initJson.data.payUrl;
      }
    } catch (err: any) {
      toast.error("Thanh toán thất bại", { description: err.message });
    } finally {
      setSubLoadingId(null);
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (
      subScrollRef.current &&
      Math.abs(e.deltaY) > Math.abs(e.deltaX)
    ) {
      subScrollRef.current.scrollLeft += e.deltaY;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      {/* Same max-w as ArenaRankModal: max-w-4xl, w-[92vw] */}
      <DialogContent
        className="max-w-4xl sm:max-w-4xl w-[92vw] p-0 flex flex-col gap-0 overflow-hidden bg-background/95 backdrop-blur-md border shadow-2xl"
        aria-describedby={undefined}
      >
        {/* ===== HEADER ===== */}
        <div className="shrink-0 p-6 pb-4 border-b">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl font-black">
              <Crown className="h-6 w-6 text-amber-500" />
              Nâng cấp LexiCore
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Chọn gói phù hợp hoặc nạp thêm Coin & Diamond để mở khóa toàn bộ
            trải nghiệm học tập!
          </p>

          {/* Tab switcher */}
          <div className="flex mt-4 bg-muted rounded-xl p-1">
            <button
              onClick={() => setActiveTab("subscription")}
              className={`flex-1 text-sm font-medium py-1.5 rounded-lg transition-all
                ${activeTab === "subscription"
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
                }`}
            >
              <Crown className="h-3.5 w-3.5 inline mr-1.5 text-amber-500" />
              Gói Premium
            </button>
            <button
              onClick={() => setActiveTab("topup")}
              className={`flex-1 text-sm font-medium py-1.5 rounded-lg transition-all
                ${activeTab === "topup"
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
                }`}
            >
              <Gift className="h-3.5 w-3.5 inline mr-1.5 text-fuchsia-500" />
              Nạp Coin & Diamond
            </button>
          </div>
        </div>

        {/* ===== BODY ===== */}
        <div className="flex-1 overflow-hidden">

          {/* ---- TAB: SUBSCRIPTION ---- */}
          {activeTab === "subscription" && (
            <div className="h-full flex flex-col">
              {/* Scroll ngang — same style as ArenaRankModal */}
              <div className="w-full min-w-0 overflow-hidden p-6 pb-2">
                <div
                  ref={subScrollRef}
                  onWheel={handleWheel}
                  className="w-full overflow-x-auto flex items-stretch gap-5 pb-4 select-none scroll-smooth [&::-webkit-scrollbar]:h-2.5 [&::-webkit-scrollbar-track]:bg-muted/40 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-muted-foreground/30 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/50"
                  style={{ scrollbarWidth: "thin" }}
                >
                  {packages.subscription.map((pkg) => (
                    <SubscriptionFlipCard
                      key={pkg.id}
                      pkg={pkg}
                      selected={selectedSubId === pkg.id}
                      onSelect={() => setSelectedSubId(pkg.id)}
                    />
                  ))}
                </div>
              </div>

              {/* Footer: gateway + CTA */}
              <div className="shrink-0 px-6 py-4 bg-muted/40 border-t flex flex-col sm:flex-row items-center justify-between gap-3">
                {/* Gateway selector */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    Thanh toán qua:
                  </span>
                  <button
                    onClick={() => setGateway("MOCK")}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all
                      ${gateway === "MOCK"
                        ? "border-foreground bg-background"
                        : "border-border hover:border-muted-foreground"
                      }`}
                  >
                    <CreditCard className="h-3.5 w-3.5" />
                    Test
                    {gateway === "MOCK" && (
                      <Check className="h-3 w-3 ml-0.5" />
                    )}
                  </button>
                  <button
                    onClick={() => setGateway("VNPAY")}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all
                      ${gateway === "VNPAY"
                        ? "border-blue-500 bg-blue-500/5"
                        : "border-border hover:border-muted-foreground"
                      }`}
                  >
                    <span className="text-blue-600 font-bold">VN</span>
                    VNPay
                    {gateway === "VNPAY" && (
                      <Check className="h-3 w-3 ml-0.5 text-blue-500" />
                    )}
                  </button>
                </div>

                {/* Button đăng ký góc dưới bên phải thay cho dòng text cũ */}
                {selectedSub && (
                  <Button
                    className={`h-10 px-6 text-xs font-bold transition-all shadow-md rounded-xl
                      ${selectedSub.tier === "ELITE"
                        ? "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-amber-500/25"
                        : selectedSub.tier === "PRO"
                          ? "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-blue-500/25"
                          : "bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-emerald-500/25"
                      }`}
                    disabled={subLoadingId === selectedSub.id}
                    onClick={() => handleBuySub(selectedSub)}
                  >
                    {subLoadingId === selectedSub.id ? (
                      "Đang xử lý..."
                    ) : (
                      <>
                        {selectedSub.tier === "ELITE" && (
                          <Crown className="h-4 w-4 mr-1.5" />
                        )}
                        {selectedSub.tier === "PRO" && (
                          <Zap className="h-4 w-4 mr-1.5" />
                        )}
                        {selectedSub.tier === "STARTER" && (
                          <Star className="h-4 w-4 mr-1.5" />
                        )}
                        Đăng ký {selectedSub.name} — {formatVND(getFinalPrice(selectedSub))}/tháng
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* ---- TAB: TOPUP ---- */}
          {activeTab === "topup" && (
            <div className="p-6 space-y-5 overflow-y-auto max-h-[calc(90vh-220px)]">
              {/* Gateway */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  Thanh toán qua:
                </span>
                <button
                  onClick={() => setGateway("MOCK")}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all
                    ${gateway === "MOCK"
                      ? "border-foreground bg-muted"
                      : "border-border hover:border-muted-foreground"
                    }`}
                >
                  <CreditCard className="h-3.5 w-3.5" />
                  Test
                  {gateway === "MOCK" && <Check className="h-3 w-3 ml-0.5" />}
                </button>
                <button
                  onClick={() => setGateway("VNPAY")}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all
                    ${gateway === "VNPAY"
                      ? "border-blue-500 bg-blue-500/5"
                      : "border-border hover:border-muted-foreground"
                    }`}
                >
                  <span className="text-blue-600 font-bold text-xs">VN</span>
                  VNPay
                  {gateway === "VNPAY" && (
                    <Check className="h-3 w-3 ml-0.5 text-blue-500" />
                  )}
                </button>
              </div>

              {/* Coin row */}
              {packages.coin_packs.length > 0 && (
                <div>
                  <p className="text-sm font-semibold flex items-center gap-1.5 mb-3">
                    <CircleDollarSign className="h-4 w-4 text-emerald-600" /> Nạp Coin
                  </p>
                  <HScrollRow>
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
                  </HScrollRow>
                </div>
              )}

              {/* Diamond row */}
              {packages.diamond_packs.length > 0 && (
                <div>
                  <p className="text-sm font-semibold flex items-center gap-1.5 mb-3">
                    <Gem className="h-4 w-4 text-fuchsia-500" /> Nạp Diamond
                  </p>
                  <HScrollRow>
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
                  </HScrollRow>
                </div>
              )}

              <p className="text-xs text-center text-muted-foreground pb-2">
                Coin & Diamond được cộng ngay vào ví sau khi thanh toán thành
                công.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
