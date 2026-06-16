"use client";

import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { Bloom, DepthOfField, EffectComposer } from "@react-three/postprocessing";
import { useMotionValueEvent, useReducedMotion, useScroll } from "motion/react";
import type { DepthOfFieldEffect } from "postprocessing";
import {
  type PointerEvent as ReactPointerEvent,
  type RefObject,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ACESFilmicToneMapping,
  Box3,
  CanvasTexture,
  Euler,
  type Group,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
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

// Callout anchors in board-plane fractions (a = horizontal −left/+right, b = vertical +up/−down),
// calibrated against the board's own silkscreen.
type Callout = { id: string; label: string; sub: string; a: number; b: number };
const CALLOUTS: Callout[] = [
  { id: "compute", label: "Compute", sub: "ESP32-S3 MCU", a: 0.0, b: -0.05 },
  { id: "gnss", label: "GNSS", sub: "Position fix", a: -0.5, b: -0.52 },
  { id: "lora", label: "LoRa", sub: "Long-range radio", a: 0.52, b: -0.52 },
  { id: "sensors", label: "Sensors", sub: "Telemetry suite", a: 0.5, b: 0.5 },
  { id: "power", label: "Power", sub: "Battery & regulation", a: -0.5, b: 0.5 },
];

// per-part disassembly descriptor (staggered tiers → punchier explosion)
type Part = { node: Object3D; orig: Vector3; dir: Vector3; start: number; end: number; dist: number };

// drag-to-rotate state, shared between the DOM canvas and the render loop
type DragState = {
  active: boolean;
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
  dofRef,
  calloutEls,
  captionEls,
  onReady,
}: {
  progressRef: RefObject<number>;
  reduced: boolean;
  coarse: boolean;
  dragRef: RefObject<DragState>;
  dofRef: RefObject<DepthOfFieldEffect | null>;
  calloutEls: RefObject<(HTMLDivElement | null)[]>;
  captionEls: RefObject<(HTMLDivElement | null)[]>;
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
      const g = groupOf(nm);
      if (g === "lid") {
        // screws pop first & furthest → standoffs → clear lid floats up last
        const tier = /screw/i.test(nm) ? 0 : /standoff/i.test(nm) ? 1 : 2;
        const dist = [3.3, 2.7, 2.2][tier];
        const start = 0.3 + tier * 0.06;
        parts.push({ node: child, orig, dir: liftDir, start, end: start + 0.3, dist });
      } else if (g === "back") {
        // antenna / solar / hinges lead, the back enclosure shell trails
        const lead = !/Back_Enclosure/i.test(nm);
        const start = 0.42 + (lead ? 0 : 0.06);
        parts.push({
          node: child,
          orig,
          dir: backTravel,
          start,
          end: start + 0.34,
          dist: lead ? 2.7 : 2.3,
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
    const pmrem = new PMREMGenerator(gl);
    rootScene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    gl.toneMapping = ACESFilmicToneMapping;
    gl.toneMappingExposure = 0.92;

    // give the clear lid a real glass look (imported transmission reads as a black slab).
    // On touch devices, transmission forces an extra render pass — swap in a cheap translucent
    // material instead so the showcase stays smooth.
    s.traverse((o) => {
      if (!(o as Mesh).isMesh) return;
      if (topName(o) === "Enclosure_clear_lid") {
        (o as Mesh).material = coarse
          ? new MeshPhysicalMaterial({
              color: 0xbcd4ff,
              metalness: 0,
              roughness: 0.16,
              transparent: true,
              opacity: 0.42,
              clearcoat: 1,
              clearcoatRoughness: 0.18,
              envMapIntensity: 1.2,
            })
          : new MeshPhysicalMaterial({
              color: 0xeaf2ff,
              metalness: 0,
              roughness: 0.08,
              transmission: 1,
              thickness: 0.5,
              ior: 1.45,
              transparent: true,
              clearcoat: 1,
              clearcoatRoughness: 0.12,
              envMapIntensity: 1.4,
            });
      } else {
        const m = (o as Mesh).material as { envMapIntensity?: number };
        if (m && "envMapIntensity" in m) m.envMapIntensity = 1.1;
      }
    });

    return { parts, liftDir, scaleK, pcbCenter, anchors, qHero, qFocus, shadow };
  }, [gltf, gl, rootScene, coarse]);

  // scratch objects (avoid per-frame allocation)
  const tmpQ = useRef(new Quaternion()).current;
  const yawQ = useRef(new Quaternion()).current;
  const userQ = useRef(new Quaternion()).current;
  const userE = useRef(new Euler()).current;
  const yAxis = useRef(new Vector3(0, 1, 0)).current;
  const target = useRef(new Vector3()).current;
  const camOff = useRef(new Vector3()).current;
  const proj = useRef(new Vector3()).current;

  useFrame((state) => {
    const root = rootRef.current;
    if (!root) return;
    const { parts, scaleK, pcbCenter, anchors, qHero, qFocus, shadow } = rig;

    const p = reduced ? 0 : (progressRef.current ?? 0);
    const focus = sstep(0.5, 1, p);

    // orientation: gentle idle sway near the top, slerp hero → chip-side-facing-camera
    const sway = Math.sin(state.clock.elapsedTime * 0.4) * 0.1 * (1 - sstep(0, 0.22, p));
    yawQ.setFromAxisAngle(yAxis, sway);
    tmpQ.copy(qHero).premultiply(yawQ);
    root.quaternion.slerpQuaternions(tmpQ, qFocus, focus);

    // user drag: smooth toward the pointer target, ease back to neutral on release,
    // and fade out into the finale so it never fights the choreography
    const drag = dragRef.current;
    if (drag) {
      if (!drag.active) {
        drag.targetYaw *= 0.94;
        drag.targetPitch *= 0.94;
      }
      drag.yaw = lerp(drag.yaw, drag.targetYaw, 0.18);
      drag.pitch = lerp(drag.pitch, drag.targetPitch, 0.18);
      const di = reduced ? 0 : 1 - sstep(0.5, 0.92, p);
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

    // camera: frame whole assembly → frame the PCB
    root.updateMatrixWorld(true);
    target.copy(pcbCenter).applyMatrix4(root.matrixWorld).multiplyScalar(focus);
    const dist = lerp(8.2, 4.0, focus);
    camOff.set(0, lerp(0.25, 0.55, focus), 1).normalize().multiplyScalar(dist);
    camera.position.copy(target).add(camOff);
    camera.lookAt(target);

    // depth of field: crisp hero, bokeh ramps in over the close-up finale
    const dof = dofRef.current;
    if (dof) {
      if (!dof.target) dof.target = new Vector3();
      dof.target.copy(target);
      dof.bokehScale = lerp(0, 3.2, focus);
    }

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
        el.style.opacity = onScreen ? String(appear) : "0";
        el.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px)`;
      }
    }

    // captions + scroll hint: driven by the same progress, one frame, one source
    const caps = captionEls.current;
    if (caps) {
      const o0 = 1 - sstep(0.22, 0.34, p);
      const o1 = reduced ? 0 : Math.min(sstep(0.34, 0.44, p), 1 - sstep(0.52, 0.6, p));
      const o2 = reduced ? 0 : sstep(0.62, 0.72, p);
      const oh = reduced ? 0 : 1 - sstep(0, 0.1, p);
      if (caps[0]) caps[0].style.opacity = String(o0);
      if (caps[1]) caps[1].style.opacity = String(o1);
      if (caps[2]) caps[2].style.opacity = String(o2);
      if (caps[3]) caps[3].style.opacity = String(oh);
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
  onReady,
}: {
  progressRef: RefObject<number>;
  reduced: boolean;
  coarse: boolean;
  dragRef: RefObject<DragState>;
  calloutEls: RefObject<(HTMLDivElement | null)[]>;
  captionEls: RefObject<(HTMLDivElement | null)[]>;
  onReady: () => void;
}) {
  const dofRef = useRef<DepthOfFieldEffect | null>(null);
  const fx = !reduced && !coarse;
  return (
    <Canvas
      camera={{ position: [0, 2, 8.2], fov: 38 }}
      dpr={coarse ? [1, 1.4] : [1, 1.8]}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
    >
      <ambientLight intensity={0.22} />
      <directionalLight position={[5, 8, 6]} intensity={3.0} color="#ffffff" />
      <directionalLight position={[-6, 1, -4]} intensity={2.4} color="#5ad0ff" />
      <directionalLight position={[2, -5, -3]} intensity={1.3} color="#bcd4ff" />
      <directionalLight position={[-3, 3, 6]} intensity={0.5} color="#ffffff" />
      <Suspense fallback={null}>
        <PcbModel
          progressRef={progressRef}
          reduced={reduced}
          coarse={coarse}
          dragRef={dragRef}
          dofRef={dofRef}
          calloutEls={calloutEls}
          captionEls={captionEls}
          onReady={onReady}
        />
      </Suspense>
      {fx ? (
        <EffectComposer>
          <Bloom intensity={0.32} luminanceThreshold={0.92} luminanceSmoothing={0.08} mipmapBlur />
          <DepthOfField ref={dofRef} target={[0, 0, 0]} worldFocusRange={2.4} bokehScale={0} />
        </EffectComposer>
      ) : (
        <></>
      )}
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
  const calloutEls = useRef<(HTMLDivElement | null)[]>([]);
  const captionEls = useRef<(HTMLDivElement | null)[]>([]);
  const dragRef = useRef<DragState>({
    active: false,
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

  // drag-to-rotate: horizontal = yaw always; vertical = pitch on fine pointers only
  // (touch-action: pan-y keeps vertical gestures scrolling the page on mobile)
  const drag = dragRef.current;
  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    drag.active = true;
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
    drag.targetYaw = clamp(drag.targetYaw + dx * 0.006, -1.1, 1.1);
    if (!coarse) drag.targetPitch = clamp(drag.targetPitch - dy * 0.005, -0.45, 0.45);
  };
  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    drag.active = false;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
  };

  return (
    <section ref={sectionRef} className={`pcb-showcase ${reduced ? "is-reduced" : ""}`}>
      <div className="pcb-sticky">
        <div
          className={`pcb-canvas ${reduced ? "" : "is-grabbable"}`}
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
                onReady={() => setLoaded(true)}
              />
            </CanvasErrorBoundary>
          ) : null}
          {inView && !loaded ? <PcbLoader /> : null}
        </div>

        {/* projected component callouts */}
        <div className="pcb-callouts" aria-hidden="true">
          {CALLOUTS.map((c, i) => (
            <div
              key={c.id}
              className="pcb-callout"
              ref={(el) => {
                calloutEls.current[i] = el;
              }}
            >
              <span className="pcb-callout-dot" />
              <span className="pcb-callout-text">
                <b>{c.label}</b>
                <span className="pcb-callout-sub">{c.sub}</span>
              </span>
            </div>
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
            <p className="kicker">Flagship build · 3D</p>
            <h2 className="display text-4xl text-white sm:text-5xl">A board that signs its own data.</h2>
            <p className="lead mt-5 max-w-md">
              A CubeSat telemetry board — ESP32-S3, LoRa, GNSS, hardware root of trust. Scroll to take
              it apart, drag to spin it.
            </p>
          </div>

          <div
            className="pcb-caption"
            style={{ opacity: 0 }}
            ref={(el) => {
              captionEls.current[1] = el;
            }}
          >
            <p className="kicker">Open the enclosure</p>
            <h2 className="display text-4xl text-white sm:text-5xl">Clear lid, sealed electronics.</h2>
            <p className="lead mt-5 max-w-md">
              A machined enclosure with a transparent lid lifts away to reveal the populated board.
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
            <h2 className="display text-3xl text-white sm:text-4xl">Every subsystem, in one stack.</h2>
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
      </div>
    </section>
  );
}
