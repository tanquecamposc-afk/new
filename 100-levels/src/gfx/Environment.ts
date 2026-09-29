/**
 * Sky dome, fog, sun/hemisphere lighting and ambient particles per world theme.
 */
import * as THREE from 'three';
import { Grade } from './PostFX';
import { AmbientEmitter, Particles, Preset, EmitOpts } from './Particles';

export interface EnvTheme {
  skyTop: number;
  skyHorizon: number;
  skyBottom: number;
  sunColor: number;
  sunIntensity: number;
  sunDir: [number, number, number];
  hemiSky: number;
  hemiGround: number;
  hemiIntensity: number;
  fogColor: number;
  fogDensity: number;
  envIntensity: number;
  stars: number;
  clouds: number;
  exposure: number;
  grade: Partial<Grade>;
  ambient?: { preset: Preset; rate: number; radius: number; height: [number, number]; opts?: EmitOpts }[];
}

const base: EnvTheme = {
  skyTop: 0x1a4a8a, skyHorizon: 0x9ac8f0, skyBottom: 0x404850,
  sunColor: 0xfff0d8, sunIntensity: 2.6, sunDir: [0.5, 0.8, 0.3],
  hemiSky: 0xbcd8ff, hemiGround: 0x404030, hemiIntensity: 0.7,
  fogColor: 0x9ac8f0, fogDensity: 0.006, envIntensity: 0.5, stars: 0, clouds: 0.5, exposure: 1,
  grade: {},
};

const t = (o: Partial<EnvTheme>): EnvTheme => ({ ...base, ...o });

