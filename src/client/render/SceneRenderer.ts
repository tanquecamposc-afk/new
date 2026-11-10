/**
 * Owns the Three.js renderer and scene. It is a pure view: it draws whatever the game client
 * tells it (camera, character pose, course state) and never mutates gameplay state.
 */
import * as THREE from 'three';
import type { MapDefinition } from '../../core/sim/map.js';
import type { QualityPreset } from '../../core/meta/settings.js';
import { Avatar, type AvatarPose } from './avatar.js';
import { CheckpointView } from './checkpoints.js';
import { PALETTE, SUN_DIRECTION } from './palette.js';
import { ANCHOR_BURST, DUST, LANDING, Particles, SLIDE_SPRAY, type BurstOptions } from './particles.js';
import { Sky } from './sky.js';
import { createDetailTextures, createGlowTexture, type DetailTexture } from './textures.js';
import { WorldView } from './worldView.js';

export interface QualityProfile {
  antialias: boolean;
  maxPixelRatio: number;
  shadows: boolean;
  shadowMapSize: number;
  particles: boolean;
  clouds: boolean;
  /** Lambert world shading instead of PBR. */
  cheapShading: boolean;
  decorDensity: number;
  viewDistance: number;
  anisotropy: number;
}

/** Every preset changes real renderer state; nothing here is cosmetic to the settings panel. */
export const QUALITY_PROFILES: Readonly<Record<QualityPreset, QualityProfile>> = Object.freeze({
  low: { antialias: false, maxPixelRatio: 1, shadows: false, shadowMapSize: 0, particles: false, clouds: false, cheapShading: true, decorDensity: 0.35, viewDistance: 240, anisotropy: 1 },
  medium: { antialias: true, maxPixelRatio: 1.25, shadows: true, shadowMapSize: 1024, particles: true, clouds: true, cheapShading: false, decorDensity: 0.8, viewDistance: 320, anisotropy: 4 },
  high: { antialias: true, maxPixelRatio: 1.6, shadows: true, shadowMapSize: 2048, particles: true, clouds: true, cheapShading: false, decorDensity: 1, viewDistance: 420, anisotropy: 8 },
  epic: { antialias: true, maxPixelRatio: 2, shadows: true, shadowMapSize: 4096, particles: true, clouds: true, cheapShading: false, decorDensity: 1, viewDistance: 520, anisotropy: 16 },
});

export class WebGLUnavailableError extends Error {
  constructor(cause: unknown) {
    super('WebGL 2 is not available');
    this.name = 'WebGLUnavailableError';
    this.cause = cause;
  }
}

export interface CameraView {
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  fovDegrees: number;
}

export interface PlayerView {
  x: number;
  y: number;
  z: number;
  yaw: number;
  pose: AvatarPose;
  /** Distance from the feet down to the ground (0 when standing). */
  groundOffset: number;
  visible: boolean;
}

export interface FrameView {
  timeSeconds: number;
  frameSeconds: number;
  camera: CameraView;
  player: PlayerView;
  /** Index of the next course anchor, or -1 when there is no course to show. */
  nextAnchor: number;
  reducedMotion: boolean;
  /** Lobby presentation: studio lights on the character, zone signs hidden. */
  lobby: boolean;
}

export interface RendererCallbacks {
  onContextLost(): void;
  onContextRestored(): void;
}

export interface RenderStats {
  drawCalls: number;
  triangles: number;
}

export class SceneRenderer {
  readonly stats: RenderStats = { drawCalls: 0, triangles: 0 };

  private renderer!: THREE.WebGLRenderer;
  private canvas!: HTMLCanvasElement;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(75, 16 / 9, 0.1, 1200);
  private readonly sun = new THREE.DirectionalLight(PALETTE.sunLight, 2.6);
  private readonly hemisphere = new THREE.HemisphereLight(PALETTE.skyLight, PALETTE.groundLight, 1.15);
  /** Key and rim lights that follow the character while it is on show in the lobby. */
  private readonly keyLight = new THREE.PointLight(0xffe2bd, 0, 14, 1.6);
  private readonly rimLight = new THREE.PointLight(PALETTE.violet, 0, 12, 1.6);
  private readonly sky = new Sky();
  private readonly avatar = new Avatar();
  private readonly glow: THREE.Texture;
  private readonly particles: Particles;
  private textures!: Record<DetailTexture, THREE.CanvasTexture>;
  private world: WorldView | null = null;
  private checkpoints: CheckpointView | null = null;
  private map: MapDefinition | null = null;
  private translate: (key: string) => string = (key) => key;
  private profile: QualityProfile = QUALITY_PROFILES.medium;
  private preset: QualityPreset = 'medium';
  private renderScale = 1;
  private readonly resizeObserver: ResizeObserver;
  private readonly sunDirection = new THREE.Vector3(SUN_DIRECTION.x, SUN_DIRECTION.y, SUN_DIRECTION.z).normalize();

