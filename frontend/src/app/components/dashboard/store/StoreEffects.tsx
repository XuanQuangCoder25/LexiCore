import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";

/** Smoothly counts from previous balance to new balance (CountDown / CountUp over 0.3s ease). */
export function AnimatedBalanceNumber({
  value,
  duration = 300,
  className = "",
}: {
  value: number;
  duration?: number;
  className?: string;
}) {
  const safeTarget = Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
  const [displayValue, setDisplayValue] = useState(safeTarget);
  const prevValueRef = useRef(safeTarget);

  useEffect(() => {
    const startVal = prevValueRef.current;
    if (startVal === safeTarget) {
      setDisplayValue(safeTarget);
      return;
    }

    let rafId = 0;
    const startTime = performance.now();

    const tick = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      // Cubic ease-out for crisp 0.3s balance transition
      const eased = 1 - Math.pow(1 - progress, 3);
      const next = Math.round(startVal + (safeTarget - startVal) * eased);
      setDisplayValue(next);

      if (progress < 1) {
        rafId = requestAnimationFrame(tick);
      } else {
        prevValueRef.current = safeTarget;
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafId);
      prevValueRef.current = safeTarget;
    };
  }, [safeTarget, duration]);

  return (
    <span className={`tabular-nums ${className}`}>
      {displayValue.toLocaleString("vi-VN")}
    </span>
  );
}

/** Shimmer skeleton grid while loading Store catalog. */
export function StoreShimmerGrid({ count = 8 }: { count?: number }) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="h-8 w-44 rounded-lg bg-muted animate-pulse" />
        <div className="h-4 w-64 rounded-md bg-muted/70 animate-pulse" />
      </div>

      <div className="h-10 w-56 rounded-lg bg-muted animate-pulse" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: count }).map((_, idx) => (
          <div
            key={idx}
            className="relative overflow-hidden rounded-xl border bg-card p-4 space-y-3"
          >
            <motion.div
              className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 dark:via-white/10 to-transparent"
              animate={{ x: ["-100%", "200%"] }}
              transition={{ duration: 1.35, repeat: Infinity, delay: (idx % 4) * 0.12, ease: "easeInOut" }}
            />
            <div className="w-full h-36 rounded-2xl bg-muted/70" />
            <div className="space-y-2 pt-1">
              <div className="h-4 w-3/4 mx-auto rounded bg-muted/80" />
              <div className="h-3 w-5/6 mx-auto rounded bg-muted/60" />
            </div>
            <div className="flex items-center justify-between pt-3 border-t">
              <div className="h-5 w-16 rounded bg-muted/80" />
              <div className="h-8 w-20 rounded-full bg-muted/80" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
