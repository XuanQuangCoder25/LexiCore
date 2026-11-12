/**
 * ============================================================
 * Shared components & data dùng chung cho SubscriptionModal và SubscriptionView
 * ============================================================
 */
import React, { useState, useEffect, useRef } from "react";
import {
  Crown, Check, Zap, Mic, Brain, BarChart3, Users,
  CircleDollarSign, Gem, Star, Clock, Info, ArrowLeft,
} from "lucide-react";
import { Button } from "../ui/button";

// ============================================================
// Types
// ============================================================
export interface CreditPackage {
  id: string;
  name: string;
  slug: string;
  package_type: "SUBSCRIPTION" | "COIN_PACK" | "DIAMOND_PACK" | "BUNDLE";
  tier: "STARTER" | "PRO" | "ELITE" | "TRIAL" | null;
  price_vnd: number;
  price_usd: number;
  coin_amount: number;
  diamond_amount: number;
  duration_days: number | null;
  sale_percent: number;
  sale_ends_at: string | null;
  features: string[] | null;
  display_order: number;
  /** true nếu đây là gói dùng thử (do admin bật) */
  is_trial?: boolean;
}

export interface GroupedPackages {
  subscription: CreditPackage[];
  coin_packs: CreditPackage[];
  diamond_packs: CreditPackage[];
  bundles: CreditPackage[];
}

