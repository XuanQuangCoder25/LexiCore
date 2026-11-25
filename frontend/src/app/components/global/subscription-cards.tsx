/**
 * ============================================================
 * Shared components & data dùng chung cho SubscriptionModal và SubscriptionView
 * ============================================================
 */
import React, { useState, useEffect, useRef } from "react";
import {
  Crown, Check, Zap, Mic, Brain, BarChart3, Users,
  CircleDollarSign, Gem, Star, Clock, Info, ArrowLeft,
  Sparkles, Gift, Swords, ShieldCheck, PlayCircle, ArrowRight,
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
  /** ID chiến dịch nếu đây là gói quà tặng từ subscription_campaigns */
  campaign_id?: string | null;
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
        "Trải nghiệm toàn bộ gói Pro",
        "60 câu phát âm Whisper / ngày",
        "Mở khóa Radar Năng lực 6D",
        "Đấu Rank vô hạn + 5 trận x2",
        "Tên Ocean Blue & Khung Sapphire",
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
      coin_amount: 0,
      diamond_amount: 0,
      duration_days: 30,
      sale_percent: 0,
      sale_ends_at: null,
      display_order: 1,
      features: [
        "25 câu phát âm Whisper / ngày",
        "10 video cá nhân (<15 phút)",
        "Đấu Rank Arena không giới hạn",
        "3 trận x2 Coin & EXP / ngày",
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
      coin_amount: 0,
      diamond_amount: 0,
      duration_days: 30,
      sale_percent: 0,
      sale_ends_at: null,
      display_order: 2,
      features: [
        "60 câu phát âm Whisper / ngày",
        "50 video (Mọi thời lượng)",
        "Đấu Rank vô hạn + 5 trận x2",
        "Mở khóa Radar Năng lực 6D",
        "Tên Ocean Blue & Khung Sapphire",
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
      coin_amount: 0,
      diamond_amount: 0,
      duration_days: 30,
      sale_percent: 0,
      sale_ends_at: null,
      display_order: 3,
      features: [
        "120 câu phát âm Whisper / ngày",
        "Import video không giới hạn",
        "Đấu Rank vô hạn + 10 trận x2",
        "Mở khóa Radar Năng lực 6D",
        "Tự động bảo vệ chuỗi Streak",
        "Tên Royal Gold & Khung Vàng VIP",
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
// size="sm": topup cards (nhỏ)
// size="md": subscription cards (to, nổi bật như badge "Best Value" cũ)
// ============================================================
function formatCompactCountdownText(endsAt: string, size: "sm" | "md"): string {
  const diff = new Date(endsAt).getTime() - Date.now();
  if (diff <= 0) return "Hết hạn";
  const totalSec = Math.floor(diff / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  if (size === "md") {
    if (days > 0) {
      return `${days} ${days === 1 ? "Day" : "Days"} ${hours} ${hours === 1 ? "Hour" : "Hours"}`;
    }
    if (hours > 0) {
      return `${hours} ${hours === 1 ? "Hour" : "Hours"} ${minutes} ${minutes === 1 ? "Minute" : "Minutes"}`;
    }
    return `${minutes} ${minutes === 1 ? "Minute" : "Minutes"} ${seconds} ${seconds === 1 ? "Second" : "Seconds"}`;
  }
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}p`;
  return `${minutes}p ${seconds}s`;
}

export function CompactCountdown({
  endsAt,
  size = "sm",
  className,
}: {
  endsAt: string;
  size?: "sm" | "md";
  className?: string;
}) {
  const [timeLeft, setTimeLeft] = useState(() => formatCompactCountdownText(endsAt, size));

  useEffect(() => {
    const calc = () => setTimeLeft(formatCompactCountdownText(endsAt, size));
    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, [endsAt, size]);

  if (!timeLeft || timeLeft === "Hết hạn") return null;

  if (size === "md") {
    return (
      <span className={`absolute -top-3.5 left-1/2 -translate-x-1/2 z-10 px-3.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-[0_0_12px_rgba(245,158,11,0.5)] pointer-events-none flex items-center gap-1.5 whitespace-nowrap ${className || ""}`}>
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
    { icon: Mic, label: "25 câu phát âm Whisper / ngày" },
    { icon: PlayCircle, label: "10 video cá nhân (<15 phút)" },
    { icon: Swords, label: "Đấu Rank Arena không giới hạn" },
    { icon: Zap, label: "3 trận x2 Coin & EXP / ngày" },
  ],
  PRO: [
    { icon: Mic, label: "60 câu phát âm Whisper / ngày" },
    { icon: PlayCircle, label: "50 video (Mọi thời lượng)" },
    { icon: Swords, label: "Đấu Rank vô hạn + 5 trận x2" },
    { icon: BarChart3, label: "Mở khóa Radar Năng lực 6D" },
    { icon: Crown, label: "Tên Ocean Blue & Khung Sapphire" },
  ],
  TRIAL: [
    { icon: Zap, label: "Trải nghiệm toàn bộ gói Pro" },
    { icon: Mic, label: "60 câu phát âm Whisper / ngày" },
    { icon: BarChart3, label: "Mở khóa Radar Năng lực 6D" },
    { icon: Swords, label: "Đấu Rank vô hạn + 5 trận x2" },
    { icon: Crown, label: "Tên Ocean Blue & Khung Sapphire" },
  ],
  ELITE: [
    { icon: Mic, label: "120 câu phát âm Whisper / ngày" },
    { icon: PlayCircle, label: "Import video không giới hạn" },
    { icon: Swords, label: "Đấu Rank vô hạn + 10 trận x2" },
    { icon: BarChart3, label: "Mở khóa Radar Năng lực 6D" },
    { icon: ShieldCheck, label: "Tự động bảo vệ chuỗi Streak" },
    { icon: Crown, label: "Tên Royal Gold & Khung Vàng VIP" },
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
  onOpenComparison,
  widthClass = "w-[240px] min-w-[240px]",
}: {
  pkg: CreditPackage;
  selected: boolean;
  onSelect: () => void;
  onBuy: (pkg: CreditPackage) => void;
  onOpenComparison?: () => void;
  /** Tailwind width classes. Modal dùng cố định 240px; trang dùng flex-1 */
  widthClass?: string;
}) {
  const [flipState, setFlipState] = useState<{
    side: "front" | "back";
    deg: number;
    transition: string;
  }>({
    side: "front",
    deg: 0,
    transition: "none",
  });
  const rotRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<number | null>(null);
  const settleRef = useRef<number | null>(null);
  const raf1Ref = useRef<number | null>(null);
  const raf2Ref = useRef<number | null>(null);

  const clearFlipTimers = () => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (settleRef.current !== null) {
      window.clearTimeout(settleRef.current);
      settleRef.current = null;
    }
    if (raf1Ref.current !== null) {
      window.cancelAnimationFrame(raf1Ref.current);
      raf1Ref.current = null;
    }
    if (raf2Ref.current !== null) {
      window.cancelAnimationFrame(raf2Ref.current);
      raf2Ref.current = null;
    }
  };

  useEffect(() => {
    return clearFlipTimers;
  }, []);

  // Lật thẻ 2 pha (0 -> 90deg đổi nội dung -> -90 -> 0deg), sau khi xong trả về thẻ phẳng 2D để tránh lỗi GPU Blink
  const flipTo = (targetSide: "front" | "back") => {
    clearFlipTimers();
    const outDeg = targetSide === "back" ? 90 : -90;
    const inDeg = targetSide === "back" ? -90 : 90;

    setFlipState((prev) => ({
      ...prev,
      deg: outDeg,
      transition: "transform 180ms cubic-bezier(0.4, 0, 1, 1)",
    }));

    timerRef.current = window.setTimeout(() => {
      setFlipState({
        side: targetSide,
        deg: inDeg,
        transition: "none",
      });

      raf1Ref.current = window.requestAnimationFrame(() => {
        void rotRef.current?.offsetHeight;
        raf2Ref.current = window.requestAnimationFrame(() => {
          setFlipState({
            side: targetSide,
            deg: 0,
            transition: "transform 220ms cubic-bezier(0, 0, 0.2, 1)",
          });

          settleRef.current = window.setTimeout(() => {
            setFlipState({
              side: targetSide,
              deg: 0,
              transition: "none",
            });
          }, 230);
        });
      });
    }, 180);
  };
  const isTrial = pkg.is_trial || pkg.tier === "TRIAL";
  const isElite = pkg.tier === "ELITE";
  const isPro = pkg.tier === "PRO" && !isTrial;
  const hasSale = useSaleActive(pkg.sale_percent, pkg.sale_ends_at);
  const finalPrice = hasSale ? Math.round(pkg.price_vnd * (1 - pkg.sale_percent / 100)) : pkg.price_vnd;
  const baseFeatures = TIER_FEATURES_MAP[isTrial ? "TRIAL" : (pkg.tier ?? "")] ?? [];
  const bonusParts: string[] = [];
  if (pkg.coin_amount > 0) bonusParts.push(`${pkg.coin_amount.toLocaleString("vi-VN")} Coin`);
  if (pkg.diamond_amount > 0) bonusParts.push(`${pkg.diamond_amount} Diamond`);
  const bonusSuffix = pkg.duration_days === 30 || pkg.duration_days === 365 ? "/tháng" : "";
  const features = bonusParts.length > 0
    ? [...baseFeatures, { icon: CircleDollarSign, label: `Tặng ${bonusParts.join(" + ")}${bonusSuffix}` }]
    : baseFeatures;

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

  const cardTitle = pkg.campaign_id
    ? (pkg.tier ? `Gói ${pkg.tier.charAt(0).toUpperCase() + pkg.tier.slice(1).toLowerCase()}` : pkg.name)
    : pkg.name;

  const isFlatResting = flipState.deg === 0 && flipState.transition === "none";

  return (
    <div
      className={`group/card ${widthClass} shrink-0 transition-transform duration-300 ease-out hover:-translate-y-1.5`}
      style={{ height: "330px" }}
    >
      <div className="w-full h-full" style={{ perspective: "1200px" }}>
        <div
          ref={rotRef}
          onClick={onSelect}
          className={`relative w-full h-full rounded-2xl border-2 flex flex-col cursor-pointer transition-[border-color,box-shadow] duration-200 bg-card select-none ${
            flipState.side === "back" ? "p-4" : "p-5"
          } ${selected ? tierBorderActive : tierBorderIdle}`}
          style={{
            transform: isFlatResting ? undefined : `rotateY(${flipState.deg}deg)`,
            transition: flipState.transition === "none" ? undefined : flipState.transition,
          }}
        >
          {flipState.side === "front" ? (
            <>
              {/* Sale countdown badge trên đầu (chỉ hiển thị khi có đợt Sale) */}
              {hasSale && pkg.sale_ends_at && (
                <CompactCountdown endsAt={pkg.sale_ends_at} size="md" />
              )}

              {/* Selected checkmark */}
              {selected && (
                <div className={`absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center ${tierCheckBg} shadow-sm`}>
                  <Check className="h-3 w-3 text-white" />
                </div>
              )}

              {/* Tier icon */}
              <div className={`w-11 h-11 rounded-2xl flex items-center justify-center mb-3 mt-1 transition-transform duration-300 group-hover/card:scale-110 ${tierBg}`}>
                {isElite ? <Crown className="h-6 w-6 text-amber-500" />
                  : (isPro || isTrial) ? <Zap className="h-6 w-6 text-blue-500" />
                    : <Star className="h-6 w-6 text-emerald-500" />}
              </div>

              {/* Name */}
              <p className={`font-black text-xl mb-1 ${tierColor}`}>{cardTitle}</p>

              {/* Price */}
              <div className="flex flex-col mb-1">
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

              {/* Badge thông tin bổ sung: Chiến dịch sự kiện hoặc Đặc quyền tài khoản */}
              {pkg.campaign_id ? (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gradient-to-r from-amber-500/15 via-rose-500/15 to-purple-500/15 border border-amber-500/35 text-amber-600 dark:text-amber-400 text-[11px] font-bold tracking-wide mt-2 w-fit shadow-xs">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span className="truncate max-w-[190px]">{pkg.name}</span>
                </div>
              ) : isTrial ? (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/25 text-blue-600 dark:text-blue-400 text-[11px] font-semibold tracking-wide mt-2 w-fit">
                  <Gift className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  <span>Đặc quyền khi tạo tài khoản</span>
                </div>
              ) : null}

              <div className="flex-1" />

              {/* Detail button */}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); flipTo("back"); }}
                className={`w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border border-border bg-muted/40 hover:bg-muted text-xs font-semibold text-muted-foreground transition-colors duration-200 ${detailButtonHover}`}
              >
                <Info className="h-3.5 w-3.5" />
                Chi tiết quyền lợi
              </button>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between mb-2.5">
                <p className="font-bold text-sm">
                  <span className={tierColor}>{cardTitle}</span> - Quyền lợi
                </p>
              </div>
              <div className="flex-1 space-y-1.5 select-none">
                {features.map(({ icon: Icon, label }) => (
                  <div key={label} className="flex items-center gap-2 text-xs">
                    <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center shrink-0">
                      <Icon className="h-3 w-3" />
                    </div>
                    <span className="leading-tight">{label}</span>
                  </div>
                ))}
              </div>
              {onOpenComparison && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onOpenComparison(); }}
                  className="w-full flex items-center justify-center gap-1 pt-1.5 pb-1 text-[11px] font-semibold text-primary hover:underline transition-colors"
                >
                  <span>Xem bảng so sánh đầy đủ</span>
                  <ArrowRight className="h-3 w-3" />
                </button>
              )}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); flipTo("front"); }}
                className={`w-full flex items-center justify-center gap-1.5 py-2 mt-1 rounded-xl border border-border bg-muted/40 hover:bg-muted text-xs font-semibold text-muted-foreground transition-colors duration-200 ${detailButtonHover}`}
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Quay lại mặt trước
              </button>
            </>
          )}
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
  selected = false,
  onSelect,
  onMouseEnter,
}: {
  pkg: CreditPackage;
  icon: typeof CircleDollarSign;
  colorClass: string;
  unit: string;
  onBuy: (pkg: CreditPackage) => void;
  loading: string | null;
  selected?: boolean;
  onSelect?: () => void;
  onMouseEnter?: () => void;
}) {
  const hasSale = useSaleActive(pkg.sale_percent, pkg.sale_ends_at);
  const finalPrice = hasSale ? Math.round(pkg.price_vnd * (1 - pkg.sale_percent / 100)) : pkg.price_vnd;
  const amount = pkg.coin_amount || pkg.diamond_amount;
  const isCoin = unit.toLowerCase() === "coin" || pkg.package_type === "COIN_PACK";

  const hoverCardStyles = isCoin
    ? "hover:border-emerald-600 hover:shadow-[0_0_20px_rgba(5,150,105,0.35)] hover:bg-emerald-500/[0.04]"
    : "hover:border-fuchsia-500 hover:shadow-[0_0_20px_rgba(217,70,239,0.35)] hover:bg-fuchsia-500/[0.04]";

  const activeCardStyles = isCoin
    ? "border-emerald-600 shadow-[0_0_20px_rgba(5,150,105,0.35)] bg-emerald-500/[0.04] -translate-y-0.5"
    : "border-fuchsia-500 shadow-[0_0_20px_rgba(217,70,239,0.35)] bg-fuchsia-500/[0.04] -translate-y-0.5";

  const iconBg = isCoin
    ? (selected ? "bg-emerald-500/20" : "bg-emerald-500/10 group-hover:bg-emerald-500/20")
    : (selected ? "bg-fuchsia-500/20" : "bg-fuchsia-500/10 group-hover:bg-fuchsia-500/20");

  const buttonStyle = isCoin
    ? "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-600/25"
    : "bg-gradient-to-r from-fuchsia-500 to-pink-600 hover:from-fuchsia-600 hover:to-pink-700 text-white shadow-fuchsia-500/25";

  return (
    <div
      onClick={onSelect}
      onMouseEnter={onMouseEnter}
      className={`group relative flex-shrink-0 w-[150px] min-w-[150px] rounded-2xl border-2 bg-card p-3.5 flex flex-col items-center justify-between transition-all duration-300 hover:-translate-y-0.5 cursor-pointer select-none ${
        selected ? activeCardStyles : `border-border ${hoverCardStyles}`
      }`}
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
        <p className="text-[10px] text-muted-foreground -mt-1 font-medium text-center truncate max-w-full px-1">{pkg.name}</p>
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

// ============================================================
// Logic phân định Hành động Nâng cấp / Gia hạn / Hạ cấp
// ============================================================
export const TIER_RANKS: Record<string, number> = {
  FREE: 0,
  TRIAL: 1,
  STARTER: 1,
  PRO: 2,
  ELITE: 3,
};

export interface SubscriptionActionInfo {
  type: "NEW" | "EXTEND" | "UPGRADE" | "DOWNGRADE" | "INVALID_CYCLE";
  disabled: boolean;
  buttonText: string;
  badgeText?: string;
  finalPrice: number;
  originalPrice: number;
  unusedOldValue: number;
  remainingDays: number;
  targetTier?: string | null;
  currentTier?: string | null;
}

export function getSubscriptionActionInfo(
  membership: {
    tier: string;
    packageId?: string | null;
    durationDays?: number | null;
    expiresAt?: string | null;
  },
  selectedPkg: CreditPackage | null | undefined,
  allPackages: CreditPackage[] = []
): SubscriptionActionInfo {
  if (!selectedPkg) {
    return {
      type: "NEW",
      disabled: true,
      buttonText: "Chọn gói",
      finalPrice: 0,
      originalPrice: 0,
      unusedOldValue: 0,
      remainingDays: 0,
    };
  }

  const originalPrice = getFinalPrice(selectedPkg);

  // 1. Gói Campaign
  if (selectedPkg.campaign_id) {
    const currentRank = TIER_RANKS[membership.tier?.toUpperCase()] ?? 0;
    const targetRank = TIER_RANKS[selectedPkg.tier?.toUpperCase()] ?? 1;

    // Hạ gói -> Khóa nút (Downgrade Prevention)
    if (currentRank > targetRank) {
      return {
        type: "DOWNGRADE",
        disabled: true,
        buttonText: `Đã bao gồm trong ${membership.tier}`,
        badgeText: "Đang có gói cao hơn",
        finalPrice: 0,
        originalPrice: 0,
        unusedOldValue: 0,
        remainingDays: 0,
        targetTier: selectedPkg.tier,
        currentTier: membership.tier,
      };
    }

    // Cùng hạng -> Cộng dồn thêm ngày
    const isSameTier = currentRank === targetRank && membership.tier !== "FREE";
    return {
      type: isSameTier ? "EXTEND" : (currentRank > 0 ? "UPGRADE" : "NEW"),
      disabled: false,
      buttonText: isSameTier
        ? `Cộng thêm ${selectedPkg.duration_days} ngày ${selectedPkg.tier}`
        : `Nhận quà sự kiện (${selectedPkg.duration_days} ngày)`,
      finalPrice: 0,
      originalPrice: 0,
      unusedOldValue: 0,
      remainingDays: 0,
      targetTier: selectedPkg.tier,
      currentTier: membership.tier,
    };
  }

  // 2. Gói Trial mặc định
  if (selectedPkg.is_trial) {
    const isPaidActive = membership.tier && membership.tier !== "FREE" && (!membership.expiresAt || new Date(membership.expiresAt).getTime() > Date.now());
    if (isPaidActive) {
      return {
        type: "DOWNGRADE",
        disabled: true,
        buttonText: `Đang có gói ${membership.tier}`,
        badgeText: "Chỉ dành cho tài khoản Miễn phí",
        finalPrice: 0,
        originalPrice: 0,
        unusedOldValue: 0,
        remainingDays: 0,
        targetTier: selectedPkg.tier,
        currentTier: membership.tier,
      };
    }
    return {
      type: "NEW",
      disabled: false,
      buttonText: `Dùng thử miễn phí (${selectedPkg.duration_days ?? 3} ngày)`,
      finalPrice: 0,
      originalPrice: 0,
      unusedOldValue: 0,
      remainingDays: 0,
      targetTier: selectedPkg.tier,
      currentTier: membership.tier,
    };
  }

  const isExpired = !membership.expiresAt || new Date(membership.expiresAt).getTime() <= Date.now();

  // 3. Nếu đang FREE hoặc gói cũ hết hạn -> Đăng ký mới
  if (membership.tier === "FREE" || isExpired) {
    return {
      type: "NEW",
      disabled: false,
      buttonText: `Đăng ký ${selectedPkg.name} (${formatVND(originalPrice)}${getDurationLabel(selectedPkg.duration_days)})`,
      finalPrice: originalPrice,
      originalPrice,
      unusedOldValue: 0,
      remainingDays: 0,
      targetTier: selectedPkg.tier,
      currentTier: membership.tier,
    };
  }

  const curRank = TIER_RANKS[membership.tier] ?? 0;
  const targetRank = TIER_RANKS[selectedPkg.tier ?? ""] ?? 0;

  // 4. Hạ cấp (targetRank < curRank) -> Khoá nút
  if (targetRank < curRank) {
    return {
      type: "DOWNGRADE",
      disabled: true,
      buttonText: "Đã bao gồm trong gói của bạn",
      badgeText: "Gói thấp hơn",
      finalPrice: originalPrice,
      originalPrice,
      unusedOldValue: 0,
      remainingDays: 0,
      targetTier: selectedPkg.tier,
      currentTier: membership.tier,
    };
  }

  // 5. Cùng thứ hạng gói -> Gia hạn
  if (targetRank === curRank) {
    return {
      type: "EXTEND",
      disabled: false,
      buttonText: `Gia hạn ${selectedPkg.name} (${formatVND(originalPrice)}${getDurationLabel(selectedPkg.duration_days)})`,
      badgeText: "Gia hạn thêm",
      finalPrice: originalPrice,
      originalPrice,
      unusedOldValue: 0,
      remainingDays: 0,
      targetTier: selectedPkg.tier,
      currentTier: membership.tier,
    };
  }

  // 6. Nâng cấp lên gói cao hơn (targetRank > curRank)
  const curDuration = Number(membership.durationDays) || 30;
  const targetDuration = Number(selectedPkg.duration_days) || 30;

  // Ràng buộc chu kỳ: chu kỳ gói mới phải >= chu kỳ gói đang dùng
  if (targetDuration < curDuration) {
    return {
      type: "INVALID_CYCLE",
      disabled: true,
      buttonText: `Chỉ nâng cấp chu kỳ từ ${curDuration} ngày trở lên`,
      badgeText: "Chu kỳ không hợp lệ",
      finalPrice: originalPrice,
      originalPrice,
      unusedOldValue: 0,
      remainingDays: 0,
      targetTier: selectedPkg.tier,
      currentTier: membership.tier,
    };
  }

  // Tìm gói cũ để tính giá gốc
  let oldPrice = 0;
  if (membership.packageId) {
    const oldPkg = allPackages.find((p) => p.id === membership.packageId);
    if (oldPkg && !oldPkg.is_trial) {
      oldPrice = getFinalPrice(oldPkg);
    }
  }

  const remainingMs = Math.max(0, new Date(membership.expiresAt).getTime() - Date.now());
  const remainingDays = Math.max(0, remainingMs / (24 * 60 * 60 * 1000));
  const unusedOldValue = Math.round((oldPrice / curDuration) * remainingDays);

  const diffPrice = originalPrice - unusedOldValue;
  const upgradePrice = Math.max(10000, Math.round(diffPrice));

  return {
    type: "UPGRADE",
    disabled: false,
    buttonText: `Nâng cấp lên ${selectedPkg.name} (${formatVND(upgradePrice)})`,
    badgeText: `Bù chênh lệch ${formatVND(upgradePrice)}`,
    finalPrice: upgradePrice,
    originalPrice,
    unusedOldValue,
    remainingDays: Math.ceil(remainingDays),
    targetTier: selectedPkg.tier,
    currentTier: membership.tier,
  };
}