  constructor(
    private readonly host: HTMLElement,
    private readonly callbacks: RendererCallbacks,
    preset: QualityPreset,
    renderScale: number,
  ) {
    this.preset = preset;
    this.profile = QUALITY_PROFILES[preset];
    this.renderScale = renderScale;
    this.createRenderer();

    this.glow = createGlowTexture();
    this.particles = new Particles(this.glow);

    this.camera.rotation.order = 'YXZ';
    this.scene.fog = new THREE.Fog(PALETTE.fog, 60, this.profile.viewDistance);
    this.scene.add(this.sky.mesh, this.hemisphere, this.sun, this.sun.target, this.keyLight, this.rimLight, this.avatar.group, this.particles.points);

    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.045;
    this.applyProfile();

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(host);
    this.resize();
  }

  get domElement(): HTMLCanvasElement {
    return this.canvas;
  }

  /** Changes the quality preset / internal resolution. Rebuilds what depends on it. */
  setQuality(preset: QualityPreset, renderScale: number): void {
    const next = QUALITY_PROFILES[preset];
    const antialiasChanged = next.antialias !== this.profile.antialias;
    const worldChanged =
      next.shadows !== this.profile.shadows ||
      next.cheapShading !== this.profile.cheapShading ||
      next.decorDensity !== this.profile.decorDensity ||
      next.anisotropy !== this.profile.anisotropy;
    const changed = preset !== this.preset || renderScale !== this.renderScale;
    this.preset = preset;
    this.profile = next;
    this.renderScale = renderScale;
    if (!changed) return;

    if (antialiasChanged) {
      // Antialiasing is fixed when a WebGL context is created: swap in a fresh canvas.
      this.disposeRenderer();
      this.createRenderer();
    }
    this.applyProfile();
    if ((worldChanged || antialiasChanged) && this.map) this.loadMap(this.map, this.translate);
    this.resize();
  }

  /** Builds the visuals for a map (replacing the previous one). */
  loadMap(map: MapDefinition, translate: (key: string) => string): void {
    this.clearMap();
    this.map = map;
    this.translate = translate;
    this.world = new WorldView(map, {
      textures: this.textures,
      shadows: this.profile.shadows,
      cheapShading: this.profile.cheapShading,
      decorDensity: this.profile.decorDensity,
      translate,
    });
    this.scene.add(this.world.group);
    if (map.checkpoints.length > 0) {
      this.checkpoints = new CheckpointView(map.checkpoints, this.glow);
      this.scene.add(this.checkpoints.group);
    }
  }

  clearMap(): void {
    this.world?.dispose();
    this.world = null;
    this.checkpoints?.dispose();
    this.checkpoints = null;
    this.map = null;
  }

  setTranslator(translate: (key: string) => string): void {
    this.translate = translate;
    this.world?.setTranslator(translate);
  }

  resize(): void {
    const width = Math.max(1, this.host.clientWidth);
    const height = Math.max(1, this.host.clientHeight);
    const pixelRatio = Math.max(0.35, Math.min(window.devicePixelRatio || 1, this.profile.maxPixelRatio) * this.renderScale);
    this.renderer.setPixelRatio(pixelRatio);
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.particles.setViewport(height * pixelRatio, this.camera.fov);
  }

  render(view: FrameView): void {
    const { camera } = this;
    if (camera.fov !== view.camera.fovDegrees) {
      camera.fov = view.camera.fovDegrees;
      camera.updateProjectionMatrix();
      this.particles.setViewport(this.canvas.height, camera.fov);
    }
    camera.position.set(view.camera.x, view.camera.y, view.camera.z);
    camera.rotation.set(view.camera.pitch, view.camera.yaw, 0);

    const player = view.player;
    this.avatar.group.visible = player.visible;
    if (player.visible) {
      this.avatar.group.position.set(player.x, player.y, player.z);
      this.avatar.group.rotation.y = player.yaw;
      this.avatar.update(player.pose, view.frameSeconds, view.reducedMotion, player.groundOffset);
    }

    // The shadow frustum follows the player in 2 m steps so shadow edges do not swim.
    if (this.profile.shadows) {
      const tx = Math.round(player.x / 2) * 2;
      const tz = Math.round(player.z / 2) * 2;
      this.sun.target.position.set(tx, player.y, tz);
      this.sun.position.set(tx + this.sunDirection.x * 90, player.y + this.sunDirection.y * 90, tz + this.sunDirection.z * 90);
    }

    // Studio lighting for the lobby: warm key from the camera side, violet rim from behind.
    if (view.lobby) {
      this.keyLight.intensity = 26;
      this.rimLight.intensity = 34;
      this.keyLight.position.set(camera.position.x * 0.55 + player.x * 0.45 - 1.4, player.y + 2.6, camera.position.z * 0.55 + player.z * 0.45);
      this.rimLight.position.set(player.x * 2 - camera.position.x * 0.6 + 1.2, player.y + 2.2, player.z * 2 - camera.position.z * 0.6);
    } else {
      this.keyLight.intensity = 0;
      this.rimLight.intensity = 0;
    }
    this.world?.setLabelsVisible(!view.lobby);

    this.sky.update(camera.position, view.timeSeconds);
    this.world?.update(view.reducedMotion ? 0 : view.timeSeconds);
    this.checkpoints?.update(view.nextAnchor < 0 ? Number.MAX_SAFE_INTEGER : view.nextAnchor, view.timeSeconds, view.frameSeconds, view.reducedMotion);
    this.particles.update(view.frameSeconds);

    this.renderer.render(this.scene, camera);
    this.stats.drawCalls = this.renderer.info.render.calls;
    this.stats.triangles = this.renderer.info.render.triangles;
  }