// ============================================================
// Mock data
// ============================================================
export const MOCK_DATA: GroupedPackages = {
  subscription: [
    {
      id: "sub-trial",
      name: "Dùng thử Pro",
      slug: "sub-trial-3days",
      package_type: "SUBSCRIPTION",
      tier: "PRO",
      price_vnd: 0,
      price_usd: 0,
      coin_amount: 0,
      diamond_amount: 0,
      duration_days: 3,
      sale_percent: 0,
      sale_ends_at: null,
      display_order: 0,
      features: [
        "Toàn bộ tính năng Pro",
        "AI Voice Recognition",
        "Unlimited AI feedback",
        "Analytics chi tiết",
        "Badge Pro trong 3 ngày",
      ],
      is_trial: true,
    },
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
      sale_percent: 0,
      sale_ends_at: null,
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
      display_order: 10,
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
      sale_percent: 0,
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
      sale_percent: 0,
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
      sale_percent: 0,
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
      sale_percent: 0,
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
      sale_percent: 0,
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
export function formatVND(amount: number): string {
  return new Intl.NumberFormat("vi-VN").format(amount) + "₫";
}

export function getDurationLabel(durationDays: number | null | undefined): string {
  if (!durationDays) return "/tháng";
  if (durationDays === 365) return "/năm";
  if (durationDays === 7) return "/tuần";
  if (durationDays === 30) return "/tháng";
  return `/${durationDays} ngày`;
}

export function getFinalPrice(pkg: CreditPackage): number {
  if (pkg.sale_percent > 0 && pkg.sale_ends_at && new Date(pkg.sale_ends_at) > new Date()) {
    return Math.round(pkg.price_vnd * (1 - pkg.sale_percent / 100));
  }
  if (pkg.sale_percent > 0 && !pkg.sale_ends_at) {
    return Math.round(pkg.price_vnd * (1 - pkg.sale_percent / 100));
  }
  return pkg.price_vnd;
}

export function useSaleActive(salePercent: number, saleEndsAt: string | null): boolean {
  const [active, setActive] = useState(() => {
    if (salePercent <= 0) return false;
    if (!saleEndsAt) return true;
    return new Date(saleEndsAt).getTime() > Date.now();
  });

  useEffect(() => {
    if (salePercent <= 0 || !saleEndsAt) {
      setActive(salePercent > 0);
      return;
    }
    const check = () => {
      const isStillActive = new Date(saleEndsAt).getTime() > Date.now();
      setActive(isStillActive);
    };
    check();
    const diff = new Date(saleEndsAt).getTime() - Date.now();
    if (diff <= 0) return;

    const timer = setTimeout(check, diff + 100);
    return () => clearTimeout(timer);
  }, [salePercent, saleEndsAt]);

  return active;
}

// ============================================================
// CompactCountdown
// size="sm" → topup cards (nhỏ)
// size="md" → subscription cards (to, nổi bật như badge "Best Value" cũ)
// ============================================================
export function CompactCountdown({
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
      if (diff <= 0) { setTimeLeft("Hết hạn"); return; }
      const totalSec = Math.floor(diff / 1000);
      const days = Math.floor(totalSec / 86400);
      const hours = Math.floor((totalSec % 86400) / 3600);
      const minutes = Math.floor((totalSec % 3600) / 60);
      const seconds = totalSec % 60;
      if (days > 0) setTimeLeft(`${days}d ${hours}h`);
      else if (hours > 0) setTimeLeft(`${hours}h ${minutes}p`);
      else setTimeLeft(`${minutes}p ${seconds}s`);
    };
    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, [endsAt]);

  if (!timeLeft || timeLeft === "Hết hạn") return null;

  if (size === "md") {
    return (
      <span className={`absolute -top-3.5 left-1/2 -translate-x-1/2 z-10 px-3 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-[0_0_12px_rgba(245,158,11,0.5)] pointer-events-none flex items-center gap-1.5 whitespace-nowrap ${className || ""}`}>
        <Clock className="w-3 h-3 shrink-0" />
        {timeLeft}
      </span>
    );
  }

  return (
    <span className={`absolute -top-2.5 left-1/2 -translate-x-1/2 z-10 px-2 py-0.5 rounded-full text-[9px] font-black tracking-tight bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-xs pointer-events-none flex items-center gap-1 whitespace-nowrap ${className || ""}`}>
      <Clock className="w-2.5 h-2.5 shrink-0" />
      {timeLeft}
    </span>
  );
}

// ============================================================
// TIER_FEATURES_MAP
// ============================================================
export const TIER_FEATURES_MAP: Record<string, { icon: typeof Zap; label: string }[]> = {
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
  TRIAL: [
    { icon: Zap, label: "Toàn bộ tính năng Pro" },
    { icon: Mic, label: "AI Voice Recognition" },
    { icon: Brain, label: "Unlimited AI feedback" },
    { icon: BarChart3, label: "Analytics chi tiết" },
    { icon: Crown, label: "Badge Pro trong 3 ngày" },
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
    { icon: Zap, label: "Early access" },
  ],
};

// ============================================================
// SubscriptionFlipCard
// width: flexible (w-full trong trang, 240px trong modal)
// ============================================================
export function SubscriptionFlipCard({
  pkg,
  selected,
  onSelect,
  onBuy,
  widthClass = "w-[240px] min-w-[240px]",
}: {
  pkg: CreditPackage;
  selected: boolean;
  onSelect: () => void;
  onBuy: (pkg: CreditPackage) => void;
  /** Tailwind width classes. Modal dùng cố định 240px; trang dùng flex-1 */
  widthClass?: string;
}) {
  const [flipped, setFlipped] = useState(false);
  const isTrial = pkg.is_trial || pkg.tier === "TRIAL";
  const isElite = pkg.tier === "ELITE";
  const isPro = pkg.tier === "PRO" && !isTrial;
  const hasSale = useSaleActive(pkg.sale_percent, pkg.sale_ends_at);
  const finalPrice = hasSale ? Math.round(pkg.price_vnd * (1 - pkg.sale_percent / 100)) : pkg.price_vnd;
  const features = TIER_FEATURES_MAP[isTrial ? "TRIAL" : (pkg.tier ?? "")] ?? [];

  const tierColor = isElite ? "text-amber-500" : isPro ? "text-blue-500" : isTrial ? "text-blue-400" : "text-emerald-500";
  const tierBg = isElite
    ? "bg-amber-500/15 group-hover/card:bg-amber-500/25"
    : isPro
      ? "bg-blue-500/15 group-hover/card:bg-blue-500/25"
      : isTrial
        ? "bg-blue-400/15 group-hover/card:bg-blue-400/25"
        : "bg-emerald-500/15 group-hover/card:bg-emerald-500/25";
  const tierCheckBg = isElite ? "bg-amber-500" : isPro ? "bg-blue-500" : isTrial ? "bg-blue-400" : "bg-emerald-500";

  const tierBorderActive = isElite
    ? "border-amber-500 shadow-[0_0_25px_rgba(245,158,11,0.45)] bg-gradient-to-b from-amber-500/[0.06] via-card to-card"
    : isPro
      ? "border-blue-500 shadow-[0_0_22px_rgba(59,130,246,0.4)] bg-gradient-to-b from-blue-500/[0.06] via-card to-card"
      : isTrial
        ? "border-blue-400 shadow-[0_0_22px_rgba(96,165,250,0.35)] bg-gradient-to-b from-blue-400/[0.05] via-card to-card"
        : "border-emerald-500 shadow-[0_0_22px_rgba(16,185,129,0.4)] bg-gradient-to-b from-emerald-500/[0.06] via-card to-card";

  const tierBorderIdle = isElite
    ? "border-border hover:border-amber-500/80 hover:shadow-[0_0_22px_rgba(245,158,11,0.3)] hover:bg-amber-500/[0.03]"
    : isPro
      ? "border-border hover:border-blue-500/80 hover:shadow-[0_0_20px_rgba(59,130,246,0.28)] hover:bg-blue-500/[0.03]"
      : isTrial
        ? "border-blue-400/60 hover:border-blue-400 hover:shadow-[0_0_18px_rgba(96,165,250,0.25)] hover:bg-blue-400/[0.03]"
        : "border-border hover:border-emerald-500/80 hover:shadow-[0_0_20px_rgba(16,185,129,0.28)] hover:bg-emerald-500/[0.03]";

  const detailButtonHover = isElite
    ? "hover:border-amber-500/50 hover:text-amber-500"
    : isPro || isTrial
      ? "hover:border-blue-500/50 hover:text-blue-500"
      : "hover:border-emerald-500/50 hover:text-emerald-500";

  return (
    <div
      className={`group/card ${widthClass} shrink-0 transition-transform duration-300 hover:-translate-y-1.5`}
      style={{ perspective: "1000px", height: "330px" }}
    >
      <div
        className="relative w-full h-full transition-transform duration-500"
        style={{ transformStyle: "preserve-3d", transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)" }}
      >
        {/* ===== FRONT ===== */}
        <div
          onClick={onSelect}
          className={`absolute inset-0 rounded-2xl border-2 p-5 flex flex-col cursor-pointer transition-all duration-300 bg-card select-none ${selected ? tierBorderActive : tierBorderIdle}`}
          style={{ backfaceVisibility: "hidden" }}
        >
          {/* Trial badge trên đầu */}
          {isTrial && (
            <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-10 px-3 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase bg-gradient-to-r from-blue-400 to-blue-500 text-white shadow-[0_0_12px_rgba(96,165,250,0.5)] pointer-events-none flex items-center gap-1.5 whitespace-nowrap">
              <Zap className="w-3 h-3 shrink-0" />
              Dùng thử miễn phí
            </span>
          )}

          {/* Sale countdown badge */}
          {!isTrial && hasSale && pkg.sale_ends_at && (
            <CompactCountdown endsAt={pkg.sale_ends_at} size="md" />
          )}

          {/* Selected checkmark */}
          {selected && (
            <div className={`absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center ${tierCheckBg} shadow-sm`}>
              <Check className="h-3 w-3 text-white" />
            </div>
          )}

          {/* Tier icon */}
          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center mb-3 mt-1 transition-all duration-300 group-hover/card:scale-110 ${tierBg}`}>
            {isElite ? <Crown className="h-6 w-6 text-amber-500" />
              : (isPro || isTrial) ? <Zap className="h-6 w-6 text-blue-500" />
                : <Star className="h-6 w-6 text-emerald-500" />}
          </div>

          {/* Name */}
          <p className={`font-black text-xl mb-1 ${tierColor}`}>{pkg.name}</p>

          {/* Price */}
          <div className="flex flex-col mb-2">
            {/* Dòng 1: giá cũ / placeholder */}
            <div className="flex items-center gap-1.5 leading-none mb-1">
              {!isTrial && hasSale ? (
                <>
                  <span className="text-xs text-muted-foreground/75 line-through leading-none">{formatVND(pkg.price_vnd)}</span>
                  <span className="text-[10px] font-black text-rose-500 bg-rose-500/10 px-1.5 py-0.5 rounded leading-none">-{pkg.sale_percent}%</span>
                </>
              ) : (
                <span className="text-xs invisible select-none leading-none py-0.5" aria-hidden="true">0₫</span>
              )}
            </div>
            {/* Dòng 2: giá chính */}
            <div className="flex items-baseline gap-1.5">
              {isTrial ? (
                <>
                  <span className="text-2xl font-extrabold tracking-tight">Miễn phí</span>
                  <span className="text-xs text-muted-foreground font-medium">/{pkg.duration_days ?? 3} ngày</span>
                </>
              ) : (
                <>
                  <span className="text-2xl font-extrabold tracking-tight">{formatVND(finalPrice)}</span>
                  <span className="text-xs text-muted-foreground font-medium">{getDurationLabel(pkg.duration_days)}</span>
                </>
              )}
            </div>
          </div>

          <div className="flex-1" />

          {/* Detail button */}
          <button
            onClick={(e) => { e.stopPropagation(); setFlipped(true); }}
            className={`w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border border-border bg-muted/40 hover:bg-muted text-xs font-semibold text-muted-foreground transition-all duration-200 ${detailButtonHover}`}
          >
            <Info className="h-3.5 w-3.5" />
            Chi tiết quyền lợi
          </button>
        </div>

        {/* ===== BACK ===== */}
        <div
          onClick={onSelect}
          className={`absolute inset-0 rounded-2xl border-2 p-5 flex flex-col cursor-pointer transition-all duration-300 bg-card select-none ${selected ? tierBorderActive : tierBorderIdle}`}
          style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
        >
          <div className="flex items-center justify-between mb-3">
            <p className="font-bold text-sm">
              <span className={tierColor}>{pkg.name}</span> - Quyền lợi
            </p>
          </div>
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
          <button
            onClick={(e) => { e.stopPropagation(); setFlipped(false); }}
            className={`w-full flex items-center justify-center gap-1.5 py-2 mt-2 rounded-xl border border-border bg-muted/40 hover:bg-muted text-xs font-semibold text-muted-foreground transition-all duration-200 ${detailButtonHover}`}
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
// TopupCard - Coin / Diamond (Size chuẩn 150px)
// ============================================================
export function TopupCard({
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
  const hasSale = useSaleActive(pkg.sale_percent, pkg.sale_ends_at);
  const finalPrice = hasSale ? Math.round(pkg.price_vnd * (1 - pkg.sale_percent / 100)) : pkg.price_vnd;
  const amount = pkg.coin_amount || pkg.diamond_amount;
  const isCoin = unit.toLowerCase() === "coin" || pkg.package_type === "COIN_PACK";

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
      {/* Badge thời gian */}
      {hasSale && pkg.sale_ends_at && <CompactCountdown endsAt={pkg.sale_ends_at} />}

      {/* Icon + Amount + Unit */}
      <div className="flex flex-col items-center gap-1 w-full">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center mt-0.5 transition-colors duration-300 ${iconBg}`}>
          <Icon className={`h-5 w-5 ${colorClass}`} />
        </div>
        <p className={`text-lg font-extrabold tracking-tight ${colorClass}`}>{amount.toLocaleString()}</p>
        <p className="text-[10px] text-muted-foreground -mt-1 font-medium">{unit}</p>
      </div>

      {/* Price + Button */}
      <div className="flex flex-col items-center w-full mt-2 gap-2">
        <div className="flex flex-col items-center justify-end leading-none">
          {hasSale ? (
            <div className="flex items-center gap-1 leading-none mb-1">
              <span className="text-[10px] text-muted-foreground/75 line-through leading-none">{formatVND(pkg.price_vnd)}</span>
              <span className="text-[9px] font-black text-rose-500 bg-rose-500/10 px-1 rounded leading-none">-{pkg.sale_percent}%</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 leading-none mb-1 invisible select-none" aria-hidden="true">
              <span className="text-[10px] leading-none">0₫</span>
              <span className="text-[9px] px-1 rounded leading-none">-0%</span>
            </div>
          )}
          <span className="text-sm font-bold tracking-tight leading-none">{formatVND(finalPrice)}</span>
        </div>
        <Button
          size="sm"
          className={`w-full h-7 text-xs font-bold rounded-lg shadow-sm transition-all ${buttonStyle}`}
          disabled={loading === pkg.id}
          onClick={(e) => { e.stopPropagation(); onBuy(pkg); }}
        >
          {loading === pkg.id ? "..." : "Mua ngay"}
        </Button>
      </div>
    </div>
  );
}

// ============================================================
// HScrollRow - dùng trong Modal khi không đủ chỗ
// ============================================================
export function HScrollRow({ children }: { children: React.ReactNode }) {
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

