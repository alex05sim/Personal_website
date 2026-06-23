"use client";

import { useEffect, useState } from "react";
import { useHydratedReducedMotion } from "./portfolio/shared";

/** When a project page is reached via a homepage launch (`?from=...`), cover the
 *  screen with the warp's end-flash colour and dissolve it to reveal the page —
 *  a seamless handoff from the click-the-object zoom. Warm for the Sun, cool otherwise. */
export function ArrivalFlash() {
  const reduce = useHydratedReducedMotion();
  const [from, setFrom] = useState<string | null>(null);

  useEffect(() => {
    if (reduce) return;
    const url = new URL(window.location.href);
    const f = url.searchParams.get("from");
    if (!f) return;
    setFrom(f);
    url.searchParams.delete("from");
    window.history.replaceState({}, "", url.pathname + url.search + url.hash);
  }, [reduce]);

  if (!from) return null;
  return <div className={`arrival-flash ${from === "sun" ? "is-sun" : ""}`} aria-hidden="true" />;
}
