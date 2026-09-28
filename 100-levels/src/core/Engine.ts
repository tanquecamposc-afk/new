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

  constructor(private container: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance', stencil: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
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
    this.post = new PostFX(this.renderer, this.scene, this.camera, 4);
    window.addEventListener('resize', this.onResize);
    Input.attach(this.renderer.domElement);
    this.onResize();
  }

  setQuality(q: Quality) {
    this.quality = q;
    const pr = Math.min(window.devicePixelRatio, q === 'high' ? 1.75 : q === 'medium' ? 1.25 : 0.9);
    this.renderer.setPixelRatio(pr);
    this.renderer.shadowMap.enabled = q !== 'low';
    this.post.bloom.enabled = q !== 'low';
    this.onResize();
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
      const rawDt = Math.min(0.05, (now - this.last) / 1000);
      this.last = now;
      this.frame(rawDt);
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
