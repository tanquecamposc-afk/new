/**
 * Catálogo de cosméticos (diseños propios). Son SÓLO visuales: no cambian
 * velocidad, potencia, física, puntuación ni hitbox.
 */
export type CosmeticCategory = 'skin' | 'color' | 'trail' | 'effect';
export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';

export type SkinPattern = 'classic' | 'solid' | 'stripes' | 'dots' | 'stars' | 'checker' | 'planet' | 'metal';
export type EffectKind = 'none' | 'glow' | 'sparkles' | 'gold_confetti';

export interface CosmeticItem {
  id: string;
  name: string;
  category: CosmeticCategory;
  rarity: Rarity;
  /** 0 = gratuito / incluido de inicio. */
  price: number;
  /** Nivel mínimo para comprarlo. */
  level?: number;
  /** Datos visuales según la categoría. */
  pattern?: SkinPattern;
  /** Color secundario del patrón (skins) o color principal (colores, estelas). */
  color?: number;
  accent?: number;
  effect?: EffectKind;
}

export const RARITY_INFO: Record<Rarity, { label: string; color: string }> = {
  common: { label: 'Común', color: '#b8c4d6' },
  rare: { label: 'Rara', color: '#4fa3ff' },
  epic: { label: 'Épica', color: '#c77dff' },
  legendary: { label: 'Legendaria', color: '#ffcf3f' },
};

export const CATEGORY_INFO: Record<CosmeticCategory, { label: string; icon: string }> = {
  skin: { label: 'Bolas', icon: '⚪' },
  color: { label: 'Colores', icon: '🎨' },
  trail: { label: 'Estelas', icon: '〰' },
  effect: { label: 'Efectos', icon: '✨' },
};

/** Color "automático": la bola usa el color asignado en la sala (fácil de distinguir). */
export const AUTO_COLOR = 'color-auto';

export const COSMETICS: readonly CosmeticItem[] = [
  // Bolas (patrón)
  { id: 'skin-classic', name: 'Clásica', category: 'skin', rarity: 'common', price: 0, pattern: 'classic' },
  { id: 'skin-solid', name: 'Lisa', category: 'skin', rarity: 'common', price: 0, pattern: 'solid' },
  { id: 'skin-stripes', name: 'Rayas', category: 'skin', rarity: 'common', price: 120, pattern: 'stripes', accent: 0x23324f },
  { id: 'skin-dots', name: 'Lunares', category: 'skin', rarity: 'rare', price: 220, pattern: 'dots', accent: 0xff4f8b },
  { id: 'skin-checker', name: 'Ajedrez', category: 'skin', rarity: 'rare', price: 260, pattern: 'checker', accent: 0x13213d },
  { id: 'skin-stars', name: 'Estrellada', category: 'skin', rarity: 'epic', price: 480, level: 3, pattern: 'stars', accent: 0xffcf3f },
  { id: 'skin-planet', name: 'Planeta', category: 'skin', rarity: 'epic', price: 560, level: 5, pattern: 'planet', accent: 0x2ec4b6 },
  { id: 'skin-metal', name: 'Cromada', category: 'skin', rarity: 'legendary', price: 1200, level: 8, pattern: 'metal' },
  // Colores
  { id: AUTO_COLOR, name: 'Automático', category: 'color', rarity: 'common', price: 0 },
  { id: 'color-white', name: 'Blanco', category: 'color', rarity: 'common', price: 0, color: 0xffffff },
  { id: 'color-coral', name: 'Coral', category: 'color', rarity: 'common', price: 60, color: 0xff6b6b },
  { id: 'color-sky', name: 'Cielo', category: 'color', rarity: 'common', price: 60, color: 0x4fa3ff },
  { id: 'color-lime', name: 'Lima', category: 'color', rarity: 'common', price: 60, color: 0xa3e635 },
  { id: 'color-sun', name: 'Sol', category: 'color', rarity: 'rare', price: 140, color: 0xffcf3f },
  { id: 'color-violet', name: 'Violeta', category: 'color', rarity: 'rare', price: 140, color: 0x9b5de5 },
  { id: 'color-mint', name: 'Menta', category: 'color', rarity: 'rare', price: 140, color: 0x2ec4b6 },
  { id: 'color-night', name: 'Noche', category: 'color', rarity: 'epic', price: 320, level: 4, color: 0x22264a },
  // Estelas
  { id: 'trail-none', name: 'Sin estela', category: 'trail', rarity: 'common', price: 0 },
  { id: 'trail-white', name: 'Nube', category: 'trail', rarity: 'common', price: 100, color: 0xffffff },
  { id: 'trail-fire', name: 'Fuego', category: 'trail', rarity: 'rare', price: 260, color: 0xff7a1a, accent: 0xffd23f },
  { id: 'trail-ocean', name: 'Océano', category: 'trail', rarity: 'rare', price: 260, color: 0x00bbf9, accent: 0x9be7ff },
  { id: 'trail-rainbow', name: 'Arcoíris', category: 'trail', rarity: 'legendary', price: 900, level: 6, color: 0xff5c5c, accent: 0x4fa3ff },
  // Efectos
  { id: 'effect-none', name: 'Ninguno', category: 'effect', rarity: 'common', price: 0, effect: 'none' },
  { id: 'effect-glow', name: 'Halo', category: 'effect', rarity: 'rare', price: 300, effect: 'glow', color: 0xfff1a8 },
  { id: 'effect-sparkles', name: 'Chispas', category: 'effect', rarity: 'epic', price: 520, level: 4, effect: 'sparkles', color: 0xffe066 },
  { id: 'effect-gold', name: 'Confeti dorado', category: 'effect', rarity: 'legendary', price: 1000, level: 7, effect: 'gold_confetti', color: 0xffcf3f },
];

