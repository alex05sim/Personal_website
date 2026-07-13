"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { ArrowUpRight, Crosshair, Download, Mail, MoonStar, SunMedium } from "lucide-react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import SunCalc from "suncalc";
import type { Group, Mesh, MeshBasicMaterial, PerspectiveCamera, Points, Texture } from "three";
import {
  AdditiveBlending,
  CanvasTexture,
  Quaternion,
  SRGBColorSpace,
  TextureLoader,
  Vector3,
} from "three";
import { makeAtmosphereMaterial, makeEarthMaterial } from "@/lib/earth-gl";
import { latLonToVec3, subsolarPoint } from "@/lib/geo";
import { profile } from "@/lib/portfolio-data";
import { CanvasErrorBoundary } from "./canvas-error-boundary";
import { Magnetic } from "./interactions";

const BERKELEY = { name: "Berkeley, CA", lat: 37.8715, lon: -122.273 };
const FORT_MEADE = { name: "Fort Meade, MD", lat: 39.108, lon: -76.771 };

function useHydratedReducedMotion() {
  const preference = useReducedMotion();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setHydrated(true), 0);

    return () => window.clearTimeout(timer);
  }, []);

  return hydrated ? Boolean(preference) : false;
}

function seededNoise(index: number) {
  const value = Math.sin(index * 12.9898 + 78.233) * 43758.5453;

  return value - Math.floor(value);
}

function createStarPositions(count: number, near: number, far: number, seed: number) {
  const stars = new Float32Array(count * 3);

  for (let i = 0; i < stars.length; i += 3) {
    const idx = i + seed;
    const radius = near + seededNoise(idx) * (far - near);
    const theta = seededNoise(idx + 1) * Math.PI * 2;
    const phi = Math.acos(2 * seededNoise(idx + 2) - 1);

    stars[i] = radius * Math.sin(phi) * Math.cos(theta);
    stars[i + 1] = radius * Math.sin(phi) * Math.sin(theta);
    stars[i + 2] = radius * Math.cos(phi);
  }

  return stars;
}

function StarLayer({
  count,
  near,
  far,
  size,
  opacity,
  color,
  speed,
  seed,
}: {
  count: number;
  near: number;
  far: number;
  size: number;
  opacity: number;
  color: string;
  speed: number;
  seed: number;
}) {
  const pointsRef = useRef<Points>(null);
  const positions = useMemo(
    () => createStarPositions(count, near, far, seed),
    [count, near, far, seed],
  );

  useFrame((_, delta) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y += delta * speed;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial transparent size={size} color={color} opacity={opacity} depthWrite={false} sizeAttenuation />
    </points>
  );
}

function StarField({ compact }: { compact: boolean }) {
  return (
    <>
      {/* Dense background field */}
      <StarLayer count={compact ? 400 : 900} near={12} far={38} size={0.011} opacity={0.38} color="#eef2ff" speed={0.004} seed={0} />
      {/* Mid-distance brighter stars */}
      <StarLayer count={compact ? 180 : 380} near={9} far={26} size={0.022} opacity={0.65} color="#f8fafc" speed={0.007} seed={5000} />
      {/* Close vivid stars */}
      <StarLayer count={compact ? 60 : 130} near={7} far={18} size={0.04} opacity={0.88} color="#cfe0ff" speed={0.011} seed={9000} />
      {/* Bright foreground accent stars - warm and cool mix */}
      <StarLayer count={compact ? 20 : 48} near={6} far={14} size={0.07} opacity={0.95} color="#ffe8c8" speed={0.016} seed={13000} />
      {/* Very faint ultra-deep background haze */}
      <StarLayer count={compact ? 0 : 500} near={28} far={55} size={0.008} opacity={0.22} color="#d8e4ff" speed={0.002} seed={20000} />
    </>
  );
}

