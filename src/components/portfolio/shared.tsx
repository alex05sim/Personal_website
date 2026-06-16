"use client";

import { motion, useReducedMotion } from "motion/react";
import { type ReactNode, useEffect, useState } from "react";

/**
 * `useReducedMotion` returns the real preference only after hydration; before that
 * we return `false` so server and first client render agree (no hydration flash).
 */
export function useHydratedReducedMotion() {
  const preference = useReducedMotion();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setHydrated(true), 0);

    return () => window.clearTimeout(timer);
  }, []);

  return hydrated ? Boolean(preference) : false;
}

/** Fade/slide-in wrapper used by every section; respects reduced motion. */
export function Reveal({
  children,
  className,
  delay = 0,
  y = 24,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
}) {
  const reduceMotion = useHydratedReducedMotion();

  return (
    <motion.div
      className={className}
      initial={reduceMotion ? false : { opacity: 0, y, filter: "blur(4px)" }}
      whileInView={reduceMotion ? undefined : { opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, margin: "-70px" }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
