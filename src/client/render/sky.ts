/**
 * Sky dome: a gradient from ink blue to a peach horizon, a soft sun and slow stylized clouds,
 * all computed in the fragment shader (no skybox images).
 */
import * as THREE from 'three';
import { PALETTE, SUN_DIRECTION } from './palette.js';

const vertexShader = /* glsl */ `
  varying vec3 vDirection;
  void main() {
    vDirection = normalize(position);
    vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * viewPosition;
    gl_Position.z = gl_Position.w; // always at the far plane
  }
`;

const fragmentShader = /* glsl */ `
  precision highp float;
  varying vec3 vDirection;
  uniform vec3 uTop;
  uniform vec3 uMid;
  uniform vec3 uHorizon;
  uniform vec3 uSunColor;
  uniform vec3 uSunDirection;
  uniform float uTime;
  uniform float uClouds;

  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
  }
  float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    for (int i = 0; i < 4; i++) {
      value += amplitude * noise(p);
      p = p * 2.03 + vec2(17.0, 9.0);
      amplitude *= 0.5;
    }
    return value;
  }

  void main() {
    vec3 dir = normalize(vDirection);
    float h = clamp(dir.y, -0.2, 1.0);
    vec3 color = mix(uHorizon, uMid, smoothstep(-0.02, 0.28, h));
    color = mix(color, uTop, smoothstep(0.22, 0.95, h));
    // Below the horizon fade toward a hazy ground tone so the rim of the map never looks cut.
    color = mix(color, uHorizon * 0.86, smoothstep(0.0, -0.18, h));

    float sunAmount = max(dot(dir, normalize(uSunDirection)), 0.0);
    color += uSunColor * (pow(sunAmount, 900.0) * 2.4 + pow(sunAmount, 48.0) * 0.35 + pow(sunAmount, 6.0) * 0.16);

    if (uClouds > 0.5 && dir.y > 0.02) {
      vec2 uv = dir.xz / (dir.y + 0.32);
      float density = fbm(uv * 1.35 + vec2(uTime * 0.012, uTime * 0.004));
      float cover = smoothstep(0.52, 0.78, density) * smoothstep(0.02, 0.2, dir.y);
      vec3 cloudColor = mix(uHorizon, vec3(1.0, 0.97, 0.92), 0.55 + 0.45 * sunAmount);
      color = mix(color, cloudColor, cover * 0.72);
    }
    gl_FragColor = vec4(color, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export class Sky {
  readonly mesh: THREE.Mesh;
  private readonly material: THREE.ShaderMaterial;

  constructor() {
    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      side: THREE.BackSide,
      depthWrite: false,
      depthTest: true,
      fog: false,
      uniforms: {
        uTop: { value: new THREE.Color(PALETTE.skyTop) },
        uMid: { value: new THREE.Color(PALETTE.skyMid) },
        uHorizon: { value: new THREE.Color(PALETTE.skyHorizon) },
        uSunColor: { value: new THREE.Color(PALETTE.sunDisc) },
        uSunDirection: { value: new THREE.Vector3(SUN_DIRECTION.x, SUN_DIRECTION.y, SUN_DIRECTION.z).normalize() },
        uTime: { value: 0 },
        uClouds: { value: 1 },
      },
    });
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16), this.material);
    this.mesh.scale.setScalar(900);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = -10;
  }

  /** Keeps the dome centred on the camera and advances the clouds. */
  update(cameraPosition: THREE.Vector3, timeSeconds: number): void {
    this.mesh.position.copy(cameraPosition);
    this.material.uniforms['uTime']!.value = timeSeconds;
  }

  setClouds(enabled: boolean): void {
    this.material.uniforms['uClouds']!.value = enabled ? 1 : 0;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    this.material.dispose();
  }
}
