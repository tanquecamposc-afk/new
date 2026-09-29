/**
 * Post-processing stack: render → (DOF) → bloom → cinematic grade → output.
 * The final pass bundles vignette, chromatic aberration, radial motion blur,
 * colour grading, film grain, flashes, low-health pulse and pixelation.
 */
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { damp } from '../core/math';

const FinalShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uRes: { value: new THREE.Vector2(1, 1) },
    uVignette: { value: 0.35 },
    uCA: { value: 0.002 },
    uMotion: { value: 0 },
    uSat: { value: 1.05 },
    uContrast: { value: 1.05 },
    uBright: { value: 1 },
    uTint: { value: new THREE.Color(1, 1, 1) },
    uGrain: { value: 0.02 },
    uFlash: { value: 0 },
    uFlashColor: { value: new THREE.Color(1, 1, 1) },
    uLowHp: { value: 0 },
    uDark: { value: 0 },
    uPixel: { value: 0 },
    uLetterbox: { value: 0 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uTime, uVignette, uCA, uMotion, uSat, uContrast, uBright, uGrain, uFlash, uLowHp, uDark, uPixel, uLetterbox;
    uniform vec2 uRes;
    uniform vec3 uTint, uFlashColor;
    varying vec2 vUv;
    float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main() {
      vec2 uv = vUv;
      if (uPixel > 1.0) uv = (floor(uv * uRes / uPixel) + 0.5) * uPixel / uRes;
      vec2 dir = uv - 0.5;
      float d = length(dir);
      float ca = uCA * (0.4 + d * 2.0);
      vec3 col = texture2D(tDiffuse, uv).rgb;
      // Chromatic aberration only while it's actually visible (hits / impacts)
      if (uCA > 0.0006) {
        col.r = texture2D(tDiffuse, uv + dir * ca).r;
        col.b = texture2D(tDiffuse, uv - dir * ca).b;
      }
      // Cheap 4-tap radial blur, only at the screen edges and only when requested
      if (uMotion > 0.02 && d > 0.2) {
        vec3 acc = col;
        for (int i = 1; i < 4; i++) acc += texture2D(tDiffuse, uv - dir * uMotion * float(i) * 0.02).rgb;
        col = mix(col, acc / 4.0, smoothstep(0.2, 0.6, d));
      }
      float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
      col = mix(vec3(l), col, uSat);
      col = max(vec3(0.0), mix(vec3(0.18), col, uContrast));
      col *= uTint * uBright;
      col *= 1.0 - uVignette * smoothstep(0.25, 0.95, d);
      col = mix(col, vec3(0.45, 0.0, 0.02), uLowHp * smoothstep(0.3, 0.85, d));
      col *= 1.0 - uDark * smoothstep(0.08, 0.55, d);
      col += (hash(uv * uRes + fract(uTime) * 100.0) - 0.5) * uGrain;
      col = mix(col, uFlashColor, clamp(uFlash, 0.0, 1.0));
      if (uLetterbox > 0.0 && (vUv.y < uLetterbox || vUv.y > 1.0 - uLetterbox)) col = vec3(0.0);
      gl_FragColor = vec4(col, 1.0);
    }`,
};

/** Clamps HDR highlights so specular hot-spots can't flood the bloom (and the screen) with white. */
const ClampShader = {
  uniforms: { tDiffuse: { value: null }, uMax: { value: 2.4 } },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uMax;
    varying vec2 vUv;
    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      float m = max(c.r, max(c.g, c.b));
      // Scale (not per-channel clip) so hue is preserved
      if (m > uMax) c.rgb *= uMax / m;
      gl_FragColor = c;
    }`,
};

export interface Grade {
  sat: number;
  contrast: number;
  bright: number;
  tint: THREE.ColorRepresentation;
  vignette: number;
  grain: number;
  bloom: number;
  bloomThreshold: number;
  bloomRadius: number;
  ca: number;
}

export const DEFAULT_GRADE: Grade = {
  sat: 1.1, contrast: 1.05, bright: 1, tint: 0xffffff, vignette: 0.3, grain: 0,
  bloom: 0.55, bloomThreshold: 0.85, bloomRadius: 0.45, ca: 0,
};

export class PostFX {
  composer: EffectComposer;
  renderPass: RenderPass;
  bloom: UnrealBloomPass;
  bokeh: BokehPass;
  final: ShaderPass;
  output: OutputPass;
  private flash = 0;
  private flashDecay = 4;
  private hitCA = 0;
  lowHp = 0;
  motionTarget = 0;
  private motion = 0;
  darkness = 0;
  letterboxTarget = 0;
  private letterbox = 0;
  private base: Grade = { ...DEFAULT_GRADE };
  enabled = true;