function Meteor({ seed }: { seed: number }) {
  const groupRef = useRef<Group>(null);
  const matRef = useRef<MeshBasicMaterial>(null);

  const cfg = useMemo(() => {
    const r = (n: number) => seededNoise(seed * 13.1 + n);
    const theta = r(1) * Math.PI * 2;
    const radius = 10 + r(2) * 6;
    const start = new Vector3(Math.cos(theta) * radius, 5 + r(3) * 6, Math.sin(theta) * radius - 3);
    const dir = new Vector3(-0.6 + r(4) * 1.2, -0.7 - r(5) * 0.6, -0.2 + r(6) * 0.4).normalize();
    const quat = new Quaternion().setFromUnitVectors(new Vector3(1, 0, 0), dir);
    return {
      start,
      dir,
      speed: 7 + r(7) * 6,
      period: 8 + r(8) * 11,
      dur: 0.9,
      offset: r(9) * 18,
      quat: [quat.x, quat.y, quat.z, quat.w] as [number, number, number, number],
    };
  }, [seed]);

  useFrame((state) => {
    if (!groupRef.current || !matRef.current) {
      return;
    }
    const tt = (state.clock.elapsedTime + cfg.offset) % cfg.period;
    const active = tt < cfg.dur;
    groupRef.current.visible = active;
    if (active) {
      const p = tt / cfg.dur;
      groupRef.current.position.copy(cfg.start).addScaledVector(cfg.dir, p * cfg.speed);
      matRef.current.opacity = Math.sin(p * Math.PI) * 0.85;
    }
  });

  return (
    <group ref={groupRef} quaternion={cfg.quat} visible={false}>
      <mesh position={[-0.45, 0, 0]}>
        <boxGeometry args={[0.9, 0.012, 0.012]} />
        <meshBasicMaterial
          ref={matRef}
          color="#dce8ff"
          transparent
          opacity={0}
          blending={AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

function LocationPin({
  lat,
  lon,
  color,
  highlight,
}: {
  lat: number;
  lon: number;
  color: string;
  highlight?: boolean;
}) {
  const glowRef = useRef<Mesh>(null);
  const position = useMemo(() => latLonToVec3(lat, lon, 1.012), [lat, lon]);

  useFrame((state) => {
    if (glowRef.current) {
      const pulse = 1 + Math.sin(state.clock.elapsedTime * 2.2) * 0.3;
      glowRef.current.scale.setScalar(pulse);
    }
  });

  const dotSize = highlight ? 0.02 : 0.014;

  return (
    <group position={position}>
      <mesh>
        <sphereGeometry args={[dotSize, 16, 16]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <mesh ref={glowRef}>
        <sphereGeometry args={[dotSize * 2.4, 16, 16]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={highlight ? 0.34 : 0.2}
          blending={AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

type SatelliteConfig = {
  radius: number;
  speed: number;
  phase: number;
  tilt: [number, number, number];
  color: string;
  size?: number;
};

// A curated, spread-out set (was 38 — trimmed for a lighter, more polished hero).
const satellites: SatelliteConfig[] = [
  { radius: 1.28, speed: 0.32, phase: 0.6, tilt: [0.3, 0.1, 0.0], color: "#e0e8f4", size: 0.9 },
  { radius: 1.39, speed: -0.2, phase: 1.1, tilt: [-0.42, 0.85, 0.3], color: "#aab6c8", size: 0.8 },
  { radius: 1.5, speed: -0.19, phase: 2.8, tilt: [0.6, 1.1, -0.2], color: "#b8c4d4", size: 0.85 },
  { radius: 1.6, speed: 0.22, phase: 4.0, tilt: [1.25, 0.5, 0.2], color: "#9fadc2", size: 0.7 },
  { radius: 1.72, speed: 0.14, phase: 5.5, tilt: [1.2, 0.2, -0.1], color: "#b4c0d0", size: 0.8 },
  { radius: 1.82, speed: -0.17, phase: 2.6, tilt: [1.0, 0.9, 0.0], color: "#c0c9d8", size: 1 },
  { radius: 1.93, speed: -0.14, phase: 5.1, tilt: [0.9, 1.2, -0.3], color: "#d4dbe8", size: 1.0 },
  { radius: 2.04, speed: 0.075, phase: 3.6, tilt: [-1.45, 0.4, -0.2], color: "#a3b0c4", size: 1.05 },
  { radius: 2.17, speed: 0.065, phase: 0.8, tilt: [-0.8, -0.4, 0.3], color: "#d2d9e6", size: 0.9 },
  { radius: 2.3, speed: -0.085, phase: 2.0, tilt: [1.5, 0.7, -0.1], color: "#b0bccf", size: 0.8 },
  { radius: 2.5, speed: -0.058, phase: 5.2, tilt: [0.9, 1.4, 0.25], color: "#9eaabf", size: 0.72 },
  { radius: 2.6, speed: 0.045, phase: 1.4, tilt: [-1.5, 0.2, 0.6], color: "#c6cfdd", size: 0.95 },
  { radius: 2.72, speed: -0.04, phase: 4.3, tilt: [0.25, -1.3, -0.35], color: "#aeb9cc", size: 0.85 },
  { radius: 2.85, speed: -0.035, phase: 5.8, tilt: [1.1, 0.6, -0.4], color: "#bec8d6", size: 0.75 },
];

const TRAIL = [0.06, 0.13, 0.21];

function Satellite({ radius, speed, phase, tilt, color, size = 1 }: SatelliteConfig) {
  const orbitRef = useRef<Group>(null);
  const glowRef = useRef<Mesh>(null);

  useFrame((state) => {
    if (orbitRef.current) {
      orbitRef.current.rotation.y = state.clock.elapsedTime * speed + phase;
    }
    if (glowRef.current) {
      const pulse = 0.9 + Math.sin(state.clock.elapsedTime * 1.8 + phase) * 0.15;
      glowRef.current.scale.setScalar(pulse);
    }
  });

  const direction = speed >= 0 ? -1 : 1;

  return (
    <group rotation={tilt}>
      {/* orbit ring - very faint */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[radius, 0.0008, 5, 64]} />
        <meshBasicMaterial color={color} transparent opacity={0.045} blending={AdditiveBlending} depthWrite={false} />
      </mesh>
      <group ref={orbitRef}>
        <group position={[radius, 0, 0]} scale={size}>
          {/* solar panels - wider, proper blue */}
          <mesh position={[-0.055, 0, 0]}>
            <boxGeometry args={[0.06, 0.003, 0.024]} />
            <meshBasicMaterial color="#2a5c8a" />
          </mesh>
          <mesh position={[0.055, 0, 0]}>
            <boxGeometry args={[0.06, 0.003, 0.024]} />
            <meshBasicMaterial color="#2a5c8a" />
          </mesh>
          {/* panel cell grid highlight */}
          <mesh position={[-0.055, 0.0015, 0]}>
            <boxGeometry args={[0.058, 0.001, 0.022]} />
            <meshBasicMaterial color="#4a90d4" transparent opacity={0.55} blending={AdditiveBlending} depthWrite={false} />
          </mesh>
          <mesh position={[0.055, 0.0015, 0]}>
            <boxGeometry args={[0.058, 0.001, 0.022]} />
            <meshBasicMaterial color="#4a90d4" transparent opacity={0.55} blending={AdditiveBlending} depthWrite={false} />
          </mesh>
          {/* strut */}
          <mesh>
            <boxGeometry args={[0.08, 0.0014, 0.0014]} />
            <meshBasicMaterial color="#8096b2" />
          </mesh>
          {/* body */}
          <mesh>
            <boxGeometry args={[0.016, 0.016, 0.02]} />
            <meshBasicMaterial color={color} />
          </mesh>
          {/* antenna dish - tiny cone pointing outward */}
          <mesh position={[0, 0.014, 0]} rotation={[Math.PI, 0, 0]}>
            <coneGeometry args={[0.006, 0.012, 6]} />
            <meshBasicMaterial color="#a8bcd0" />
          </mesh>
          {/* bright core glint */}
          <mesh>
            <sphereGeometry args={[0.009, 10, 10]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.9} blending={AdditiveBlending} depthWrite={false} />
          </mesh>
          {/* pulsing glow halo */}
          <mesh ref={glowRef}>
            <sphereGeometry args={[0.028, 10, 10]} />
            <meshBasicMaterial color={color} transparent opacity={0.22} blending={AdditiveBlending} depthWrite={false} />
          </mesh>
        </group>
        {TRAIL.map((angle, index) => (
          <group key={index} rotation={[0, direction * angle, 0]}>
            <mesh position={[radius, 0, 0]}>
              <sphereGeometry args={[0.008 * (1 - index * 0.18), 8, 8]} />
              <meshBasicMaterial
                color={color}
                transparent
                opacity={0.38 * (1 - index * 0.2)}
                blending={AdditiveBlending}
                depthWrite={false}
              />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  );
}

function makeGlowTexture() {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.18, "rgba(255,243,214,0.85)");
    g.addColorStop(0.45, "rgba(255,206,138,0.25)");
    g.addColorStop(1, "rgba(255,196,128,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  }
  return new CanvasTexture(canvas);
}

function Sun({
  position,
  texture,
  bodyRef,
  onActivate,
  onHover,
}: {
  position: [number, number, number];
  texture: Texture;
  bodyRef?: React.RefObject<Group | null>;
  onActivate?: () => void;
  onHover?: (v: boolean) => void;
}) {
  const glow = useMemo(() => makeGlowTexture(), []);
  const glareRef = useRef<Group>(null);
  const downRef = useRef<{ x: number; y: number } | null>(null);

  useFrame((state) => {
    if (glareRef.current) {
      const pulse = 1 + Math.sin(state.clock.elapsedTime * 0.7) * 0.06;
      glareRef.current.scale.setScalar(pulse);
    }
  });

  return (
    <group position={position} ref={bodyRef}>
      {/* real photospheric surface */}
      <mesh>
        <sphereGeometry args={[0.13, 48, 48]} />
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>
      {/* invisible hit area — click the sun to launch the solar-research case study */}
      {onActivate ? (
        <mesh
          onPointerDown={(event) => {
            event.stopPropagation();
            downRef.current = { x: event.clientX, y: event.clientY };
          }}
          onPointerUp={(event) => {
            event.stopPropagation();
            const start = downRef.current;
            downRef.current = null;
            if (!start) return;
            if (Math.hypot(event.clientX - start.x, event.clientY - start.y) < 8) onActivate();
          }}
          onPointerOver={(event) => {
            event.stopPropagation();
            onHover?.(true);
            document.body.style.cursor = "pointer";
          }}
          onPointerOut={() => {
            onHover?.(false);
            document.body.style.cursor = "";
          }}
        >
          <sphereGeometry args={[0.6, 16, 16]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      ) : null}
      {/* glare - camera-facing sprites so it stays consistent at any angle */}
      <group ref={glareRef}>
        <sprite scale={[1.7, 1.7, 1]}>
          <spriteMaterial map={glow} color="#ffe7c0" transparent opacity={0.95} blending={AdditiveBlending} depthWrite={false} />
        </sprite>
        <sprite scale={[3.4, 3.4, 1]}>
          <spriteMaterial map={glow} color="#ffd9a0" transparent opacity={0.3} blending={AdditiveBlending} depthWrite={false} />
        </sprite>
        {/* anamorphic flare streak */}
        <sprite scale={[5.2, 0.16, 1]}>
          <spriteMaterial map={glow} color="#fff1da" transparent opacity={0.5} blending={AdditiveBlending} depthWrite={false} />
        </sprite>
      </group>
    </group>
  );
}

function Moon({ texture }: { texture: Texture }) {
  const meshRef = useRef<Mesh>(null);
  const orbit = useMemo(() => ({ radius: 2.45, inc: 0.7, speed: 0.05, phase: 1.4 }), []);

  useFrame((state) => {
    if (meshRef.current) {
      const a = state.clock.elapsedTime * orbit.speed + orbit.phase;
      meshRef.current.position.set(
        Math.cos(a) * orbit.radius,
        Math.sin(a) * orbit.radius * Math.sin(orbit.inc),
        Math.sin(a) * orbit.radius * Math.cos(orbit.inc),
      );
      meshRef.current.rotation.y += 0.0008;
    }
  });

  // A real lunar albedo map, lit by the scene's sun so it shows a phase. The
  // faint cool emissive is "earthshine" - the dark side never goes pure black.
  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[0.24, 48, 48]} />
      <meshStandardMaterial
        map={texture}
        bumpMap={texture}
        bumpScale={0.006}
        roughness={1}
        metalness={0}
        emissive="#16233f"
        emissiveIntensity={0.22}
      />
    </mesh>
  );
}

function LiveEarth({
  compact,
  launching,
  hopeBodyRef,
  onHopeActivate,
  onHopeHover,
  sunBodyRef,
  onSunActivate,
  onSunHover,
}: {
  compact: boolean;
  launching: boolean;
  hopeBodyRef: React.RefObject<Group | null>;
  onHopeActivate: () => void;
  onHopeHover: (v: boolean) => void;
  sunBodyRef: React.RefObject<Group | null>;
  onSunActivate: () => void;
  onSunHover: (v: boolean) => void;
}) {
  const groupRef = useRef<Group>(null);
  const cloudsRef = useRef<Mesh>(null);
  const draggingRef = useRef(false);
  const lastPointerRef = useRef({ x: 0, y: 0 });
  const velocityRef = useRef(0);

  const textures = useMemo(() => {
    const loader = new TextureLoader();
    const day = loader.load("/earth/earth_day.jpg");
    const clouds = loader.load("/earth/earth_clouds_1024.png");
    const night = loader.load("/earth/earth_night.jpg");
    const moon = loader.load("/earth/moon.jpg");
    const mask = loader.load("/earth/earth_specular_2048.jpg");
    const sun = loader.load("/earth/sun.jpg");
    // Anisotropic filtering kills the pixelation at the globe's grazing edges.
    day.anisotropy = 16;
    clouds.anisotropy = 16;
    night.anisotropy = 16;
    moon.anisotropy = 16;
    day.colorSpace = SRGBColorSpace;
    clouds.colorSpace = SRGBColorSpace;
    night.colorSpace = SRGBColorSpace;
    moon.colorSpace = SRGBColorSpace;
    sun.colorSpace = SRGBColorSpace;

    return { day, clouds, night, moon, mask, sun };
  }, []);

  const sunVec = useMemo(() => {
    const sun = subsolarPoint(new Date());
    return latLonToVec3(sun.lat, sun.lon, 1);
  }, []);

  const earthMaterial = useMemo(
    () => makeEarthMaterial(textures.day, textures.night, textures.mask, new Vector3(...sunVec)),
    [textures, sunVec],
  );
  const atmosphereMaterial = useMemo(() => makeAtmosphereMaterial(), []);

  const initialRotation = useMemo(() => {
    const [x, , z] = latLonToVec3(BERKELEY.lat, BERKELEY.lon, 1);
    return -Math.atan2(x, z);
  }, []);

  useEffect(() => {
    if (groupRef.current) {
      groupRef.current.rotation.y = initialRotation;
    }
  }, [initialRotation]);

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += velocityRef.current;
      velocityRef.current *= 0.94;

      if (!draggingRef.current) {
        groupRef.current.rotation.y += delta * 0.022;
      }
    }

    if (cloudsRef.current) {
      cloudsRef.current.rotation.y += delta * 0.004;
    }
  });

  const segments = compact ? 64 : 128;

  return (
    <group
      ref={groupRef}
      scale={1.42}
      onPointerDown={(event) => {
        event.stopPropagation();
        draggingRef.current = true;
        lastPointerRef.current = { x: event.clientX, y: event.clientY };
      }}
      onPointerLeave={() => {
        draggingRef.current = false;
      }}
      onPointerMove={(event) => {
        if (!draggingRef.current || !groupRef.current) {
          return;
        }
        const deltaX = event.clientX - lastPointerRef.current.x;
        const next = deltaX * 0.005;
        groupRef.current.rotation.y += next;
        velocityRef.current = next;
        lastPointerRef.current = { x: event.clientX, y: event.clientY };
      }}
      onPointerUp={() => {
        draggingRef.current = false;
      }}
    >
      {/* Directional light only lights the clouds; the earth self-lights via its
          day/night shader. Kept as a child so it tracks geography. */}
      <directionalLight
        position={[sunVec[0] * 6, sunVec[1] * 6, sunVec[2] * 6]}
        intensity={2.6}
        color="#fff4e0"
      />

      {/* The sun (procedural plasma) at the real sub-solar direction - the
          earth's day/night adapts to it - and an orbiting cratered moon. */}
      <Sun
        position={[sunVec[0] * 4.7, sunVec[1] * 4.7, sunVec[2] * 4.7]}
        texture={textures.sun}
        bodyRef={sunBodyRef}
        onActivate={onSunActivate}
        onHover={onSunHover}
      />
      <Moon texture={textures.moon} />

      <mesh>
        <sphereGeometry args={[1, segments, segments]} />
        <primitive object={earthMaterial} attach="material" />
      </mesh>

      {/* Graticule - a clean lat/long grid for the "data globe" look. */}
      <mesh scale={1.003}>
        <sphereGeometry args={[1, 36, 18]} />
        <meshBasicMaterial color="#7e93b4" wireframe transparent opacity={0.055} depthWrite={false} />
      </mesh>

      <mesh ref={cloudsRef} scale={1.008}>
        <sphereGeometry args={[1, segments, segments]} />
        <meshStandardMaterial map={textures.clouds} transparent opacity={0.42} depthWrite={false} />
      </mesh>

      <mesh scale={1.1}>
        <sphereGeometry args={[1, 48, 48]} />
        <primitive object={atmosphereMaterial} attach="material" />
      </mesh>

      <LocationPin lat={BERKELEY.lat} lon={BERKELEY.lon} color="#9cc0e0" highlight />
      <LocationPin lat={FORT_MEADE.lat} lon={FORT_MEADE.lon} color="#9aa6ba" />

      {(compact ? satellites.slice(0, 6) : satellites).map((satellite, index) => (
        <Satellite key={index} {...satellite} />
      ))}

      <HopeSatellite bodyRef={hopeBodyRef} onActivate={onHopeActivate} onHover={onHopeHover} launching={launching} />
    </group>
  );
}

function CameraParallax({ paused }: { paused: boolean }) {
  useFrame((state) => {
    if (paused) return;
    state.camera.position.x += (state.pointer.x * 0.38 - state.camera.position.x) * 0.04;
    state.camera.position.y += (state.pointer.y * 0.26 - state.camera.position.y) * 0.04;
    state.camera.lookAt(0, 0, 0);
  });
  return null;
}

/** The HOPE CubeSat — a distinct amber asset with a target reticle; clicking it launches the case study. */
function HopeSatellite({
  bodyRef,
  onActivate,
  onHover,
  launching,
}: {
  bodyRef: React.RefObject<Group | null>;
  onActivate: () => void;
  onHover: (v: boolean) => void;
  launching: boolean;
}) {
  const orbitRef = useRef<Group>(null);
  const reticleRef = useRef<Group>(null);
  const downRef = useRef<{ x: number; y: number } | null>(null);
  const radius = 1.34;

  // Launch "lock-on": the sat's orbital motion brakes to a stop (so the camera
  // approaches a stationary target instead of chasing one), and the reticle
  // gives a quick target-acquired flick, expanding as we close in.
  const orbitAngle = useRef(2.1);
  const orbitSpeed = useRef(0.16);
  const reticleAngle = useRef(0);
  const reticleKick = useRef(0);
  const reticleScale = useRef(1);

  useFrame((state, delta) => {
    if (!launching) {
      orbitAngle.current = state.clock.elapsedTime * 0.16 + 2.1;
      orbitSpeed.current = 0.16;
      reticleAngle.current = state.clock.elapsedTime * 0.6;
      reticleKick.current = 3.4; // primed for the next launch
      reticleScale.current = 1;
    } else {
      orbitSpeed.current *= Math.exp(-delta * 3.4); // brake to a halt
      orbitAngle.current += orbitSpeed.current * delta;
      reticleKick.current *= Math.exp(-delta * 2.8); // spin flick, then freeze
      reticleAngle.current += reticleKick.current * delta;
      reticleScale.current = Math.min(2.1, reticleScale.current + delta * 1.5);
    }
    if (orbitRef.current) orbitRef.current.rotation.y = orbitAngle.current;
    if (reticleRef.current) {
      reticleRef.current.rotation.z = reticleAngle.current;
      reticleRef.current.scale.setScalar(reticleScale.current);
    }
  });

  const ticks = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2];

  return (
    <group rotation={[0.36, 0.2, 0.05]}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[radius, 0.0012, 6, 128]} />
        <meshBasicMaterial color="#f6a23c" transparent opacity={0.14} blending={AdditiveBlending} depthWrite={false} />
      </mesh>
      <group ref={orbitRef}>
        <group ref={bodyRef} position={[radius, 0, 0]} scale={1.5}>
          {/* invisible larger hit area for easy click/tap. We handle pointer
              down/up with a small move threshold instead of onClick: the globe's
              drag handler + the satellite's own orbit motion would otherwise
              steal the click (sat slides out from under the cursor). */}
          <mesh
            onPointerDown={(event) => {
              event.stopPropagation();
              downRef.current = { x: event.clientX, y: event.clientY };
            }}
            onPointerUp={(event) => {
              event.stopPropagation();
              const start = downRef.current;
              downRef.current = null;
              if (!start) return;
              const moved = Math.hypot(event.clientX - start.x, event.clientY - start.y);
              if (moved < 8) onActivate();
            }}
            onPointerOver={(event) => {
              event.stopPropagation();
              onHover(true);
              document.body.style.cursor = "pointer";
            }}
            onPointerOut={() => {
              onHover(false);
              document.body.style.cursor = "";
            }}
          >
            <sphereGeometry args={[0.16, 16, 16]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          </mesh>
          {/* solar panels */}
          <mesh position={[-0.055, 0, 0]}>
            <boxGeometry args={[0.06, 0.003, 0.024]} />
            <meshBasicMaterial color="#2a5c8a" />
          </mesh>
          <mesh position={[0.055, 0, 0]}>
            <boxGeometry args={[0.06, 0.003, 0.024]} />
            <meshBasicMaterial color="#2a5c8a" />
          </mesh>
          {/* amber body + glow */}
          <mesh>
            <boxGeometry args={[0.02, 0.02, 0.024]} />
            <meshBasicMaterial color="#ffd9a8" />
          </mesh>
          <mesh>
            <sphereGeometry args={[0.032, 12, 12]} />
            <meshBasicMaterial color="#f6a23c" transparent opacity={0.42} blending={AdditiveBlending} depthWrite={false} />
          </mesh>
          {/* spinning target reticle */}
          <group ref={reticleRef}>
            <mesh>
              <torusGeometry args={[0.052, 0.0016, 6, 48]} />
              <meshBasicMaterial color="#f6a23c" transparent opacity={0.85} blending={AdditiveBlending} depthWrite={false} />
            </mesh>
            {ticks.map((angle, index) => (
              <mesh key={index} position={[Math.cos(angle) * 0.06, Math.sin(angle) * 0.06, 0]} rotation={[0, 0, angle]}>
                <boxGeometry args={[0.014, 0.0018, 0.0018]} />
                <meshBasicMaterial color="#f6a23c" transparent opacity={0.85} blending={AdditiveBlending} depthWrite={false} />
              </mesh>
            ))}
          </group>
        </group>
      </group>
    </group>
  );
}

/** When active, dollies the camera toward the target for the launch zoom.
 *  `orbit` adds a lateral/vertical arc so it swoops AROUND the target (the Sun). */
function LaunchDolly({ active, targetRef, orbit = false }: { active: boolean; targetRef: React.RefObject<Group | null>; orbit?: boolean }) {
  const target = useMemo(() => new Vector3(), []);
  const dir = useMemo(() => new Vector3(), []);
  const desired = useMemo(() => new Vector3(), []);
  const tangent = useMemo(() => new Vector3(), []);
  const UP = useMemo(() => new Vector3(0, 1, 0), []);
  const prog = useRef(0);
  const baseFov = useRef<number | null>(null);

  useFrame((state, delta) => {
    const cam = state.camera as PerspectiveCamera;
    if (!active) {
      prog.current = 0;
      if (baseFov.current !== null) {
        cam.fov = baseFov.current;
        cam.updateProjectionMatrix();
        baseFov.current = null;
      }
      return;
    }
    if (!targetRef.current) return;
    if (baseFov.current === null) baseFov.current = cam.fov;

    // Eased approach: gentle start (lock-on beat), committed middle, soft
    // arrival — no terminal dive. The warp overlay sells the final jump.
    prog.current = Math.min(1, prog.current + delta / 1.85);
    const t = prog.current;
    const p = t * t * (3 - 2 * t); // smoothstep

    targetRef.current.getWorldPosition(target);
    dir.copy(target).sub(state.camera.position).normalize();
    const standoff = 0.5 - 0.34 * p; // 0.5 → 0.16: close, but never inside it
    desired.copy(target).sub(dir.multiplyScalar(standoff));
    // both launches bank through a lateral arc; the Sun's is a full swoop
    const arcScale = orbit ? 1.1 : 0.34;
    const arc = Math.sin(t * Math.PI);
    tangent.crossVectors(dir, UP).normalize();
    desired.addScaledVector(tangent, arc * arcScale);
    desired.addScaledVector(UP, Math.sin(t * Math.PI * 0.8) * (orbit ? 0.4 : 0.16));

    state.camera.position.lerp(desired, 0.05 + 0.2 * p);
    state.camera.lookAt(target);
    // lens punch: the FOV tightens as we commit — speed you can feel without
    // the geometry blowing past the near plane
    cam.fov = baseFov.current - 9 * p;
    cam.updateProjectionMatrix();
  });
  return null;
}

function OrbitScene({
  compact,
  frameloop,
  launching,
  launchTargetRef,
  launchOrbit,
  dpr,
  hopeBodyRef,
  onHopeActivate,
  onHopeHover,
  sunBodyRef,
  onSunActivate,
  onSunHover,
}: {
  compact: boolean;
  frameloop: "always" | "demand";
  launching: boolean;
  launchTargetRef: React.RefObject<Group | null>;
  launchOrbit: boolean;
  dpr: number;
  hopeBodyRef: React.RefObject<Group | null>;
  onHopeActivate: () => void;
  onHopeHover: (v: boolean) => void;
  sunBodyRef: React.RefObject<Group | null>;
  onSunActivate: () => void;
  onSunHover: (v: boolean) => void;
}) {
  return (
    <Canvas
      frameloop={frameloop}
      camera={{ position: [-0.7, 0.1, 4.6], fov: 40 }}
      dpr={dpr}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
    >
      {/* Near-zero ambient so the cloud layer is only lit by the sun - clouds
          show on the day side and correctly vanish into the night side. */}
      <ambientLight intensity={0.02} />
      {!compact ? <CameraParallax paused={launching} /> : null}
      <LaunchDolly active={launching} targetRef={launchTargetRef} orbit={launchOrbit} />
      <StarField compact={compact} />
      {!compact ? [0, 1, 2, 3].map((i) => <Meteor key={i} seed={i * 97 + 5} />) : null}
      <LiveEarth
        compact={compact}
        launching={launching}
        hopeBodyRef={hopeBodyRef}
        onHopeActivate={onHopeActivate}
        onHopeHover={onHopeHover}
        sunBodyRef={sunBodyRef}
        onSunActivate={onSunActivate}
        onSunHover={onSunHover}
      />
      {!compact ? (
        <EffectComposer>
          <Bloom
            intensity={0.5}
            luminanceThreshold={0.6}
            luminanceSmoothing={0.3}
            mipmapBlur
            radius={0.6}
          />
        </EffectComposer>
      ) : (
        <></>
      )}
    </Canvas>
  );
}

const heroMeta = [
  { label: "Now", value: "Berkeley research" },
  { label: "Previously", value: "NSA software intern" },
  { label: "Open to", value: "Summer 2026" },
];

function HeroSunBadge() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const initial = window.setTimeout(() => setNow(new Date()), 0);
    const interval = window.setInterval(() => setNow(new Date()), 30000);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(interval);
    };
  }, []);

  const info = useMemo(() => {
    if (!now) {
      return null;
    }

    const position = SunCalc.getPosition(now, BERKELEY.lat, BERKELEY.lon);
    const isDay = position.altitude > 0;
    const time = new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      timeZone: "America/Los_Angeles",
    }).format(now);

    return { isDay, time };
  }, [now]);

  return (
    <Link href="/world" className="hero-live" aria-label="See the live sky on the World page">
      <span className="hero-live-dot" aria-hidden="true" />
      <span className="hero-live-label">Live - Berkeley, CA</span>
      {info ? (
        <span className="hero-live-state">
          {info.isDay ? <SunMedium size={13} /> : <MoonStar size={13} />}
          {info.isDay ? "Daytime" : "Night"} - {info.time}
        </span>
      ) : (
        <span className="hero-live-state">Loading sky...</span>
      )}
      <ArrowUpRight size={13} className="opacity-60" />
    </Link>
  );
}

