import React from "react";
import styles from "./Preloader.module.css";

interface PreloaderProps {
  progress: number;
}

export const Preloader: React.FC<PreloaderProps> = ({ progress }) => {
  const rounded = Math.round(progress);
  const formatted = rounded < 10 ? `0${rounded}` : `${rounded}`;

  return (
    <div className={styles.preloader} aria-hidden="true">
      <img
        src="/wordmark.svg"
        alt="LexiCore"
        className={styles.wordmark}
        data-preloader="wordmark"
      />
      <div className={styles.counter} data-preloader="counter">
        {formatted}%
      </div>
    </div>
  );
};
