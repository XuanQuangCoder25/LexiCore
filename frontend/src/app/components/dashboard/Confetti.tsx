import { useEffect } from "react";
import confetti from "canvas-confetti";

interface ConfettiProps {
  /** Tổng thời gian hiệu ứng (ms). */
  duration?: number;
  colors?: string[];
}

const DEFAULT_COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ec4899", "#06b6d4", "#f43f5e", "#a855f7"];

/**
 * Hiệu ứng pháo giấy dùng thư viện `canvas-confetti` có sẵn trong project.
 * Hai "khẩu pháo" bắn liên tục từ hai bên trong `duration` ms.
 * Tự dọn dẹp khi unmount; thư viện tự bỏ qua nếu người dùng bật prefers-reduced-motion.
 */
export const Confetti = ({ duration = 4000, colors = DEFAULT_COLORS }: ConfettiProps) => {
  useEffect(() => {
    const end = Date.now() + duration;
    let raf = 0;

    // Đợt bắn mở đầu từ giữa màn hình
    confetti({
      particleCount: 120,
      spread: 90,
      startVelocity: 45,
      origin: { x: 0.5, y: 0.6 },
      colors,
      disableForReducedMotion: true,
    });

    const frame = () => {
      confetti({
        particleCount: 4,
        angle: 60,
        spread: 60,
        origin: { x: 0, y: 0.7 },
        colors,
        disableForReducedMotion: true,
      });
      confetti({
        particleCount: 4,
        angle: 120,
        spread: 60,
        origin: { x: 1, y: 0.7 },
        colors,
        disableForReducedMotion: true,
      });
      if (Date.now() < end) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      confetti.reset();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
};
