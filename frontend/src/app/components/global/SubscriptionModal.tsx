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

export interface SubscriptionModalProps {
  open: boolean;
  onClose: () => void;
}
export type PremiumModalProps = SubscriptionModalProps;

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
      sale_ends_at: new Date(Date.now() + (2 * 24 + 14) * 3600 * 1000).toISOString(),
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
      sale_ends_at: new Date(Date.now() + (5 * 3600 + 42 * 60) * 1000).toISOString(),
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
      sale_ends_at: new Date(Date.now() + (3 * 24 + 8) * 3600 * 1000).toISOString(),
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
      sale_ends_at: new Date(Date.now() + (18 * 60 + 45) * 1000).toISOString(),
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
      sale_ends_at: new Date(Date.now() + (1 * 24 + 6) * 3600 * 1000).toISOString(),
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
// Compact Countdown cho Badge chính giữa mép trên Card
// Hiển thị tối đa 2 thông số:
// - Còn > 1 ngày: Xd Yh
// - Còn < 1 ngày & >= 1 giờ: Xh Yp
// - Còn < 1 giờ: Xp Ys
// ============================================================
function CompactCountdown({
  endsAt,
  size = "sm",
  className,
}: {
  endsAt: string;
  size?: "sm" | "md";
  className?: string;
}) {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    const calc = () => {
      const diff = new Date(endsAt).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft("Hết hạn");
        return;
      }
      const totalSec = Math.floor(diff / 1000);
      const days = Math.floor(totalSec / 86400);
      const hours = Math.floor((totalSec % 86400) / 3600);
      const minutes = Math.floor((totalSec % 3600) / 60);
      const seconds = totalSec % 60;

      if (days > 0) {
        setTimeLeft(`${days}d ${hours}h`);
      } else if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}p`);
      } else {
        setTimeLeft(`${minutes}p ${seconds}s`);
      }
    };
    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, [endsAt]);

  if (!timeLeft || timeLeft === "Hết hạn") return null;

  if (size === "md") {
    return (
      <span
        className={`absolute -top-3.5 left-1/2 -translate-x-1/2 z-10 px-3 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-[0_0_12px_rgba(245,158,11,0.5)] pointer-events-none flex items-center gap-1.5 whitespace-nowrap ${className || ""}`}
      >
        <Clock className="w-3 h-3 shrink-0" />
        {timeLeft}
      </span>
    );
  }

  return (
    <span
      className={`absolute -top-2.5 left-1/2 -translate-x-1/2 z-10 px-2 py-0.5 rounded-full text-[9px] font-black tracking-tight bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-xs pointer-events-none flex items-center gap-1 whitespace-nowrap ${className || ""}`}
    >
      <Clock className="w-2.5 h-2.5 shrink-0" />
      {timeLeft}
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
    (!pkg.sale_ends_at || new Date(pkg.sale_ends_at) > new Date());
  const features = pkg.tier ? TIER_FEATURES_MAP[pkg.tier] ?? [] : [];

  // Màu chủ đạo cho 3 gói
  const tierColor = isElite
    ? "text-amber-500"
    : isPro
      ? "text-blue-500"
      : "text-emerald-500";

  const tierBg = isElite
    ? "bg-amber-500/15 group-hover/card:bg-amber-500/25"
    : isPro
      ? "bg-blue-500/15 group-hover/card:bg-blue-500/25"
      : "bg-emerald-500/15 group-hover/card:bg-emerald-500/25";

  const tierCheckBg = isElite
    ? "bg-amber-500"
    : isPro
      ? "bg-blue-500"
      : "bg-emerald-500";

  // Border & glow khi được chọn
  const tierBorderActive = isElite
    ? "border-amber-500 shadow-[0_0_25px_rgba(245,158,11,0.45)] bg-gradient-to-b from-amber-500/[0.06] via-card to-card"
    : isPro
      ? "border-blue-500 shadow-[0_0_22px_rgba(59,130,246,0.4)] bg-gradient-to-b from-blue-500/[0.06] via-card to-card"
      : "border-emerald-500 shadow-[0_0_22px_rgba(16,185,129,0.4)] bg-gradient-to-b from-emerald-500/[0.06] via-card to-card";

  // Border, glow & tint khi hover (lúc chưa chọn)
  const tierBorderIdle = isElite
    ? "border-border hover:border-amber-500/80 hover:shadow-[0_0_22px_rgba(245,158,11,0.3)] hover:bg-amber-500/[0.03]"
    : isPro
      ? "border-border hover:border-blue-500/80 hover:shadow-[0_0_20px_rgba(59,130,246,0.28)] hover:bg-blue-500/[0.03]"
      : "border-border hover:border-emerald-500/80 hover:shadow-[0_0_20px_rgba(16,185,129,0.28)] hover:bg-emerald-500/[0.03]";

  const detailButtonHover = isElite
    ? "hover:border-amber-500/50 hover:text-amber-500"
    : isPro
      ? "hover:border-blue-500/50 hover:text-blue-500"
      : "hover:border-emerald-500/50 hover:text-emerald-500";

  return (
    // Perspective wrapper — cùng kích thước card 240px
    <div
      className="group/card w-[240px] min-w-[240px] shrink-0 transition-transform duration-300 hover:-translate-y-1.5"
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
          className={`absolute inset-0 rounded-2xl border-2 p-5 flex flex-col cursor-pointer transition-all duration-300
            ${selected ? tierBorderActive : tierBorderIdle}
            bg-card select-none`}
          style={{ backfaceVisibility: "hidden" }}
        >
          {/* Badge thời gian đếm ngược chính giữa mép trên card (màu cam, to nổi bật) */}
          {hasSale && pkg.sale_ends_at && (
            <CompactCountdown endsAt={pkg.sale_ends_at} size="md" />
          )}

          {/* Selected checkmark (góc trên phải) */}
          {selected && (
            <div
              className={`absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center ${tierCheckBg} shadow-sm`}
            >
              <Check className="h-3 w-3 text-white" />
            </div>
          )}

          {/* Tier icon */}
          <div
            className={`w-11 h-11 rounded-2xl flex items-center justify-center mb-3 mt-1 transition-all duration-300 group-hover/card:scale-110 ${tierBg}`}
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
            {/* Dòng 1: Giá cũ & Tag % sale (hoặc khoảng trống vô hình giữ chỗ) */}
            <div className="flex items-center gap-1.5 leading-none mb-1">
              {hasSale ? (
                <>
                  <span className="text-xs text-muted-foreground/75 line-through leading-none">
                    {formatVND(pkg.price_vnd)}
                  </span>
                  <span className="text-[10px] font-black text-rose-500 bg-rose-500/10 px-1.5 py-0.5 rounded leading-none">
                    -{pkg.sale_percent}%
                  </span>
                </>
              ) : (
                <span
                  className="text-xs invisible select-none leading-none py-0.5"
                  aria-hidden="true"
                >
                  0₫
                </span>
              )}
            </div>

            {/* Dòng 2: Giá chính */}
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-extrabold tracking-tight">
                {formatVND(finalPrice)}
              </span>
              <span className="text-xs text-muted-foreground font-medium">/tháng</span>
            </div>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Detail button — lật thẻ xem quyền lợi */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setFlipped(true);
            }}
            className={`w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border border-border bg-muted/40 hover:bg-muted text-xs font-semibold text-muted-foreground transition-all duration-200 ${detailButtonHover}`}
          >
            <Info className="h-3.5 w-3.5" />
            Chi tiết quyền lợi
          </button>
        </div>

        {/* ===== BACK FACE ===== */}
        <div
          onClick={onSelect}
          className={`absolute inset-0 rounded-2xl border-2 p-5 flex flex-col cursor-pointer transition-all duration-300
            ${selected ? tierBorderActive : tierBorderIdle}
            bg-card select-none`}
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
            className={`w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border border-border bg-muted/40 hover:bg-muted text-xs font-semibold text-muted-foreground transition-all duration-200 ${detailButtonHover}`}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Quay lại mặt trước
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
  const hasSale =
    pkg.sale_percent > 0 &&
    (!pkg.sale_ends_at || new Date(pkg.sale_ends_at) > new Date());
  const amount = pkg.coin_amount || pkg.diamond_amount;
  const isCoin = unit.toLowerCase() === "coin" || pkg.package_type === "COIN_PACK";

  // Hover color chủ đạo theo loại thẻ
  const hoverCardStyles = isCoin
    ? "hover:border-emerald-600 hover:shadow-[0_0_20px_rgba(5,150,105,0.35)] hover:bg-emerald-500/[0.04]"
    : "hover:border-fuchsia-500 hover:shadow-[0_0_20px_rgba(217,70,239,0.35)] hover:bg-fuchsia-500/[0.04]";

  const iconBg = isCoin
    ? "bg-emerald-500/10 group-hover:bg-emerald-500/20"
    : "bg-fuchsia-500/10 group-hover:bg-fuchsia-500/20";

  const buttonStyle = isCoin
    ? "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-600/25"
    : "bg-gradient-to-r from-fuchsia-500 to-pink-600 hover:from-fuchsia-600 hover:to-pink-700 text-white shadow-fuchsia-500/25";

  return (
    <div
      onClick={() => onBuy(pkg)}
      className={`group relative flex-shrink-0 w-[150px] min-w-[150px] rounded-2xl border-2 border-border bg-card p-3.5 flex flex-col items-center justify-between transition-all duration-300 hover:-translate-y-0.5 cursor-pointer select-none ${hoverCardStyles}`}
      style={{ scrollSnapAlign: "start" }}
    >
      {/* Badge thời gian đếm ngược chính giữa mép trên card (màu cam) */}
      {hasSale && pkg.sale_ends_at && (
        <CompactCountdown endsAt={pkg.sale_ends_at} />
      )}

      {/* Top section: Icon + Số lượng + Đơn vị */}
      <div className="flex flex-col items-center gap-1 w-full">
        {/* Icon */}
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center mt-0.5 transition-colors duration-300 ${iconBg}`}
        >
          <Icon className={`h-5 w-5 ${colorClass}`} />
        </div>

        {/* Amount */}
        <p className={`text-lg font-extrabold tracking-tight ${colorClass}`}>
          {amount.toLocaleString()}
        </p>
        <p className="text-[10px] text-muted-foreground -mt-1 font-medium">{unit}</p>
      </div>

      {/* Bottom section: Giá tiền đồng bộ + Nút mua */}
      <div className="flex flex-col items-center w-full mt-2 gap-2">
        {/* Price block: 2 dòng đồng bộ tuyệt đối về chiều cao */}
        <div className="flex flex-col items-center justify-end leading-none">
          {hasSale ? (
            <div className="flex items-center gap-1 leading-none mb-1">
              <span className="text-[10px] text-muted-foreground/75 line-through leading-none">
                {formatVND(pkg.price_vnd)}
              </span>
              <span className="text-[9px] font-black text-rose-500 bg-rose-500/10 px-1 py-0.2 rounded leading-none">
                -{pkg.sale_percent}%
              </span>
            </div>
          ) : (
            <div
              className="flex items-center gap-1 leading-none mb-1 invisible select-none"
              aria-hidden="true"
            >
              <span className="text-[10px] leading-none">0₫</span>
              <span className="text-[9px] px-1 py-0.2 rounded leading-none">-0%</span>
            </div>
          )}
          <span className="text-sm font-bold tracking-tight leading-none">
            {formatVND(finalPrice)}
          </span>
        </div>

        <Button
          size="sm"
          className={`w-full h-7 text-xs font-bold rounded-lg shadow-sm transition-all ${buttonStyle}`}
          disabled={loading === pkg.id}
          onClick={(e) => {
            e.stopPropagation();
            onBuy(pkg);
          }}
        >
          {loading === pkg.id ? "..." : "Mua ngay"}
        </Button>
      </div>
    </div>
  );
}

// ============================================================
// Horizontal scroll row (scroll ngang, hỗ trợ lăn chuột)
// ============================================================
function HScrollRow({
  children,
}: {
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (ref.current && Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      ref.current.scrollLeft += e.deltaY;
    }
  };

  return (
    <div className="w-full min-w-0 overflow-hidden">
      <div
        ref={ref}
        onWheel={handleWheel}
        className="w-full flex items-stretch gap-3 overflow-x-auto pb-3 pt-3 px-1.5 select-none scroll-smooth [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:bg-muted/40 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-muted-foreground/30 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/50"
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
export function SubscriptionModal({ open, onClose }: SubscriptionModalProps) {
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
              Gói Hội viên
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
              {/* Scroll ngang */}
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

// Backward compatibility alias
export { SubscriptionModal as PremiumModal };