const BY_ID = new Map(COSMETICS.map((c) => [c.id, c]));

export function getCosmetic(id: string): CosmeticItem | undefined {
  return BY_ID.get(id);
}

export interface Equipped {
  skin: string;
  color: string;
  trail: string;
  effect: string;
}

export const DEFAULT_EQUIPPED: Equipped = { skin: 'skin-classic', color: AUTO_COLOR, trail: 'trail-none', effect: 'effect-none' };

/** Objetos que todo jugador tiene desde el principio. */
export const STARTER_ITEMS = COSMETICS.filter((c) => c.price === 0).map((c) => c.id);

/** Sanea un conjunto equipado (ids inexistentes o de otra categoría → por defecto). */
export function sanitizeEquipped(raw: Partial<Record<keyof Equipped, unknown>> | undefined): Equipped {
  const out = { ...DEFAULT_EQUIPPED };
  if (!raw) return out;
  for (const cat of ['skin', 'color', 'trail', 'effect'] as const) {
    const id = raw[cat];
    if (typeof id === 'string' && getCosmetic(id)?.category === cat) out[cat] = id;
  }
  return out;
}

/** Aspecto visual resuelto de una bola (lo que necesita el render). */
export interface BallLook {
  pattern: SkinPattern;
  color: number;
  accent: number;
  trail: { color: number; accent: number } | null;
  effect: EffectKind;
  effectColor: number;
}

export function resolveLook(eq: Equipped, slotColor: number): BallLook {
  const skin = getCosmetic(eq.skin) ?? getCosmetic(DEFAULT_EQUIPPED.skin)!;
  const color = getCosmetic(eq.color);
  const trail = getCosmetic(eq.trail);
  const effect = getCosmetic(eq.effect);
  return {
    pattern: skin.pattern ?? 'classic',
    color: color?.color ?? slotColor,
    accent: skin.accent ?? 0x2b6cff,
    trail: trail?.color !== undefined ? { color: trail.color, accent: trail.accent ?? trail.color } : null,
    effect: effect?.effect ?? 'none',
    effectColor: effect?.color ?? 0xffffff,
  };
}
