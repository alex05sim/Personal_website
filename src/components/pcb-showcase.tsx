"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import {
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useTransform,
} from "motion/react";
import { type RefObject, useEffect, useRef, useState } from "react";
import type { Group } from "three";

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/**
 * Stylized stand-in CubeSat assembly. Swap the contents for a loaded GLB
 * (public/models/cubesat.glb) with named parts later — the explode/orbit logic
 * (driven by progressRef) stays the same.
 */
function CubesatModel({
  progressRef,
  reduced,
}: {
  progressRef: RefObject<number>;
  reduced: boolean;
}) {
  const groupRef = useRef<Group>(null);
  const lidRef = useRef<Group>(null);
  const trayRef = useRef<Group>(null);
  const boardRef = useRef<Group>(null);

  useFrame((state) => {
    const p = reduced ? 0.04 : (progressRef.current ?? 0);
    const e = smoothstep(0.42, 1, p);

    if (groupRef.current) {
      // continuous slow spin (cinematic) + extra rotation as you scroll
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.16 + p * Math.PI * 0.85;
      groupRef.current.rotation.x = 0.34 + Math.sin(state.clock.elapsedTime * 0.25) * 0.02 - p * 0.12;
    }
    if (lidRef.current) lidRef.current.position.y = 0.22 + e * 1.5;
    if (trayRef.current) trayRef.current.position.y = -0.22 - e * 1.05;
    if (boardRef.current) boardRef.current.position.y = e * 0.34;
  });

  return (
    <group ref={groupRef} scale={1.1}>
      {/* enclosure — bottom tray */}
      <group ref={trayRef} position={[0, -0.22, 0]}>
        <mesh>
          <boxGeometry args={[1.7, 0.06, 1.7]} />
          <meshStandardMaterial color="#2b303a" metalness={0.7} roughness={0.4} />
        </mesh>
        {[
          [0, 0.12, 0.82],
          [0, 0.12, -0.82],
          [0.82, 0.12, 0],
          [-0.82, 0.12, 0],
        ].map((pos, i) => (
          <mesh key={i} position={pos as [number, number, number]}>
            <boxGeometry args={i < 2 ? [1.7, 0.22, 0.06] : [0.06, 0.22, 1.7]} />
            <meshStandardMaterial color="#333944" metalness={0.65} roughness={0.45} />
          </mesh>
        ))}
      </group>

      {/* PCB + components */}
      <group ref={boardRef}>
        <mesh>
          <boxGeometry args={[1.5, 0.05, 1.5]} />
          <meshStandardMaterial color="#0f5a3c" metalness={0.2} roughness={0.55} />
        </mesh>
        {/* ESP32-S3 (MCU) with shield */}
        <mesh position={[-0.38, 0.09, -0.28]}>
          <boxGeometry args={[0.44, 0.1, 0.42]} />
          <meshStandardMaterial color="#c7ccd4" metalness={0.85} roughness={0.3} />
        </mesh>
        {/* LoRa radio can */}
        <mesh position={[0.4, 0.1, -0.32]}>
          <boxGeometry args={[0.42, 0.12, 0.26]} />
          <meshStandardMaterial color="#9aa3ad" metalness={0.9} roughness={0.28} />
        </mesh>
        {/* GNSS module */}
        <mesh position={[0.32, 0.085, 0.34]}>
          <boxGeometry args={[0.3, 0.09, 0.3]} />
          <meshStandardMaterial color="#20232a" metalness={0.5} roughness={0.4} />
        </mesh>
        {/* ATECC608A secure element */}
        <mesh position={[-0.12, 0.055, 0.2]}>
          <boxGeometry args={[0.12, 0.05, 0.12]} />
          <meshStandardMaterial color="#0c0d10" metalness={0.4} roughness={0.5} />
        </mesh>
        {/* USB-C */}
        <mesh position={[-0.74, 0.06, 0.45]}>
          <boxGeometry args={[0.14, 0.07, 0.22]} />
          <meshStandardMaterial color="#cfd4db" metalness={0.95} roughness={0.2} />
        </mesh>
        {/* u.FL antenna connector + whip */}
        <mesh position={[0.66, 0.07, 0.62]}>
          <cylinderGeometry args={[0.04, 0.04, 0.06, 16]} />
          <meshStandardMaterial color="#d9b25a" metalness={0.9} roughness={0.3} />
        </mesh>
        <mesh position={[0.66, 0.28, 0.62]}>
          <cylinderGeometry args={[0.012, 0.012, 0.42, 12]} />
          <meshStandardMaterial color="#1a1c20" metalness={0.6} roughness={0.4} />
        </mesh>
        {/* scattered SMD parts */}
        {[
          [0.05, 0.04, -0.5],
          [0.2, 0.04, -0.5],
          [-0.5, 0.04, 0.5],
          [-0.36, 0.04, 0.52],
          [0.5, 0.04, 0.1],
        ].map((pos, i) => (
          <mesh key={i} position={pos as [number, number, number]}>
            <boxGeometry args={[0.07, 0.04, 0.04]} />
            <meshStandardMaterial color="#cdab5a" metalness={0.6} roughness={0.4} />
          </mesh>
        ))}
      </group>

      {/* enclosure — top lid */}
      <group ref={lidRef} position={[0, 0.22, 0]}>
        <mesh>
          <boxGeometry args={[1.7, 0.06, 1.7]} />
          <meshStandardMaterial color="#2b303a" metalness={0.7} roughness={0.4} />
        </mesh>
        {/* vent slots */}
        {[-0.3, -0.1, 0.1, 0.3].map((x) => (
          <mesh key={x} position={[x, 0.035, 0]}>
            <boxGeometry args={[0.05, 0.02, 0.9]} />
            <meshStandardMaterial color="#171a20" metalness={0.5} roughness={0.5} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function Scene({ progressRef, reduced }: { progressRef: RefObject<number>; reduced: boolean }) {
  return (
    <Canvas
      camera={{ position: [0, 1.25, 4.2], fov: 34 }}
      dpr={[1, 1.6]}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
    >
      <ambientLight intensity={0.5} />
      <directionalLight position={[3.5, 5, 3]} intensity={1.5} color="#ffffff" />
      <directionalLight position={[-4, 2, -3]} intensity={0.5} color="#9cc0e0" />
      <pointLight position={[0, -2, 2]} intensity={0.6} color="#5ad0ff" />
      <CubesatModel progressRef={progressRef} reduced={reduced} />
    </Canvas>
  );
}

export function PcbShowcase() {
  const reduced = Boolean(useReducedMotion());
  const sectionRef = useRef<HTMLElement>(null);
  const progressRef = useRef(0);
  const [inView, setInView] = useState(false);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });
  useMotionValueEvent(scrollYProgress, "change", (v) => {
    progressRef.current = v;
  });

  const cap1Opacity = useTransform(scrollYProgress, [0, 0.28, 0.42], [1, 1, 0]);
  const cap2Opacity = useTransform(scrollYProgress, [0.5, 0.64, 1], [0, 1, 1]);
  const hint = useTransform(scrollYProgress, [0, 0.12], [1, 0]);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), {
      rootMargin: "300px",
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className={`pcb-showcase ${reduced ? "is-reduced" : ""}`}>
      <div className="pcb-sticky">
        <div className="pcb-canvas">
          {inView ? <Scene progressRef={progressRef} reduced={reduced} /> : null}
        </div>

        <div className="pcb-overlay shell">
          <motion.div className="pcb-caption" style={reduced ? undefined : { opacity: cap1Opacity }}>
            <p className="kicker">Flagship build · 3D</p>
            <h2 className="display text-4xl text-white sm:text-5xl">A board that signs its own data.</h2>
            <p className="lead mt-5 max-w-md">
              ESP32-S3 · LoRa · GNSS · ATECC608A — engineered for the field. Scroll to take it apart.
            </p>
          </motion.div>

          <motion.div
            className="pcb-caption pcb-caption-2"
            style={reduced ? { opacity: 0 } : { opacity: cap2Opacity }}
          >
            <p className="kicker">Inside the enclosure</p>
            <ul className="pcb-parts">
              <li><span>MCU</span> ESP32-S3</li>
              <li><span>Radio</span> LoRa long-range</li>
              <li><span>Position</span> GNSS receiver</li>
              <li><span>Trust</span> ATECC608A secure element</li>
            </ul>
          </motion.div>
        </div>

        {!reduced ? (
          <motion.div className="pcb-scrollhint" style={{ opacity: hint }} aria-hidden="true">
            Scroll to explode ↓
          </motion.div>
        ) : null}
      </div>
    </section>
  );
}
