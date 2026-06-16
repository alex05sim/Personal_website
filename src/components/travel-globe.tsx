"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Group, Mesh } from "three";
import { AdditiveBlending, SRGBColorSpace, TextureLoader, Vector3 } from "three";
import { makeAtmosphereMaterial, makeEarthMaterial } from "@/lib/earth-gl";
import { latLonToVec3, subsolarPoint } from "@/lib/geo";
import { CanvasErrorBoundary } from "./canvas-error-boundary";

const BERKELEY = { lat: 37.8715, lon: -122.273 };
const R = 1.42;

function TravelEarth() {
  const groupRef = useRef<Group>(null);
  const cloudsRef = useRef<Mesh>(null);
  const draggingRef = useRef(false);
  const lastPointerRef = useRef({ x: 0, y: 0 });
  const velocityRef = useRef(0);

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
  const pinPosition = useMemo(() => latLonToVec3(BERKELEY.lat, BERKELEY.lon, R * 1.01), []);

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += velocityRef.current;
      velocityRef.current *= 0.94;
      if (!draggingRef.current) {
        groupRef.current.rotation.y += delta * 0.03;
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

      <group position={pinPosition}>
        <mesh>
          <sphereGeometry args={[0.03, 16, 16]} />
          <meshBasicMaterial color="#5ad0ff" />
        </mesh>
        <mesh>
          <sphereGeometry args={[0.07, 16, 16]} />
          <meshBasicMaterial
            color="#9cc0e0"
            transparent
            opacity={0.3}
            blending={AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      </group>
    </group>
  );
}

export function TravelGlobe() {
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
        <TravelEarth />
      </Canvas>
    </CanvasErrorBoundary>
  );
}
