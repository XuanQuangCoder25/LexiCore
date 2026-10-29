import React from "react";
import { Words } from "./Words";
import styles from "./HeroCopy.module.css";

interface HeroCopyProps {
  style?: React.CSSProperties;
}

export const HeroCopy: React.FC<HeroCopyProps> = ({ style }) => {
  return (
    <div className={styles.heroCopy} style={style}>
      <div className={styles.heroColumn}>
        {/* Badge */}
        <div className={styles.badge} data-intro="badge">
          <div className={styles.badgeSquare} aria-hidden="true" />
          <span className={styles.badgeText}>
            AI-Powered SRS &amp; Real-time PvP Arena
          </span>
        </div>

        {/* Headline */}
        <h1
          className={styles.headline}
          aria-label="Master New Words Without Losing Memory"
          data-intro="headline"
        >
          <span className={styles.lineSpan} aria-hidden="true">
            <Words text="Master New Words" className={styles.headlineWord} />
          </span>
          <span className={styles.lineSpan} aria-hidden="true">
            <Words text="Without Losing Memory" className={styles.headlineWord} />
          </span>
        </h1>
      </div>

      {/* Buttons Row */}
      <div className={styles.buttonsRow} data-intro="buttons">
        <a href="#" className={styles.btnPrimary}>
          Explore Courses
        </a>
        <a href="#" className={styles.btnSecondary}>
          Try PvP Arena
        </a>
      </div>

      {/* Lead Text */}
      <p className={styles.lead} data-intro="lead">
        LexiCore is an intelligent language ecosystem built for lasting fluency.
        Master flashcards with SRS, battle live in PvP Arena, practice AI
        pronunciation, and learn together.
      </p>
    </div>
  );
};
