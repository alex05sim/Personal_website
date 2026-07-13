"use client";

import { useRef, useState } from "react";
import { useMotionValueEvent, useScroll } from "motion/react";
import { SolarSunStage } from "./solar-sun-stage";
import { useHydratedReducedMotion } from "./portfolio/shared";

/**
 * Fixed-position mount for the 3D sun — sits where the intro's hero sun would be
 * at scroll 0, then stays large on the left through the whole project article so
 * the sun is a persistent presence (CSS handles the wide-screen right-column vs.
 * laptop ambient-dim treatment). Fades out once the article ends and the shared
 * site footer takes over, so the warm sun never bleeds over the cool footer.
 */
export function SolarPin() {
  const reduce = useHydratedReducedMotion();
  const { scrollY } = useScroll();
  const [docked, setDocked] = useState(false);
  const [hidden, setHidden] = useState(false);
  const articleRef = useRef<Element | null>(null);

  useMotionValueEvent(scrollY, "change", (y) => {
    const vh = typeof window !== "undefined" ? window.innerHeight : 800;
    setDocked(y > vh * 0.82);
    // "sunset" as the project article ends: trigger a little before the footer
    // arrives so the sink-and-dim has room to play out
    if (!articleRef.current) articleRef.current = document.querySelector(".detail");
    const article = articleRef.current;
    if (article) {
      setHidden(article.getBoundingClientRect().bottom < vh * 1.08);
    }
  });

  if (reduce) return null;

  return (
    <div
      className={`solar-pin ${docked ? "is-docked" : ""} ${hidden ? "is-hidden" : ""}`}
      aria-hidden="true"
    >
      <SolarSunStage />
    </div>
  );
}
