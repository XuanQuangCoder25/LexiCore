import React from "react";
import { Words } from "./Words";
import styles from "./Ready.module.css";

interface ReadyProps {
  cardUrl: string;
  onNavigate: (tabId?: string) => void;
}

export const Ready: React.FC<ReadyProps> = ({ cardUrl, onNavigate }) => {
  return (
    <section className={styles.ready} data-ready="section">
      {/* Background Giant Wordmark */}
      <div className={styles.wordmarkWrapper} data-ready="wordmark">
        <img
          src="/wordmark.svg"
          alt="LEXICORE"
          className={styles.wordmarkImg}
        />
      </div>

      {/* 3D Smart Card Box */}
      <div className={styles.cardBox} data-ready="card-box">
        <div className={styles.floatWrapper} data-ready="float-wrapper">
          <img
            src={cardUrl}
            alt="LexiCore 3D Smart Flashcard & Arena Pass"
            className={styles.cardImg}
            data-ready="card-img"
          />
        </div>
      </div>

      {/* Headlines (one h2 with two absolute spans) */}
      <h2 aria-label="Fluency Unlocked Before You Speak">
        <span
          className={styles.headlineUnlocked}
          aria-hidden="true"
          data-ready="unlocked"
        >
          <Words text="Fluency Unlocked" className={styles.readyWord} />
        </span>
        <span
          className={styles.headlineSpeak}
          aria-hidden="true"
          data-ready="speak"
        >
          <Words text="Before You Speak" className={styles.readyWord} />
        </span>
      </h2>

      {/* "SRS + AI" Pill */}
      <a
        href="#flashcards"
        className={styles.srsPill}
        data-ready="pill"
        onClick={(e) => {
          e.preventDefault();
          onNavigate("flashcards");
        }}
      >
        <img
          src="/icon-plus.svg"
          alt=""
          className={styles.plusIcon}
          aria-hidden="true"
        />
        <span className={styles.srsText}>SRS + AI</span>
      </a>

      {/* Lead Text on Screen 2 */}
      <p className={styles.readyText} data-ready="text">
        Build custom decks in your Private Space, clone top courses from
        Creators, challenge friends in 1v1 vocabulary battles, and never miss a
        review.
      </p>

      {/* Dark Action CTA */}
      <a
        href="#start"
        className={styles.startBtn}
        data-ready="button"
        onClick={(e) => {
          e.preventDefault();
          onNavigate("dashboard");
        }}
      >
        Start learning for free
      </a>

      {/* Scroll indicator */}
      <div className={styles.scrollMore} data-ready="scroll">
        Scroll down for more ↓
      </div>
    </section>
  );
};