export function SpaceHero() {
  const reduceMotion = useHydratedReducedMotion();
  const { scrollYProgress } = useScroll();
  const heroY = useTransform(scrollYProgress, [0, 0.3], ["0%", "12%"]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.32], [1, 0]);
  const titleY = useTransform(scrollYProgress, [0, 0.2], [0, -44]);
  const titleScale = useTransform(scrollYProgress, [0, 0.2], [1, 0.97]);
  const copyOpacity = useTransform(scrollYProgress, [0, 0.16], [1, 0]);
  const nameCharacters = profile.name.split("");

  const heroRef = useRef<HTMLElement>(null);
  const [inView, setInView] = useState(true);
  const [dpr, setDpr] = useState(1.3);
  const [compact, setCompact] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(max-width: 768px)").matches,
  );

  // Cap the render buffer to a fixed pixel budget so the hero stays smooth on
  // large / high-DPI (4K) displays instead of rendering a giant target.
  useEffect(() => {
    const calc = () => {
      const w = window.innerWidth || 1920;
      const budget = 2300;
      const cap = Math.min(window.devicePixelRatio || 1, 1.5);
      setDpr(Math.max(0.75, Math.min(cap, budget / w)));
    };
    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, []);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 768px)");
    const update = () => setCompact(query.matches);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const el = heroRef.current;
    if (!el) {
      return;
    }
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), {
      rootMargin: "200px",
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const router = useRouter();
  const hopeBodyRef = useRef<Group>(null);
  const sunBodyRef = useRef<Group>(null);
  const launchTimers = useRef<number[]>([]);
  const [phase, setPhase] = useState<"idle" | "zoom" | "warp">("idle");
  const [hopeHover, setHopeHover] = useState(false);
  const [sunHover, setSunHover] = useState(false);
  const [launchKind, setLaunchKind] = useState<"hope" | "sun">("hope");

  useEffect(() => {
    router.prefetch?.("/projects/cubesat-telemetry-pcb");
    router.prefetch?.("/projects/solar-cycle-prediction");
    // warm the heavy assets the case study needs (PCB model + hi-res clouds) so
    // they're cached and ready by the time the launch transition lands.
    const links = ["/pcb/hope_PCB_opt.glb", "/earth/earth_clouds_hi.png"].map((href) => {
      const link = document.createElement("link");
      link.rel = "prefetch";
      link.as = "fetch";
      link.href = href;
      link.crossOrigin = "anonymous";
      document.head.appendChild(link);
      return link;
    });
    const timers = launchTimers.current;
    return () => {
      timers.forEach((id) => window.clearTimeout(id));
      links.forEach((l) => l.remove());
    };
  }, [router]);

  const launch = (kind: "hope" | "sun") => {
    if (phase !== "idle") return;
    const dest =
      kind === "sun" ? "/projects/solar-cycle-prediction" : "/projects/cubesat-telemetry-pcb";
    if (reduceMotion) {
      router.push(dest);
      return;
    }
    setLaunchKind(kind);
    setPhase("zoom");
    launchTimers.current.push(
      window.setTimeout(() => setPhase("warp"), 1700),
      window.setTimeout(() => {
        try {
          sessionStorage.setItem(kind === "sun" ? "solar:arrival" : "hope:arrival", "1");
        } catch {
          /* sessionStorage may be unavailable */
        }
        router.push(`${dest}?from=${kind === "sun" ? "sun" : "orbit"}`);
      }, 2250),
    );
  };

  const launchTargetRef = launchKind === "sun" ? sunBodyRef : hopeBodyRef;
  const frameloop: "always" | "demand" =
    phase !== "idle" || (!reduceMotion && inView) ? "always" : "demand";

  return (
    <section ref={heroRef} className="hero relative flex min-h-[92svh] items-start overflow-hidden pt-16 pb-12 sm:min-h-screen sm:pt-24 sm:pb-16">
      <motion.div
        aria-hidden="true"
        className="hero-canvas absolute inset-0"
        style={reduceMotion ? undefined : { y: heroY, opacity: heroOpacity }}
      >
        <div className="hero-canvas-grade absolute inset-0 cursor-grab active:cursor-grabbing">
          <CanvasErrorBoundary label="space hero">
            <OrbitScene
              compact={compact}
              frameloop={frameloop}
              launching={phase !== "idle"}
              launchTargetRef={launchTargetRef}
              launchOrbit={launchKind === "sun"}
              dpr={compact ? 1 : dpr}
              hopeBodyRef={hopeBodyRef}
              onHopeActivate={() => launch("hope")}
              onHopeHover={setHopeHover}
              sunBodyRef={sunBodyRef}
              onSunActivate={() => launch("sun")}
              onSunHover={setSunHover}
            />
          </CanvasErrorBoundary>
        </div>
      </motion.div>
      <div className="hero-veil pointer-events-none absolute inset-0" />
      <div className="hero-blur-strip" />
      <div className="hero-base pointer-events-none absolute inset-x-0 bottom-0 h-64" />
      {hopeHover && phase === "idle" ? (
        <div className="hope-hint" aria-hidden="true">
          <Crosshair size={13} />
          HOPE · CubeSat asset — click to open
        </div>
      ) : null}
      {sunHover && phase === "idle" ? (
        <div className="hope-hint sun-hint" aria-hidden="true">
          <SunMedium size={13} />
          The Sun · Solar-cycle research — click to open
        </div>
      ) : null}
      {phase !== "idle" ? (
        <div className={`hero-warp hero-warp-${phase} ${launchKind === "sun" ? "is-sun" : ""}`} aria-hidden="true" />
      ) : null}

      <div className="hero-shell relative z-10 w-full">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 20 }}
          animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="hero-copy max-w-[44rem]"
          style={reduceMotion ? undefined : { y: titleY, scale: titleScale, opacity: copyOpacity }}
        >
          <motion.p
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="kicker mb-7"
          >
            Security / Hardware / AI
          </motion.p>
          <h1 className="display text-[clamp(2.4rem,8.5vw,6.5rem)] text-white">
            <span aria-label={profile.name} className="hero-name">
              {nameCharacters.map((character, index) => (
                <motion.span
                  aria-hidden="true"
                  key={`${character}-${index}`}
                  initial={reduceMotion ? false : { opacity: 0, y: "0.5em" }}
                  animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                  transition={{
                    delay: 0.12 + index * 0.028,
                    duration: 0.5,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                >
                  {/* nbsp: a lone collapsible space inside an inline-block span
                      renders zero-width, which deleted the gap in "Alex Simpson" */}
                  {character === " " ? " " : character}
                </motion.span>
              ))}
            </span>
          </h1>
          <motion.p
            initial={reduceMotion ? false : { opacity: 0, y: 14 }}
            animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="lead mt-8 max-w-xl"
          >
            {profile.intro}
          </motion.p>
          <motion.p
            initial={reduceMotion ? false : { opacity: 0, y: 10 }}
            animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{ delay: 0.52, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="mt-4 max-w-xl text-sm font-medium leading-relaxed text-white/85 sm:text-base"
          >
            Former NSA software intern. Built a secure telemetry PCB, a malicious-datastore file
            system, and GPU-accelerated simulation work.
          </motion.p>
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 14 }}
            animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{ delay: 0.68, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="mt-9 flex flex-col gap-3 sm:flex-row"
          >
            <Magnetic>
              <Link className="btn btn-primary" href="/projects">
                View projects
                <ArrowUpRight size={18} />
              </Link>
            </Magnetic>
            <Magnetic>
              <a className="btn btn-ghost" href={profile.resumeHref} target="_blank" rel="noreferrer">
                <Download size={18} />
                Resume
              </a>
            </Magnetic>
            <Magnetic>
              <a className="btn btn-ghost" href={`mailto:${profile.email}`}>
                <Mail size={18} />
                Contact
              </a>
            </Magnetic>
          </motion.div>
          <motion.div
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={reduceMotion ? undefined : { opacity: 1 }}
            transition={{ delay: 0.78, duration: 0.5 }}
            className="mt-6 flex flex-col gap-2"
          >
            <button type="button" onClick={() => launch("hope")} className="hero-mission-cue">
              <span className="hero-mission-dot" aria-hidden="true" />
              Click the amber satellite to enter Operation HOPE
              <ArrowUpRight size={14} />
            </button>
            <button type="button" onClick={() => launch("sun")} className="hero-mission-cue hero-sun-cue">
              <span className="hero-mission-dot hero-sun-dot" aria-hidden="true" />
              Click the Sun for solar-cycle research
              <ArrowUpRight size={14} />
            </button>
          </motion.div>
          <motion.div
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={reduceMotion ? undefined : { opacity: 1 }}
            transition={{ delay: 0.82, duration: 0.55 }}
            className="mt-12 flex flex-wrap items-center gap-x-10 gap-y-6"
          >
            <div className="hero-meta">
              {heroMeta.map((item) => (
                <div className="item" key={item.label}>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>
          </motion.div>
          <motion.div
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={reduceMotion ? undefined : { opacity: 1 }}
            transition={{ delay: 0.92, duration: 0.55 }}
            className="mt-8"
          >
            <HeroSunBadge />
          </motion.div>
        </motion.div>
      </div>
      <div className="scroll-cue" aria-hidden="true">
        <span />
      </div>
    </section>
  );
}
