"use client";

import { useEffect, useRef, useState } from "react";

const GLYPHS = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789<>-_/\\[]{}#$%&*+=";
type ScrambleTag = "span" | "h1" | "h2" | "h3" | "p";

/**
 * "Decrypts" text on first scroll-into-view: characters cycle through random
 * glyphs and resolve left-to-right. A small cybersecurity flourish.
 */
export function ScrambleText({
  text,
  className,
  as: Tag = "span",
  duration = 1350,
}: {
  text: string;
  className?: string;
  as?: ScrambleTag;
  duration?: number;
}) {
  const [display, setDisplay] = useState(text);
  const ref = useRef<HTMLElement>(null);
  const started = useRef(false);
  const frameRef = useRef(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) {
      return;
    }

    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReduced) {
      const timer = window.setTimeout(() => setDisplay(text), 0);
      return () => window.clearTimeout(timer);
    }

    const animate = () => {
      const total = text.length;
      const startTime = performance.now();
      const revealPer = duration / Math.max(total, 1);

      const tick = (now: number) => {
        const elapsed = now - startTime;
        const revealed = Math.floor(elapsed / revealPer);
        let out = "";

        for (let i = 0; i < total; i += 1) {
          const ch = text[i];
          if (ch === " ") {
            out += " ";
          } else if (i < revealed) {
            out += ch;
          } else {
            out += GLYPHS[(Math.random() * GLYPHS.length) | 0];
          }
        }

        setDisplay(out);

        if (revealed < total) {
          frameRef.current = requestAnimationFrame(tick);
        } else {
          setDisplay(text);
        }
      };

      frameRef.current = requestAnimationFrame(tick);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !started.current) {
          started.current = true;
          animate();
          observer.disconnect();
        }
      },
      { threshold: 0.4 },
    );

    observer.observe(el);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(frameRef.current);
    };
  }, [text, duration]);

  const setRef = (node: HTMLElement | null) => {
    ref.current = node;
  };
  const props = { ref: setRef, className, "aria-label": text };

  if (Tag === "h1") return <h1 {...props}>{display}</h1>;
  if (Tag === "h2") return <h2 {...props}>{display}</h2>;
  if (Tag === "h3") return <h3 {...props}>{display}</h3>;
  if (Tag === "p") return <p {...props}>{display}</p>;
  return <span {...props}>{display}</span>;
}