  constructor(private renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.PerspectiveCamera, samples: number) {
    const size = renderer.getSize(new THREE.Vector2());
    const pr = renderer.getPixelRatio();
    const rt = new THREE.WebGLRenderTarget(size.x * pr, size.y * pr, { type: THREE.HalfFloatType, samples });
    this.composer = new EffectComposer(renderer, rt);
    this.renderPass = new RenderPass(scene, camera);
    this.bokeh = new BokehPass(scene, camera, { focus: 8, aperture: 0.004, maxblur: 0.008 });
    this.bokeh.enabled = false;
    this.bloom = new UnrealBloomPass(new THREE.Vector2(size.x, size.y), 0.6, 0.45, 0.85);
    this.final = new ShaderPass(FinalShader);
    this.output = new OutputPass();
    this.composer.addPass(this.renderPass);
    this.composer.addPass(this.bokeh);
    this.composer.addPass(new ShaderPass(ClampShader));
    this.composer.addPass(this.bloom);
    this.composer.addPass(this.final);
    this.composer.addPass(this.output);
  }

  setScene(scene: THREE.Scene, camera: THREE.PerspectiveCamera) {
    this.renderPass.scene = scene;
    this.renderPass.camera = camera;
    const b = this.bokeh as unknown as { scene: THREE.Scene; camera: THREE.Camera };
    b.scene = scene;
    b.camera = camera;
  }

  setSize(w: number, h: number) {
    this.composer.setSize(w, h);
    const pr = this.renderer.getPixelRatio();
    (this.final.uniforms.uRes.value as THREE.Vector2).set(w * pr, h * pr);
  }

  setGrade(g: Partial<Grade>) {
    this.base = { ...DEFAULT_GRADE, ...g };
    const u = this.final.uniforms;
    u.uSat.value = this.base.sat;
    u.uContrast.value = this.base.contrast;
    u.uBright.value = this.base.bright;
    (u.uTint.value as THREE.Color).set(this.base.tint);
    u.uVignette.value = this.base.vignette;
    u.uGrain.value = this.base.grain;
    this.bloom.strength = this.base.bloom;
    // Only genuinely emissive / HDR highlights bloom (lit white surfaces stay crisp)
    this.bloom.threshold = Math.max(1.3, this.base.bloomThreshold);
    this.bloom.radius = this.base.bloomRadius;
  }

  flashScreen(color: THREE.ColorRepresentation, amount = 0.6, decay = 4) {
    (this.final.uniforms.uFlashColor.value as THREE.Color).set(color);
    this.flash = Math.max(this.flash, amount);
    this.flashDecay = decay;
  }

  hit(amount = 1) {
    this.hitCA = Math.min(0.02, this.hitCA + 0.008 * amount);
  }

  /** MSAA samples of the HDR scene target (0 on low quality). */
  setSamples(n: number) {
    const c = this.composer as unknown as { renderTarget1: THREE.WebGLRenderTarget; renderTarget2: THREE.WebGLRenderTarget };
    for (const rt of [c.renderTarget1, c.renderTarget2]) {
      if (rt.samples !== n) {
        rt.samples = n;
        rt.dispose();
      }
    }
  }

  setDOF(on: boolean, focus = 8, aperture = 0.004) {
    this.bokeh.enabled = on;
    const u = this.bokeh.uniforms as unknown as Record<string, { value: number }>;
    u.focus.value = focus;
    u.aperture.value = aperture;
  }

  setPixelate(px: number) {
    this.final.uniforms.uPixel.value = px;
  }

  update(dt: number, time: number) {
    const u = this.final.uniforms;
    u.uTime.value = time;
    this.flash = Math.max(0, this.flash - dt * this.flashDecay);
    u.uFlash.value = this.flash;
    this.hitCA = Math.max(0, this.hitCA - dt * 0.04);
    u.uCA.value = this.base.ca + this.hitCA;
    this.motion = damp(this.motion, this.motionTarget, 6, dt);
    u.uMotion.value = this.motion;
    u.uLowHp.value = this.lowHp * (0.75 + 0.25 * Math.sin(time * 6));
    u.uDark.value = this.darkness;
    this.letterbox = damp(this.letterbox, this.letterboxTarget, 5, dt);
    u.uLetterbox.value = this.letterbox < 0.002 ? 0 : this.letterbox;
  }

  render(dt: number) {
    this.composer.render(dt);
  }

  resetTransient() {
    this.flash = 0;
    this.hitCA = 0;
    this.lowHp = 0;
    this.motionTarget = 0;
    this.motion = 0;
    this.darkness = 0;
    this.letterboxTarget = 0;
    this.letterbox = 0;
    this.setDOF(false);
    this.setPixelate(0);
  }

  dispose() {
    this.composer.dispose();
  }
}
