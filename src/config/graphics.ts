/** GraphicsConfig — presets de calidad (el ajuste fino para dispositivos llega en Phase 8). */
export type QualityPreset = 'low' | 'medium' | 'high' | 'ultra';

/**
 * Sombras:
 * - none: sin mapa de sombras (sólo sombras "blob" bajo las bolas y AO de contacto).
 * - static: el mapa se calcula UNA vez para la geometría estática (iluminación precalculada);
 *   las bolas usan sombras blob.
 * - dynamic: mapa de sombras en tiempo real.
 */
export type ShadowMode = 'none' | 'static' | 'dynamic';

export interface GraphicsPreset {
  pixelRatioCap: number;
  shadowMode: ShadowMode;
  shadowMapSize: number;
  antialias: boolean;
  /** Multiplicador del número de partículas de los efectos. */
  particles: number;
  /** Agua con shader animado (ondas, fresnel, brillo) o material simple. */
  waterShader: boolean;
  /** Nubes, montañas lejanas y decoración extra. */
  scenery: boolean;
  /** Estelas y chispas de los cosméticos. */
  cosmeticFx: boolean;
}

export const GRAPHICS_PRESETS: Record<QualityPreset, GraphicsPreset> = {
  low: { pixelRatioCap: 1, shadowMode: 'none', shadowMapSize: 512, antialias: false, particles: 0.35, waterShader: false, scenery: false, cosmeticFx: false },
  medium: { pixelRatioCap: 1.5, shadowMode: 'static', shadowMapSize: 1024, antialias: true, particles: 0.6, waterShader: true, scenery: true, cosmeticFx: true },
  high: { pixelRatioCap: 2, shadowMode: 'dynamic', shadowMapSize: 2048, antialias: true, particles: 1, waterShader: true, scenery: true, cosmeticFx: true },
  ultra: { pixelRatioCap: 2.5, shadowMode: 'dynamic', shadowMapSize: 4096, antialias: true, particles: 1.4, waterShader: true, scenery: true, cosmeticFx: true },
};

export const GraphicsConfig = {
  defaultPreset: 'high' as QualityPreset,
  skyTop: 0x4aa8ff,
  skyBottom: 0xcfeaff,
  fogNear: 45,
  fogFar: 140,
};
