"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { ArrowUpRight, Download, Mail, MoonStar, SunMedium } from "lucide-react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import SunCalc from "suncalc";
import type { Group, Mesh, MeshBasicMaterial, Points, Texture } from "three";
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
import { Magnetic } from "./interactions";
import { ScrambleText } from "./scramble-text";

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
      <StarLayer count={compact ? 220 : 460} near={9} far={28} size={0.016} opacity={0.5} color="#eef2ff" speed={0.006} seed={0} />
      <StarLayer count={compact ? 70 : 140} near={8} far={22} size={0.032} opacity={0.8} color="#f8fafc" speed={0.01} seed={5000} />
      <StarLayer count={36} near={7} far={17} size={0.055} opacity={0.95} color="#cfe0ff" speed={0.014} seed={9000} />
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

const satellites: SatelliteConfig[] = [
  { radius: 1.32, speed: 0.27, phase: 0.0, tilt: [0.5, 0.2, 0.0], color: "#d3dae6", size: 1.1 },
  { radius: 1.39, speed: -0.2, phase: 1.1, tilt: [-0.42, 0.85, 0.3], color: "#aab6c8", size: 0.8 },
  { radius: 1.46, speed: 0.18, phase: 2.2, tilt: [1.5, -0.2, 0.05], color: "#c4cdda", size: 1 },
  { radius: 1.53, speed: -0.15, phase: 3.1, tilt: [0.2, 1.45, -0.3], color: "#b6c2d2", size: 0.9 },
  { radius: 1.6, speed: 0.22, phase: 4.0, tilt: [1.25, 0.5, 0.2], color: "#9fadc2", size: 0.7 },
  { radius: 1.68, speed: -0.13, phase: 5.0, tilt: [-0.7, 1.0, 0.5], color: "#dde3ed", size: 1.2 },
  { radius: 1.75, speed: 0.1, phase: 0.7, tilt: [1.55, -1.0, 0.0], color: "#a7b4c7", size: 0.85 },
  { radius: 1.82, speed: -0.17, phase: 2.6, tilt: [1.0, 0.9, 0.0], color: "#c0c9d8", size: 1 },
  { radius: 1.89, speed: 0.09, phase: 4.6, tilt: [-0.5, 0.3, 0.6], color: "#b2bed0", size: 0.75 },
  { radius: 1.96, speed: -0.11, phase: 1.8, tilt: [0.7, -0.6, 0.35], color: "#d6dde8", size: 0.95 },
  { radius: 2.04, speed: 0.075, phase: 3.6, tilt: [-1.45, 0.4, -0.2], color: "#a3b0c4", size: 1.05 },
  { radius: 2.12, speed: -0.07, phase: 5.6, tilt: [0.45, 1.2, 0.15], color: "#bcc6d6", size: 0.7 },
  { radius: 2.21, speed: 0.062, phase: 0.3, tilt: [1.15, -0.3, 0.5], color: "#cbd3e0", size: 0.9 },
  { radius: 2.3, speed: -0.085, phase: 2.0, tilt: [1.5, 0.7, -0.1], color: "#b0bccf", size: 0.8 },
  { radius: 2.4, speed: 0.05, phase: 3.9, tilt: [-0.3, -0.9, 0.4], color: "#d9e0ea", size: 1 },
  { radius: 2.5, speed: -0.058, phase: 5.2, tilt: [0.9, 1.4, 0.25], color: "#9eaabf", size: 0.72 },
  { radius: 2.6, speed: 0.045, phase: 1.4, tilt: [-1.5, 0.2, 0.6], color: "#c6cfdd", size: 0.95 },
  { radius: 2.72, speed: -0.04, phase: 4.3, tilt: [0.25, -1.3, -0.35], color: "#aeb9cc", size: 0.85 },
];

const TRAIL = [0.05, 0.1, 0.16, 0.23, 0.31];

