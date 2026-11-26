import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { formatRankName, getRankBadgeUrl } from "../../../services/arena-service";
import { Award, BookImage, BookOpen, Crown, Flame, Medal, Mic, PenTool, Swords, Target, Trophy, Users } from "lucide-react";

const RANK_COLOR_MAP: Record<string, string> = {
  BRONZE: "#cd7f32",
  SILVER: "#94a3b8",
  GOLD: "#f59e0b",
  PLATINUM_1: "#06b6d4",
  PLATINUM_2: "#22d3ee",
  SAPPHIRE_1: "#2563eb",
  SAPPHIRE_2: "#1d4ed8",
  EMERALD_1: "#10b981",
  EMERALD_2: "#059669",
  DIAMOND_1: "#38bdf8",
  DIAMOND_2: "#2dd4bf",
  MASTER_1: "#9333ea",
  MASTER_2: "#e11d48",
  MASTER_3: "#dc2626",
};

export function getRankAccentColor(rank?: string, customColor?: string): string {
  if (customColor) return customColor;
  const key = String(rank || "BRONZE").toUpperCase().trim();
  return RANK_COLOR_MAP[key] || "#cd7f32";
}

/** 1s ease-out cubic CountUp formatter for numeric profile metrics. */
export function CountUpNumber({
  value,
  duration = 1000,
  locale = true,
  className = "",
}: {
  value: number;
  duration?: number;
  locale?: boolean;
  className?: string;
}) {
  const safeTarget = Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let rafId = 0;
    const startTime = performance.now();
    setDisplayValue(0);

    const tick = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(eased * safeTarget));
      if (progress < 1) {
        rafId = requestAnimationFrame(tick);
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [safeTarget, duration]);

  return (
    <span className={`tabular-nums ${className}`}>
      {locale ? displayValue.toLocaleString("vi-VN") : displayValue}
    </span>
  );
}

/** Animated viewport-aware fill progress bar (0% -> target%, 0.8s ease-out). */
export function AnimatedProgressBar({
  percent,
  trackClassName = "h-4 w-full bg-secondary rounded-full overflow-hidden shadow-inner",
  barClassName = "h-full bg-gradient-to-r from-blue-600 via-indigo-500 to-violet-400 rounded-full relative",
  showGloss = true,
}: {
  percent: number;
  trackClassName?: string;
  barClassName?: string;
  showGloss?: boolean;
}) {
  const safePct = Math.max(0, Math.min(100, percent));

  return (
    <div className={trackClassName}>
      <motion.div
        className={barClassName}
        initial={{ width: "0%" }}
        whileInView={{ width: `${safePct}%` }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        {showGloss && <div className="absolute top-0 left-0 right-0 h-1/2 bg-white/20 rounded-full" />}
      </motion.div>
    </div>
  );
}

/** 3D Arena Rank emblem with rank-tinted drop-shadow & hover scale/glow animation. */
export function ArenaRankBadge3D({
  rank,
  accentColor,
  size = "md",
  onClick,
}: {
  rank?: string;
  accentColor?: string;
  size?: "sm" | "md" | "lg";
  onClick?: () => void;
}) {
  const resolvedRank = rank || "BRONZE";
  const color = getRankAccentColor(resolvedRank, accentColor);
  const rankLabel = formatRankName(resolvedRank);

  const dims =
    size === "lg"
      ? "h-20 w-20 p-2.5"
      : size === "sm"
        ? "h-12 w-12 p-1.5"
        : "h-16 w-16 p-2";

  return (
    <motion.div
      onClick={onClick}
      whileHover={{
        scale: 1.1,
        y: -2,
        boxShadow: `0 12px 26px -4px ${color}66, 0 0 18px ${color}55`,
      }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      style={{
        borderColor: `${color}66`,
        boxShadow: `0 8px 18px -6px ${color}50, inset 0 1px 1px rgba(255,255,255,0.45)`,
        background: `radial-gradient(circle at 30% 25%, ${color}24, transparent 70%)`,
      }}
      title={`Hạng Arena: ${rankLabel}`}
      className={`relative rounded-2xl border-2 backdrop-blur-xs flex items-center justify-center shrink-0 select-none ${dims} ${onClick ? "cursor-pointer" : ""}`}
    >
      <div
        className="absolute inset-1 rounded-xl opacity-30 pointer-events-none"
        style={{ background: `linear-gradient(135deg, ${color}33 0%, transparent 65%)` }}
      />
      <img
        src={getRankBadgeUrl(resolvedRank)}
        alt={rankLabel}
        className="relative z-10 w-full h-full object-contain"
        style={{ filter: `drop-shadow(0 4px 8px ${color}70)` }}
      />
    </motion.div>
  );
}

export function renderAchievementIcon(iconName?: string) {
  switch (iconName) {
    case "Mic":
      return <Mic className="w-5 h-5" />;
    case "BookOpen":
      return <BookOpen className="w-5 h-5" />;
    case "PenTool":
      return <PenTool className="w-5 h-5" />;
    case "Swords":
      return <Swords className="w-5 h-5" />;
    case "Trophy":
      return <Trophy className="w-5 h-5" />;
    case "Award":
      return <Award className="w-5 h-5" />;
    case "Medal":
      return <Medal className="w-5 h-5" />;
    case "Crown":
      return <Crown className="w-5 h-5" />;
    case "BookImage":
      return <BookImage className="w-5 h-5" />;
    case "Flame":
      return <Flame className="w-5 h-5" />;
    case "Users":
      return <Users className="w-5 h-5" />;
    default:
      return <Target className="w-5 h-5" />;
  }
}
