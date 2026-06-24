"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import { AdditiveBlending, CanvasTexture, Color, MeshBasicMaterial, PlaneGeometry, ShaderMaterial } from "three";
import type { Group, Mesh } from "three";
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
    vec3 col = vec3(0.34, 0.05, 0.008); // glowing deep red (valleys glow, not black)
    col = mix(col, vec3(0.92, 0.22, 0.012), smoothstep(0.24, 0.5, v));
    col = mix(col, vec3(1.0, 0.5, 0.07), smoothstep(0.45, 0.68, v));
    col = mix(col, vec3(1.0, 0.82, 0.32), smoothstep(0.66, 0.85, v));
    col = mix(col, vec3(1.0, 0.96, 0.86), smoothstep(0.86, 0.97, v)); // white-hot

    // glowing limb (corona-ish rim)
    float fres = pow(1.0 - max(dot(vNormal, vec3(0.0, 0.0, 1.0)), 0.0), 2.5);
    col += vec3(1.0, 0.46, 0.16) * fres * 0.75;

    col *= 1.3;
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

// Solar flares — a SEPARATE, removable layer (not parented to the spinning
// sphere, so they stay anchored to the visible limb). Bright additive jets that
// erupt outward and recede on staggered cycles, biased to the upper/lower right
// limb (into the gap, clear of the off-screen left and the text column).
type FlareDef = { angle: number; w: number; h: number; period: number; phase: number };

// varied lengths/widths so they don't read as uniform spokes
const FLARES: FlareDef[] = [
  { angle: 68, w: 0.34, h: 1.25, period: 7.0, phase: 0.0 },
  { angle: 46, w: 0.5, h: 0.82, period: 5.4, phase: 0.55 },
  { angle: 20, w: 0.3, h: 1.12, period: 6.6, phase: 0.25 },
  { angle: -24, w: 0.46, h: 0.92, period: 7.4, phase: 0.7 },
  { angle: -50, w: 0.33, h: 1.18, period: 6.0, phase: 0.38 },
];

const FLARE_BASE = 1.5; // root radius — just inside the sphere limb (radius 1.6)

// a hot fiery jet: saturated gold-white core → orange → red, fading to nothing.
// Saturated (not cream/white) so additive over the dark page reads as fire, not
// a beige streak; heavy blur makes the edges glow like gas.
function makeFlareTexture() {
  const size = 256;
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const g = c.getContext("2d");
  if (g) {
    g.filter = "blur(14px)";
    const grad = g.createLinearGradient(0, size, 0, 0);
    grad.addColorStop(0, "rgba(255, 232, 150, 1)"); // saturated gold-white core
    grad.addColorStop(0.32, "rgba(255, 140, 42, 0.92)"); // orange body
    grad.addColorStop(0.66, "rgba(255, 74, 24, 0.45)"); // red-orange
    grad.addColorStop(1, "rgba(214, 44, 14, 0)"); // deep red tip
    g.fillStyle = grad;
    g.beginPath();
    g.moveTo(size * 0.5, size * 0.04);
    g.quadraticCurveTo(size * 0.8, size * 0.55, size * 0.5, size * 0.98);
    g.quadraticCurveTo(size * 0.2, size * 0.55, size * 0.5, size * 0.04);
    g.closePath();
    g.fill();
  }
  return new CanvasTexture(c);
}

function SolarFlares() {
  const tex = useMemo(() => makeFlareTexture(), []);
  const groups = useRef<(Group | null)[]>([]);
  // each flare = a bright core jet + a wider, softer, oranger glow under it, so
  // it reads as glowing plasma rather than a flat ribbon. Both base-anchored so
  // they erupt outward from the limb; not parented to the spinning sphere.
  const flares = useMemo(
    () =>
      FLARES.map((f) => {
        const th = (f.angle * Math.PI) / 180;
        const core = new PlaneGeometry(f.w, f.h);
        core.translate(0, f.h / 2, 0);
        const glow = new PlaneGeometry(f.w * 2.4, f.h * 1.02);
        glow.translate(0, (f.h * 1.02) / 2, 0);
        const matOpts = {
          map: tex,
          transparent: true,
          opacity: 0,
          blending: AdditiveBlending,
          depthWrite: false,
          depthTest: false,
          toneMapped: false,
        } as const;
        const coreMat = new MeshBasicMaterial(matOpts);
        const glowMat = new MeshBasicMaterial({ ...matOpts, color: new Color("#ff7e2e") });
        return {
          core,
          glow,
          coreMat,
          glowMat,
          rot: th - Math.PI / 2,
          bx: FLARE_BASE * Math.cos(th),
          by: FLARE_BASE * Math.sin(th),
        };
      }),
    [tex],
  );
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    // shorten flares on narrower viewports so their tips never reach the text
    // column (the sun↔content gap shrinks as the screen narrows).
    const vw = typeof window !== "undefined" ? window.innerWidth : 1920;
    const lenScale = Math.max(0.5, Math.min(1, (vw - 1450) / 650));
    for (let i = 0; i < flares.length; i++) {
      const grp = groups.current[i];
      if (!grp) continue;
      const f = FLARES[i];
      const phase = (t / f.period + f.phase) % 1;
      const env = Math.pow(Math.sin(phase * Math.PI), 0.7); // erupt + recede
      grp.scale.set(1, (0.1 + env) * lenScale, 1);
      flares[i].coreMat.opacity = env * 0.95;
      flares[i].glowMat.opacity = env * 0.4;
    }
  });
  return (
    <group>
      {flares.map((fl, i) => (
        <group
          key={i}
          ref={(el) => {
            groups.current[i] = el;
          }}
          position={[fl.bx, fl.by, 0.1]}
          rotation={[0, 0, fl.rot]}
        >
          <mesh geometry={fl.glow} material={fl.glowMat} />
          <mesh geometry={fl.core} material={fl.coreMat} />
        </group>
      ))}
    </group>
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
        <SolarFlares />
      </Canvas>
    </CanvasErrorBoundary>
  );
}