  /* ---- cosmetic effects triggered by simulation events ------------------------------------- */

  footDust(x: number, y: number, z: number): void {
    this.particles.burst(x, y + 0.05, z, DUST);
  }

  landingPuff(x: number, y: number, z: number, strength: number): void {
    const options: BurstOptions = { ...LANDING, count: Math.round(6 + 14 * Math.min(1, strength)) };
    this.particles.burst(x, y + 0.05, z, options);
  }

  slideSpray(x: number, y: number, z: number): void {
    this.particles.burst(x, y + 0.05, z, SLIDE_SPRAY);
  }

  anchorBurst(x: number, y: number, z: number): void {
    this.particles.burst(x, y, z, ANCHOR_BURST);
  }

  dispose(): void {
    this.resizeObserver.disconnect();
    this.clearMap();
    this.avatar.dispose();
    this.particles.dispose();
    this.sky.dispose();
    this.glow.dispose();
    this.disposeRenderer();
  }

  /* ---- internals --------------------------------------------------------------------------- */

  private createRenderer(): void {
    const canvas = document.createElement('canvas');
    canvas.className = 'game-canvas';
    canvas.setAttribute('aria-label', 'NEXUS ROYALE');
    try {
      this.renderer = new THREE.WebGLRenderer({ canvas, antialias: this.profile.antialias, powerPreference: 'high-performance', alpha: false, stencil: false });
    } catch (error) {
      throw new WebGLUnavailableError(error);
    }
    this.canvas = canvas;
    this.host.appendChild(canvas);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.setClearColor(PALETTE.skyHorizon, 1);

    // Only the live canvas may report context loss: a canvas we retire on purpose (quality
    // change) also fires this event and must not freeze the game.
    canvas.addEventListener('webglcontextlost', (event) => {
      if (canvas !== this.canvas) return;
      event.preventDefault();
      this.callbacks.onContextLost();
    });
    canvas.addEventListener('webglcontextrestored', () => {
      if (canvas === this.canvas) this.callbacks.onContextRestored();
    });

    // Detail textures belong to the context they were uploaded with.
    if (this.textures) for (const texture of Object.values(this.textures)) texture.dispose();
    this.textures = createDetailTextures(Math.min(this.profile.anisotropy, this.renderer.capabilities.getMaxAnisotropy()));
  }

  private disposeRenderer(): void {
    const retired = this.canvas;
    // Detach first so the context-loss event of the retired canvas is ignored.
    this.canvas = document.createElement('canvas');
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    retired.remove();
  }

  private applyProfile(): void {
    const profile = this.profile;
    this.renderer.shadowMap.enabled = profile.shadows;
    this.sun.castShadow = profile.shadows;
    if (profile.shadows) {
      const shadow = this.sun.shadow;
      if (shadow.mapSize.x !== profile.shadowMapSize) {
        shadow.mapSize.set(profile.shadowMapSize, profile.shadowMapSize);
        shadow.map?.dispose();
        shadow.map = null;
      }
      const extent = 46;
      shadow.camera.left = -extent;
      shadow.camera.right = extent;
      shadow.camera.top = extent;
      shadow.camera.bottom = -extent;
      shadow.camera.near = 1;
      shadow.camera.far = 220;
      shadow.camera.updateProjectionMatrix();
    } else {
      // Without shadow maps the sun sits in its fixed direction.
      this.sun.position.copy(this.sunDirection).multiplyScalar(90);
      this.sun.target.position.set(0, 0, 0);
    }
    this.avatar.setShadowCasting(profile.shadows);
    this.avatar.setBlobShadow(!profile.shadows);
    this.particles.enabled = profile.particles;
    this.sky.setClouds(profile.clouds);
    const fog = this.scene.fog as THREE.Fog;
    fog.near = profile.viewDistance * 0.22;
    fog.far = profile.viewDistance;
    this.camera.far = Math.max(1200, profile.viewDistance * 2.5);
    this.camera.updateProjectionMatrix();
  }
}