export const THEMES: Record<string, EnvTheme> = {
  // Sunny rooftops: clear blue sky, warm sun, crisp shadows (Parkour-Race look)
  city: t({
    skyTop: 0x2a78e0, skyHorizon: 0xcfe6ff, skyBottom: 0x8aa8c8, sunColor: 0xfff2dc, sunIntensity: 3.1, sunDir: [0.45, 0.75, -0.35],
    hemiSky: 0xcfe4ff, hemiGround: 0x6a6258, hemiIntensity: 0.9, fogColor: 0xa8cdf0, fogDensity: 0.0019, envIntensity: 0.55, stars: 0, clouds: 0.75,
    grade: { bloom: 0.3, tint: 0xfffcf6, sat: 1.12, contrast: 1.04, vignette: 0.22 },
  }),
  temple: t({
    skyTop: 0x100828, skyHorizon: 0x7a4ac0, skyBottom: 0x1a1030, sunColor: 0xd8c0ff, sunIntensity: 2, sunDir: [0.3, 0.7, -0.5],
    hemiSky: 0xa080ff, hemiGround: 0x201830, hemiIntensity: 0.75, fogColor: 0x3a2860, fogDensity: 0.01, envIntensity: 0.7, stars: 0.8, clouds: 0.3,
    grade: { bloom: 0.8, tint: 0xf4eeff, sat: 1.1 },
    ambient: [{ preset: 'magic', rate: 10, radius: 22, height: [0, 8], opts: { size: [0.18, 0.02], life: [2, 4], velSpread: 0.4, up: 0.3, gravity: 0, color: 0xc0a0ff } }],
  }),
  arena: t({
    skyTop: 0x2a1410, skyHorizon: 0xff8a40, skyBottom: 0x301810, sunColor: 0xffa060, sunIntensity: 3, sunDir: [0.7, 0.4, 0.2],
    hemiSky: 0xffc090, hemiGround: 0x402010, hemiIntensity: 0.8, fogColor: 0x8a4a30, fogDensity: 0.008, envIntensity: 0.5, clouds: 0.7,
    grade: { bloom: 0.6, tint: 0xfff0e0, contrast: 1.12 },
    ambient: [{ preset: 'embers', rate: 12, radius: 25, height: [0, 6] }],
  }),
  highway: t({
    skyTop: 0x05081a, skyHorizon: 0x3a1a6a, skyBottom: 0x080810, sunColor: 0x8090ff, sunIntensity: 1.2, sunDir: [0.2, 0.8, 0.4],
    hemiSky: 0x6080ff, hemiGround: 0x200a30, hemiIntensity: 0.55, fogColor: 0x241040, fogDensity: 0.004, envIntensity: 0.9, stars: 1, clouds: 0.2,
    grade: { bloom: 1.0, bloomThreshold: 0.7, tint: 0xf0f0ff, sat: 1.2 },
  }),
  horror: t({
    skyTop: 0x020204, skyHorizon: 0x0c1014, skyBottom: 0x000000, sunColor: 0x6070a0, sunIntensity: 0.25, sunDir: [-0.3, 0.8, 0.5],
    hemiSky: 0x303a50, hemiGround: 0x0a0808, hemiIntensity: 0.28, fogColor: 0x05070a, fogDensity: 0.042, envIntensity: 0.05, stars: 0.2, clouds: 0.9, exposure: 1.1,
    grade: { bloom: 0.5, sat: 0.6, contrast: 1.12, grain: 0.045, vignette: 0.7, tint: 0xd8e4ff, ca: 0.003 },
    ambient: [{ preset: 'dust', rate: 14, radius: 12, height: [0, 4], opts: { size: [0.08, 0.08], life: [3, 6], velSpread: 0.2, up: 0, alpha: 0.4, color: 0x8090a0, gravity: 0 } }],
  }),
  forest: t({
    skyTop: 0x020306, skyHorizon: 0x0a1410, skyBottom: 0x000000, sunColor: 0x7080b0, sunIntensity: 0.35, sunDir: [0.4, 0.7, -0.3],
    hemiSky: 0x304030, hemiGround: 0x080a08, hemiIntensity: 0.3, fogColor: 0x040806, fogDensity: 0.04, envIntensity: 0.05, stars: 0.6, clouds: 0.6,
    grade: { bloom: 0.5, sat: 0.55, contrast: 1.12, grain: 0.045, vignette: 0.7, tint: 0xd8ffe8, ca: 0.003 },
    ambient: [
      { preset: 'leaves', rate: 3, radius: 18, height: [4, 10], opts: { color: 0x303820, color2: 0x202418 } },
      { preset: 'magic', rate: 2, radius: 16, height: [0.5, 3], opts: { size: [0.12, 0.05], life: [2, 4], velSpread: 0.4, up: 0.1, gravity: 0, color: 0xb0ff60, color2: 0x608020 } },
    ],
  }),
  fortress: t({
    skyTop: 0x040a14, skyHorizon: 0x10303a, skyBottom: 0x02060a, sunColor: 0x80c0ff, sunIntensity: 0.9, sunDir: [-0.4, 0.8, 0.3],
    hemiSky: 0x4080a0, hemiGround: 0x081018, hemiIntensity: 0.45, fogColor: 0x0a1a24, fogDensity: 0.012, envIntensity: 0.6, stars: 0.9, clouds: 0.3,
    grade: { bloom: 0.8, tint: 0xe8fff8, sat: 0.95, contrast: 1.1 },
    ambient: [{ preset: 'dust', rate: 6, radius: 20, height: [0, 8], opts: { size: [0.1, 0.1], life: [3, 6], velSpread: 0.2, up: 0, alpha: 0.25, color: 0x80ffd0, gravity: 0 } }],
  }),
  training: t({
    skyTop: 0x3a78c8, skyHorizon: 0xd8e8f8, skyBottom: 0x707880, sunColor: 0xffffff, sunIntensity: 2.2, sunDir: [0.3, 0.9, 0.35],
    hemiSky: 0xe0f0ff, hemiGround: 0x606878, hemiIntensity: 0.6, fogColor: 0xd0e0f0, fogDensity: 0.004, envIntensity: 0.8, clouds: 0.4,
    grade: { bloom: 0.35, bloomThreshold: 2, tint: 0xfaffff, sat: 1.05 },
  }),
  island: t({
    skyTop: 0x2a70d0, skyHorizon: 0xb8e0ff, skyBottom: 0x6090a0, sunColor: 0xfff4d8, sunIntensity: 3, sunDir: [0.5, 0.75, 0.2],
    hemiSky: 0xc0e0ff, hemiGround: 0x506030, hemiIntensity: 0.85, fogColor: 0xb0d8f0, fogDensity: 0.005, envIntensity: 0.6, clouds: 0.8,
    grade: { bloom: 0.4, sat: 1.15, tint: 0xfffcf0 },
    ambient: [{ preset: 'leaves', rate: 2, radius: 25, height: [3, 10] }],
  }),
  volcano: t({
    skyTop: 0x1a0604, skyHorizon: 0xc03a10, skyBottom: 0x200804, sunColor: 0xff7040, sunIntensity: 1.8, sunDir: [0.2, 0.6, 0.6],
    hemiSky: 0xff6030, hemiGround: 0x301008, hemiIntensity: 0.6, fogColor: 0x5a1a0a, fogDensity: 0.014, envIntensity: 0.4, clouds: 1,
    grade: { bloom: 0.9, bloomThreshold: 0.75, tint: 0xfff0e8, contrast: 1.1 },
    ambient: [
      { preset: 'embers', rate: 30, radius: 25, height: [0, 12] },
      { preset: 'smoke', rate: 4, radius: 25, height: [0, 4], opts: { size: [2, 5], alpha: 0.25 } },
    ],
  }),
  apocalypse: t({
    skyTop: 0x100404, skyHorizon: 0xff4a1a, skyBottom: 0x100404, sunColor: 0xff8050, sunIntensity: 2, sunDir: [-0.5, 0.5, 0.4],
    hemiSky: 0xff8060, hemiGround: 0x201010, hemiIntensity: 0.55, fogColor: 0x4a1a10, fogDensity: 0.01, envIntensity: 0.4, clouds: 1, stars: 0.2,
    grade: { bloom: 0.9, tint: 0xffe8e0, contrast: 1.15, sat: 1.1 },
    ambient: [{ preset: 'embers', rate: 25, radius: 30, height: [0, 15] }],
  }),
  night_island: t({
    skyTop: 0x040818, skyHorizon: 0x1a2a4a, skyBottom: 0x020408, sunColor: 0x8090d0, sunIntensity: 0.6, sunDir: [-0.4, 0.7, 0.3],
    hemiSky: 0x405080, hemiGround: 0x101810, hemiIntensity: 0.35, fogColor: 0x0a1020, fogDensity: 0.014, envIntensity: 0.2, stars: 1, clouds: 0.4,
    grade: { bloom: 0.7, tint: 0xe0e8ff, sat: 0.85 },
  }),
  boss_fire: t({
    skyTop: 0x200400, skyHorizon: 0xff5010, skyBottom: 0x100200, sunColor: 0xff8040, sunIntensity: 2.2, sunDir: [0.3, 0.7, 0.2],
    hemiSky: 0xff6020, hemiGround: 0x300800, hemiIntensity: 0.6, fogColor: 0x4a1000, fogDensity: 0.012, envIntensity: 0.5, clouds: 1,
    grade: { bloom: 1, bloomThreshold: 0.7, tint: 0xfff0e0, contrast: 1.1 },
    ambient: [{ preset: 'embers', rate: 35, radius: 30, height: [0, 14] }],
  }),
  boss_ice: t({
    skyTop: 0x0a1a30, skyHorizon: 0xa0d8ff, skyBottom: 0x203040, sunColor: 0xd0f0ff, sunIntensity: 2.4, sunDir: [-0.3, 0.7, 0.4],
    hemiSky: 0xc0e8ff, hemiGround: 0x405060, hemiIntensity: 0.9, fogColor: 0x8ab8d8, fogDensity: 0.014, envIntensity: 1, clouds: 0.9,
    grade: { bloom: 0.7, tint: 0xf0f8ff, sat: 0.9 },
    ambient: [{ preset: 'ice', rate: 40, radius: 30, height: [2, 16], opts: { size: [0.15, 0.15], velSpread: 0.5, up: -1.2, gravity: 0, life: [4, 7], color: 0xffffff, color2: 0xc0e0ff, additive: false, alpha: 0.9 } }],
  }),
  boss_lightning: t({
    skyTop: 0x05051a, skyHorizon: 0x3040a0, skyBottom: 0x050510, sunColor: 0xa0b0ff, sunIntensity: 1.3, sunDir: [0.2, 0.8, 0.3],
    hemiSky: 0x6070ff, hemiGround: 0x101030, hemiIntensity: 0.5, fogColor: 0x101840, fogDensity: 0.01, envIntensity: 0.6, clouds: 1, stars: 0.4,
    grade: { bloom: 1.1, bloomThreshold: 0.7, tint: 0xf0f0ff },
  }),
  boss_shadow: t({
    skyTop: 0x000000, skyHorizon: 0x200830, skyBottom: 0x000000, sunColor: 0x8060c0, sunIntensity: 0.8, sunDir: [0.2, 0.9, 0.2],
    hemiSky: 0x402060, hemiGround: 0x000000, hemiIntensity: 0.3, fogColor: 0x0a0414, fogDensity: 0.025, envIntensity: 0.2, stars: 0.6,
    grade: { bloom: 0.9, sat: 0.8, vignette: 0.7, grain: 0.04, tint: 0xf0e0ff },
    ambient: [{ preset: 'shadow', rate: 10, radius: 25, height: [0, 3], opts: { count: 1 } }],
  }),
  boss_storm: t({
    skyTop: 0x101820, skyHorizon: 0x506070, skyBottom: 0x101418, sunColor: 0xc0d0e0, sunIntensity: 1.4, sunDir: [0.4, 0.6, 0.2],
    hemiSky: 0x8090a0, hemiGround: 0x202428, hemiIntensity: 0.6, fogColor: 0x3a4450, fogDensity: 0.015, envIntensity: 0.5, clouds: 1,
    grade: { bloom: 0.7, sat: 0.8, contrast: 1.1 },
    ambient: [{ preset: 'water', rate: 60, radius: 25, height: [8, 14], opts: { vel: new THREE.Vector3(3, -22, 0), velSpread: 0.5, up: 0, gravity: -10, size: [0.08, 0.08], life: [0.6, 0.9], alpha: 0.5 } }],
  }),
  boss_earth: t({
    skyTop: 0x2a3a50, skyHorizon: 0xc0a080, skyBottom: 0x302820, sunColor: 0xffe0b0, sunIntensity: 2.6, sunDir: [0.6, 0.6, 0.3],
    hemiSky: 0xc0c8d0, hemiGround: 0x403020, hemiIntensity: 0.7, fogColor: 0x907860, fogDensity: 0.01, envIntensity: 0.5, clouds: 0.7,
    grade: { bloom: 0.4, contrast: 1.1 },
    ambient: [{ preset: 'dust', rate: 15, radius: 25, height: [0, 5] }],
  }),
  boss_serpent: t({
    skyTop: 0x04201a, skyHorizon: 0x40a080, skyBottom: 0x041010, sunColor: 0xc0ffe0, sunIntensity: 1.8, sunDir: [0.3, 0.7, -0.4],
    hemiSky: 0x60c0a0, hemiGround: 0x082018, hemiIntensity: 0.6, fogColor: 0x1a4a3a, fogDensity: 0.016, envIntensity: 0.6, clouds: 0.6,
    grade: { bloom: 0.7, tint: 0xe8fff4, sat: 1.1 },
  }),
  boss_ancient: t({
    skyTop: 0x1a1408, skyHorizon: 0xd0b060, skyBottom: 0x201808, sunColor: 0xffe0a0, sunIntensity: 2.4, sunDir: [-0.3, 0.8, 0.2],
    hemiSky: 0xffe0a0, hemiGround: 0x302010, hemiIntensity: 0.7, fogColor: 0x6a5a30, fogDensity: 0.01, envIntensity: 0.7, stars: 0.5, clouds: 0.4,
    grade: { bloom: 0.8, tint: 0xfff8e8 },
    ambient: [{ preset: 'magic', rate: 10, radius: 25, height: [0, 10], opts: { color: 0xffe080, color2: 0xff9020, size: [0.2, 0.02], life: [2, 4], velSpread: 0.3, up: 0.4, gravity: 0 } }],
  }),
  boss_demon: t({
    skyTop: 0x100000, skyHorizon: 0x800010, skyBottom: 0x080000, sunColor: 0xff3020, sunIntensity: 1.8, sunDir: [0.2, 0.7, 0.4],
    hemiSky: 0xff2020, hemiGround: 0x200000, hemiIntensity: 0.5, fogColor: 0x300408, fogDensity: 0.016, envIntensity: 0.4, clouds: 1,
    grade: { bloom: 1, tint: 0xffe8e8, contrast: 1.15, sat: 1.15 },
    ambient: [{ preset: 'embers', rate: 30, radius: 25, height: [0, 12], opts: { color: 0xff4020, color2: 0x800000 } }],
  }),
  boss_destroyer: t({
    skyTop: 0x05050a, skyHorizon: 0x4a4a60, skyBottom: 0x05050a, sunColor: 0xffffff, sunIntensity: 2, sunDir: [0.5, 0.7, 0.3],
    hemiSky: 0x8080a0, hemiGround: 0x101018, hemiIntensity: 0.5, fogColor: 0x202030, fogDensity: 0.01, envIntensity: 0.9, stars: 1, clouds: 0.3,
    grade: { bloom: 0.9, contrast: 1.15, tint: 0xf4f4ff },
    ambient: [{ preset: 'sparks', rate: 6, radius: 25, height: [0, 10], opts: { count: 1 } }],
  }),
  chaos: t({
    skyTop: 0x10001a, skyHorizon: 0xff2a6a, skyBottom: 0x05000a, sunColor: 0xff80c0, sunIntensity: 2, sunDir: [0.3, 0.7, 0.4],
    hemiSky: 0xc040ff, hemiGround: 0x200010, hemiIntensity: 0.6, fogColor: 0x300830, fogDensity: 0.01, envIntensity: 0.6, stars: 1, clouds: 0.6,
    grade: { bloom: 1, bloomThreshold: 0.75, tint: 0xfff0ff, sat: 1.25, ca: 0.004 },
    ambient: [{ preset: 'magic', rate: 20, radius: 30, height: [0, 14], opts: { color: 0xff40a0, color2: 0x4020ff } }],
  }),
  final: t({
    skyTop: 0x05020a, skyHorizon: 0xffb040, skyBottom: 0x020104, sunColor: 0xffe0a0, sunIntensity: 2.6, sunDir: [0.3, 0.8, -0.55],
    hemiSky: 0xffd080, hemiGround: 0x100810, hemiIntensity: 0.6, fogColor: 0x2a1a20, fogDensity: 0.008, envIntensity: 0.8, stars: 1, clouds: 0.5,
    grade: { bloom: 1, bloomThreshold: 0.75, tint: 0xfff8f0, contrast: 1.1 },
    ambient: [{ preset: 'magic', rate: 16, radius: 30, height: [0, 14], opts: { color: 0xffe080, color2: 0xff6020, size: [0.2, 0.02], life: [2, 4], velSpread: 0.3, up: 0.6, gravity: 0 } }],
  }),
  classic: t({
    skyTop: 0x3070ff, skyHorizon: 0x90c8ff, skyBottom: 0x3070ff, sunColor: 0xffffff, sunIntensity: 2.6, sunDir: [0.4, 0.8, 0.3],
    hemiSky: 0xffffff, hemiGround: 0x608040, hemiIntensity: 1, fogColor: 0x90c8ff, fogDensity: 0.004, envIntensity: 0.3, clouds: 0.3,
    grade: { bloom: 0.2, sat: 1.3, contrast: 1.1, vignette: 0.2 },
  }),
  menu: t({
    skyTop: 0x04040c, skyHorizon: 0x2a1840, skyBottom: 0x020206, sunColor: 0xffc080, sunIntensity: 2, sunDir: [0.4, 0.6, 0.5],
    hemiSky: 0x6070ff, hemiGround: 0x100810, hemiIntensity: 0.5, fogColor: 0x0c0818, fogDensity: 0.02, envIntensity: 0.7, stars: 1, clouds: 0.2,
    grade: { bloom: 1.0, bloomThreshold: 0.72, tint: 0xfff4ff, sat: 1.15, vignette: 0.6 },
    ambient: [{ preset: 'magic', rate: 14, radius: 18, height: [0, 10], opts: { color: 0xffc94d, color2: 0xff6030, size: [0.18, 0.02], life: [2, 5], velSpread: 0.3, up: 0.5, gravity: 0 } }],
  }),
};

