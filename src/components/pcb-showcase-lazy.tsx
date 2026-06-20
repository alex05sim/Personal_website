"use client";

import dynamic from "next/dynamic";

/**
 * Client-side lazy wrapper for the PCB showcase. project-detail.tsx is a Server
 * Component, where `next/dynamic({ ssr: false })` isn't allowed - so the deferral
 * lives here. This keeps three.js + postprocessing + the GLTF loader out of the
 * project page's initial bundle until the showcase mounts.
 */
export const PcbShowcase = dynamic(
  () => import("./pcb-showcase").then((m) => m.PcbShowcase),
  { ssr: false },
);
