"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { ScrambleText } from "./scramble-text";

export function IntroLoader() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }
    if (sessionStorage.getItem("intro-seen")) {
      return;
    }

    setShow(true);
    document.body.style.overflow = "hidden";

    const timer = window.setTimeout(() => {
      setShow(false);
      sessionStorage.setItem("intro-seen", "1");
      document.body.style.overflow = "";
    }, 1500);

    return () => {
      window.clearTimeout(timer);
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <AnimatePresence>
      {show ? (
        <motion.div
          className="intro"
          initial={{ y: 0 }}
          exit={{ y: "-100%" }}
          transition={{ duration: 0.7, ease: [0.76, 0, 0.24, 1] }}
        >
          <div className="intro-inner">
            <div className="intro-line">● SECURE BOOT</div>
            <ScrambleText as="div" className="intro-name" text="ALEX SIMPSON" duration={1100} />
            <div className="intro-bar">
              <motion.span
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 1.4, ease: "easeInOut" }}
              />
            </div>
            <div className="intro-line dim">
              INITIALIZING · SECURITY / HARDWARE / AI
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
