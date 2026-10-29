import React, { useState, useRef, useCallback } from "react";
import { Outlet, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import styles from "./AuthLayout.module.css";

export function AuthLayout() {
  const [tilt, setTilt] = useState({ rx: 0, ry: 0, gx: 50, gy: 50 });
  const [isHovering, setIsHovering] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const rafId = useRef<number | null>(null);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!stageRef.current) return;
    const rect = stageRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const px = (x / rect.width) * 2 - 1; // -1 to 1
    const py = (y / rect.height) * 2 - 1; // -1 to 1

    const rx = -py * 14; // degrees
    const ry = px * 16;  // degrees
    const gx = (x / rect.width) * 100;
    const gy = (y / rect.height) * 100;

    if (rafId.current) cancelAnimationFrame(rafId.current);
    rafId.current = requestAnimationFrame(() => {
      setTilt({ rx, ry, gx, gy });
      setIsHovering(true);
    });
  }, []);

  const handlePointerLeave = useCallback(() => {
    if (rafId.current) cancelAnimationFrame(rafId.current);
    rafId.current = requestAnimationFrame(() => {
      setTilt({ rx: 0, ry: 0, gx: 50, gy: 50 });
      setIsHovering(false);
    });
  }, []);

  return (
    <div className={styles.authRoot}>
      {/* ===== GLOBAL GLASS PILL BACK BUTTON ===== */}
      <Link to="/" className={styles.backHomeBtn} title="Quay về Trang chủ LexiCore">
        <ArrowLeft className={styles.backIcon} />
        <span>Trang chủ</span>
      </Link>

      {/* ===== LEFT COLUMN: 3D VISUAL SHOWCASE (DESKTOP ONLY) ===== */}
      <div
        className={styles.showcaseCol}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
      >
        {/* Ambient Aurora Glow & Grid */}
        <div className={styles.auroraGlow} aria-hidden="true" />
        <div className={styles.gridOverlay} aria-hidden="true" />

        {/* Giant Background Wordmark */}
        <img
          src="/wordmark.svg"
          alt=""
          className={styles.watermark}
          aria-hidden="true"
        />

        {/* Top Branding */}
        <div className={styles.showcaseBrand}>
          <img src="/logo.svg" alt="LexiCore" className={styles.brandLogo} />
        </div>

        {/* Center 3D Interactive Smart Card Stage */}
        <div className={styles.cardStage} ref={stageRef}>
          <div
            className={styles.cardTiltBox}
            style={{
              transform: isHovering
                ? `rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg) scale(1.03)`
                : `rotateX(0deg) rotateY(0deg) scale(1)`,
              transition: isHovering
                ? "transform 0.12s cubic-bezier(0.2, 0, 0, 1)"
                : "transform 0.6s cubic-bezier(0.22, 1, 0.36, 1)",
              ["--mouse-x" as any]: `${tilt.gx}%`,
              ["--mouse-y" as any]: `${tilt.gy}%`,
            }}
          >
            <img
              src="/lexicore-card.svg"
              alt="LexiCore 3D Smart Card"
              className={styles.cardImg}
              draggable={false}
            />
            <div className={styles.cardGlare} />
          </div>
        </div>

        {/* Bottom Feature Badge & Motivational Quote */}
        <div className={styles.showcaseBottom}>
          <div className={styles.showcaseBadge}>
            <span className={styles.badgeDot} />
            <span>AI-Powered SRS &amp; Real-time PvP Arena</span>
          </div>
          <p className={styles.showcaseQuote}>
            <strong>Khai phóng năng lực ngôn ngữ</strong> cùng thuật toán lặp lại ngắt quãng thông minh và đấu trường từ vựng thời gian thực.
          </p>
        </div>
      </div>

      {/* ===== RIGHT COLUMN: AUTH FORM CONTAINER ===== */}
      <div className={styles.formCol}>
        <div className={styles.formInner}>
          <Outlet />
        </div>
      </div>
    </div>
  );
}

export default AuthLayout;
