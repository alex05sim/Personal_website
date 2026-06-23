"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import { AdditiveBlending, CanvasTexture, ShaderMaterial } from "three";
import type { Mesh } from "three";
import { CanvasErrorBoundary } from "./canvas-error-boundary";

// A custom GLSL "flowing plasma" sun: a sphere whose surface is domain-warped
// 3D simplex noise that churns over time, ramped through a fire palette with
// white-hot active regions and a glowing limb. Bloom turns the hot bits into
// glow. No GLB, no photo — fully procedural and animated.

const vertexShader = /* glsl */ `
  varying vec3 vPos;
  varying vec3 vNormal;
  void main() {
    vPos = position;
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uTime;
  varying vec3 vPos;
  varying vec3 vNormal;

  // Ashima/Gustavson simplex 3D noise
  vec4 permute(vec4 x){ return mod(((x*34.0)+1.0)*x, 289.0); }
  vec4 taylorInvSqrt(vec4 r){ return 1.79284291400159 - 0.85373472095314 * r; }
  float snoise(vec3 v){
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i  = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod(i, 289.0);
    vec4 p = permute(permute(permute(
               i.z + vec4(0.0, i1.z, i2.z, 1.0))
             + i.y + vec4(0.0, i1.y, i2.y, 1.0))
             + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0) * 2.0 + 1.0;
    vec4 s1 = floor(b1) * 2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
  }

  float fbm(vec3 p){
    float v = 0.0; float a = 0.5;
    for (int i = 0; i < 3; i++){ v += a * snoise(p); p *= 2.0; a *= 0.5; }
    return v;
  }

  void main(){
    float t = uTime * 0.13;
    vec3 p = vPos * 2.2;
    // domain warp → flowing, churning plasma (kept cheap: 2 fbm + 1 detail tap)
    float warp = fbm(p + vec3(0.0, 0.0, t));
    float n = fbm(p + warp * 1.25 + vec3(0.0, 0.0, t * 1.4));
    n = n * 0.5 + 0.5;
    float detail = snoise(p * 4.5 + vec3(0.0, 0.0, -t * 0.9)) * 0.12;
    float v = clamp(n + detail, 0.0, 1.0);

    // fire / plasma color ramp
    vec3 col = vec3(0.22, 0.025, 0.0);
    col = mix(col, vec3(0.85, 0.17, 0.0), smoothstep(0.22, 0.5, v));
    col = mix(col, vec3(1.0, 0.5, 0.07), smoothstep(0.45, 0.68, v));
    col = mix(col, vec3(1.0, 0.82, 0.32), smoothstep(0.66, 0.85, v));
    col = mix(col, vec3(1.0, 0.96, 0.86), smoothstep(0.86, 0.97, v)); // white-hot

    // glowing limb (corona-ish rim)
    float fres = pow(1.0 - max(dot(vNormal, vec3(0.0, 0.0, 1.0)), 0.0), 2.5);
    col += vec3(1.0, 0.46, 0.16) * fres * 0.75;

    col *= 1.25;
    gl_FragColor = vec4(col, 1.0);
  }
`;

// Soft warm corona halo around the disc — replaces EffectComposer bloom (which
// rendered intermittent black frames). A radial-gradient plane sits behind the
// opaque sphere, so only the glow OUTSIDE the limb shows: a clean atmosphere.
function makeGlowTexture() {
  const size = 512;
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const g = c.getContext("2d");
  if (g) {
    const grad = g.createRadialGradient(size / 2, size / 2, size * 0.16, size / 2, size / 2, size * 0.5);
    grad.addColorStop(0, "rgba(255, 150, 66, 0.85)");
    grad.addColorStop(0.35, "rgba(255, 112, 46, 0.4)");
    grad.addColorStop(0.7, "rgba(255, 80, 30, 0.1)");
    grad.addColorStop(1, "rgba(255, 60, 20, 0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, size, size);
  }
  return new CanvasTexture(c);
}

function GlowHalo() {
  const tex = useMemo(() => makeGlowTexture(), []);
  const ref = useRef<Mesh>(null);
  useFrame((state) => {
    if (ref.current) {
      const s = 1 + Math.sin(state.clock.elapsedTime * 0.6) * 0.04;
      ref.current.scale.set(s, s, 1); // gentle breathing glow
    }
  });
  return (
    <mesh ref={ref} position={[0, 0, -1.8]}>
      <planeGeometry args={[5, 5]} />
      <meshBasicMaterial map={tex} transparent blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
    </mesh>
  );
}

function SunPlasma() {
  const ref = useRef<Mesh>(null);
  const material = useMemo(
    () => new ShaderMaterial({ uniforms: { uTime: { value: 0 } }, vertexShader, fragmentShader }),
    [],
  );
  useFrame((state, delta) => {
    material.uniforms.uTime.value = state.clock.elapsedTime;
    if (ref.current) ref.current.rotation.y += delta * 0.045; // slow turn
  });
  return (
    <mesh ref={ref} material={material}>
      <sphereGeometry args={[1.6, 96, 96]} />
    </mesh>
  );
}

export function SolarSunStage() {
  // This canvas stays mounted (and animating) for as long as the user is on the
  // page, not just while in view — cap the render buffer so it stays cheap.
  const [dpr, setDpr] = useState(1.3);
  useEffect(() => {
    const calc = () => {
      const budget = 1600;
      const cap = Math.min(window.devicePixelRatio || 1, 1.5);
      setDpr(Math.max(0.85, Math.min(cap, budget / window.innerWidth)));
    };
    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, []);

  return (
    <CanvasErrorBoundary label="solar sun">
      <Canvas
        camera={{ position: [0, 0, 7.6], fov: 32 }}
        dpr={dpr}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      >
        <GlowHalo />
        <SunPlasma />
      </Canvas>
    </CanvasErrorBoundary>
  );
}
