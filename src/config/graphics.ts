/** GraphicsConfig — presets de calidad. Se ampliará en Phase 8. */
export type QualityPreset = 'low' | 'medium' | 'high' | 'ultra';

export interface GraphicsPreset {
  pixelRatioCap: number;
  shadows: boolean;
  shadowMapSize: number;
  antialias: boolean;
}

export const GRAPHICS_PRESETS: Record<QualityPreset, GraphicsPreset> = {
  low: { pixelRatioCap: 1, shadows: false, shadowMapSize: 512, antialias: false },
  medium: { pixelRatioCap: 1.5, shadows: true, shadowMapSize: 1024, antialias: true },
  high: { pixelRatioCap: 2, shadows: true, shadowMapSize: 2048, antialias: true },
  ultra: { pixelRatioCap: 2.5, shadows: true, shadowMapSize: 4096, antialias: true },
};

export const GraphicsConfig = {
  defaultPreset: 'high' as QualityPreset,
  skyTop: 0x5fb4ff,
  skyBottom: 0xcfeaff,
  fogNear: 45,
  fogFar: 140,
};