function Satellite({ radius, speed, phase, tilt, color, size = 1 }: SatelliteConfig) {
  const orbitRef = useRef<Group>(null);

  useFrame((state) => {
    if (orbitRef.current) {
      orbitRef.current.rotation.y = state.clock.elapsedTime * speed + phase;
    }
  });

  const direction = speed >= 0 ? -1 : 1;

  return (
    <group rotation={tilt}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[radius, 0.0011, 6, 128]} />
        <meshBasicMaterial color={color} transparent opacity={0.12} blending={AdditiveBlending} depthWrite={false} />
      </mesh>
      <group ref={orbitRef}>
        <group position={[radius, 0, 0]} scale={size}>
          {/* solar panels — small + precise */}
          <mesh position={[-0.03, 0, 0]}>
            <boxGeometry args={[0.038, 0.0025, 0.018]} />
            <meshBasicMaterial color="#33567d" />
          </mesh>
          <mesh position={[0.03, 0, 0]}>
            <boxGeometry args={[0.038, 0.0025, 0.018]} />
            <meshBasicMaterial color="#33567d" />
          </mesh>
          {/* strut */}
          <mesh>
            <boxGeometry args={[0.05, 0.0012, 0.0012]} />
            <meshBasicMaterial color="#6f86a8" />
          </mesh>
          {/* body */}
          <mesh>
            <boxGeometry args={[0.013, 0.013, 0.016]} />
            <meshBasicMaterial color={color} />
          </mesh>
          {/* faint glint */}
          <mesh>
            <sphereGeometry args={[0.02, 10, 10]} />
            <meshBasicMaterial color={color} transparent opacity={0.16} blending={AdditiveBlending} depthWrite={false} />
          </mesh>
        </group>
        {TRAIL.map((angle, index) => (
          <group key={index} rotation={[0, direction * angle, 0]}>
            <mesh position={[radius, 0, 0]}>
              <sphereGeometry args={[0.0075 * (1 - index * 0.18), 8, 8]} />
              <meshBasicMaterial
                color={color}
                transparent
                opacity={0.32 * (1 - index * 0.2)}
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
}: {
  position: [number, number, number];
  texture: Texture;
}) {
  const glow = useMemo(() => makeGlowTexture(), []);
  const glareRef = useRef<Group>(null);

  useFrame((state) => {
    if (glareRef.current) {
      const pulse = 1 + Math.sin(state.clock.elapsedTime * 0.7) * 0.06;
      glareRef.current.scale.setScalar(pulse);
    }
  });

  return (
    <group position={position}>
      {/* real photospheric surface */}
      <mesh>
        <sphereGeometry args={[0.13, 48, 48]} />
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>
      {/* glare — camera-facing sprites so it stays consistent at any angle */}
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
  // faint cool emissive is "earthshine" — the dark side never goes pure black.
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

function LiveEarth({ compact }: { compact: boolean }) {
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

      {/* The sun (procedural plasma) at the real sub-solar direction — the
          earth's day/night adapts to it — and an orbiting cratered moon. */}
      <Sun position={[sunVec[0] * 4.7, sunVec[1] * 4.7, sunVec[2] * 4.7]} texture={textures.sun} />
      <Moon texture={textures.moon} />

      <mesh>
        <sphereGeometry args={[1, segments, segments]} />
        <primitive object={earthMaterial} attach="material" />
      </mesh>

      {/* Graticule — a clean lat/long grid for the "data globe" look. */}
      <mesh scale={1.003}>
        <sphereGeometry args={[1, 36, 18]} />
        <meshBasicMaterial color="#7e93b4" wireframe transparent opacity={0.04} depthWrite={false} />
      </mesh>

      <mesh ref={cloudsRef} scale={1.008}>
        <sphereGeometry args={[1, segments, segments]} />
        <meshStandardMaterial map={textures.clouds} transparent opacity={0.28} depthWrite={false} />
      </mesh>

      <mesh scale={1.1}>
        <sphereGeometry args={[1, 48, 48]} />
        <primitive object={atmosphereMaterial} attach="material" />
      </mesh>

      <LocationPin lat={BERKELEY.lat} lon={BERKELEY.lon} color="#9cc0e0" highlight />
      <LocationPin lat={FORT_MEADE.lat} lon={FORT_MEADE.lon} color="#9aa6ba" />

      {(compact ? satellites.slice(0, 4) : satellites).map((satellite, index) => (
        <Satellite key={index} {...satellite} />
      ))}
    </group>
  );
}

function CameraParallax() {
  useFrame((state) => {
    state.camera.position.x += (state.pointer.x * 0.38 - state.camera.position.x) * 0.04;
    state.camera.position.y += (state.pointer.y * 0.26 - state.camera.position.y) * 0.04;
    state.camera.lookAt(0, 0, 0);
  });
  return null;
}

function OrbitScene({
  compact,
  frameloop,
}: {
  compact: boolean;
  frameloop: "always" | "demand";
}) {
  return (
    <Canvas
      frameloop={frameloop}
      camera={{ position: [0, 0, 4.6], fov: 40 }}
      dpr={compact ? [1, 1] : [1, 1.6]}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
    >
      {/* Near-zero ambient so the cloud layer is only lit by the sun — clouds
          show on the day side and correctly vanish into the night side. */}
      <ambientLight intensity={0.02} />
      {!compact ? <CameraParallax /> : null}
      <StarField compact={compact} />
      {!compact ? [0, 1, 2, 3].map((i) => <Meteor key={i} seed={i * 97 + 5} />) : null}
      <LiveEarth compact={compact} />
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
    setNow(new Date());
    const interval = window.setInterval(() => setNow(new Date()), 30000);
    return () => window.clearInterval(interval);
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
    <a href="/world" className="hero-live" aria-label="See the live sky on the World page">
      <span className="hero-live-dot" aria-hidden="true" />
      <span className="hero-live-label">Live · Berkeley, CA</span>
      {info ? (
        <span className="hero-live-state">
          {info.isDay ? <SunMedium size={13} /> : <MoonStar size={13} />}
          {info.isDay ? "Daytime" : "Night"} · {info.time}
        </span>
      ) : (
        <span className="hero-live-state">Loading sky…</span>
      )}
      <ArrowUpRight size={13} className="opacity-60" />
    </a>
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
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 768px)");
    const update = () => setCompact(query.matches);
    update();
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

  const frameloop: "always" | "demand" = !reduceMotion && inView ? "always" : "demand";

  return (
    <section ref={heroRef} className="hero relative flex min-h-screen items-start overflow-hidden pt-20 pb-16 sm:pt-24">
      <motion.div
        aria-hidden="true"
        className="hero-canvas absolute inset-0"
        style={reduceMotion ? undefined : { y: heroY, opacity: heroOpacity }}
      >
        <div className="hero-canvas-grade absolute inset-0 cursor-grab active:cursor-grabbing">
          <OrbitScene compact={compact} frameloop={frameloop} />
        </div>
      </motion.div>
      <div className="hero-veil pointer-events-none absolute inset-0" />
      <div className="hero-base pointer-events-none absolute inset-x-0 bottom-0 h-64" />

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
            <ScrambleText text="UC Berkeley · Computer Science + Data Science" />
          </motion.p>
          <h1 className="display text-6xl text-white sm:text-7xl lg:text-[6.5rem]">
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
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 14 }}
            animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{ delay: 0.68, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="mt-9 flex flex-col gap-3 sm:flex-row"
          >
            <Magnetic>
              <a className="btn btn-primary" href="/projects">
                View projects
                <ArrowUpRight size={18} />
              </a>
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