// Boss arenas face +z (player looks at the boss): put their sun behind the camera so both fighters are front-lit
for (const [k, th] of Object.entries(THEMES)) {
  if (k.startsWith('boss_') || k === 'arena') th.sunDir = [th.sunDir[0], th.sunDir[1], -Math.abs(th.sunDir[2])];
}

const SKY_VERT = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_Position = p.xyww;
}`;
const SKY_FRAG = /* glsl */ `
uniform vec3 uTop, uHorizon, uBottom, uSun, uSunDir;
uniform float uStars, uClouds, uTime;
varying vec3 vDir;
float h(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 45.164))) * 43758.5453); }
float n2(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  float a = h(vec3(i, 1.0)), b = h(vec3(i + vec2(1, 0), 1.0)), c = h(vec3(i + vec2(0, 1), 1.0)), d = h(vec3(i + vec2(1, 1), 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
void main() {
  vec3 d = normalize(vDir);
  float y = d.y;
  vec3 col = y > 0.0 ? mix(uHorizon, uTop, pow(y, 0.55)) : mix(uHorizon, uBottom, pow(-y, 0.4));
  float sd = max(0.0, dot(d, normalize(uSunDir)));
  col += uSun * (pow(sd, 700.0) * 6.0 + pow(sd, 18.0) * 0.35 + pow(sd, 3.0) * 0.08);
  if (uStars > 0.0 && y > 0.0) {
    vec3 sp = floor(d * 380.0);
    float s = h(sp);
    col += vec3(step(0.9975, s) * uStars * (0.6 + 0.4 * sin(uTime * 3.0 + s * 100.0))) * smoothstep(0.0, 0.3, y);
  }
  if (uClouds > 0.0 && y > 0.02) {
    vec2 uv = d.xz / (y + 0.15) * 1.6 + vec2(uTime * 0.01, 0.0);
    float c = n2(uv) * 0.5 + n2(uv * 2.1) * 0.25 + n2(uv * 4.3) * 0.125;
    c = smoothstep(0.45, 0.85, c) * uClouds * smoothstep(0.02, 0.25, y);
    // Daytime skies get white fluffy clouds, dark skies keep tinted haze
    float day = smoothstep(0.08, 0.3, dot(uTop, vec3(0.2126, 0.7152, 0.0722)));
    vec3 cc = mix(uHorizon * 0.6 + uSun * 0.12, vec3(1.0) * (0.92 + 0.08 * n2(uv * 3.0)), day);
    col = mix(col, cc, c * mix(0.55, 0.85, day));
  }
  gl_FragColor = vec4(col, 1.0);
}`;

export class Environment {
  readonly group = new THREE.Group();
  readonly sun: THREE.DirectionalLight;
  readonly hemi: THREE.HemisphereLight;
  private sky: THREE.Mesh;
  private skyMat: THREE.ShaderMaterial;
  private emitters: AmbientEmitter[] = [];
  theme: EnvTheme = THEMES.city;
  private sunOffset = new THREE.Vector3();

  constructor(private particles: Particles, shadowSize = 2048) {
    this.skyMat = new THREE.ShaderMaterial({
      vertexShader: SKY_VERT,
      fragmentShader: SKY_FRAG,
      uniforms: {
        uTop: { value: new THREE.Color() }, uHorizon: { value: new THREE.Color() }, uBottom: { value: new THREE.Color() },
        uSun: { value: new THREE.Color() }, uSunDir: { value: new THREE.Vector3(0, 1, 0) },
        uStars: { value: 0 }, uClouds: { value: 0 }, uTime: { value: 0 },
      },
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(500, 32, 16), this.skyMat);
    this.sky.frustumCulled = false;
    this.sky.renderOrder = -1;
    this.group.add(this.sky);

    this.sun = new THREE.DirectionalLight(0xffffff, 2.5);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(shadowSize, shadowSize);
    const sc = this.sun.shadow.camera;
    sc.left = sc.bottom = -34;
    sc.right = sc.top = 34;
    sc.near = 1;
    sc.far = 200;
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.03;
    this.group.add(this.sun, this.sun.target);

    this.hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
    this.group.add(this.hemi);

    // Camera-side fill light (no shadows): keeps the player's visible side readable when back-lit
    this.fill = new THREE.DirectionalLight(0xffffff, 0.4);
    this.group.add(this.fill, this.fill.target);
  }
  readonly fill: THREE.DirectionalLight;

  private skyEnv: THREE.WebGLRenderTarget | null = null;

  /**
   * Image-based lighting from this theme's own sky (gradient + softened sun),
   * so reflections match the world and there are no studio-light hot spots.
   */
  private buildSkyEnv(renderer: THREE.WebGLRenderer): THREE.Texture {
    const scene = new THREE.Scene();
    const m = this.skyMat.clone();
    m.uniforms = THREE.UniformsUtils.clone(this.skyMat.uniforms);
    m.uniforms.uStars.value = 0;
    (m.uniforms.uSun.value as THREE.Color).multiplyScalar(0.2);
    // Soft minimum fill so night / indoor worlds still read (characters never turn into silhouettes)
    m.fragmentShader = m.fragmentShader.replace('gl_FragColor = vec4(col, 1.0);', 'gl_FragColor = vec4(max(col, uHorizon * 0.45 + vec3(0.1)), 1.0);');
    const geo = new THREE.SphereGeometry(50, 32, 16);
    scene.add(new THREE.Mesh(geo, m));
    const pm = new THREE.PMREMGenerator(renderer);
    this.skyEnv?.dispose();
    this.skyEnv = pm.fromScene(scene, 0.03, 0.1, 100);
    pm.dispose();
    geo.dispose();
    m.dispose();
    return this.skyEnv.texture;
  }

  apply(scene: THREE.Scene, theme: EnvTheme, envMap: THREE.Texture, darknessBoost = 0, renderer?: THREE.WebGLRenderer) {
    this.theme = theme;
    const u = this.skyMat.uniforms;
    (u.uTop.value as THREE.Color).set(theme.skyTop);
    (u.uHorizon.value as THREE.Color).set(theme.skyHorizon);
    (u.uBottom.value as THREE.Color).set(theme.skyBottom);
    (u.uSun.value as THREE.Color).set(theme.sunColor);
    (u.uSunDir.value as THREE.Vector3).set(...theme.sunDir).normalize();
    u.uStars.value = theme.stars;
    u.uClouds.value = theme.clouds;
    this.sun.color.set(theme.sunColor);
    this.sun.intensity = theme.sunIntensity * (1 - darknessBoost * 0.8);
    this.sunOffset.set(...theme.sunDir).normalize().multiplyScalar(80);
    this.hemi.color.set(theme.hemiSky);
    this.hemi.groundColor.set(theme.hemiGround);
    this.hemi.intensity = theme.hemiIntensity * (1 - darknessBoost * 0.7);
    // Dark/horror themes get only a whisper of fill to preserve the mood
    this.fill.color.set(theme.hemiSky).lerp(new THREE.Color(0xffffff), 0.75);
    this.fill.intensity = (theme.fogDensity > 0.03 ? 0.12 : 0.55) * (1 - darknessBoost * 0.7);
    scene.fog = new THREE.FogExp2(theme.fogColor, theme.fogDensity * (1 + darknessBoost * 3));
    scene.background = new THREE.Color(theme.fogColor);
    scene.environment = renderer ? this.buildSkyEnv(renderer) : envMap;
    scene.environmentIntensity = theme.envIntensity * (renderer ? 1.4 : 1) * (1 - darknessBoost * 0.6);
    this.emitters = (theme.ambient ?? []).map((a) => new AmbientEmitter(this.particles, a.preset, a.rate, a.radius, a.height, a.opts));
  }

  addEmitter(e: AmbientEmitter) {
    this.emitters.push(e);
  }

  update(dt: number, time: number, focus: THREE.Vector3, camPos: THREE.Vector3) {
    this.skyMat.uniforms.uTime.value = time;
    this.sky.position.copy(camPos);
    // Shadow frustum follows the player (texel-snapped to avoid shimmering)
    const snap = 0.5;
    const fx = Math.round(focus.x / snap) * snap, fz = Math.round(focus.z / snap) * snap;
    this.sun.target.position.set(fx, focus.y, fz);
    this.sun.position.set(fx + this.sunOffset.x, focus.y + this.sunOffset.y, fz + this.sunOffset.z);
    this.fill.target.position.copy(focus);
    this.fill.position.set(camPos.x, camPos.y + 3, camPos.z);
    for (const e of this.emitters) e.update(dt, camPos);
  }

  dispose() {
    this.sky.geometry.dispose();
    this.skyMat.dispose();
    this.sun.shadow.map?.dispose();
    this.skyEnv?.dispose();
    this.skyEnv = null;
  }
}
