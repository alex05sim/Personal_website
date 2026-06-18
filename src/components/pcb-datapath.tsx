"use client";

import { type CSSProperties } from "react";
import { Reveal, useHydratedReducedMotion } from "./portfolio/shared";

// the real route a telemetry packet travels: sensors/GNSS → ESP32 → SX1262 → RangePi → ground station
const FLOW = "M158,82 L301,120 L496,120 L684,120 L887,120";

type FlowNode = { x: number; y: number; w: number; h: number; title: string; sub: string; c: string; cls?: string };

const NODES: FlowNode[] = [
  { x: 40, y: 60, w: 118, h: 44, title: "Sensors", sub: "BME688 · IMU", c: "43, 212, 238" },
  { x: 40, y: 136, w: 118, h: 44, title: "GNSS", sub: "MAX-M10S", c: "110, 160, 255" },
  { x: 232, y: 90, w: 138, h: 60, title: "ESP32-S3", sub: "frame · counter · HMAC", c: "246, 162, 60", cls: "is-sign" },
  { x: 430, y: 93, w: 132, h: 54, title: "SX1262", sub: "915 MHz LoRa", c: "255, 107, 107" },
  { x: 620, y: 93, w: 128, h: 54, title: "RangePi", sub: "bridge", c: "126, 224, 166" },
  { x: 812, y: 90, w: 150, h: 60, title: "Master Control", sub: "tag + replay", c: "178, 146, 255", cls: "is-verify" },
];

// solid wired links
const LINKS = [
  "M158,82 L232,108", // sensors → esp32
  "M158,158 L232,132", // gnss → esp32
  "M370,120 L430,120", // esp32 → sx1262
  "M748,120 L812,120", // rangepi → master control
];
const RF = "M562,120 L620,120"; // sx1262 → rangepi (the over-air RF hop)
const WIFI = "M301,150 C 430,232 760,232 887,150"; // esp32 → master control (Wi-Fi UDP backup)

/** Animated end-to-end datapath — sensors to ground station, with the Wi-Fi backup path. */
export function PcbDatapath() {
  const reduce = useHydratedReducedMotion();
  return (
    <Reveal className="pcb-datapath-wrap mt-16">
      <p className="kicker">Datapath</p>
      <h2 className="display mt-3 text-3xl text-white sm:text-4xl">How a packet gets home.</h2>
      <p className="lead mt-4 max-w-2xl">
        Sensors and GNSS feed the ESP32-S3, which frames a replay-protected HOPE packet and sends it over
        the SX1262 — to a RangePi bridge and the Python ground station that verifies it. A Wi-Fi UDP path
        backs up the radio for bench recovery.
      </p>
      <div className="pcb-datapath mt-6">
        <svg
          viewBox="0 0 1010 250"
          role="img"
          aria-label="Datapath: sensors and GNSS feed the ESP32-S3, which frames and signs a replay-protected packet, sends it over the SX1262 LoRa radio to a RangePi bridge and the Python Master Control ground station, with a Wi-Fi UDP backup path."
        >
          {LINKS.map((d, i) => (
            <path key={i} d={d} className="pcb-link" />
          ))}
          <path d={RF} className="pcb-link pcb-link-rf" />
          <path d={WIFI} className="pcb-link pcb-link-wifi" />
          <text x="594" y="120" className="pcb-link-lbl">RF</text>
          <text x="594" y="243" className="pcb-link-lbl pcb-link-lbl-wifi">Wi-Fi UDP backup</text>

          {NODES.map((n) => (
            <g key={n.title} className={`pcb-node ${n.cls ?? ""}`} style={{ "--n": n.c } as CSSProperties}>
              <rect x={n.x} y={n.y} width={n.w} height={n.h} rx="10" className="pcb-node-box" />
              <text x={n.x + n.w / 2} y={n.y + n.h / 2 - 3} className="pcb-node-t">
                {n.title}
              </text>
              <text x={n.x + n.w / 2} y={n.y + n.h / 2 + 14} className="pcb-node-s">
                {n.sub}
              </text>
            </g>
          ))}

          {/* the packet: travels the route, parked at the ground station under reduced motion */}
          <g className="pcb-pkt" transform={reduce ? "translate(887,120)" : undefined}>
            <circle r="11" className="pcb-pkt-glow" />
            <circle r="4.5" className="pcb-pkt-core" />
            {!reduce && (
              <animateMotion path={FLOW} dur="5s" repeatCount="indefinite" calcMode="linear" rotate="0" />
            )}
          </g>
        </svg>
      </div>
    </Reveal>
  );
}
