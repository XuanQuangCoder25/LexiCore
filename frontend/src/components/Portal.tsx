import React, { useEffect, useRef } from "react";
import {
  Quad,
  segment,
  scaleQuad,
  rectQuad,
  lerpQuad,
  quadToMatrix3d,
} from "../lib/quad";
import styles from "./Portal.module.css";

export interface PortalState {
  scale: number;
  face: number;
  flash: number;
  p: number;
}

interface PortalProps {
  photoUrl: string;
  stateRef: React.MutableRefObject<PortalState>;
}

// Smooth in-out easing for transitions
const inOut = (t: number): number => {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
};

export const Portal: React.FC<PortalProps> = ({ photoUrl, stateRef }) => {
  const mediaRef = useRef<HTMLDivElement>(null);
  const overRef = useRef<HTMLDivElement>(null);
  const photoBoxRef = useRef<HTMLDivElement>(null);
  const cardLightRef = useRef<HTMLDivElement>(null);
  const portalPlaneRef = useRef<HTMLDivElement>(null);
  const rimRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let animId: number;

    const render = () => {
      const s = stateRef.current;
      const media = mediaRef.current;
      const over = overRef.current;
      const photoBox = photoBoxRef.current;
      const cardLight = cardLightRef.current;
      const portalPlane = portalPlaneRef.current;
      const rim = rimRef.current;
      const fill = fillRef.current;

      if (!media || !over || !photoBox || !cardLight || !portalPlane || !rim || !fill) {
        animId = requestAnimationFrame(render);
        return;
      }

      // 1. Set scale on Media and Over layers
      media.style.transform = `scale(${s.scale})`;
      over.style.transform = `scale(${s.scale})`;

      const W = media.offsetWidth;
      const H = media.offsetHeight;
      const boxW = photoBox.offsetWidth;
      const boxH = photoBox.offsetHeight;
      const boxL = photoBox.offsetLeft;
      const boxT = photoBox.offsetTop;

      // 2. Map the 4 corners of the monolith from 4096x2640 image pixels
      const sx = boxW / 4096;
      const sy = boxH / 2640;

      const p0 = { x: 1738 * sx, y: 944 * sy };
      const p1 = { x: 2359 * sx, y: 994 * sy };
      const p2 = { x: 2359 * sx, y: 1984 * sy };
      const p3 = { x: 1738 * sx, y: 2052 * sy };



      const cInBox = {
        x: (p0.x + p1.x + p2.x + p3.x) / 4,
        y: (p0.y + p1.y + p2.y + p3.y) / 4,
      };

      const p = s.p;

      // 3. Camera move: scales the photo box by 1 + 0.18 × inOut(seg(p, 0, 0.7)) around C
      const camScale = 1 + 0.18 * inOut(segment(p, 0, 0.7));
      photoBox.style.transformOrigin = `${cInBox.x}px ${cInBox.y}px`;
      photoBox.style.transform = `scale(${camScale})`;

      // Center C in media layer
      const C = { x: boxL + cInBox.x, y: boxT + cInBox.y };

      const qInMedia: Quad = [
        { x: boxL + p0.x, y: boxT + p0.y },
        { x: boxL + p1.x, y: boxT + p1.y },
        { x: boxL + p2.x, y: boxT + p2.y },
        { x: boxL + p3.x, y: boxT + p3.y },
      ];

      const qCam = scaleQuad(qInMedia, C, camScale);

      // 4. Turn: blends corners towards an upright rectangle centred on C, inOut(seg(p, 0, 0.45))
      const leftH = Math.hypot(qCam[3].x - qCam[0].x, qCam[3].y - qCam[0].y);
      const rightH = Math.hypot(qCam[2].x - qCam[1].x, qCam[2].y - qCam[1].y);
      const avgH = (leftH + rightH) / 2;
      const turnH = 1.06 * avgH;
      const turnW = (turnH * 652) / 1024;
      const uprightQuad = rectQuad(C.x, C.y, turnW, turnH);
      const tTurn = inOut(segment(p, 0, 0.45));
      const qTurned = lerpQuad(qCam, uprightQuad, tTurn);

      // 5. Grow: blends towards a rectangle centred on screen, (seg(p, 0.5, 0.82))³
      const growH = Math.max(H, (W * 1024) / 652) * 1.2;
      const growW = (growH * 652) / 1024;
      const growQuad = rectQuad(W / 2, H / 2, growW, growH);
      const tGrow = Math.pow(segment(p, 0.5, 0.82), 3);
      const finalQuad = lerpQuad(qTurned, growQuad, tGrow);

      // 6. Map both planes onto the result with the same matrix3d
      const matrix = quadToMatrix3d(652, 1024, finalQuad);
      cardLightRef.current.style.transform = matrix;
      portalPlaneRef.current.style.transform = matrix;

      // 7. Opacities
      cardLight.style.opacity = String(s.face * (1 - segment(p, 0.15, 0.4)));
      rim.style.opacity = String(Math.max(s.flash, segment(p, 0.1, 0.4)));
      fill.style.opacity = String(segment(p, 0.35, 0.62));

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [stateRef]);

  return (
    <>
      {/* Media Layer (z-index 1) */}
      <div className={styles.media} ref={mediaRef}>
        <div className={styles.photoBox} ref={photoBoxRef}>
          <img
            src={photoUrl}
            alt="Desert Monolith Portal"
            className={styles.photoImg}
          />
        </div>

        {/* Card's Light Plane */}
        <div
          className={`${styles.plane} ${styles.cardLightPlane}`}
          ref={cardLightRef}
        >
          <div className={styles.cardLandscapeFace}>
            <img
              src="/card-logo.svg"
              alt="LexiCore"
              className={styles.cardLogo}
            />
            <img
              src="/card-chip.svg"
              alt="AI Neural Chip"
              className={styles.cardChip}
            />
            <span className={styles.cardTextLeft}>SERENDIPITY · C2</span>
            <span className={styles.cardTextRight}>SRS 99% · STREAK 128D</span>
          </div>
        </div>
      </div>

      {/* Over Layer (z-index 3) */}
      <div className={styles.over} ref={overRef}>
        <div
          className={`${styles.plane} ${styles.portalPlane}`}
          ref={portalPlaneRef}
        >
          <div className={styles.portalFill} ref={fillRef} />
          <div className={styles.portalRim} ref={rimRef} />
        </div>
      </div>
    </>
  );
};
