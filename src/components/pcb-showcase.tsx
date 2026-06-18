"use client";

import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { useMotionValueEvent, useReducedMotion, useScroll } from "motion/react";
import {
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Box3,
  CanvasTexture,
  Euler,
  type Group,
  type Material,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  NeutralToneMapping,
  type Object3D,
  PlaneGeometry,
  PMREMGenerator,
  Quaternion,
  Vector3,
} from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { CanvasErrorBoundary } from "./canvas-error-boundary";
import { Reveal } from "./portfolio/shared";
import { CountUp } from "./interactions";
import { PcbDatapath } from "./pcb-datapath";
import { PcbFirmware } from "./pcb-firmware";
import { PcbCrypto } from "./pcb-crypto";

const MODEL = "/pcb/hope_PCB_opt.glb";

// shared, mutable download-progress signal (read by the DOM loading overlay)
const pcbLoad = { loaded: 0, total: 0 };

const sstep = (a: number, b: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const ramp = (a: number, b: number, x: number) => Math.max(0, Math.min(1, (x - a) / (b - a)));
// ease-out-back: overshoots slightly then settles — parts "click" into place
const easeOutBack = (t: number) => {
  const c1 = 1.70158;
  const u = t - 1;
  return 1 + (c1 + 1) * u * u * u + c1 * u * u;
};
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const lerp = MathUtils.lerp;

// Top-level node-name groups (GLTFLoader sanitises spaces → underscores)
const LID = ["Enclosure_clear_lid", "Standoffs_for_enclosre"];
const BACK = ["Back_Enclosure", "Solar", "Hinges", "Antenna"];
function groupOf(name: string): "lid" | "back" | "pcb" {
  if (LID.some((n) => name.includes(n))) return "lid";
  if (BACK.some((n) => name.includes(n))) return "back";
  return "pcb";
}

// Callout anchors in board-plane fractions (a = horizontal −left/+right, b = vertical −up/+down),
// calibrated against the board's own silkscreen.
// sub = short label on the board; spec = key parts/designators (mono); desc = engineering detail.
// color/colorRgb = per-subsystem accent (blue + soft-red contrast) for the callout dot + pill.
type Callout = {
  id: string;
  label: string;
  sub: string;
  spec: string;
  desc: string;
  color: string;
  colorRgb: string;
  a: number;
  b: number;
};
const CALLOUTS: Callout[] = [
  {
    id: "compute",
    label: "Compute",
    sub: "ESP32-S3",
    spec: "ESP32-S3 · AT25SF128A QSPI flash · USB-C",
    desc: "A dual-core ESP32-S3 with external AT25SF128A flash runs the telemetry loop — polling the sensors over I²C/SPI/UART, framing each packet, and handing it to the secure element to be signed. BOOT/RESET buttons and a USB-C bridge on the left edge handle flashing and debug.",
    color: "#f6a23c",
    colorRgb: "246, 162, 60",
    a: 0.02,
    b: -0.13,
  },
  {
    id: "gnss",
    label: "GNSS",
    sub: "u-blox MAX-M10S",
    spec: "u-blox MAX-M10S · RF front end · backup supercap",
    desc: "A u-blox MAX-M10S receiver with its own RF front end and antenna connector fixes position and time. A backup supercapacitor holds the almanac between power cycles so the next fix comes faster.",
    color: "#6ea0ff",
    colorRgb: "110, 160, 255",
    a: -0.38,
    b: -0.55,
  },
  {
    id: "lora",
    label: "LoRa",
    sub: "SX1262 · 915 MHz",
    spec: "Semtech SX1262 · 915 MHz · matching net · u.FL",
    desc: "A Semtech SX1262 LoRa transceiver at 915 MHz (SF7 / 125 kHz / 14 dBm) with its own matching network and u.FL antenna. It trades bandwidth for range and power, giving the board a downlink to a ground station kilometres away — the primary telemetry path.",
    color: "#ff6b6b",
    colorRgb: "255, 107, 107",
    a: 0.38,
    b: -0.56,
  },
  {
    id: "sensors",
    label: "Sensors",
    sub: "BME688 · BNO085 · RTC",
    spec: "BME688 · BNO085 IMU · TMP117 · VEML7700 · LIS2MDL · DS3231",
    desc: "A full housekeeping suite: a Bosch BME688 (temperature, humidity, pressure, gas), a BNO085 9-axis IMU and an LIS2MDL magnetometer for attitude, a TMP117 precision thermometer, a VEML7700 ambient-light sensor, and a DS3231 real-time clock to timestamp every frame — alongside per-rail current/voltage monitors for the board's own health.",
    color: "#2bd4ee",
    colorRgb: "43, 212, 238",
    a: 0.46,
    b: 0.22,
  },
  {
    id: "power",
    label: "Power",
    sub: "Solar + battery",
    spec: "USB-C + solar · MCP73871 charger · TPS63070 · shunt monitors",
    desc: "USB-C and solar inputs feed an MCP73871 battery charger and a TPS63070 buck-boost rail, with load switches and shunt-based current monitors so the firmware can budget energy and ride out brownouts and patchy solar input.",
    color: "#7ee0a6",
    colorRgb: "126, 224, 166",
    a: -0.43,
    b: 0.22,
  },
];

// the subsystem detail grid mirrors the on-board callouts, plus the security block
// (the board's whole thesis) which has no single silkscreen marker to anchor to.
type SubInfo = { id: string; label: string; sub: string; spec: string; desc: string; color: string; colorRgb: string };
const SUBSYSTEMS: SubInfo[] = [
  ...CALLOUTS.map(({ id, label, sub, spec, desc, color, colorRgb }) => ({ id, label, sub, spec, desc, color, colorRgb })),
  {
    id: "security",
    label: "Security",
    sub: "HMAC + replay · PQ",
    spec: "HMAC-SHA256 auth · replay counter · ML-KEM/ML-DSA (liboqs)",
    desc: "Every packet carries an HMAC-SHA256 tag and a strictly-increasing per-session counter, so the ground station rejects forged or replayed frames. Sessions are set up with a post-quantum ML-KEM/ML-DSA handshake (liboqs-gated). An ATECC608A secure element sits on the board for hardware key storage — firmware integration is on the roadmap.",
    color: "#b292ff",
    colorRgb: "178, 146, 255",
  },
];

// headline metrics — count up on scroll. `value` is animated; `static` renders as-is.
// Numbers verified from the KiCad project (Hope_project.kicad_pcb / .csv) + Alex's build cost.
type Stat = {
  value?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  static?: string;
  label: string;
  colorRgb: string;
};
const STATS: Stat[] = [
  { value: 140, prefix: "~$", label: "Build cost · 1-off", colorRgb: "246, 162, 60" },
  { value: 242, label: "Components placed", colorRgb: "110, 160, 255" },
  { value: 2, suffix: "-layer", label: "PCB stackup", colorRgb: "126, 224, 166" },
  { value: 203, suffix: " mm", label: "Board · square", colorRgb: "255, 107, 107" },
  { value: 915, suffix: " MHz", label: "SX1262 LoRa", colorRgb: "43, 212, 238" },
  { value: 128, suffix: " Mb", label: "QSPI flash", colorRgb: "178, 146, 255" },
  { static: "9-axis", label: "BNO085 IMU", colorRgb: "246, 162, 60" },
  { static: "ESP32-S3", label: "WROOM-1 MCU", colorRgb: "110, 160, 255" },
];

// quick-scan spec sheet — parts confirmed against the project BOM (no fabricated numbers)
const SPECS: { k: string; v: string }[] = [
  { k: "MCU", v: "ESP32-S3-WROOM-1" },
  { k: "Flash", v: "AT25SF128A · 128 Mb" },
  { k: "Radio", v: "Semtech SX1262 · 915 MHz" },
  { k: "GNSS", v: "u-blox MAX-M10S" },
  { k: "Sensors", v: "BME688 · BNO085 · TMP117 · VEML7700 · LIS2MDL · DS3231" },
  { k: "Power", v: "USB-C + solar · MCP73871 · TPS63070" },
  { k: "Security", v: "HMAC-SHA256 · replay · ML-KEM/ML-DSA" },
  { k: "PCB", v: "2-layer · 203 mm sq · 242 parts" },
  { k: "Build", v: "~$140 · hand-soldered" },
];

// end-to-end design process (all done by Alex)
const PROCESS: { n: string; t: string; d: string }[] = [
  { n: "01", t: "Schematic", d: "Captured the design in KiCad — MCU, RF chains, power tree, and the secure element." },
  { n: "02", t: "PCB layout", d: "Placed every footprint and routed every net by hand across the board." },
  { n: "03", t: "Firmware", d: "Wrote the ESP-IDF firmware — sensor reads, HOPE packet framing, replay guard, SX1262 downlink." },
  { n: "04", t: "Assembly", d: "Hand-soldered the board and brought it up on the bench." },
];

// the software half — ESP-IDF firmware + Python ground station (facts from Alex's repo README)
type SoftItem = { id: string; title: string; tag: string; desc: string; color: string; colorRgb: string };
const SOFTWARE: SoftItem[] = [
  {
    id: "fw",
    title: "Firmware",
    tag: "C · ESP-IDF 6.0.1",
    desc: "FreeRTOS tasks drive the SX1262 LoRa radio and a UART GNSS parser that validates NMEA checksums and tracks fix age, HDOP, altitude, speed, course, and UTC.",
    color: "#f6a23c",
    colorRgb: "246, 162, 60",
  },
  {
    id: "gs",
    title: "Ground station",
    tag: "Python · Master Control",
    desc: "A browser + classic Tk dashboard adds, pairs, audits, and exports fleet nodes, with a hardware bring-up panel that checks links, GNSS quality, the command queue, and the replay guard.",
    color: "#6ea0ff",
    colorRgb: "110, 160, 255",
  },
  {
    id: "bridge",
    title: "RangePi bridge",
    tag: "SX1262 ↔ USB serial",
    desc: "A RangePi with a matching SX1262 relays packets over a simple serial contract — TX hex out, RX hex with RSSI/SNR back — so the dashboard talks to the board over real RF.",
    color: "#2bd4ee",
    colorRgb: "43, 212, 238",
  },
  {
    id: "transport",
    title: "Transports",
    tag: "LoRa · Wi-Fi · auto",
    desc: "The same packet bytes ride LoRa, Wi-Fi UDP, or an auto mode that falls back to Wi-Fi after repeated LoRa TX failures — switchable live from the console.",
    color: "#7ee0a6",
    colorRgb: "126, 224, 166",
  },
  {
    id: "proto",
    title: "HOPE protocol",
    tag: "6 types · replay-guarded",
    desc: "One versioned packet frame for telemetry, commands, ACKs, diagnostics, and lattice handshakes. Strictly-increasing per-session counters reject stale or duplicate packets; telemetry ships as a 12-byte v1 or 36-byte v2 payload.",
    color: "#ff6b6b",
    colorRgb: "255, 107, 107",
  },
  {
    id: "pq",
    title: "Post-quantum",
    tag: "ML-KEM · ML-DSA",
    desc: "A session-rotate handshake exchanges ML-KEM public keys and ML-DSA signatures (liboqs) to derive a fresh session. The ground station verifies; the ESP32 path is wired and liboqs-gated.",
    color: "#b292ff",
    colorRgb: "178, 146, 255",
  },
];

// per-part disassembly descriptor (staggered tiers → punchier explosion)
type Part = { node: Object3D; orig: Vector3; dir: Vector3; start: number; end: number; dist: number };

// drag-to-rotate state, shared between the DOM canvas and the render loop
type DragState = {
  active: boolean;
  dragged: boolean;
  lastX: number;
  lastY: number;
  targetYaw: number;
  targetPitch: number;
  yaw: number;
  pitch: number;
};

function PcbModel({
  progressRef,
  reduced,
  coarse,
  dragRef,
  calloutEls,
  captionEls,
  morphEls,
  onReady,
}: {
  progressRef: RefObject<number>;
  reduced: boolean;
  coarse: boolean;
  dragRef: RefObject<DragState>;
  calloutEls: RefObject<(HTMLElement | null)[]>;
  captionEls: RefObject<(HTMLElement | null)[]>;
  morphEls: RefObject<(HTMLElement | null)[]>;
  onReady: () => void;
}) {
  const gltf = useLoader(
    GLTFLoader,
    MODEL,
    (loader) => {
      (loader as GLTFLoader).setMeshoptDecoder(MeshoptDecoder);
    },
    (event) => {
      if (event.lengthComputable) {
        pcbLoad.loaded = event.loaded;
        pcbLoad.total = event.total;
      }
    },
  ) as GLTF;
  const { gl, scene: rootScene, camera, size } = useThree();
  const rootRef = useRef<Group>(null);

  // signal the DOM loading overlay that the model is ready to fade out
  useEffect(() => {
    onReady();
  }, [onReady]);

  const rig = useMemo(() => {
    const s = gltf.scene;
    s.scale.set(1, 1, 1);
    s.position.set(0, 0, 0);
    s.rotation.set(0, 0, 0);
    s.updateMatrixWorld(true);

    const topName = (o: Object3D) => {
      let t = o;
      while (t.parent && t.parent !== s) t = t.parent;
      return t.name || o.name;
    };
    const boxOf = (match: (n: string) => boolean) => {
      const b = new Box3();
      s.traverse((o) => {
        if ((o as Mesh).isMesh && match(topName(o))) b.expandByObject(o);
      });
      return b;
    };

    // Robust envelope: only the clean outer shells (ignores stray PCB_Body / Silkscreen / Hinges geometry)
    const env = boxOf((n) => n === "Enclosure_clear_lid" || n === "Back_Enclosure");
    const envSz = env.getSize(new Vector3());
    const envCtr = env.getCenter(new Vector3());
    const scaleK = 3.2 / Math.max(envSz.x, envSz.y, envSz.z);
    s.scale.setScalar(scaleK);
    s.position.set(-envCtr.x * scaleK, -envCtr.y * scaleK, -envCtr.z * scaleK);
    s.updateMatrixWorld(true);

    // lift direction = clear-lid min-extent world axis, signed away from the back enclosure
    const lidBox = boxOf((n) => n === "Enclosure_clear_lid");
    const lidSz = lidBox.getSize(new Vector3());
    const lidC = lidBox.getCenter(new Vector3());
    const backC = boxOf((n) => n === "Back_Enclosure").getCenter(new Vector3());
    const mn = Math.min(lidSz.x, lidSz.y, lidSz.z);
    const liftDir = new Vector3(mn === lidSz.x ? 1 : 0, mn === lidSz.y ? 1 : 0, mn === lidSz.z ? 1 : 0);
    if (liftDir.dot(new Vector3().subVectors(lidC, backC)) < 0) liftDir.negate();

    // back panel slides along the in-plane lid→back axis (long axis of the open book)
    const backDir = new Vector3().subVectors(lidC, backC);
    backDir.setComponent(liftDir.x ? 0 : liftDir.y ? 1 : 2, 0);
    backDir.normalize();
    // back parts also drop slightly out of plane as they slide away
    const backTravel = new Vector3().copy(backDir).addScaledVector(liftDir, -0.55).normalize();

    // classify top-level parts into staggered tiers; snapshot original positions
    const parts: Part[] = [];
    for (const child of [...s.children]) {
      const orig = child.position.clone();
      child.userData.orig = orig;
      const nm = child.name;
      // hide the small hardware that reads as scattered debris (screws, hinges, antenna)
      if (/screw/i.test(nm) || /hinge/i.test(nm) || /antenna/i.test(nm)) {
        child.visible = false;
        parts.push({ node: child, orig, dir: liftDir, start: 0, end: 0, dist: 0 });
        continue;
      }
      const g = groupOf(nm);
      if (g === "lid") {
        // standoffs follow, the clear lid floats highest — a tidy teardown
        const tier = /standoff/i.test(nm) ? 1 : 2;
        const dist = [1.3, 1.9, 2.5][tier];
        const start = 0.3 + tier * 0.05;
        parts.push({ node: child, orig, dir: liftDir, start, end: start + 0.3, dist });
      } else if (g === "back") {
        // solar leads, the back enclosure shell trails — kept close so nothing flies off
        const lead = !/Back_Enclosure/i.test(nm);
        const start = 0.42 + (lead ? 0 : 0.06);
        parts.push({
          node: child,
          orig,
          dir: backTravel,
          start,
          end: start + 0.34,
          dist: lead ? 1.7 : 1.6,
        });
      } else if (/batter/i.test(nm)) {
        // give the batteries a small lift so the finale has some life
        parts.push({ node: child, orig, dir: liftDir, start: 0.5, end: 0.82, dist: 0.7 });
      } else {
        // board layers / standoffs / screws stay put — this is the focus target
        parts.push({ node: child, orig, dir: liftDir, start: 0, end: 0, dist: 0 });
      }
    }

    // populated board (Component30) centre + in-plane axes for callout anchors
    const compBox = boxOf((n) => n.includes("Component30"));
    const pcbCenter = compBox.isEmpty() ? lidC.clone() : compBox.getCenter(new Vector3());
    const compSz = compBox.getSize(new Vector3());
    const inPlane: { v: Vector3; half: number }[] = [];
    const AX = [new Vector3(1, 0, 0), new Vector3(0, 1, 0), new Vector3(0, 0, 1)];
    const SZ = [compSz.x, compSz.y, compSz.z];
    for (let i = 0; i < 3; i++) {
      if (Math.abs(liftDir.getComponent(i)) < 0.5) inPlane.push({ v: AX[i], half: SZ[i] / 2 });
    }
    const anchors = CALLOUTS.map((c) =>
      pcbCenter
        .clone()
        .addScaledVector(inPlane[0].v, c.a * inPlane[0].half)
        .addScaledVector(inPlane[1].v, c.b * inPlane[1].half)
        .addScaledVector(liftDir, 0.3),
    );

    // orientation quaternions (robust — no Euler guessing)
    const qHero = new Quaternion().setFromEuler(new Euler(-0.52, 0.55, 0));
    const qFocus = new Quaternion().setFromUnitVectors(liftDir, new Vector3(0, 0, 1));

    // ── soft contact shadow (faked, parented to the rig so it tracks rotation) ──
    const shadowTex = makeShadowTexture();
    const planeSpan = Math.max(envSz.x, envSz.y, envSz.z) * scaleK * 1.5;
    const shadow = new Mesh(
      new PlaneGeometry(planeSpan, planeSpan),
      new MeshBasicMaterial({
        map: shadowTex,
        transparent: true,
        depthWrite: false,
        opacity: 0.55,
        toneMapped: false,
      }),
    );
    shadow.quaternion.setFromUnitVectors(new Vector3(0, 0, 1), liftDir);
    const halfLift = (envSz.x * liftDir.x + envSz.y * liftDir.y + envSz.z * liftDir.z) * scaleK * 0.5;
    shadow.position.copy(liftDir).multiplyScalar(-(Math.abs(halfLift) + 0.12));
    shadow.renderOrder = -1;

    // ── materials / lighting polish ────────────────────────────────
    // soft studio reflections; Khronos PBR-Neutral tone mapping rolls highlights off
    // gracefully (no clipped-white blowout, no over-saturated cyan) — product-render look.
    const pmrem = new PMREMGenerator(gl);
    rootScene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    rootScene.environmentIntensity = 0.58;
    gl.toneMapping = NeutralToneMapping;
    gl.toneMappingExposure = 0.74;

    // ── product-render material palette (dark studio) ──────────────
    // Replace the hero solids with a deliberate, cohesive palette; everything else keeps its
    // imported colour but is pushed to a SATIN finish (roughness up, reflections down) so no
    // panel clips to white under the lights. The board's silkscreen/copper/soldermask are
    // separate geometry, so taming reflectivity keeps every trace and label legible.
    const tame = (mat: Material) => {
      const m = mat as MeshStandardMaterial;
      // push roughness high so tiny SMD parts don't throw specular glints (read as "debris")
      if ("roughness" in m) m.roughness = Math.min(1, Math.max(m.roughness ?? 0.5, 0.65));
      if ("metalness" in m && (m.metalness ?? 0) < 0.5) m.metalness = 0; // plastics fully diffuse
      if ("envMapIntensity" in m) m.envMapIntensity = 0.4;
      m.needsUpdate = true;
    };
    const apply = (o: Mesh, mat: Material) => {
      o.material = Array.isArray(o.material) ? o.material.map(() => mat) : mat;
    };
    // the floating lid assembly is faded + hidden at the bird's-eye hand-off so it clears the board
    const fadeMats: { mesh: Mesh; mat: MeshStandardMaterial; base: number }[] = [];
    // the flat soldermask layer — its projected screen rect sizes the layout overlay 1:1
    let rectMesh: Mesh | null = null;
    // silkscreen materials — faded in for the finale so they don't float as dots during teardown
    const silkMats: MeshStandardMaterial[] = [];
    // ONE shared anodized metal-black tone + finish for BOTH enclosure shells
    // (Component30 = front shell / board backing, Back_Enclosure = back shell) so they can never
    // diverge in colour again. Satin (not glossy) so the front shell stays a clean dark backing
    // for the board→layout cross-fade. The clear glass lid is separate and stays clear.
    const ENC = 0x1c1e22;
    const encMat = () =>
      new MeshStandardMaterial({ color: ENC, metalness: 0.78, roughness: 0.55, envMapIntensity: 0.5 });

    s.traverse((obj) => {
      const o = obj as Mesh;
      if (!o.isMesh) return;
      const tn = topName(o);

      if (tn === "Enclosure_clear_lid") {
        // genuinely clear glass lid (light tint) — independent of the black tray; tamed env
        const lidMat = coarse
          ? new MeshPhysicalMaterial({
              color: 0xc2d2e6,
              metalness: 0,
              roughness: 0.16,
              transparent: true,
              opacity: 0.38,
              clearcoat: 1,
              clearcoatRoughness: 0.18,
              envMapIntensity: 0.8,
            })
          : new MeshPhysicalMaterial({
              color: 0xdfe8f2,
              metalness: 0,
              roughness: 0.08,
              transmission: 1,
              thickness: 0.5,
              ior: 1.45,
              transparent: true,
              clearcoat: 1,
              clearcoatRoughness: 0.12,
              envMapIntensity: 0.95,
            });
        apply(o, lidMat);
      } else if (tn === "Back_Enclosure") {
        // back enclosure shell — identical metal-black material as the front shell (Component30)
        apply(o, encMat());
      } else if (tn === "Solar") {
        // deep solar-cell blue with a glassy clearcoat — pops against the black shells
        apply(
          o,
          new MeshPhysicalMaterial({
            color: 0x163a82,
            metalness: 0.55,
            roughness: 0.3,
            clearcoat: 1,
            clearcoatRoughness: 0.2,
            envMapIntensity: 0.9,
          }),
        );
      } else if (/batter/i.test(tn)) {
        // muted gunmetal cells
        apply(o, new MeshStandardMaterial({ color: 0x43464c, metalness: 0.65, roughness: 0.52, envMapIntensity: 0.5 }));
      } else if (tn.includes("Standoffs_for_enclosre")) {
        // lid standoffs — dark metal to match the black enclosure shells (no silver bits)
        apply(o, new MeshStandardMaterial({ color: 0x24272c, metalness: 0.8, roughness: 0.5, envMapIntensity: 0.5 }));
      } else if (tn.includes("Component30")) {
        // FRONT enclosure shell (anodized aluminium body) — NOT the board. Same metal-black material
        // as Back_Enclosure so the two shells match; doubles as the dark backing the board → layout
        // cross-fade resolves over, so it stays satin (no glints) and keeps its non-fading role.
        apply(o, encMat());
      } else if (tn === "PCB_SolderMask") {
        // dark soldermask overlay (subtle PCB-green undertone) — its flat outline sizes the layout
        apply(
          o,
          new MeshStandardMaterial({ color: 0x16231d, metalness: 0.0, roughness: 0.75, envMapIntensity: 0.25 }),
        );
        rectMesh = o;
      } else if (tn === "PCB_Silkscreen") {
        // bright matte white silkscreen — faded IN for the finale (see silkMats); during the dark
        // teardown the tiny designators would otherwise read as floating "dots" on the near-black board
        const skm = new MeshStandardMaterial({
          color: 0xe9edf3,
          metalness: 0,
          roughness: 0.85,
          envMapIntensity: 0.2,
          transparent: true,
          opacity: 0,
        });
        silkMats.push(skm);
        apply(o, skm);
      } else if (tn === "PCB_Copper") {
        // copper-toned routing so the traces read as real engineering
        apply(
          o,
          new MeshStandardMaterial({ color: 0xb98a4e, metalness: 0.7, roughness: 0.45, envMapIntensity: 0.5 }),
        );
      } else {
        // populated components (PCB_Body), standoffs — keep colour, satin
        const mat = o.material;
        if (Array.isArray(mat)) mat.forEach(tame);
        else if (mat) tame(mat);
      }
    });

    // Everything that isn't the bare PCB is enclosure: hard-hide the small debris at mesh level
    // (screws/hinges/antenna), and collect the rest (lid, tray, solar, batteries, standoffs) so the
    // whole enclosure dissolves at the hand-off — leaving only the board to cross-fade into its layout.
    const isBoard = (n: string) =>
      n.includes("Component30") ||
      n === "PCB_SolderMask" ||
      n === "PCB_Silkscreen" ||
      n === "PCB_Copper" ||
      n === "PCB_Body";
    s.traverse((obj) => {
      const o = obj as Mesh;
      if (!o.isMesh) return;
      const tn = topName(o);
      if (isBoard(tn)) return;
      if (/screw|hinge|antenna|batter/i.test(tn)) {
        o.visible = false; // debris/batteries — hidden for good (read as stray "stadium" cylinders)
        return;
      }
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const mat of mats) {
        if (!mat) continue;
        (mat as MeshStandardMaterial).transparent = true;
        fadeMats.push({ mesh: o, mat: mat as MeshStandardMaterial, base: (mat as MeshStandardMaterial).opacity ?? 1 });
      }
    });

    return { parts, liftDir, scaleK, pcbCenter, anchors, qHero, qFocus, shadow, fadeMats, rectMesh, silkMats };
  }, [gltf, gl, rootScene, coarse]);

  // scratch objects (avoid per-frame allocation)
  const tmpQ = useRef(new Quaternion()).current;
  const yawQ = useRef(new Quaternion()).current;
  const userQ = useRef(new Quaternion()).current;
  const userE = useRef(new Euler()).current;
  const target = useRef(new Vector3()).current;
  const camOff = useRef(new Vector3()).current;
  const proj = useRef(new Vector3()).current;
  const boardBox = useRef(new Box3()).current;
  const corner = useRef(new Vector3()).current;
  const spin = useRef(0); // accumulated idle auto-orbit angle (radians)

  useFrame((state, delta) => {
    const root = rootRef.current;
    if (!root) return;
    const { parts, scaleK, pcbCenter, anchors, qHero, qFocus, shadow, fadeMats, rectMesh, silkMats } = rig;

    // raw scroll progress drives two stages: the 3D teardown finishes by MORPH, then the
    // last stretch cross-dissolves the board into its KiCad layout (the "zoom into the board").
    const praw = reduced ? 0 : (progressRef.current ?? 0);
    const MORPH = 0.78;
    const p = praw <= 0 ? 0 : Math.min(1, praw / MORPH);
    // two-stage hand-off: first STRAIGHTEN the board dead-on + clear the blur, THEN do a crisp
    // 1:1 cross-dissolve into the flat layout (so it reads as the board resolving, not a fade).
    const mStraight = reduced ? 0 : sstep(MORPH, 0.9, praw);
    const mFade = reduced ? 0 : sstep(0.9, 0.99, praw);
    const focus = sstep(0.5, 1, p);

    // orientation: gentle idle sway near the top until the user grabs it, then
    // slerp hero → chip-side-facing-camera as you scroll
    const drag = dragRef.current;
    // continuous 360° idle auto-orbit near the top — keeps spinning until you grab it (drag) or
    // scroll in (idle→0 freezes the spin; the slerp to qFocus then takes over for the finale)
    const idle = drag?.dragged ? 0 : 1 - sstep(0, 0.3, p);
    spin.current += delta * 0.6 * idle;
    const t = state.clock.elapsedTime;
    userE.set(Math.sin(t * 0.4) * 0.08 * idle, spin.current, 0);
    yawQ.setFromEuler(userE);
    tmpQ.copy(qHero).premultiply(yawQ);
    root.quaternion.slerpQuaternions(tmpQ, qFocus, focus);

    // user orbit: smooth toward the pointer target and HOLD there (no snap-back), so
    // you can freely spin the board from the start; influence fades into the finale
    // so the drag never fights the close-up choreography
    if (drag) {
      drag.yaw = lerp(drag.yaw, drag.targetYaw, 0.18);
      drag.pitch = lerp(drag.pitch, drag.targetPitch, 0.18);
      const di = reduced ? 0 : 1 - sstep(0.55, 0.95, p);
      if (di > 0.001 && (Math.abs(drag.yaw) > 0.0005 || Math.abs(drag.pitch) > 0.0005)) {
        userE.set(drag.pitch * di, drag.yaw * di, 0);
        userQ.setFromEuler(userE);
        root.quaternion.premultiply(userQ);
      }
    }

    // staggered explode — each part has its own window + a small settle overshoot
    for (const part of parts) {
      if (part.dist === 0) {
        part.node.position.copy(part.orig);
        continue;
      }
      const t = easeOutBack(ramp(part.start, part.end, p));
      part.node.position.copy(part.orig).addScaledVector(part.dir, (t * part.dist) / scaleK);
    }

    // contact shadow softens away as the board lifts free and turns to camera
    const sMat = shadow.material as MeshBasicMaterial;
    sMat.opacity = 0.55 * (1 - focus * 0.7);

    // dissolve the ENTIRE enclosure (lid, standoffs, back tray, solar, batteries) before the
    // bird's-eye hand-off, so only the bare board is left to cross-fade 1:1 into its flat layout
    const encFade = reduced ? 0 : sstep(0.72, 0.86, praw);
    for (const f of fadeMats) {
      f.mat.opacity = f.base * (1 - encFade);
      f.mesh.visible = encFade < 0.999;
    }
    // fade the silkscreen in as the board turns to the finale (hidden during the dark teardown,
    // full white for the close-up + the 1:1 cross-fade into the layout)
    const silkO = reduced ? 0 : sstep(0.52, 0.7, p);
    for (const sm of silkMats) sm.opacity = silkO;

    // camera: frame whole assembly → 3/4 finale → straighten DEAD-ON for the layout hand-off
    root.updateMatrixWorld(true);
    target.copy(pcbCenter).applyMatrix4(root.matrixWorld).multiplyScalar(focus);
    // drop the y-lift to 0 as we straighten so the board faces the camera flat (no trapezoid)
    const camY = lerp(0.25, 0.55, focus) * (1 - mStraight);
    const dist = lerp(8.2, 4.0, focus) - mStraight * 0.7; // push in a touch as it flattens
    camOff.set(0, camY, 1).normalize().multiplyScalar(dist);
    camera.position.copy(target).add(camOff);
    // pan the board to the RIGHT during hero/teardown so it clears the left caption column,
    // easing back to centred by the finale (focus→1) so the morph/callouts stay aligned.
    // Only on wide LANDSCAPE viewports — on narrow/portrait the caption drops to the bottom (CSS)
    // and the board stays centred, so a pan would just shove it off-screen.
    const wide = !coarse && size.width >= 1280 && size.width >= size.height * 1.3;
    const panX = wide ? (1 - focus) * -1.7 : 0;
    camera.position.x += panX;
    target.x += panX;
    camera.lookAt(target);

    // callouts: project anchors → DOM, reveal across the finale
    const els = calloutEls.current;
    if (els) {
      for (let i = 0; i < anchors.length; i++) {
        const el = els[i];
        if (!el) continue;
        const appear = sstep(0.68 + i * 0.04, 0.78 + i * 0.04, p);
        proj.copy(anchors[i]).applyMatrix4(root.matrixWorld).project(camera);
        const onScreen = proj.z < 1 && appear > 0.01;
        const x = (proj.x * 0.5 + 0.5) * size.width;
        const y = (-proj.y * 0.5 + 0.5) * size.height;
        // keep callouts through the morph — they're projected from the anchors, which stay locked to
        // the layout's rect, so they carry onto the flat layout and remain tappable
        el.style.opacity = onScreen ? String(appear) : "0";
        el.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px)`;
      }
    }

    // captions + scroll hint: driven by the same progress, one frame, one source
    const caps = captionEls.current;
    if (caps) {
      // clear the 3D captions before the layout caption arrives (avoids overlap)
      const fade = reduced ? 0 : 1 - sstep(0.78, 0.87, praw);
      const o0 = 1 - sstep(0.22, 0.34, p);
      const o1 = reduced ? 0 : Math.min(sstep(0.34, 0.44, p), 1 - sstep(0.52, 0.6, p));
      const o2 = reduced ? 0 : sstep(0.62, 0.72, p);
      const oh = reduced ? 0 : 1 - sstep(0, 0.1, p);
      if (caps[0]) caps[0].style.opacity = String(o0 * fade);
      if (caps[1]) caps[1].style.opacity = String(o1 * fade);
      if (caps[2]) caps[2].style.opacity = String(o2 * fade);
      if (caps[3]) caps[3].style.opacity = String(oh * fade);
    }

    // morph overlay: lock the flat layout EXACTLY onto the board's projected rectangle so the
    // shared silkscreen never moves — the cross-dissolve then reads as the board resolving, not a swap
    const morph = morphEls.current;
    if (morph) {
      const layout = morph[0];
      if (layout && rectMesh && praw > 0.6) {
        boardBox.setFromObject(rectMesh);
        const { min, max } = boardBox;
        let minX = Infinity,
          minY = Infinity,
          maxX = -Infinity,
          maxY = -Infinity;
        for (let i = 0; i < 8; i++) {
          corner.set(i & 1 ? max.x : min.x, i & 2 ? max.y : min.y, i & 4 ? max.z : min.z).project(camera);
          const sx = (corner.x * 0.5 + 0.5) * size.width;
          const sy = (-corner.y * 0.5 + 0.5) * size.height;
          if (sx < minX) minX = sx;
          if (sx > maxX) maxX = sx;
          if (sy < minY) minY = sy;
          if (sy > maxY) maxY = sy;
        }
        layout.style.left = `${minX}px`;
        layout.style.top = `${minY}px`;
        layout.style.width = `${maxX - minX}px`;
        layout.style.height = `${maxY - minY}px`;
      }
      if (layout) layout.style.opacity = String(mFade);
      // cross-dissolve: fade the whole 3D canvas OUT as the layout fades IN, so the board's frame
      // and anything else dissolves cleanly instead of lingering behind the flat layout
      const canvas = morph[2];
      if (canvas) canvas.style.opacity = String(1 - mFade);
      const cap = morph[1];
      if (cap) cap.style.opacity = String(reduced ? 0 : sstep(0.93, 0.99, praw));
    }
  });

  return (
    <group ref={rootRef}>
      <primitive object={gltf.scene} />
      <primitive object={rig.shadow} />
    </group>
  );
}

// radial gradient → a soft round contact shadow, drawn once on a canvas texture
function makeShadowTexture() {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, "rgba(0,0,0,0.85)");
    g.addColorStop(0.55, "rgba(0,0,0,0.4)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  }
  const tex = new CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

function Scene({
  progressRef,
  reduced,
  coarse,
  dragRef,
  calloutEls,
  captionEls,
  morphEls,
  onReady,
}: {
  progressRef: RefObject<number>;
  reduced: boolean;
  coarse: boolean;
  dragRef: RefObject<DragState>;
  calloutEls: RefObject<(HTMLElement | null)[]>;
  captionEls: RefObject<(HTMLElement | null)[]>;
  morphEls: RefObject<(HTMLElement | null)[]>;
  onReady: () => void;
}) {
  // No postprocessing: bloom + depth-of-field both turned tiny SMD specular glints into floating
  // "debris" dots. Clean materials + tone mapping carry the look instead.
  return (
    <Canvas
      camera={{ position: [0, 2, 8.2], fov: 38 }}
      dpr={coarse ? [1, 1.4] : [1, 1.8]}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
    >
      <ambientLight intensity={0.14} />
      <directionalLight position={[5, 8, 6]} intensity={1.25} color="#ffffff" />
      {/* cool rim lights define the black-metal enclosure edges so it doesn't read as a void */}
      <directionalLight position={[-6, 1, -4]} intensity={0.65} color="#cdd8e6" />
      <directionalLight position={[2, -5, -3]} intensity={0.34} color="#cdd8e6" />
      <directionalLight position={[-3, 3, 6]} intensity={0.48} color="#ffffff" />
      <Suspense fallback={null}>
        <PcbModel
          progressRef={progressRef}
          reduced={reduced}
          coarse={coarse}
          dragRef={dragRef}
          calloutEls={calloutEls}
          captionEls={captionEls}
          morphEls={morphEls}
          onReady={onReady}
        />
      </Suspense>
    </Canvas>
  );
}

// branded loading overlay (DOM, sits over the canvas until the model resolves)
function PcbLoader() {
  const [pct, setPct] = useState(0);
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const p = pcbLoad.total > 0 ? pcbLoad.loaded / pcbLoad.total : 0;
      setPct(Math.min(99, Math.round(p * 100)));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <div className="pcb-loader" aria-hidden="true">
      <div className="pcb-loader-bar">
        <span style={{ width: `${pct}%` }} />
      </div>
      <p className="kicker pcb-loader-label">Assembling board… {pct}%</p>
    </div>
  );
}

export function PcbShowcase() {
  const reduced = Boolean(useReducedMotion());
  const sectionRef = useRef<HTMLElement>(null);
  const progressRef = useRef(0);
  const calloutEls = useRef<(HTMLElement | null)[]>([]);
  const captionEls = useRef<(HTMLElement | null)[]>([]);
  const morphEls = useRef<(HTMLElement | null)[]>([]);
  const dragRef = useRef<DragState>({
    active: false,
    dragged: false,
    lastX: 0,
    lastY: 0,
    targetYaw: 0,
    targetPitch: 0,
    yaw: 0,
    pitch: 0,
  });
  const [inView, setInView] = useState(false);
  const [coarse, setCoarse] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });
  useMotionValueEvent(scrollYProgress, "change", (v) => {
    progressRef.current = v;
  });

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), {
      rootMargin: "300px",
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse), (max-width: 1023px)");
    const update = () => setCoarse(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // drag-to-orbit: horizontal = full 360° yaw; vertical = pitch on fine pointers only
  // (touch-action: pan-y keeps vertical gestures scrolling the page on mobile)
  const drag = dragRef.current;
  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    drag.active = true;
    drag.dragged = true;
    drag.lastX = e.clientX;
    drag.lastY = e.clientY;
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!drag.active) return;
    const dx = e.clientX - drag.lastX;
    const dy = e.clientY - drag.lastY;
    drag.lastX = e.clientX;
    drag.lastY = e.clientY;
    // yaw spins freely (no clamp → full orbit); pitch limited so it never flips fully over
    drag.targetYaw += dx * 0.007;
    if (!coarse) drag.targetPitch = clamp(drag.targetPitch - dy * 0.006, -1.35, 1.35);
  };
  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    drag.active = false;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
  };

  return (
    <>
    <section ref={sectionRef} className={`pcb-showcase ${reduced ? "is-reduced" : ""}`}>
      <div className="pcb-sticky">
        <div
          className={`pcb-canvas ${reduced ? "" : "is-grabbable"}`}
          ref={(el) => {
            morphEls.current[2] = el;
          }}
          onPointerDown={reduced ? undefined : onPointerDown}
          onPointerMove={reduced ? undefined : onPointerMove}
          onPointerUp={reduced ? undefined : onPointerUp}
          onPointerCancel={reduced ? undefined : onPointerUp}
        >
          {inView ? (
            <CanvasErrorBoundary label="pcb showcase">
              <Scene
                progressRef={progressRef}
                reduced={reduced}
                coarse={coarse}
                dragRef={dragRef}
                calloutEls={calloutEls}
                captionEls={captionEls}
                morphEls={morphEls}
                onReady={() => setLoaded(true)}
              />
            </CanvasErrorBoundary>
          ) : null}
          {inView && !loaded ? <PcbLoader /> : null}
        </div>

        {/* projected component callouts — tap/click a point to populate its detail */}
        <div className="pcb-callouts">
          {CALLOUTS.map((c, i) => (
            <button
              type="button"
              key={c.id}
              className={`pcb-callout ${openId === c.id ? "is-open" : ""}`}
              style={{ "--c": c.color, "--c-rgb": c.colorRgb } as CSSProperties}
              aria-expanded={openId === c.id}
              aria-label={`${c.label} — ${c.sub}`}
              onClick={() => setOpenId((cur) => (cur === c.id ? null : c.id))}
              ref={(el) => {
                calloutEls.current[i] = el;
              }}
            >
              <span className="pcb-callout-dot" />
              <span className="pcb-callout-text">
                <b>{c.label}</b>
                <span className="pcb-callout-sub">{c.sub}</span>
                <span className="pcb-callout-panel">
                  <span className="pcb-callout-spec">{c.spec}</span>
                  <span className="pcb-callout-desc">{c.desc}</span>
                </span>
              </span>
            </button>
          ))}
        </div>

        <div className="pcb-overlay shell">
          <div
            className="pcb-caption"
            style={{ opacity: 1 }}
            ref={(el) => {
              captionEls.current[0] = el;
            }}
          >
            <p className="kicker">Flagship build · KiCad · firmware · CAD</p>
            <h2 className="display text-4xl text-white sm:text-5xl">A CubeSat telemetry board, built end-to-end.</h2>
            <p className="lead mt-5 max-w-md">
              Schematic and PCB laid out in KiCad, ESP32-S3 firmware, a machined enclosure,
              hand-soldered — LoRa + GNSS RF and an ATECC608A secure element that signs every packet.
              Scroll to take it apart, drag to spin it.
            </p>
          </div>

          <div
            className="pcb-caption"
            style={{ opacity: 0 }}
            ref={(el) => {
              captionEls.current[1] = el;
            }}
          >
            <p className="kicker">Mechanical · CAD</p>
            <h2 className="display text-4xl text-white sm:text-5xl">Machined enclosure, clear lid.</h2>
            <p className="lead mt-5 max-w-md">
              A two-piece housing I modeled around the board — sealed for deployment, opening on
              standoffs for bring-up and debug.
            </p>
          </div>

          <div
            className="pcb-caption pcb-caption-end"
            style={{ opacity: 0 }}
            ref={(el) => {
              captionEls.current[2] = el;
            }}
          >
            <p className="kicker">Inside the board</p>
            <h2 className="display text-3xl text-white sm:text-4xl">Five subsystems, hand-soldered.</h2>
            <p className="lead mt-4 max-w-md">
              Compute, positioning, radio, sensing, and power — tap a point for the parts.
            </p>
          </div>
        </div>

        <div
          className="pcb-scrollhint"
          style={{ opacity: 0 }}
          aria-hidden="true"
          ref={(el) => {
            captionEls.current[3] = el;
          }}
        >
          Scroll to explode ↓
        </div>

        {/* morph target: the 3D board cross-dissolves into its real KiCad layout */}
        <div className="pcb-layout-wrap">
          <div
            className="pcb-layout"
            style={{ opacity: 0 }}
            ref={(el) => {
              morphEls.current[0] = el;
            }}
          >
            <img
              className="pcb-layout-img"
              src="/pcb/layout-dark.webp"
              alt="KiCad layout of the CubeSat telemetry board — copper routing and silkscreen"
              draggable={false}
            />
            {/* fab-drawing corner crop marks (engineering-drawing frame) */}
            <span className="pcb-frame pcb-frame-tl" aria-hidden="true" />
            <span className="pcb-frame pcb-frame-tr" aria-hidden="true" />
            <span className="pcb-frame pcb-frame-bl" aria-hidden="true" />
            <span className="pcb-frame pcb-frame-br" aria-hidden="true" />
          </div>
          <div
            className="pcb-layout-cap shell"
            style={{ opacity: 0 }}
            ref={(el) => {
              morphEls.current[1] = el;
            }}
          >
            <p className="kicker">As routed</p>
            <h2 className="display text-3xl text-white sm:text-4xl">Schematic → layout, routed by hand.</h2>
            <p className="lead mt-4 max-w-md">
              Every footprint placed and every net routed in KiCad — RF front ends, the power tree,
              and the secure element you just toured, as the real board.
            </p>
          </div>
        </div>
      </div>
    </section>

      <section className="pcb-subsystems shell" aria-label="Board subsystems">
        <p className="kicker">The subsystems</p>
        <h2 className="display mt-3 text-3xl text-white sm:text-4xl">Every block, one job.</h2>
        <p className="lead mt-5 max-w-2xl">
          A handful of blocks share one board, wired so the data it gathers can be measured, located,
          signed, and sent — and trusted at the other end.
        </p>
        <Reveal className="pcb-sub-grid mt-10">
          {SUBSYSTEMS.map((c) => (
            <div
              className="pcb-sub-card"
              key={c.id}
              style={{ "--c": c.color, "--c-rgb": c.colorRgb } as CSSProperties}
            >
              <span className="pcb-sub-dot" aria-hidden="true" />
              <h3 className="pcb-sub-name">{c.label}</h3>
              <p className="pcb-sub-tag">{c.sub}</p>
              <p className="pcb-sub-spec">{c.spec}</p>
              <p className="pcb-sub-desc">{c.desc}</p>
            </div>
          ))}
        </Reveal>

        {/* how the data flows + gets signed */}
        <PcbDatapath />

        {/* the code that does it */}
        <PcbFirmware />

        {/* the software half — firmware + ground station */}
        <Reveal className="pcb-soft-wrap mt-16">
          <p className="kicker">The software</p>
          <h2 className="display mt-3 text-3xl text-white sm:text-4xl">From board to ground station.</h2>
          <p className="lead mt-4 max-w-2xl">
            The board is half of it. An ESP-IDF firmware and a Python ground station move signed,
            replay-protected telemetry over LoRa — with a Wi-Fi backup and a post-quantum session layer.
          </p>
          <div className="pcb-soft-grid mt-8">
            {SOFTWARE.map((s) => (
              <div
                className="pcb-soft-card"
                key={s.id}
                style={{ "--c": s.color, "--c-rgb": s.colorRgb } as CSSProperties}
              >
                <span className="pcb-sub-dot" aria-hidden="true" />
                <h3 className="pcb-sub-name">{s.title}</h3>
                <p className="pcb-sub-tag">{s.tag}</p>
                <p className="pcb-sub-desc">{s.desc}</p>
              </div>
            ))}
          </div>
        </Reveal>

        {/* security architecture deep dive */}
        <PcbCrypto />

        {/* headline numbers + full spec sheet */}
        <Reveal className="pcb-stats-wrap mt-16">
          <p className="kicker">By the numbers</p>
          <div className="pcb-stats mt-6">
            {STATS.map((s) => (
              <div className="pcb-stat" key={s.label} style={{ "--c-rgb": s.colorRgb } as CSSProperties}>
                <span className="pcb-stat-v">
                  {s.static !== undefined ? (
                    s.static
                  ) : (
                    <CountUp value={s.value ?? 0} prefix={s.prefix} suffix={s.suffix} decimals={s.decimals} />
                  )}
                </span>
                <span className="pcb-stat-l">{s.label}</span>
              </div>
            ))}
          </div>
          <div className="pcb-spec-grid mt-4">
            {SPECS.map((s) => (
              <div className="pcb-spec" key={s.k}>
                <span className="pcb-spec-k">{s.k}</span>
                <span className="pcb-spec-v">{s.v}</span>
              </div>
            ))}
          </div>
        </Reveal>

        {/* end-to-end process timeline */}
        <Reveal className="pcb-process mt-16">
          <p className="kicker">Built end-to-end</p>
          <h2 className="display mt-3 text-3xl text-white sm:text-4xl">Schematic to solder.</h2>
          <ol className="pcb-timeline mt-8">
            {PROCESS.map((p) => (
              <li className="pcb-tl-step" key={p.n}>
                <span className="pcb-tl-node" aria-hidden="true" />
                <span className="pcb-tl-n">{p.n}</span>
                <h3 className="pcb-tl-t">{p.t}</h3>
                <p className="pcb-tl-d">{p.d}</p>
              </li>
            ))}
          </ol>
        </Reveal>
      </section>
    </>
  );
}
