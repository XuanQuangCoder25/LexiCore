import React from "react";
import styles from "./Nav.module.css";

interface NavProps {
  theme: "light" | "dark";
  onNavigate: (tabId?: string) => void;
}

const LINKS = [
  { id: "courses", label: "Courses" },
  { id: "flashcards", label: "Flashcards" },
  { id: "arena", label: "PvP Arena" },
  { id: "community", label: "Community" },
  { id: "creator", label: "Creator" },
];

export const Nav: React.FC<NavProps> = ({ theme, onNavigate }) => {
  return (
    <header className={styles.nav} data-theme={theme} data-intro="nav">
      {/* Brand Logo Mask */}
      <a
        href="/"
        className={styles.logo}
        aria-label="LexiCore home"
        onClick={(e) => {
          e.preventDefault();
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
      />

      {/* Centre Glass Navigation Pill */}
      <nav className={styles.centrePill} aria-label="Main navigation">
        {LINKS.map((link) => {
          const isActive =
            (theme === "light" && link.id === "courses") ||
            (theme === "dark" && link.id === "flashcards");

          return (
            <a
              key={link.id}
              href={`#${link.id}`}
              className={styles.navLink}
              onClick={(e) => {
                e.preventDefault();
                onNavigate(link.id);
              }}
            >
              {link.label}
              <span
                className={`${styles.activeBar} ${
                  isActive ? styles.activeBarVisible : ""
                }`}
                aria-hidden="true"
              />
            </a>
          );
        })}
      </nav>

      {/* Right Account & Action CTA */}
      <div className={styles.rightRow}>
        <a
          href="#account"
          className={styles.accountPill}
          onClick={(e) => {
            e.preventDefault();
            onNavigate("account");
          }}
        >
          <img
            src="/icon-account.svg"
            alt=""
            className={styles.accountIcon}
            aria-hidden="true"
          />
          <span className={styles.uiText}>Account</span>
        </a>

        <a
          href="#start"
          className={styles.startBtn}
          onClick={(e) => {
            e.preventDefault();
            onNavigate("start");
          }}
        >
          <span className={styles.uiText}>Start Learning</span>
        </a>
      </div>
    </header>
  );
};

