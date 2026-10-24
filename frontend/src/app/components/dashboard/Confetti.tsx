import { useEffect, useRef } from "react";

interface ConfettiProps {
  /** Tổng thời gian hiệu ứng (ms). */
  duration?: number;
  colors?: string[];
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  rotation: number;
  spin: number;
  shape: "rect" | "circle";
  life: number; // 0..1 (còn lại)
  decay: number;
}

const DEFAULT_COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ec4899", "#06b6d4", "#f43f5e", "#a855f7"];

/**
 * Hiệu ứng pháo giấy bằng canvas, không phụ thuộc thư viện ngoài.
 * - Hai "khẩu pháo" bắn từ hai góc dưới, cộng thêm mưa giấy từ phía trên.
 * - Tự dừng và dọn dẹp khi kết thúc; tôn trọng prefers-reduced-motion.
 */
export const Confetti = ({ duration = 5000, colors = DEFAULT_COLORS }: ConfettiProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const dpr = window.devicePixelRatio || 1;
    let width = 0;
    let height = 0;
    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const particles: Particle[] = [];
    const rand = (min: number, max: number) => Math.random() * (max - min) + min;
    const pick = () => colors[Math.floor(Math.random() * colors.length)];

    const spawn = (x: number, y: number, angle: number, speed: number, spread: number): Particle => {
      const a = angle + rand(-spread, spread);
      const s = speed * rand(0.55, 1);
      return {
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        size: rand(6, 11),
        color: pick(),
        rotation: rand(0, Math.PI * 2),
        spin: rand(-0.3, 0.3),
        shape: Math.random() > 0.7 ? "circle" : "rect",
        life: 1,
        decay: rand(0.003, 0.007),
      };
    };

    // Hai khẩu pháo ở góc dưới
    for (let i = 0; i < 110; i++) {
      particles.push(spawn(0, height, -Math.PI / 3, rand(14, 26), 0.35));
      particles.push(spawn(width, height, (-2 * Math.PI) / 3, rand(14, 26), 0.35));
    }

    const start = performance.now();
    let last = start;
    let raf = 0;

    const tick = (now: number) => {
      const elapsed = now - start;
      const dt = Math.min((now - last) / 16.67, 3); // chuẩn hoá theo 60fps
      last = now;

      // Mưa giấy từ phía trên trong 2.5 giây đầu
      if (elapsed < 2500) {
        for (let i = 0; i < 3; i++) {
          particles.push({
            ...spawn(rand(0, width), -10, Math.PI / 2, rand(2, 5), 0.5),
            decay: rand(0.002, 0.004),
          });
        }
      }

      ctx.clearRect(0, 0, width, height);

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.vx *= 0.985;
        p.vy = p.vy * 0.985 + 0.35 * dt; // trọng lực + lực cản
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rotation += p.spin * dt;
        p.life -= p.decay * dt;

        if (p.life <= 0 || p.y > height + 20) {
          particles.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = Math.min(1, p.life * 1.5);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;
        if (p.shape === "circle") {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        }
        ctx.restore();
      }

      if (elapsed < duration && (particles.length > 0 || elapsed < 2500)) {
        raf = requestAnimationFrame(tick);
      } else {
        ctx.clearRect(0, 0, width, height);
      }
    };

    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      ctx.clearRect(0, 0, width, height);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[60]"
    />
  );
};
