"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Group, Mesh } from "three";
import {
  AdditiveBlending,
  BufferGeometry,
  CatmullRomCurve3,
  Line,
  LineBasicMaterial,
  SRGBColorSpace,
  TextureLoader,
  Vector3,
} from "three";
import { makeAtmosphereMaterial, makeEarthMaterial } from "@/lib/earth-gl";
import { latLonToVec3, subsolarPoint } from "@/lib/geo";
import { CanvasErrorBoundary } from "./canvas-error-boundary";

const BERKELEY = { lat: 37.8715, lon: -122.273 };
const R = 1.42;

export type GlobeStop = { place: string; lat: number; lon: number; home?: boolean };
export type GlobeFocus = { lat: number; lon: number; seq: number };

/** Great-circle path between two lat/lon points, lifted off the surface so it
 *  reads as a signal arc rather than a ground route. */
function makeArcPoints(from: GlobeStop, to: GlobeStop, segments = 72): Vector3[] {
  const a = new Vector3(...latLonToVec3(from.lat, from.lon, 1));
  const b = new Vector3(...latLonToVec3(to.lat, to.lon, 1));
  const angle = a.angleTo(b);
  const lift = 0.06 + angle * 0.22; // longer hops arc higher
  const points: Vector3[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const p = new Vector3().copy(a).lerp(b, t).normalize();
    // spherical-ish interpolation: renormalized lerp is fine at these angles
    p.multiplyScalar(R * (1.004 + Math.sin(t * Math.PI) * lift));
    points.push(p);
  }
  return points;
}

/** One glowing dot that travels along an arc, like a packet on a link. */
function ArcPacket({ points, phase, speed }: { points: Vector3[]; phase: number; speed: number }) {
  const ref = useRef<Mesh>(null);
  useFrame((state) => {
    if (!ref.current) return;
    const u = (state.clock.elapsedTime * speed + phase) % 1;
    const f = u * (points.length - 1);
    const i = Math.min(points.length - 2, Math.floor(f));
    ref.current.position.copy(points[i]).lerp(points[i + 1], f - i);
    const mat = ref.current.material as { opacity?: number };
    // fade in/out at the endpoints so packets don't pop
    mat.opacity = Math.min(1, Math.sin(u * Math.PI) * 2.2) * 0.95;
  });
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.016, 8, 8]} />
      <meshBasicMaterial color="#ffd9a8" transparent blending={AdditiveBlending} depthWrite={false} />
    </mesh>
  );
}

