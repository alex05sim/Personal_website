"use client";

/* eslint-disable react-hooks/immutability, react-hooks/set-state-in-effect */

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, ExternalLink } from "lucide-react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import type { Group, Mesh } from "three";
import { AdditiveBlending, SRGBColorSpace, TextureLoader, Vector3 } from "three";
import { makeAtmosphereMaterial, makeEarthMaterial } from "@/lib/earth-gl";
import { latLonToVec3 } from "@/lib/geo";
import { ScrambleText } from "./scramble-text";
import { CanvasErrorBoundary } from "./canvas-error-boundary";
import { useHydratedReducedMotion } from "./portfolio/shared";

const Y_AXIS = new Vector3(0, 1, 0);
const EARTH_CENTER = new Vector3(0.95, -0.12, 0);
const EARTH_R = 1.5;
// Fixed world direction toward the upper-centre-front of the visible globe; the
// HOPE sat rides just above the surface along this dir so it stays framed + in front.
const HOPE_DIR = new Vector3(-0.4, 0.12, 0.91).normalize();
// Hostile listener rides just up-and-right of HOPE so the intercept tap is a
// short, on-screen link rather than a beam shooting off to the corner.
const ATTACKER_DIR = new Vector3(-0.31, 0.15, 0.94).normalize();
// Cinematic camera: descends toward Earth from CAM_FAR to a close low-orbit
// resting framing (CAM_REST). Telephoto (low FOV, pulled back) so the globe reads
// ROUND (a wide FOV on a close off-axis sphere projects an oval).
const CAM_REST = new Vector3(0, 0.05, 3.15);
const CAM_FAR = new Vector3(0, 0.03, 4.0);
const BERKELEY = { lat: 37.8715, lon: -122.273 };

const OBJECTIVES = [
  { label: "01", title: "Intercept assumed", tag: "RF link treated as watched" },
  { label: "02", title: "Data packed", tag: "Telemetry → HOPE packets" },
  { label: "03", title: "Ciphertext out", tag: "Payload stays unreadable" },
];

/** The same realistic day/night Earth as the homepage hero, reused as a full-bleed
 *  backdrop so the launch zoom lands on the planet you flew toward. */
function IntroEarth({ reduce }: { reduce: boolean }) {
  const spinRef = useRef<Group>(null);
  const cloudsRef = useRef<Mesh>(null);

  const textures = useMemo(() => {
    const loader = new TextureLoader();
    const day = loader.load("/earth/earth_day.jpg");
    const clouds = loader.load("/earth/earth_clouds_hi.png");
    const night = loader.load("/earth/earth_night.jpg");
    const mask = loader.load("/earth/earth_specular_2048.jpg");
    day.anisotropy = 16;
    clouds.anisotropy = 16;
    night.anisotropy = 16;
    day.colorSpace = SRGBColorSpace;
    clouds.colorSpace = SRGBColorSpace;
    night.colorSpace = SRGBColorSpace;
    return { day, clouds, night, mask };
  }, []);

  // The earth shader takes `sunDirection` in the mesh's LOCAL space (terminator
  // pinned to geography). To keep the camera-facing hemisphere lit as the globe
  // spins, we drive the sun each frame toward the camera (with an up-left bias so
  // a terminator falls near the limb for depth) — a "hero" globe, not real time.
  const initialRotation = useMemo(() => {
    const [x, , z] = latLonToVec3(BERKELEY.lat, BERKELEY.lon, 1);
    return -Math.atan2(x, z);
  }, []);

  // Sub-solar point ~34° to the upper-LEFT of the disc centre: the whole visible
  // face reads as lit, and the ocean glint lands behind the left brief scrim
  // (hidden) rather than blooming a glare blob over the open globe. Bloom lifts
  // the highlights + city lights to the homepage's premium look.
  const worldSun = useMemo(() => new Vector3(-0.5, 0.52, 0.69).normalize(), []);
  const localSun = useMemo(() => new Vector3(), []);

  const earthMaterial = useMemo(() => {
    const sun0 = worldSun.clone().applyAxisAngle(Y_AXIS, -initialRotation);
    return makeEarthMaterial(textures.day, textures.night, textures.mask, sun0);
  }, [textures, worldSun, initialRotation]);
  const atmosphereMaterial = useMemo(() => makeAtmosphereMaterial(), []);

  useEffect(() => {
    if (spinRef.current) spinRef.current.rotation.y = initialRotation;
  }, [initialRotation]);

  useFrame((_, delta) => {
    const spin = spinRef.current;
    if (!spin) return;
    if (!reduce) {
      spin.rotation.y += delta * 0.018;
      if (cloudsRef.current) cloudsRef.current.rotation.y += delta * 0.006;
    }
    localSun.copy(worldSun).applyAxisAngle(Y_AXIS, -spin.rotation.y);
    earthMaterial.uniforms.sunDirection.value.copy(localSun);
  });

  return (
    <group position={[0.95, -0.12, 0]} scale={1.5}>
      <directionalLight
        position={[worldSun.x * 6, worldSun.y * 6, worldSun.z * 6]}
        intensity={2.6}
        color="#fff4e0"
      />
      <group ref={spinRef}>
        <mesh>
          <sphereGeometry args={[1, 128, 128]} />
          <primitive object={earthMaterial} attach="material" />
        </mesh>
        <mesh scale={1.003}>
          <sphereGeometry args={[1, 36, 18]} />
          <meshBasicMaterial color="#7e93b4" wireframe transparent opacity={0.05} depthWrite={false} />
        </mesh>
        <mesh ref={cloudsRef} scale={1.008}>
          <sphereGeometry args={[1, 128, 128]} />
          <meshStandardMaterial map={textures.clouds} transparent opacity={0.5} depthWrite={false} />
        </mesh>
      </group>
      <mesh scale={1.1}>
        <sphereGeometry args={[1, 48, 48]} />
        <primitive object={atmosphereMaterial} attach="material" />
      </mesh>
    </group>
  );
}

