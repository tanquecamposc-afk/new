import * as THREE from 'three';
import { GRAPHICS_PRESETS, GraphicsConfig, type GraphicsPreset, type QualityPreset } from '@/config/graphics';
import type { CourseData } from '@/game/courses/types';

export class WebGLUnavailableError extends Error {
  constructor() {
    super('WebGL no está disponible en este navegador o dispositivo.');
  }
}

/**
 * Renderer de Three.js: escena, cielo, niebla, iluminación y sombras según el
 * preset de calidad. Iluminación: hemisférica (cielo/suelo) + sol con sombras
 * + relleno suave sin sombras. Nada de decenas de luces dinámicas.
 */
export class SceneRenderer {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly sun: THREE.DirectionalLight;
  readonly preset: GraphicsPreset;
  private readonly hemi: THREE.HemisphereLight;
  private readonly fill: THREE.DirectionalLight;
  private disposables: { dispose(): void }[] = [];
  private sky: THREE.Mesh;
  private clouds: THREE.Group | null = null;

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
    this.renderer.shadowMap.enabled = this.preset.shadowMode !== 'none';
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.shadowMap.autoUpdate = this.preset.shadowMode === 'dynamic';
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.preset.pixelRatioCap));

    this.scene.background = new THREE.Color(GraphicsConfig.skyBottom);
    this.scene.fog = new THREE.Fog(GraphicsConfig.skyBottom, GraphicsConfig.fogNear, GraphicsConfig.fogFar);
    this.sky = this.createSky();
    this.scene.add(this.sky);

    this.hemi = new THREE.HemisphereLight(0xdff1ff, 0x5d8c4a, 1);
    this.sun = new THREE.DirectionalLight(0xfff3dd, 2.4);
    this.sun.castShadow = this.preset.shadowMode !== 'none';
    this.sun.shadow.mapSize.set(this.preset.shadowMapSize, this.preset.shadowMapSize);
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.02;
    // Relleno frío desde el lado opuesto: da volumen sin otra sombra.
    this.fill = new THREE.DirectionalLight(0xbfd8ff, 0.45);
    this.scene.add(this.hemi, this.sun, this.sun.target, this.fill);
  }

  private track<T extends { dispose(): void }>(o: T): T {
    this.disposables.push(o);
    return o;
  }

  /** Cúpula de cielo con degradado y halo del sol (shader barato, sin texturas). */
  private createSky(): THREE.Mesh {
    const mat = this.track(
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: {
          top: { value: new THREE.Color(GraphicsConfig.skyTop) },
          bottom: { value: new THREE.Color(GraphicsConfig.skyBottom) },
          sunDir: { value: new THREE.Vector3(0, 1, 0) },
        },
        vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); vec4 p = modelViewMatrix * vec4(position,1.0); gl_Position = projectionMatrix * p; }`,
        fragmentShader: `uniform vec3 top; uniform vec3 bottom; uniform vec3 sunDir; varying vec3 vDir;
          void main(){
            float h = clamp(vDir.y * 1.4 + 0.15, 0.0, 1.0);
            vec3 col = mix(bottom, top, pow(h, 0.8));
            float s = max(dot(normalize(vDir), normalize(sunDir)), 0.0);
            col += vec3(1.0, 0.92, 0.75) * (pow(s, 64.0) * 0.9 + pow(s, 6.0) * 0.12);
            gl_FragColor = vec4(col, 1.0);
            #include <colorspace_fragment>
          }`,
      }),
    );
    const sky = new THREE.Mesh(this.track(new THREE.SphereGeometry(300, 24, 12)), mat);
    sky.renderOrder = -1;
    sky.frustumCulled = false;
    return sky;
  }

  /** Nubes (sprites) y montañas lejanas de bajo coste. */
  private createScenery(cx: number, cz: number): void {
    const g = new THREE.Group();
    const c = document.createElement('canvas');
    c.width = 128;
    c.height = 64;
    const ctx = c.getContext('2d')!;
    for (const [x, y, r] of [[40, 38, 22], [64, 30, 28], [90, 38, 22], [64, 42, 24]] as const) {
      const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, 'rgba(255,255,255,0.95)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 128, 64);
    }
    const tex = this.track(new THREE.CanvasTexture(c));
    const cloudMat = this.track(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, fog: false, opacity: 0.9 }));
    let seed = 42;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 14; i++) {
      const s = new THREE.Sprite(cloudMat);
      const a = rnd() * Math.PI * 2;
      const d = 90 + rnd() * 90;
      s.position.set(cx + Math.cos(a) * d, 35 + rnd() * 35, cz + Math.sin(a) * d);
      const k = 30 + rnd() * 30;
      s.scale.set(k, k * 0.45, 1);
      g.add(s);
    }
    const hillMat = this.track(new THREE.MeshLambertMaterial({ color: 0x7fb8a0, flatShading: true }));
    const hillGeo = this.track(new THREE.ConeGeometry(1, 1, 6));
    const hills = new THREE.InstancedMesh(hillGeo, hillMat, 22);
    const m = new THREE.Matrix4();
    for (let i = 0; i < 22; i++) {
      const a = (i / 22) * Math.PI * 2 + rnd() * 0.2;
      const d = 120 + rnd() * 30;
      const h = 14 + rnd() * 22;
      const w = 22 + rnd() * 20;
      m.compose(new THREE.Vector3(cx + Math.cos(a) * d, h / 2 - 3, cz + Math.sin(a) * d), new THREE.Quaternion(), new THREE.Vector3(w, h, w));
      hills.setMatrixAt(i, m);
    }
    g.add(hills);
    this.clouds = g;
    this.scene.add(g);
  }

  /** Ajusta luces, cielo y caja de sombras al curso. */
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
    this.fill.position.set(cx - dir.x * 30, 18, cz - dir.z * 30);
    this.fill.target = this.sun.target;
    (this.sky.material as THREE.ShaderMaterial).uniforms.sunDir!.value.copy(dir);
    this.sky.position.set(cx, 0, cz);
    const cam = this.sun.shadow.camera;
    cam.left = -ext;
    cam.right = ext;
    cam.top = ext;
    cam.bottom = -ext;
    cam.near = 1;
    cam.far = 100;
    cam.updateProjectionMatrix();
    this.hemi.intensity = L.ambientIntensity;
    if (this.preset.scenery && !this.clouds) this.createScenery(cx, cz);
  }

  /** Modo "static": calcula el mapa de sombras una única vez (geometría estática). */
  bakeStaticShadows(): void {
    if (this.preset.shadowMode !== 'static') return;
    this.renderer.shadowMap.needsUpdate = true;
  }

  get dynamicShadows(): boolean {
    return this.preset.shadowMode === 'dynamic';
  }

  private size = { w: 1, h: 1 };
  /** Escala de resolución dinámica (1 = resolución completa del preset). */
  resolutionScale = 1;

  resize(width: number, height: number): void {
    this.size = { w: width, h: height };
    this.renderer.setSize(width, height, false);
  }

  /** Resolución dinámica: cambia los píxeles renderizados sin tocar el tamaño en pantalla. */
  setResolutionScale(scale: number): void {
    this.resolutionScale = Math.min(1, Math.max(0.5, scale));
    const base = Math.min(window.devicePixelRatio || 1, this.preset.pixelRatioCap);
    this.renderer.setPixelRatio(Math.max(0.5, base * this.resolutionScale));
    this.renderer.setSize(this.size.w, this.size.h, false);
  }

  /** Se llama si el navegador pierde el contexto WebGL (driver, memoria de GPU). */
  onContextLost(cb: () => void): void {
    this.contextLostCb = cb;
    if (this.listening) return;
    this.listening = true;
    this.canvas.addEventListener('webglcontextlost', this.handleContextLost);
  }

  private readonly handleContextLost = (e: Event): void => {
    e.preventDefault();
    // La pérdida provocada por dispose() (liberar el contexto) no es un error.
    if (!this.disposed) this.contextLostCb?.();
  };

  private contextLostCb: (() => void) | null = null;
  private listening = false;
  private disposed = false;

  render(camera: THREE.Camera): void {
    this.sky.position.x = camera.position.x;
    this.sky.position.z = camera.position.z;
    this.renderer.render(this.scene, camera);
  }

  get stats(): { drawCalls: number; triangles: number } {
    const i = this.renderer.info.render;
    return { drawCalls: i.calls, triangles: i.triangles };
  }

  dispose(): void {
    this.disposed = true;
    this.disposables.forEach((d) => d.dispose());
    this.renderer.dispose();
    // Liberar el contexto: cada hoyo crea un canvas nuevo y el navegador limita los contextos vivos.
    this.renderer.forceContextLoss();
    // El canvas puede sobrevivir al motor (React/DOM desprendido): no debe retenerlo.
    this.canvas.removeEventListener('webglcontextlost', this.handleContextLost);
    this.contextLostCb = null;
  }
}