function StopPin({ stop }: { stop: GlobeStop }) {
  const glowRef = useRef<Mesh>(null);
  const position = useMemo(
    () => new Vector3(...latLonToVec3(stop.lat, stop.lon, R * 1.005)),
    [stop.lat, stop.lon],
  );
  useFrame((state) => {
    if (glowRef.current && stop.home) {
      const s = 1 + Math.sin(state.clock.elapsedTime * 1.6) * 0.25;
      glowRef.current.scale.setScalar(s);
    }
  });
  const color = stop.home ? "#5ad0ff" : "#f6a23c";
  return (
    <group position={position}>
      <mesh>
        <sphereGeometry args={[stop.home ? 0.03 : 0.022, 16, 16]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <mesh ref={glowRef}>
        <sphereGeometry args={[stop.home ? 0.07 : 0.05, 16, 16]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.28}
          blending={AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

/** Live ISS marker — real position from wheretheiss.at, updated every 10s and
 *  eased between fixes. Earth-fixed lat/lon, so it rides inside the rotating
 *  group like the pins. Silently absent if the API is unreachable. */
function IssMarker({
  onUpdate,
}: {
  onUpdate?: (pos: { lat: number; lon: number } | null) => void;
}) {
  const ref = useRef<Group>(null);
  const target = useRef<{ lat: number; lon: number } | null>(null);
  const shown = useRef<{ lat: number; lon: number } | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const fetchIss = async () => {
      try {
        const res = await fetch("https://api.wheretheiss.at/v1/satellites/25544", {
          cache: "no-store",
        });
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as { latitude: number; longitude: number };
        if (cancelled) return;
        target.current = { lat: data.latitude, lon: data.longitude };
        setVisible(true);
        onUpdate?.(target.current);
      } catch {
        if (!cancelled) {
          setVisible(false);
          onUpdate?.(null);
        }
      }
    };
    fetchIss();
    const id = window.setInterval(fetchIss, 10_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [onUpdate]);

  useFrame(() => {
    if (!ref.current || !target.current) return;
    if (!shown.current) shown.current = { ...target.current };
    // ease toward the latest fix; handle the dateline wrap on longitude
    let dLon = target.current.lon - shown.current.lon;
    if (dLon > 180) dLon -= 360;
    if (dLon < -180) dLon += 360;
    shown.current.lat += (target.current.lat - shown.current.lat) * 0.04;
    shown.current.lon += dLon * 0.04;
    const [x, y, z] = latLonToVec3(shown.current.lat, shown.current.lon, R * 1.09);
    ref.current.position.set(x, y, z);
  });

  if (!visible) return null;
  return (
    <group ref={ref}>
      <mesh>
        <sphereGeometry args={[0.018, 8, 8]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.045, 12, 12]} />
        <meshBasicMaterial
          color="#cfe8ff"
          transparent
          opacity={0.3}
          blending={AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

function TravelEarth({
  stops,
  focus,
  onIssUpdate,
}: {
  stops: GlobeStop[];
  focus: GlobeFocus | null;
  onIssUpdate?: (pos: { lat: number; lon: number } | null) => void;
}) {
  const groupRef = useRef<Group>(null);
  const cloudsRef = useRef<Mesh>(null);
  const draggingRef = useRef(false);
  const lastPointerRef = useRef({ x: 0, y: 0 });
  const velocityRef = useRef(0);
  const focusTargetY = useRef<number | null>(null);
  const lastFocusSeq = useRef(0);

  const textures = useMemo(() => {
    const loader = new TextureLoader();
    const day = loader.load("/earth/earth_day.jpg");
    const night = loader.load("/earth/earth_night.jpg");
    const clouds = loader.load("/earth/earth_clouds_1024.png");
    const mask = loader.load("/earth/earth_specular_2048.jpg");
    day.anisotropy = 16;
    night.anisotropy = 16;
    clouds.anisotropy = 16;
    day.colorSpace = SRGBColorSpace;
    night.colorSpace = SRGBColorSpace;
    clouds.colorSpace = SRGBColorSpace;
    return { day, night, clouds, mask };
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

  const home = useMemo(
    () => stops.find((s) => s.home) ?? { place: "Berkeley", ...BERKELEY, home: true },
    [stops],
  );
  const arcs = useMemo(
    () =>
      stops
        .filter((s) => !s.home)
        .map((stop, i) => {
          const points = makeArcPoints(home, stop);
          const geometry = new BufferGeometry().setFromPoints(
            new CatmullRomCurve3(points).getPoints(96),
          );
          const line = new Line(
            geometry,
            new LineBasicMaterial({
              color: "#f6a23c",
              transparent: true,
              opacity: 0.32,
              blending: AdditiveBlending,
              depthWrite: false,
            }),
          );
          return { stop, points, line, phase: i * 0.45 };
        }),
    [stops, home],
  );

  // A new focus request converts the stop's longitude into the group yaw that
  // brings it to face the camera, then eases there (shortest way around).
  useEffect(() => {
    if (!focus || focus.seq === lastFocusSeq.current) return;
    lastFocusSeq.current = focus.seq;
    const [x, , z] = latLonToVec3(focus.lat, focus.lon, 1);
    focusTargetY.current = Math.atan2(-x, z);
    velocityRef.current = 0;
  }, [focus]);

  useFrame((_, delta) => {
    if (groupRef.current) {
      const g = groupRef.current;
      if (focusTargetY.current !== null && !draggingRef.current) {
        let diff = focusTargetY.current - g.rotation.y;
        diff = ((diff + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
        g.rotation.y += diff * Math.min(1, delta * 3.2);
        if (Math.abs(diff) < 0.01) focusTargetY.current = null; // arrived — resume idle spin
      } else {
        g.rotation.y += velocityRef.current;
        velocityRef.current *= 0.94;
        if (!draggingRef.current) {
          g.rotation.y += delta * 0.03;
        }
      }
    }
    if (cloudsRef.current) {
      cloudsRef.current.rotation.y += delta * 0.006;
    }
  });

  return (
    <group
      ref={groupRef}
      rotation={[0.16, -0.5, 0]}
      onPointerDown={(event) => {
        event.stopPropagation();
        draggingRef.current = true;
        focusTargetY.current = null; // a grab cancels any pending focus glide
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
      <directionalLight
        position={[sunVec[0] * 6, sunVec[1] * 6, sunVec[2] * 6]}
        intensity={2.6}
        color="#fff4e0"
      />

      <mesh>
        <sphereGeometry args={[R, 96, 96]} />
        <primitive object={earthMaterial} attach="material" />
      </mesh>

      <mesh scale={1.004}>
        <sphereGeometry args={[R, 36, 18]} />
        <meshBasicMaterial color="#7e93b4" wireframe transparent opacity={0.04} depthWrite={false} />
      </mesh>

      <mesh ref={cloudsRef} scale={1.008}>
        <sphereGeometry args={[R, 64, 64]} />
        <meshStandardMaterial map={textures.clouds} transparent opacity={0.26} depthWrite={false} />
      </mesh>

      <mesh scale={1.14}>
        <sphereGeometry args={[R, 48, 48]} />
        <primitive object={atmosphereMaterial} attach="material" />
      </mesh>

      {stops.map((stop) => (
        <StopPin key={stop.place} stop={stop} />
      ))}

      {arcs.map((arc) => (
        <group key={arc.stop.place}>
          <primitive object={arc.line} />
          <ArcPacket points={arc.points} phase={arc.phase} speed={0.09} />
        </group>
      ))}

      <IssMarker onUpdate={onIssUpdate} />
    </group>
  );
}

export function TravelGlobe({
  stops = [],
  focus = null,
  onIssUpdate,
}: {
  stops?: GlobeStop[];
  focus?: GlobeFocus | null;
  onIssUpdate?: (pos: { lat: number; lon: number } | null) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [inView, setInView] = useState(true);

  // Pause the render loop while the globe is scrolled off-screen so it isn't
  // burning the GPU on the home/world page when nobody is looking at it.
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) {
      return;
    }
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), {
      rootMargin: "200px",
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <CanvasErrorBoundary label="travel globe">
      <Canvas
        ref={canvasRef}
        frameloop={inView ? "always" : "demand"}
        camera={{ position: [0, 0, 4.4], fov: 48 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      >
        <ambientLight intensity={0.02} />
        <TravelEarth stops={stops} focus={focus} onIssUpdate={onIssUpdate} />
      </Canvas>
    </CanvasErrorBoundary>
  );
}
