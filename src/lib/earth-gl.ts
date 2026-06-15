import {
  AdditiveBlending,
  BackSide,
  Color,
  QuadraticBezierCurve3,
  ShaderMaterial,
  type Texture,
  Vector3,
} from "three";
import { latLonToVec3 } from "./geo";

/** Vector3 for a lat/lon on a sphere of the given radius. */
export function latLonVector(lat: number, lon: number, radius: number): Vector3 {
  const [x, y, z] = latLonToVec3(lat, lon, radius);
  return new Vector3(x, y, z);
}

/**
 * Day/night Earth material. The day texture is shown on the lit hemisphere; the
 * night hemisphere darkens and land glows faintly amber ("city lights"), with a
 * warm terminator. `sunDirection` is in the mesh's LOCAL space, so the terminator
 * stays pinned to geography as the globe rotates.
 */
export function makeEarthMaterial(
  dayMap: Texture,
  nightMap: Texture,
  maskMap: Texture,
  sunDirection: Vector3,
): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: {
      dayMap: { value: dayMap },
      nightMap: { value: nightMap },
      maskMap: { value: maskMap },
      sunDirection: { value: sunDirection.clone().normalize() },
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vNormal;
      void main() {
        vUv = uv;
        vNormal = normalize(normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D dayMap;
      uniform sampler2D nightMap;
      uniform sampler2D maskMap;
      uniform vec3 sunDirection;
      varying vec2 vUv;
      varying vec3 vNormal;

      void main() {
        vec3 day = texture2D(dayMap, vUv).rgb;
        vec3 nightTex = texture2D(nightMap, vUv).rgb;
        float water = texture2D(maskMap, vUv).r;

        float s = dot(normalize(vNormal), normalize(sunDirection));
        float dayAmount = smoothstep(-0.09, 0.22, s);

        // Full-color day side (NASA Blue Marble), with a gentle saturation lift.
        vec3 dayColor = mix(vec3(dot(day, vec3(0.299, 0.587, 0.114))), day, 1.18);
        vec3 lit = dayColor * (0.5 + 0.8 * clamp(s, 0.0, 1.0));

        // Night side = the real NASA Black Marble city lights, boosted a touch.
        vec3 night = nightTex * vec3(1.15, 1.05, 0.95) * 1.6;

        vec3 color = mix(night, lit, dayAmount);

        // Sun glint off the oceans near the sub-solar point.
        float glint = pow(clamp(s, 0.0, 1.0), 72.0) * water;
        color += vec3(1.0, 0.95, 0.82) * glint * 1.6;

        // cool glow along the terminator
        float term = 1.0 - smoothstep(0.0, 0.18, abs(s));
        color += vec3(0.35, 0.6, 1.0) * term * 0.05;

        gl_FragColor = vec4(color, 1.0);
      }
    `,
  });
}

// Shared value-noise + fbm GLSL for the procedural sun and moon surfaces.
const NOISE_GLSL = `
  float hash3(vec3 p) {
    p = fract(p * 0.3183099 + 0.1);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }
  float noise3(vec3 x) {
    vec3 i = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(hash3(i + vec3(0,0,0)), hash3(i + vec3(1,0,0)), f.x),
          mix(hash3(i + vec3(0,1,0)), hash3(i + vec3(1,1,0)), f.x), f.y),
      mix(mix(hash3(i + vec3(0,0,1)), hash3(i + vec3(1,0,1)), f.x),
          mix(hash3(i + vec3(0,1,1)), hash3(i + vec3(1,1,1)), f.x), f.y), f.z);
  }
  float fbm3(vec3 p) {
    float v = 0.0; float a = 0.5;
    for (int i = 0; i < 5; i++) { v += a * noise3(p); p *= 2.0; a *= 0.5; }
    return v;
  }
`;

/** Animated turbulent plasma sun surface. */
export function makeSunMaterial(): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: { time: { value: 0 } },
    vertexShader: `
      varying vec3 vPos;
      void main() {
        vPos = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float time;
      varying vec3 vPos;
      ${NOISE_GLSL}
      void main() {
        vec3 p = normalize(vPos);
        float h = fbm3(p * 3.2 + vec3(0.0, time * 0.12, 0.0)) * 0.7
                + fbm3(p * 8.0 - vec3(time * 0.08)) * 0.3;
        vec3 dark = vec3(0.85, 0.22, 0.04);
        vec3 mid = vec3(1.0, 0.55, 0.12);
        vec3 hot = vec3(1.0, 0.95, 0.62);
        vec3 col = mix(dark, mid, smoothstep(0.28, 0.58, h));
        col = mix(col, hot, smoothstep(0.58, 0.86, h));
        gl_FragColor = vec4(col * 1.35, 1.0);
      }
    `,
  });
}

/** Procedural cratered moon, lit by the sun (shows a phase). */
export function makeMoonMaterial(sunDirection: Vector3): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: { sunDirection: { value: sunDirection.clone().normalize() } },
    vertexShader: `
      varying vec3 vPos;
      varying vec3 vNormal;
      void main() {
        vPos = position;
        vNormal = normalize(normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 sunDirection;
      varying vec3 vPos;
      varying vec3 vNormal;
      ${NOISE_GLSL}
      void main() {
        vec3 p = normalize(vPos);
        float base = fbm3(p * 4.5);
        float fine = fbm3(p * 16.0);
        float maria = smoothstep(0.52, 0.74, fbm3(p * 2.2));   // dark seas
        float albedo = 0.62 + (base - 0.5) * 0.4 + (fine - 0.5) * 0.18;
        albedo -= maria * 0.28;
        albedo = clamp(albedo, 0.12, 0.95);
        float lambert = clamp(dot(normalize(vNormal), normalize(sunDirection)), 0.0, 1.0);
        vec3 col = vec3(0.92, 0.93, 0.97) * albedo * (0.05 + lambert);
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
}

/** Thin, restrained atmospheric rim (back-side fresnel, additive). */
export function makeAtmosphereMaterial(color = "#5b7aa8"): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: { glowColor: { value: new Color(color) } },
    vertexShader: `
      varying vec3 vNormal;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 vNormal;
      uniform vec3 glowColor;
      void main() {
        // higher power = tighter rim; lower multiplier = subtler glow
        float intensity = pow(0.6 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 4.2);
        intensity = clamp(intensity, 0.0, 1.0) * 0.55;
        gl_FragColor = vec4(glowColor, 1.0) * intensity;
      }
    `,
    side: BackSide,
    blending: AdditiveBlending,
    transparent: true,
    depthWrite: false,
  });
}

/** A great-circle-ish arc between two coordinates, lifted off the surface. */
export function arcCurve(
  from: { lat: number; lon: number },
  to: { lat: number; lon: number },
  radius: number,
  lift = 0.4,
): QuadraticBezierCurve3 {
  const start = latLonVector(from.lat, from.lon, radius);
  const end = latLonVector(to.lat, to.lon, radius);
  const distance = start.distanceTo(end);
  const mid = start
    .clone()
    .add(end)
    .multiplyScalar(0.5)
    .normalize()
    .multiplyScalar(radius + distance * lift);

  return new QuadraticBezierCurve3(start, mid, end);
}
