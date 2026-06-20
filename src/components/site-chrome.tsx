"use client";

import { motion, useScroll } from "motion/react";

export function ScrollProgress() {
  const { scrollYProgress } = useScroll();

  return (
    <motion.div
      className="scroll-progress"
      style={{ scaleX: scrollYProgress }}
      aria-hidden="true"
    />
  );
}

export function HudFrame() {
  return (
    <div className="hud" aria-hidden="true">
      <span className="hud-corner tl" />
      <span className="hud-corner tr" />
      <span className="hud-corner bl" />
      <span className="hud-corner br" />
      <span className="hud-edge left">Alex Simpson - Portfolio 2026</span>
      <span className="hud-edge right">37.87 degN 122.27 degW - Berkeley</span>
    </div>
  );
}
