import type { QualityPreset } from './graphics';

export interface DeviceInfo {
  gpu: string;
  cores: number;
  memoryGb: number | null;
  mobile: boolean;
  chromebook: boolean;
  dpr: number;
  screen: { w: number; h: number };
}

/** Lee lo que el navegador expone del dispositivo (sin permisos ni huella invasiva). */
export function readDeviceInfo(): DeviceInfo {
  let gpu = '';
  try {
    const c = document.createElement('canvas');
    const gl = (c.getContext('webgl2') ?? c.getContext('webgl')) as WebGLRenderingContext | null;
    if (gl) {
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      gpu = String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    }
  } catch {
    /* sin WebGL: lo gestiona la pantalla de error */
  }
  const nav = navigator as Navigator & { deviceMemory?: number };
  const coarse = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
  return {
    gpu,
    cores: nav.hardwareConcurrency || 4,
    memoryGb: nav.deviceMemory ?? null,
    mobile: coarse && Math.min(screen.width, screen.height) < 820,
    chromebook: /CrOS/.test(nav.userAgent),
    dpr: window.devicePixelRatio || 1,
    screen: { w: screen.width, h: screen.height },
  };
}

const ORDER: QualityPreset[] = ['low', 'medium', 'high', 'ultra'];
const cap = (q: QualityPreset, max: QualityPreset) => ORDER[Math.min(ORDER.indexOf(q), ORDER.indexOf(max))]!;

/**
 * Elige un preset inicial razonable. Es sólo el punto de partida: la
 * resolución dinámica del motor ajusta después según los FPS reales.
 */
export function recommendQuality(d: DeviceInfo): { quality: QualityPreset; reason: string } {
  const g = d.gpu.toLowerCase();
  if (/swiftshader|llvmpipe|software|basic render/.test(g)) return { quality: 'low', reason: 'renderizado por software' };
  let q: QualityPreset = 'high';
  let reason = 'equipo capaz';
  if (/rtx|radeon rx|geforce gtx 1[0-9]|apple m[1-9]/.test(g) && d.cores >= 8) {
    q = 'ultra';
    reason = 'GPU dedicada';
  }
  if (/intel.*(hd|uhd) graphics|mali-t|mali-4|adreno \(tm\) [3-5]|powervr|videocore/.test(g)) {
    q = cap(q, 'medium');
    reason = 'GPU integrada o móvil modesta';
  }
  if (d.chromebook) {
    q = cap(q, 'medium');
    reason = 'Chromebook';
  }
  if (d.mobile) {
    q = cap(q, 'medium');
    reason = 'móvil';
  }
  if (d.cores <= 2 || (d.memoryGb !== null && d.memoryGb <= 2)) {
    q = 'low';
    reason = 'pocos recursos (CPU/memoria)';
  } else if (d.cores <= 4 || (d.memoryGb !== null && d.memoryGb <= 4)) {
    q = cap(q, 'medium');
    reason = reason === 'equipo capaz' ? 'CPU/memoria moderadas' : reason;
  }
  return { quality: q, reason };
}
