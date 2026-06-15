"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

export default function Template({ children }: { children: ReactNode }) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <>{children}</>;
  }

  return (
    <>
      {children}
      {/* Black panel that wipes upward to reveal each new page. It's a separate
          fixed overlay (not wrapping content), so the fixed nav is unaffected. */}
      <motion.div
        className="page-wipe"
        aria-hidden="true"
        initial={{ y: 0 }}
        animate={{ y: "-100%" }}
        transition={{ duration: 0.62, ease: [0.76, 0, 0.24, 1] }}
      />
    </>
  );
}
