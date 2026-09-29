/**
 * Engine: owns the WebGL renderer, post-processing, the main loop and time
 * scaling (slow motion). Scenes (menu / level session) plug into it.
 */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { PostFX } from '../gfx/PostFX';
import { setAnisotropy } from '../gfx/Textures';
import { Input } from './Input';
import { damp } from './math';

export interface Updatable {
  update(dt: number, rawDt: number): void;
}

export type Quality = 'low' | 'medium' | 'high';

export class Engine {
  readonly renderer: THREE.WebGLRenderer;
  post: PostFX;
  scene: THREE.Scene = new THREE.Scene();
  camera: THREE.PerspectiveCamera;
  envMap: THREE.Texture;
  private running = false;
  private last = 0;
  private raf = 0;
  /** Current global time scale (slow-mo). */
  timeScale = 1;
  private timeScaleTarget = 1;
  private slowmoTimer = 0;
  /** Extra multiplier from mutations (SPEED). */
  speedMul = 1;
  time = 0;
  updater: Updatable | null = null;
  private fpsAcc = 0;
  private fpsFrames = 0;
  fps = 60;
  onFps: ((fps: number) => void) | null = null;
  quality: Quality = 'high';
  /** Dynamic resolution: fraction of the quality's max pixel ratio (auto-tuned to hold frame rate). */
  private resScale = 1;
  private resCheckT = 0;
  private frameTimes: number[] = [];
  autoRes = true;

  constructor(private container: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance', stencil: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.25));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.domElement.className = 'game-canvas';
    container.appendChild(this.renderer.domElement);
    setAnisotropy(Math.min(8, this.renderer.capabilities.getMaxAnisotropy()));

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const room = new RoomEnvironment();
    this.envMap = pmrem.fromScene(room, 0.04).texture;
    room.dispose();
    pmrem.dispose();

    this.camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 900);
    this.post = new PostFX(this.renderer, this.scene, this.camera, 2);
    window.addEventListener('resize', this.onResize);
    Input.attach(this.renderer.domElement);
    this.onResize();
  }

  setQuality(q: Quality) {
    this.quality = q;
    this.resScale = 1;
    this.frameTimes.length = 0;
    this.applyPixelRatio();
    this.renderer.shadowMap.enabled = q !== 'low';
    this.post.bloom.enabled = q !== 'low';
    this.post.setSamples(q === 'high' ? 4 : q === 'medium' ? 2 : 0);
    this.onResize();
  }

  private get maxPixelRatio() {
    const q = this.quality;
    return Math.min(window.devicePixelRatio || 1, q === 'high' ? 1.5 : q === 'medium' ? 1.1 : 0.85);
  }

  private applyPixelRatio() {
    const pr = Math.max(0.5, this.maxPixelRatio * this.resScale);
    if (Math.abs(this.renderer.getPixelRatio() - pr) > 0.01) {
      this.renderer.setPixelRatio(pr);
      return true;
    }
    return false;
  }

  /**
   * Dynamic resolution: when frames take too long the internal resolution drops
   * (down to 55%); when there's headroom it climbs back. Keeps the game fluid on
   * weak GPUs without the player touching settings.
   */
  private tuneResolution(realDt: number) {
    if (!this.autoRes) return;
    this.frameTimes.push(realDt);
    this.resCheckT += realDt;
    if (this.resCheckT < 1) return;
    this.resCheckT = 0;
    const ft = this.frameTimes.slice().sort((a, b) => a - b);
    this.frameTimes.length = 0;
    if (ft.length < 10) return;
    // 80th percentile frame time: ignores single hitches (GC, loading)
    const p80 = ft[Math.floor(ft.length * 0.8)];
    let next = this.resScale;
    if (p80 > 1 / 45) next = Math.max(0.55, this.resScale - (p80 > 1 / 30 ? 0.15 : 0.08));
    else if (p80 < 1 / 57 && this.resScale < 1) next = Math.min(1, this.resScale + 0.05);
    if (next !== this.resScale) {
      this.resScale = next;
      if (this.applyPixelRatio()) this.onResize();
    }
  }

  setScene(scene: THREE.Scene, camera: THREE.PerspectiveCamera) {
    this.scene = scene;
    this.camera = camera;
    this.post.setScene(scene, camera);
    this.onResize();
  }

  private onResize = () => {
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h);
    this.post.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    window.dispatchEvent(new CustomEvent('engine-resize', { detail: { w, h } }));
  };

  get viewportHeight() {
    return this.renderer.domElement.height;
  }

  /** Temporary slow motion that eases back to normal speed. */
  slowmo(scale: number, duration: number) {
    this.timeScaleTarget = scale;
    this.timeScale = Math.min(this.timeScale, scale + 0.15);
    this.slowmoTimer = duration;
  }

  /** Short freeze for heavy impacts (hit-stop). */
  hitStop(duration = 0.05) {
    this.timeScale = 0.02;
    this.timeScaleTarget = 0.02;
    this.slowmoTimer = duration;
  }

  resetTime() {
    this.timeScale = this.timeScaleTarget = 1;
    this.slowmoTimer = 0;
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    const loop = (now: number) => {
      if (!this.running) return;
      this.raf = requestAnimationFrame(loop);
      const realDt = (now - this.last) / 1000;
      const rawDt = Math.min(0.05, realDt);
      this.last = now;
      this.frame(rawDt);
      if (document.visibilityState === 'visible' && realDt < 0.25) this.tuneResolution(realDt);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  private tickTimeScale(rawDt: number) {
    // Slow-mo timer runs in real time
    if (this.slowmoTimer > 0) {
      this.slowmoTimer -= rawDt;
      if (this.slowmoTimer <= 0) this.timeScaleTarget = 1;
    }
    this.timeScale = damp(this.timeScale, this.timeScaleTarget, this.timeScaleTarget < this.timeScale ? 30 : 3, rawDt);
  }

  private frame(rawDt: number) {
    this.tickTimeScale(rawDt);
    const dt = rawDt * this.timeScale * this.speedMul;
    this.time += rawDt;
    this.updater?.update(dt, rawDt);
    this.post.update(rawDt, this.time);
    if (this.post.enabled) this.post.render(rawDt);
    else this.renderer.render(this.scene, this.camera);
    Input.endFrame();

    this.fpsFrames++;
    if (this.fpsAcc >= 0.5) {
      this.fps = Math.round(this.fpsFrames / this.fpsAcc);
      this.fpsAcc = 0;
      this.fpsFrames = 0;
      this.onFps?.(this.fps);
    }
  }

  /** Dev/testing: advance the simulation without rendering. */
  simulate(seconds: number, step = 1 / 30) {
    const n = Math.ceil(seconds / step);
    for (let i = 0; i < n; i++) {
      this.time += step;
      this.tickTimeScale(step);
      this.updater?.update(step * this.timeScale * this.speedMul, step);
      Input.endFrameKeepHeld();
    }
  }

  /** Compile all materials of a scene ahead of time to avoid hitches. */
  async precompile(scene: THREE.Scene, camera: THREE.Camera) {
    try {
      await this.renderer.compileAsync(scene, camera);
    } catch {
      this.renderer.compile(scene, camera);
    }
  }

  dispose() {
    this.stop();
    window.removeEventListener('resize', this.onResize);
    this.post.dispose();
    this.renderer.dispose();
  }
}
