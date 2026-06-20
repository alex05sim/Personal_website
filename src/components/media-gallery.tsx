"use client";

import { useState } from "react";
import { Reveal } from "./portfolio/shared";

type MediaItem = { src: string; caption?: string; video?: boolean; fit?: "cover" | "contain" };

/** Renders project images / GIFs / video; any item whose file is missing is hidden (no broken icon). */
export function MediaGallery({ items, label = "Gallery" }: { items?: MediaItem[]; label?: string }) {
  const [broken, setBroken] = useState<Record<string, boolean>>({});
  if (!items || items.length === 0) return null;
  const visible = items.filter((it) => !broken[it.src]);
  if (visible.length === 0) return null;

  const markBroken = (src: string) => setBroken((b) => ({ ...b, [src]: true }));

  return (
    <Reveal className="detail-section mt-16">
      <p className="kicker">{label}</p>
      <div className="media-gallery mt-6">
        {visible.map((it) => (
          <figure className="media-item" key={it.src}>
            {it.video ? (
              <video
                className="media-el"
                src={it.src}
                autoPlay
                muted
                loop
                playsInline
                onError={() => markBroken(it.src)}
              />
            ) : (
              <img
                className={`media-el ${it.fit === "contain" ? "is-contain" : ""}`}
                src={it.src}
                alt={it.caption ?? ""}
                loading="lazy"
                onError={() => markBroken(it.src)}
              />
            )}
            {it.caption ? <figcaption className="media-cap">{it.caption}</figcaption> : null}
          </figure>
        ))}
      </div>
    </Reveal>
  );
}