/** Live layer: the HOPE CubeSat station-keeping above the globe, a downlink of
 *  packets streaming to its nadir, a gentle camera drift + one-time arrival
 *  settle, and projection of the HOPE callout onto the moving sat. */
function LiveOps({
  reduce,
  hopeObj,
  hopeEl,
  attackerEl,
}: {
  reduce: boolean;
  hopeObj: React.RefObject<Group | null>;
  hopeEl: React.RefObject<HTMLDivElement | null>;
  attackerEl: React.RefObject<HTMLDivElement | null>;
}) {
  const packetsRef = useRef<Group>(null);
  const attackerRef = useRef<Group>(null);
  const interceptBeamRef = useRef<Mesh>(null);
  const interceptPulseRef = useRef<Group>(null);
  const PACKETS = 6;

  const dirTmp = useMemo(() => new Vector3(), []);
  const attackerDir = useMemo(() => new Vector3(), []);
  const nadir = useMemo(() => new Vector3(), []);
  const attackerPos = useMemo(() => new Vector3(), []);
  const beamMid = useMemo(() => new Vector3(), []);
  const beamVec = useMemo(() => new Vector3(), []);
  const wp = useMemo(() => new Vector3(), []);
  const ndc = useMemo(() => new Vector3(), []);
  const ray = useMemo(() => new Vector3(), []);
  const oc = useMemo(() => new Vector3(), []);
  const lookTarget = useMemo(() => new Vector3().copy(EARTH_CENTER), []);
  const lookCurrent = useMemo(() => new Vector3().copy(EARTH_CENTER), []);

  // cinematic push-in: 0 → 1 eased on mount (CAM_FAR → CAM_REST). reduced-motion
  // snaps straight to the resting close framing.
  const settle = useRef(0);
  useEffect(() => {
    if (reduce) settle.current = 1;
  }, [reduce]);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    const cam = state.camera;

    // --- HOPE sat: sways slowly above the surface, staying in front + framed ---
    const sat = hopeObj.current;
    if (sat) {
      const sway = reduce ? 0 : Math.sin(t * 0.045) * 0.085;
      dirTmp.copy(HOPE_DIR).applyAxisAngle(Y_AXIS, sway);
      sat.position.copy(dirTmp).multiplyScalar(1.9).add(EARTH_CENTER);
      if (!reduce) sat.position.y += Math.sin(t * 0.08) * 0.03;
      sat.lookAt(EARTH_CENTER);
    }

    // --- hostile listener: rides just off HOPE, antenna trained on the downlink ---
    const attacker = attackerRef.current;
    if (attacker) {
      const counterSway = reduce ? 0 : Math.sin(t * 0.05 + 1.1) * 0.06;
      attackerDir.copy(ATTACKER_DIR).applyAxisAngle(Y_AXIS, counterSway);
      attacker.position.copy(attackerDir).multiplyScalar(1.98).add(EARTH_CENTER);
      if (!reduce) attacker.position.y += Math.sin(t * 0.09 + 1.7) * 0.02;
      if (sat) attacker.lookAt(sat.position);
    }

    // --- camera: cinematic push-in (CAM_FAR→CAM_REST) → close framing that
    //     gently follows HOPE; reduced-motion holds the resting close framing ---
    if (!reduce) {
      if (settle.current < 1) settle.current = Math.min(1, settle.current + delta * 0.42);
    } else {
      settle.current = 1;
    }
    const ease = 1 - Math.pow(1 - settle.current, 3); // easeOutCubic
    const driftX = reduce ? 0 : Math.sin(t * 0.16) * 0.03;
    const driftY = reduce ? 0 : Math.sin(t * 0.12) * 0.022;
    const fx = sat ? (sat.position.x - EARTH_CENTER.x) * 0.04 : 0;
    const fy = sat ? (sat.position.y - EARTH_CENTER.y) * 0.03 : 0;
    cam.position.x = CAM_FAR.x + (CAM_REST.x - CAM_FAR.x) * ease + driftX + fx * ease;
    cam.position.y = CAM_FAR.y + (CAM_REST.y - CAM_FAR.y) * ease + driftY + fy * ease;
    cam.position.z = CAM_FAR.z + (CAM_REST.z - CAM_FAR.z) * ease + (reduce ? 0 : Math.sin(t * 0.1) * 0.03);
    // look essentially at the Earth centre so the globe stays on-axis (round);
    // only a tiny bias toward the sat so the callouts sit in the upper sky.
    if (sat) lookTarget.lerpVectors(EARTH_CENTER, sat.position, 0.06);
    else lookTarget.copy(EARTH_CENTER);
    lookCurrent.lerp(lookTarget, reduce ? 1 : 0.06); // damp so the follow never snaps
    cam.lookAt(lookCurrent);

    // --- downlink: packets stream from the sat to its nadir on the surface ---
    if (sat && packetsRef.current) {
      nadir.copy(dirTmp).multiplyScalar(EARTH_R + 0.02).add(EARTH_CENTER);
      const kids = packetsRef.current.children;
      for (let i = 0; i < kids.length; i++) {
        const frac = reduce ? (i + 0.5) / PACKETS : (t * 0.55 + i / PACKETS) % 1;
        kids[i].position.lerpVectors(sat.position, nadir, frac);
        const mat = (kids[i] as Mesh).material as { opacity?: number };
        if (mat && typeof mat.opacity === "number") mat.opacity = (1 - frac) * 0.7 + 0.08;
      }
    }

    // --- interception: a faint tap + travelling pulses from HOPE to the attacker ---
    if (sat && attacker) {
      attacker.getWorldPosition(attackerPos);
      if (interceptBeamRef.current) {
        beamMid.copy(sat.position).lerp(attackerPos, 0.5);
        beamVec.copy(attackerPos).sub(sat.position);
        interceptBeamRef.current.position.copy(beamMid);
        interceptBeamRef.current.scale.set(1, beamVec.length(), 1);
        interceptBeamRef.current.quaternion.setFromUnitVectors(Y_AXIS, beamVec.normalize());
        const mat = interceptBeamRef.current.material as { opacity?: number };
        if (mat && typeof mat.opacity === "number") {
          mat.opacity = reduce ? 0.16 : 0.1 + Math.sin(t * 3.2) * 0.05;
        }
      }
      if (interceptPulseRef.current) {
        const kids = interceptPulseRef.current.children;
        for (let i = 0; i < kids.length; i++) {
          const frac = reduce ? (i + 0.5) / kids.length : (t * 0.4 + i / kids.length) % 1;
          kids[i].position.lerpVectors(sat.position, attackerPos, frac);
          const mat = (kids[i] as Mesh).material as { opacity?: number };
          if (mat && typeof mat.opacity === "number") mat.opacity = Math.sin(frac * Math.PI) * 0.75;
        }
      }
    }

    // --- project the tracked callouts onto their live 3D anchors ---
    const project = (obj: Group | null, el: HTMLDivElement | null) => {
      if (!obj || !el) return;
      obj.getWorldPosition(wp);
      ray.copy(wp).sub(cam.position);
      const dist = ray.length();
      ray.normalize();
      oc.copy(cam.position).sub(EARTH_CENTER);
      const b = oc.dot(ray);
      const c = oc.lengthSq() - EARTH_R * EARTH_R;
      const disc = b * b - c;
      let occluded = false;
      if (disc > 0) {
        const tHit = -b - Math.sqrt(disc);
        occluded = tHit > 0.001 && tHit < dist - 0.05;
      }
      ndc.copy(wp).project(cam);
      const x = (ndc.x * 0.5 + 0.5) * state.size.width;
      const y = (-ndc.y * 0.5 + 0.5) * state.size.height;
      el.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px)`;
      el.style.opacity = !occluded && ndc.z < 1 ? "1" : "0";
    };
    project(sat, hopeEl.current);
    project(attacker, attackerEl.current);
  });

  return (
    <>
      <group ref={hopeObj} scale={0.58}>
        {/* foil-wrapped main bus */}
        <mesh>
          <boxGeometry args={[0.05, 0.07, 0.05]} />
          <meshStandardMaterial color="#d9c79a" metalness={0.25} roughness={0.5} emissive="#3a3220" emissiveIntensity={0.3} />
        </mesh>
        {/* darker lower module */}
        <mesh position={[0, -0.05, 0]}>
          <boxGeometry args={[0.04, 0.03, 0.04]} />
          <meshStandardMaterial color="#3c424d" metalness={0.3} roughness={0.55} emissive="#10141a" emissiveIntensity={0.4} />
        </mesh>
        {/* solar wings */}
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 0.12, 0, 0]}>
            <boxGeometry args={[0.15, 0.005, 0.06]} />
            <meshStandardMaterial color="#15335f" metalness={0.4} roughness={0.4} emissive="#174788" emissiveIntensity={0.45} />
          </mesh>
        ))}
        {/* antenna mast + dish toward Earth */}
        <mesh position={[0, 0.06, 0]}>
          <cylinderGeometry args={[0.0015, 0.0015, 0.04, 6]} />
          <meshBasicMaterial color="#dfeaff" />
        </mesh>
        <mesh position={[0, -0.075, 0]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[0.02, 0.018, 14]} />
          <meshStandardMaterial color="#c9d2de" metalness={0.3} roughness={0.6} emissive="#1a2230" emissiveIntensity={0.4} />
        </mesh>
        {/* tight glow */}
        <mesh>
          <sphereGeometry args={[0.04, 12, 12]} />
          <meshBasicMaterial color="#a9dcff" transparent opacity={0.16} blending={AdditiveBlending} depthWrite={false} />
        </mesh>
      </group>

      <group ref={packetsRef}>
        {Array.from({ length: PACKETS }).map((_, i) => (
          <mesh key={i}>
            <sphereGeometry args={[0.01, 8, 8]} />
            <meshBasicMaterial color="#c8ecff" transparent opacity={0.7} blending={AdditiveBlending} depthWrite={false} />
          </mesh>
        ))}
      </group>

      <group ref={attackerRef} scale={0.58}>
        {/* dark hostile bus */}
        <mesh>
          <boxGeometry args={[0.055, 0.05, 0.05]} />
          <meshStandardMaterial color="#39232a" metalness={0.4} roughness={0.5} emissive="#160a0d" emissiveIntensity={0.5} />
        </mesh>
        {/* red sensor eye (faces HOPE) */}
        <mesh position={[0, 0, 0.03]}>
          <sphereGeometry args={[0.013, 14, 14]} />
          <meshStandardMaterial color="#ff5050" emissive="#ff2020" emissiveIntensity={1.4} />
        </mesh>
        {/* dark collector panels */}
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 0.1, 0, 0]}>
            <boxGeometry args={[0.11, 0.005, 0.05]} />
            <meshStandardMaterial color="#2a1519" metalness={0.4} roughness={0.5} emissive="#3a1014" emissiveIntensity={0.3} />
          </mesh>
        ))}
        {/* tight red glow */}
        <mesh>
          <sphereGeometry args={[0.045, 12, 12]} />
          <meshBasicMaterial color="#ff5f5f" transparent opacity={0.14} blending={AdditiveBlending} depthWrite={false} />
        </mesh>
      </group>

      <mesh ref={interceptBeamRef}>
        <cylinderGeometry args={[0.0035, 0.0035, 1, 8, 1, true]} />
        <meshBasicMaterial color="#ff6b6b" transparent opacity={0.12} blending={AdditiveBlending} depthWrite={false} />
      </mesh>

      <group ref={interceptPulseRef}>
        {Array.from({ length: 4 }).map((_, i) => (
          <mesh key={i}>
            <sphereGeometry args={[0.009, 8, 8]} />
            <meshBasicMaterial color="#ff9d9d" transparent opacity={0.7} blending={AdditiveBlending} depthWrite={false} />
          </mesh>
        ))}
      </group>
    </>
  );
}

/** Telemetry readout — isolated so its 1.1s ticks re-render only this small DOM
 *  subtree, never the <Canvas> tree (which caused periodic frame stalls). */
function MissionConsole({ reduce }: { reduce: boolean }) {
  const [tx, setTx] = useState(1042);
  const [rssi, setRssi] = useState(-74);

  useEffect(() => {
    if (reduce) return;
    const id = window.setInterval(() => {
      setTx((v) => v + 2 + Math.floor(Math.random() * 5));
      setRssi(-71 - Math.floor(Math.random() * 9));
    }, 1100);
    return () => window.clearInterval(id);
  }, [reduce]);

  return (
    <div className="hopx-console">
      <div className="hopx-console-head">
        <span>Mission channel</span>
        <strong>RF exposed</strong>
      </div>
      <div className="hopx-tele">
        <span>PKT TX</span>
        <b>{tx.toString().padStart(5, "0")}</b>
        <span>RSSI</span>
        <b>{rssi} dBm</b>
        <span>State</span>
        <b className="hopx-tele-live">
          <i aria-hidden="true" />
          {reduce ? "LINK UP" : "TRANSMITTING"}
        </b>
      </div>
      <div className="hopx-console-row">
        <i className="hopx-ok" aria-hidden="true" />
        Payload protected before transmit
      </div>
      <div className="hopx-console-row">
        <i className="hopx-ok" aria-hidden="true" />
        Capture yields ciphertext
      </div>
      <div className="hopx-console-row">
        <i className="hopx-ok" aria-hidden="true" />
        Ground station verifies packets
      </div>
    </div>
  );
}

export function HopeMissionIntro() {
  const reduce = useHydratedReducedMotion();
  const [mounted, setMounted] = useState(false);
  const [fromOrbit, setFromOrbit] = useState(false);
  const [inView, setInView] = useState(true);
  const [dpr, setDpr] = useState(1.3);
  const sectionRef = useRef<HTMLElement>(null);
  const hopeObj = useRef<Group>(null);
  const hopeEl = useRef<HTMLDivElement>(null);
  const attackerEl = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  // Cap the render buffer to a fixed pixel budget so FPS stays stable when the
  // window grows / goes fullscreen (otherwise a native-4K canvas balloons the
  // render target and the framerate tanks).
  useEffect(() => {
    const calc = () => {
      const w = window.innerWidth || 1920;
      const budget = 3200; // max internal render width (sharper, still smooth at 4K)
      const cap = Math.min(window.devicePixelRatio || 1, 1.8);
      setDpr(Math.max(0.85, Math.min(cap, budget / w)));
    };
    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, []);

  // Pause the WebGL canvas once the intro scrolls off-screen so it stops pegging
  // the GPU — this keeps scrolling the rest of the page fluid.
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), {
      rootMargin: "120px",
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Detect arrival from the homepage zoom. The cover→reveal fade is handled
  // purely in CSS (animation on mount) so it can't get stuck if this effect is
  // re-invoked (React StrictMode) and the flag has already been consumed.
  useEffect(() => {
    if (reduce) return;
    const url = new URL(window.location.href);
    const flagged = url.searchParams.get("from") === "orbit" || sessionStorage.getItem("hope:arrival") === "1";
    if (!flagged) return;
    setFromOrbit(true);
    sessionStorage.removeItem("hope:arrival");
    if (url.searchParams.has("from")) {
      url.searchParams.delete("from");
      window.history.replaceState({}, "", url.pathname + url.search + url.hash);
    }
  }, [reduce]);

  return (
    <section ref={sectionRef} className="hopx" aria-label="Operation HOPE mission briefing">
      {fromOrbit ? <div className="hopx-arrival" aria-hidden="true" /> : null}

      {/* full-bleed realistic Earth backdrop */}
      {mounted ? (
        <div className="hopx-canvas" aria-hidden="true">
          <CanvasErrorBoundary label="hope intro globe">
            <Canvas
              camera={{ position: [0, 0, 3.2], fov: 33 }}
              dpr={dpr}
              gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
              frameloop={!reduce && inView ? "always" : "demand"}
            >
              <ambientLight intensity={0.04} />
              <IntroEarth reduce={reduce} />
              <LiveOps reduce={reduce} hopeObj={hopeObj} hopeEl={hopeEl} attackerEl={attackerEl} />
              <EffectComposer>
                <Bloom intensity={0.42} luminanceThreshold={0.62} luminanceSmoothing={0.3} mipmapBlur radius={0.5} />
              </EffectComposer>
            </Canvas>
          </CanvasErrorBoundary>
        </div>
      ) : null}

      {/* FX + legibility overlays */}
      <div className="hopx-scrim" aria-hidden="true" />
      <div className="hopx-scan" aria-hidden="true" />
      <div className="hopx-grain" aria-hidden="true" />
      <div className="hopx-vignette" aria-hidden="true" />

      {/* HUD frame */}
      <span className="hopx-bracket tl" aria-hidden="true" />
      <span className="hopx-bracket tr" aria-hidden="true" />
      <span className="hopx-bracket bl" aria-hidden="true" />
      <span className="hopx-bracket br" aria-hidden="true" />

      <div className="hopx-topbar">
        <span className="hopx-op">
          <i aria-hidden="true" />
          Operation HOPE // Mission brief
        </span>
        <span className="hopx-threat">
          <i aria-hidden="true" />
          Link not trusted
        </span>
      </div>

      {/* HOPE callout — tracks the live 3D satellite (positioned by LiveOps) */}
      <div ref={hopeEl} className="hopx-tk hopx-tk-asset" aria-hidden="true" style={{ opacity: 0 }}>
        <span className="hopx-tk-anchor" />
        <span className="hopx-tk-chip">
          <strong>HOPE</strong>
          <em>PQ data-pack · downlinking</em>
        </span>
      </div>

      {/* ATTACKER callout — tracks the live hostile satellite (positioned by LiveOps) */}
      <div ref={attackerEl} className="hopx-tk hopx-tk-threat" aria-hidden="true" style={{ opacity: 0 }}>
        <span className="hopx-tk-reticle" />
        <span className="hopx-tk-chip">
          <strong>ATTACKER SAT</strong>
          <em>Listening to HOPE downlink</em>
        </span>
      </div>

      {/* left ops brief */}
      <div className="hopx-brief">
        <p className="hopx-decrypt">
          <ScrambleText as="span" text="INCOMING TRANSMISSION // DECRYPTED" duration={1700} />
        </p>
        <ScrambleText
          as="h2"
          className="hopx-title"
          text="SECURE THE PACKET BEFORE THE SKY SEES IT"
          duration={1500}
        />
        <p className="hopx-lead">
          A post-quantum secure satellite data-packing PCB — built for a link that may already be watched.
        </p>

        <div className="hopx-dossier">
          <p className="hopx-dossier-head">▣ Field intel // why this board exists</p>
          <p className="hopx-dossier-body">
            In 2018, France accused Russia&apos;s <strong>Luch / Olymp-K</strong> of maneuvering alongside the
            French-Italian <strong>Athena-Fidus</strong> military comms satellite to intercept its traffic.
            In this mission view, HOPE transmits while an attacker satellite listens in. The RF path is visible;
            the payload has to stay protected anyway.
          </p>
          <div className="hopx-links">
            <a
              href="https://www.defensenews.com/space/2018/09/07/espionage-french-defense-head-charges-russia-of-dangerous-games-in-space/"
              target="_blank"
              rel="noreferrer"
            >
              Luch/Olymp-K approached Athena-Fidus
              <ExternalLink size={12} />
            </a>
            <a
              href="https://today.ucsd.edu/story/the-sky-is-full-of-secrets-glaring-vulnerabilities-discovered-in-satellite-communications"
              target="_blank"
              rel="noreferrer"
            >
              Unencrypted satellite traffic intercepted
              <ExternalLink size={12} />
            </a>
          </div>
        </div>

        <div className="hopx-obj">
          <p className="hopx-obj-label">Objectives</p>
          {OBJECTIVES.map((step) => (
            <div className="hopx-step" key={step.label}>
              <span>{step.label}</span>
              <strong>{step.title}</strong>
              <em>{step.tag}</em>
            </div>
          ))}
        </div>

        <a className="hopx-cta" href="#case-study">
          Begin mission
          <ArrowRight size={16} />
        </a>
      </div>

      {/* bottom-right console (own state so telemetry ticks never re-render the Canvas) */}
      <MissionConsole reduce={reduce} />
    </section>
  );
}
