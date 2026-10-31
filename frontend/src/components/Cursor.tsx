import React, { useEffect, useRef, useState } from "react";
import styles from "./Cursor.module.css";

export const Cursor: React.FC = () => {
  const cursorRef = useRef<HTMLDivElement>(null);
  const [hasMouse, setHasMouse] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Only on devices with fine pointer and hover
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    if (!mq.matches) return;
    setHasMouse(true);

    document.documentElement.setAttribute("data-landing-active", "true");

    let targetX = window.innerWidth / 2;
    let targetY = window.innerHeight / 2;
    let currX = targetX;
    let currY = targetY;
    let lastTime = performance.now();
    let animId: number;

    const onPointerMove = (e: PointerEvent) => {
      targetX = e.clientX;
      targetY = e.clientY;
      setIsVisible(true);
    };

    const onMouseOut = (e: MouseEvent) => {
      if (!e.relatedTarget && !e.toElement) {
        setIsVisible(false);
      }
    };

    const loop = (now: number) => {
      const dt = Math.min(now - lastTime, 100);
      lastTime = now;

      // k = 1 - 0.7^(dt / 16.67ms)
      const k = 1 - Math.pow(0.7, dt / 16.67);
      currX += (targetX - currX) * k;
      currY += (targetY - currY) * k;

      if (cursorRef.current) {
        const rect = cursorRef.current.getBoundingClientRect();
        const halfW = rect.width / 2 || 16;
        const halfH = rect.height / 2 || 16;
        cursorRef.current.style.transform = `translate3d(${currX - halfW}px, ${currY - halfH}px, 0)`;
      }

      animId = requestAnimationFrame(loop);
    };

    window.addEventListener("pointermove", onPointerMove);
    document.addEventListener("mouseout", onMouseOut);
    animId = requestAnimationFrame(loop);

    return () => {
      document.documentElement.removeAttribute("data-landing-active");
      window.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("mouseout", onMouseOut);
      cancelAnimationFrame(animId);
    };
  }, []);

  if (!hasMouse) return null;

  return (
    <div
      ref={cursorRef}
      className={`${styles.cursor} ${isVisible ? styles.visible : ""}`}
      aria-hidden="true"
    />
  );
};
