import * as THREE from 'three';
import { GRAPHICS_PRESETS, GraphicsConfig, type GraphicsPreset, type QualityPreset } from '@/config/graphics';
import type { CourseData } from '@/game/courses/types';
import { createSkyTexture } from './textures';

export class WebGLUnavailableError extends Error {
  constructor() {
    super('WebGL no está disponible en este navegador o dispositivo.');
  }
}

/** Renderer de Three.js: escena, cielo, niebla, iluminación y sombras. */
export class SceneRenderer {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly sun: THREE.DirectionalLight;
  private preset: GraphicsPreset;
  private sky: THREE.Texture;

  constructor(
    readonly canvas: HTMLCanvasElement,
    quality: QualityPreset = GraphicsConfig.defaultPreset,
  ) {
    this.preset = GRAPHICS_PRESETS[quality];
    try {
      this.renderer = new THREE.WebGLRenderer({ canvas, antialias: this.preset.antialias, powerPreference: 'high-performance' });
    } catch {
      throw new WebGLUnavailableError();
    }
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = this.preset.shadows;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.preset.pixelRatioCap));

    this.sky = createSkyTexture(GraphicsConfig.skyTop, GraphicsConfig.skyBottom);
    this.scene.background = this.sky;
    this.scene.fog = new THREE.Fog(GraphicsConfig.skyBottom, GraphicsConfig.fogNear, GraphicsConfig.fogFar);

    // Luz ambiental de cielo/suelo + una única luz principal con sombras.
    this.scene.add(new THREE.HemisphereLight(0xdff1ff, 0x5d8c4a, 1));
    this.sun = new THREE.DirectionalLight(0xfff3dd, 2.4);
    this.sun.castShadow = this.preset.shadows;
    this.sun.shadow.mapSize.set(this.preset.shadowMapSize, this.preset.shadowMapSize);
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.02;
    this.scene.add(this.sun, this.sun.target);
  }

  /** Ajusta la luz y la caja de sombras al curso (sombras nítidas sin desperdiciar resolución). */
  configureForCourse(course: CourseData): void {
    const { min, max } = course.boundaries;
    const cx = (min.x + max.x) / 2;
    const cz = (min.z + max.z) / 2;
    const ext = Math.max(max.x - min.x, max.z - min.z) / 2 + 8;
    const L = course.lighting;
    const dir = new THREE.Vector3(L.sunDirection.x, L.sunDirection.y, L.sunDirection.z).normalize();
    this.sun.position.set(cx + dir.x * 40, dir.y * 40, cz + dir.z * 40);
    this.sun.target.position.set(cx, 0, cz);
    this.sun.intensity = L.sunIntensity;
    const cam = this.sun.shadow.camera;
    cam.left = -ext;
    cam.right = ext;
    cam.top = ext;
    cam.bottom = -ext;
    cam.near = 1;
    cam.far = 100;
    cam.updateProjectionMatrix();
    const hemi = this.scene.children.find((c): c is THREE.HemisphereLight => c instanceof THREE.HemisphereLight);
    if (hemi) hemi.intensity = L.ambientIntensity;
  }

  resize(width: number, height: number): void {
    this.renderer.setSize(width, height, false);
  }

  render(camera: THREE.Camera): void {
    this.renderer.render(this.scene, camera);
  }

  get stats(): { drawCalls: number; triangles: number } {
    const i = this.renderer.info.render;
    return { drawCalls: i.calls, triangles: i.triangles };
  }

  dispose(): void {
    this.sky.dispose();
    this.renderer.dispose();
  }
}
