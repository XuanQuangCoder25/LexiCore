import React, { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Portal, PortalState } from "./Portal";
import { Preloader } from "./Preloader";
import { HeroCopy } from "./HeroCopy";
import { Ready } from "./Ready";
import { Nav } from "./Nav";
import { loadAssets, LoadedImages } from "../lib/loadImages";
import { segment } from "../lib/quad";
import { authService } from "../app/services/auth-service";
import styles from "./Page.module.css";

gsap.registerPlugin(ScrollTrigger);

// Motion constants
const SCROLL_DISTANCE = 1.5; // innerHeight * 1.5
const HERO_COPY_RISE = 120; // 120 * var(--u)
const CARD_TILT_MAX_Y = 8; // degrees
const CARD_TILT_MAX_X = 6; // degrees

export const Page: React.FC = () => {
  const navigate = useNavigate();
  const [images, setImages] = useState<LoadedImages | null>(null);
  const [counterProgress, setCounterProgress] = useState(0);
  const [navTheme, setNavTheme] = useState<"light" | "dark">("light");
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const isNavigatingRef = useRef(false);
  const authCheckPromiseRef = useRef<Promise<boolean> | null>(null);

  const portalStateRef = useRef<PortalState>({
    scale: 0,
    face: 0,
    flash: 0,
    p: 0,
  });

  const mainRef = useRef<HTMLElement>(null);
  const heroCopyWrapRef = useRef<HTMLDivElement>(null);

  // Background auth check on mount
  useEffect(() => {
    let isCurrent = true;
    authCheckPromiseRef.current = (async () => {
      try {
        await authService.getMe();
        if (isCurrent) setIsAuthenticated(true);
        return true;
      } catch {
        try {
          await authService.refreshToken();
          await authService.getMe();
          if (isCurrent) setIsAuthenticated(true);
          return true;
        } catch {
          if (isCurrent) setIsAuthenticated(false);
          return false;
        }
      }
    })();

    return () => {
      isCurrent = false;
    };
  }, []);

  // Seamless Exit Transition & Auth-aware Routing
  const handleNavigate = useCallback(
    async (actionOrTab?: string) => {
      if (isNavigatingRef.current) return;
      isNavigatingRef.current = true;

      // 1. Kiểm tra trạng thái auth (chờ tối đa 250ms nếu đang check ngầm)
      let loggedIn = isAuthenticated === true;
      if (isAuthenticated === null && authCheckPromiseRef.current) {
        try {
          loggedIn = await Promise.race([
            authCheckPromiseRef.current,
            new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 250)),
          ]);
        } catch {
          loggedIn = false;
        }
      }

      // 2. Xác định đích đến và tab
      let targetPath = "/dashboard";
      let targetTab: string | undefined = undefined;

      if (actionOrTab === "account") {
        if (loggedIn) {
          targetPath = "/dashboard";
          targetTab = "profile";
        } else {
          targetPath = "/login";
        }
      } else if (actionOrTab === "start" || actionOrTab === "dashboard" || !actionOrTab) {
        if (loggedIn) {
          targetPath = "/dashboard";
          targetTab = "dashboard";
        } else {
          targetPath = "/login";
        }
      } else {
        // courses, arena, flashcards, community, creator, etc.
        targetTab = actionOrTab;
        if (loggedIn) {
          targetPath = "/dashboard";
        } else {
          targetPath = "/login";
        }
      }

      // 3. Critical Cleanup: Mở khóa cuộn trang & khôi phục con trỏ chuột hệ thống ngay lập tức
      document.documentElement.removeAttribute("data-locked");
      document.documentElement.removeAttribute("data-landing-active");
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
      document.body.style.filter = "";
      document.documentElement.style.filter = "";

      // 4. GSAP Exit Transition (0.35s, ease: power2.inOut)
      const targetElement = containerRef.current;
      const executeNavigation = () => {
        // Dọn dẹp triệt để ScrollTrigger và pin-spacers
        ScrollTrigger.getAll().forEach((t) => t.kill());
        window.scrollTo(0, 0);

        if (targetPath === "/login") {
          navigate("/login", {
            state: targetTab ? { redirectTab: targetTab } : undefined,
          });
        } else {
          navigate(targetPath, {
            state: { tab: targetTab || "dashboard" },
          });
        }
      };

      if (targetElement) {
        gsap.to(targetElement, {
          opacity: 0,
          filter: "blur(8px)",
          scale: 0.98,
          duration: 0.35,
          ease: "power2.inOut",
          onComplete: executeNavigation,
        });
      } else {
        executeNavigation();
      }
    },
    [isAuthenticated, navigate]
  );

  // Asset loading & initial scroll lock
  useEffect(() => {
    history.scrollRestoration = "manual";
    window.scrollTo(0, 0);
    document.documentElement.setAttribute("data-locked", "true");

    let isMounted = true;
    const counterObj = { val: 0 };
    const counterFollow = gsap.quickTo(counterObj, "val", {
      duration: 0.4,
      ease: "power1.out",
      onUpdate: () => {
        if (isMounted) setCounterProgress(counterObj.val);
      },
    });

    loadAssets((p) => {
      // Counter eases toward progress * 90 so it never hits 100 before decode finishes
      counterFollow(p * 90);
    })
      .then((loaded) => {
        if (isMounted) {
          setImages(loaded);
        }
      })
      .catch((err) => {
        console.error("Asset loading error, proceeding with intro anyway:", err);
        if (isMounted) {
          setImages({
            desert: "https://assets.uberdesigner.ai/portale/desert.webp",
            card: "/lexicore-card.svg",
          });
        }
      });

    return () => {
      isMounted = false;
      document.documentElement.removeAttribute("data-locked");
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    };
  }, []);

  // GSAP Context & Animations once images are loaded
  useEffect(() => {
    if (!images || !mainRef.current) return;

    ScrollTrigger.config({ ignoreMobileResize: true });

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;


    const ctx = gsap.context((self) => {
      const state = portalStateRef.current;
      const mainEl = mainRef.current;
      if (!mainEl) return;

      if (prefersReducedMotion) {
        // Reduced motion mode
        state.scale = 1;
        state.face = 1;

        gsap.to('[data-preloader="wordmark"], [data-preloader="counter"]', {
          opacity: 0,
          duration: 0.1,
        });

        gsap.to(
          '[data-intro="badge"], [data-intro="headline"], [data-intro="buttons"], [data-intro="lead"], [data-intro="nav"]',
          {
            opacity: 1,
            duration: 0.4,
            ease: "power1.out",
            onComplete: () => {
              document.documentElement.removeAttribute("data-locked");
              ScrollTrigger.refresh();
            },
          }
        );

        const proxy = { p: 0 };
        ScrollTrigger.create({
          trigger: mainEl,
          start: "top top",
          end: () => "+=" + window.innerHeight * SCROLL_DISTANCE,
          pin: true,
          scrub: true,
          animation: gsap.to(proxy, { p: 1, ease: "none" }),
          onUpdate: () => {
            state.p = proxy.p;
            const readySec = mainEl.querySelector(
              '[data-ready="section"]'
            ) as HTMLElement;
            if (readySec) {
              const op = segment(proxy.p, 0.3, 0.6);
              readySec.style.opacity = String(op);
              readySec.style.visibility = op > 0 ? "visible" : "hidden";
            }
            if (proxy.p >= 0.6) {
              setNavTheme("dark");
              gsap.to(
                '[data-ready="card-box"], [data-ready="wordmark"], [data-ready="pill"], [data-ready="text"], [data-ready="button"], [data-ready="unlocked"], [data-ready="speak"]',
                { opacity: 1, duration: 0.4 }
              );
            } else {
              setNavTheme("light");
            }
          },
        });

        return;
      }

      // Normal Full Motion Mode
      // M4: Second screen reveal timeline (initially paused)
      const readyTl = gsap.timeline({ paused: true });

      readyTl.fromTo(
        '[data-ready="card-box"]',
        { opacity: 0 },
        { opacity: 1, duration: 0.5, ease: "power1.out" },
        0
      );

      readyTl.fromTo(
        '[data-ready="float-wrapper"]',
        {
          rotationY: -70,
          rotation: 18,
          scale: 0.75,
          filter: "blur(16px) brightness(1.6)",
        },
        {
          rotationY: 0,
          rotation: 0,
          scale: 1,
          filter: "blur(0px) brightness(1)",
          duration: 1.4,
          ease: "power3.out",
          clearProps: "filter",
        },
        0
      );

      const unlockedWords = mainEl.querySelectorAll(
        '[data-ready="unlocked"] [data-word]'
      );
      if (unlockedWords.length) {
        readyTl.fromTo(
          unlockedWords,
          { opacity: 0, filter: "blur(12px)", yPercent: 25 },
          {
            opacity: 1,
            filter: "blur(0px)",
            yPercent: 0,
            duration: 0.7,
            stagger: 0.09,
            ease: "power2.out",
            clearProps: "filter,transform",
          },
          0.15
        );
      }

      const speakWords = mainEl.querySelectorAll(
        '[data-ready="speak"] [data-word]'
      );
      if (speakWords.length) {
        readyTl.fromTo(
          speakWords,
          { opacity: 0, filter: "blur(12px)", yPercent: 25 },
          {
            opacity: 1,
            filter: "blur(0px)",
            yPercent: 0,
            duration: 0.7,
            stagger: 0.09,
            ease: "power2.out",
            clearProps: "filter,transform",
          },
          0.3
        );
      }

      readyTl.fromTo(
        '[data-ready="wordmark"]',
        { opacity: 0 },
        { opacity: 1, duration: 1, ease: "power1.out" },
        0.4
      );

      readyTl.fromTo(
        '[data-ready="pill"]',
        { opacity: 0, filter: "blur(10px)" },
        {
          opacity: 1,
          filter: "blur(0px)",
          duration: 0.6,
          ease: "power2.out",
          clearProps: "filter",
        },
        0.55
      );

      readyTl.fromTo(
        '[data-ready="text"]',
        { opacity: 0, filter: "blur(10px)" },
        {
          opacity: 1,
          filter: "blur(0px)",
          duration: 0.6,
          ease: "power2.out",
          clearProps: "filter",
        },
        0.65
      );

      readyTl.fromTo(
        '[data-ready="button"]',
        { opacity: 0, filter: "blur(10px)" },
        {
          opacity: 1,
          filter: "blur(0px)",
          duration: 0.6,
          ease: "power2.out",
          clearProps: "filter",
        },
        0.75
      );

      readyTl.fromTo(
        '[data-ready="scroll"]',
        { opacity: 0, filter: "blur(10px)" },
        {
          opacity: 1,
          filter: "blur(0px)",
          duration: 0.6,
          ease: "power2.out",
          clearProps: "filter",
        },
        0.9
      );

      // Continuous float animation on card
      gsap.fromTo(
        '[data-ready="card-img"]',
        { yPercent: 0.75, rotation: -0.75 },
        {
          yPercent: -0.75,
          rotation: 0.75,
          duration: 3.2,
          ease: "sine.inOut",
          yoyo: true,
          repeat: -1,
        }
      );

      // Interactive 3D pointer tilt on card
      gsap.set('[data-ready="card-box"]', { transformPerspective: 1200 });
      const tiltY = gsap.quickTo('[data-ready="card-box"]', "rotationY", {
        duration: 0.8,
        ease: "power2.out",
      });
      const tiltX = gsap.quickTo('[data-ready="card-box"]', "rotationX", {
        duration: 0.8,
        ease: "power2.out",
      });

      const onPointerMove = (e: PointerEvent) => {
        const ry = (e.clientX / window.innerWidth - 0.5) * 2 * CARD_TILT_MAX_Y;
        const rx = -(e.clientY / window.innerHeight - 0.5) * 2 * CARD_TILT_MAX_X;
        tiltY(ry);
        tiltX(rx);
      };
      window.addEventListener("pointermove", onPointerMove);
      self.add(() => () => window.removeEventListener("pointermove", onPointerMove));

      // M1 Intro Timeline (t = 0 is when images finish decoding)
      const introTl = gsap.timeline();

      // 0 → 0.5: Counter runs to 100
      const counterProxy = { val: 90 };
      introTl.to(
        counterProxy,
        {
          val: 100,
          duration: 0.5,
          ease: "power1.out",
          onUpdate: () => setCounterProgress(counterProxy.val),
        },
        0
      );

      // 0.5: Counter fades out (0.15s, power1.in)
      introTl.to(
        '[data-preloader="counter"]',
        { opacity: 0, duration: 0.15, ease: "power1.in" },
        0.5
      );

      // 0.6: Photo and card scale from 0 to 1 around screen centre (0.85s, power2.out)
      introTl.to(
        state,
        { scale: 1, duration: 0.85, ease: "power2.out" },
        0.6
      );

      // 0.7: Preloader wordmark fades out (0.4s, power1.out)
      introTl.to(
        '[data-preloader="wordmark"]',
        { opacity: 0, duration: 0.4, ease: "power1.out" },
        0.7
      );

      // 1.05: Card's light switches on with flicker & rim flashes
      introTl.to(
        state,
        {
          keyframes: { face: [0, 0.8, 0.15, 1, 0.55, 1] },
          duration: 0.45,
          ease: "none",
        },
        1.05
      );
      introTl.to(
        state,
        {
          keyframes: { flash: [0, 1, 0] },
          duration: 0.7,
          ease: "power1.out",
        },
        1.05
      );

      // 1.1: Badge blurs in (0.6s, power2.out)
      introTl.fromTo(
        '[data-intro="badge"]',
        { opacity: 0, filter: "blur(10px)" },
        {
          opacity: 1,
          filter: "blur(0px)",
          duration: 0.6,
          ease: "power2.out",
          clearProps: "filter",
        },
        1.1
      );

      // 1.15: Nav blurs in from blur(8px)
      introTl.fromTo(
        '[data-intro="nav"]',
        { opacity: 0, filter: "blur(8px)" },
        {
          opacity: 1,
          filter: "blur(0px)",
          duration: 0.6,
          ease: "power2.out",
          clearProps: "filter",
        },
        1.15
      );

      // 1.25: Headline words sequence (0.7s, power2.out, stagger 0.09)
      const headlineWords = mainEl.querySelectorAll(
        '[data-intro="headline"] [data-word]'
      );
      introTl.set('[data-intro="headline"]', { opacity: 1 }, 1.25);
      if (headlineWords.length) {
        introTl.fromTo(
          headlineWords,
          { opacity: 0, filter: "blur(12px)", yPercent: 25 },
          {
            opacity: 1,
            filter: "blur(0px)",
            yPercent: 0,
            duration: 0.7,
            stagger: 0.09,
            ease: "power2.out",
            clearProps: "filter,transform",
          },
          1.25
        );
      }

      // 1.55: Buttons blur in
      introTl.fromTo(
        '[data-intro="buttons"]',
        { opacity: 0, filter: "blur(10px)" },
        {
          opacity: 1,
          filter: "blur(0px)",
          duration: 0.6,
          ease: "power2.out",
          clearProps: "filter",
        },
        1.55
      );

      // 1.85: Lead blurs in
      introTl.fromTo(
        '[data-intro="lead"]',
        { opacity: 0, filter: "blur(10px)" },
        {
          opacity: 1,
          filter: "blur(0px)",
          duration: 0.6,
          ease: "power2.out",
          clearProps: "filter",
        },
        1.85
      );

      // 2.3: Unlock scrolling and refresh ScrollTrigger
      introTl.add(() => {
        document.documentElement.removeAttribute("data-locked");
        ScrollTrigger.refresh();
      }, 2.3);

      // M3 Through the Portal ScrollTrigger
      const proxy = { p: 0 };
      let readyPlayed = false;

      ScrollTrigger.create({
        trigger: mainEl,
        start: "top top",
        end: () => "+=" + window.innerHeight * SCROLL_DISTANCE,
        pin: true,
        scrub: 0.6,
        invalidateOnRefresh: true,
        animation: gsap.to(proxy, { p: 1, ease: "none" }),
        onUpdate: () => {
          const p = proxy.p;
          state.p = p;

          // Hero copy moves up: translateY(calc(-120 * seg(p, 0.2, 0.8) * var(--u)))
          if (heroCopyWrapRef.current) {
            const rise = -HERO_COPY_RISE * segment(p, 0.2, 0.8);
            heroCopyWrapRef.current.style.transform = `translateY(calc(${rise} * var(--u)))`;
          }

          // Second screen fades in over seg(p, 0.79, 0.81) (visibility: hidden while 0)
          const readySec = mainEl.querySelector(
            '[data-ready="section"]'
          ) as HTMLElement;
          if (readySec) {
            const readyOp = segment(p, 0.79, 0.81);
            readySec.style.opacity = String(readyOp);
            readySec.style.visibility = readyOp > 0 ? "visible" : "hidden";
          }

          // Nav switches to dark state at p >= 0.76 and back below it
          if (p >= 0.76) {
            setNavTheme("dark");
          } else {
            setNavTheme("light");
          }

          // Ready screen reveal plays at p >= 0.8 and reverses at 2x speed below 0.74
          if (p >= 0.8 && !readyPlayed) {
            readyPlayed = true;
            readyTl.timeScale(1).play();
          } else if (p < 0.74 && readyPlayed) {
            readyPlayed = false;
            readyTl.timeScale(2).reverse();
          }
        },
      });
    });

    return () => {
      ctx.revert();
      ScrollTrigger.getAll().forEach((t) => t.kill());
      document.documentElement.removeAttribute("data-locked");
      document.documentElement.removeAttribute("data-landing-active");
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
      document.body.style.filter = "";
      document.documentElement.style.filter = "";
      window.scrollTo(0, 0);
    };
  }, [images]);

  return (
    <div className={styles.pageContainer} ref={containerRef}>
      {/* Fixed Navigation Bar */}
      <Nav theme={navTheme} onNavigate={handleNavigate} />

      {/* Outer wrapper to shield React from ScrollTrigger pin spacer */}
      <div>
        <main className={styles.main} ref={mainRef}>
          {/* Preloader Layer (z-index auto) */}
          <Preloader progress={counterProgress} />

          {/* Photo & Glass Flashcard Layers (Media z-index 1, Over z-index 3) */}
          {images && (
            <Portal
              photoUrl={images.desert}
              stateRef={portalStateRef}
            />
          )}

          {/* Hero Copy Layer (z-index 2) */}
          <div
            ref={heroCopyWrapRef}
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 2,
              pointerEvents: "none",
            }}
          >
            <HeroCopy onNavigate={handleNavigate} />
          </div>

          {/* Ready Layer: Second Screen (z-index 4) */}
          {images && (
            <Ready cardUrl={images.card} onNavigate={handleNavigate} />
          )}
        </main>
      </div>
    </div>
  );
};

