/**
 * Visual definitions for player skins and enemy humanoids.
 */
export type HeadStyle = 'hair' | 'helmet' | 'mask' | 'hat' | 'robot' | 'hood' | 'visor' | 'skull' | 'crown' | 'bald' | 'horns';

export interface SkinDef {
  suit: number;
  suit2: number;
  skin: number;
  accent: number;
  accentGlow: number;
  metal: number;
  rough: number;
  head: HeadStyle;
  hair?: number;
  cape?: number;
  scarf?: number;
  backpack?: boolean;
  shoulderPads?: boolean;
  antenna?: boolean;
  eyes?: number;
  opacity?: number;
  /** Limb scale tweaks for enemies (long limbs etc). */
  limbScale?: number;
  bulk?: number;
}

export const SKINS: Record<string, SkinDef> = {
  skin_runner: { suit: 0x2f7de0, suit2: 0x2a2f3c, skin: 0xe0b090, accent: 0xff7a2a, accentGlow: 0.25, metal: 0.05, rough: 0.7, head: 'hair', hair: 0x2a1a10 },
  skin_knight: { suit: 0xb8c0cc, suit2: 0x4a3a2a, skin: 0xd8a888, accent: 0xd02020, accentGlow: 0.3, metal: 0.9, rough: 0.25, head: 'helmet', cape: 0x9a1020, shoulderPads: true },
  skin_ninja: { suit: 0x1a1a22, suit2: 0x2a2a36, skin: 0xd8a888, accent: 0xff2040, accentGlow: 0.8, metal: 0.05, rough: 0.85, head: 'mask', scarf: 0xc01830 },
  skin_explorer: { suit: 0x8a6a40, suit2: 0x4a5a30, skin: 0xd8a080, accent: 0xe0c070, accentGlow: 0, metal: 0.05, rough: 0.85, head: 'hat', hair: 0x4a2a10, backpack: true },
  skin_robot: { suit: 0xa0aabb, suit2: 0x3a4250, skin: 0x8a94a4, accent: 0x40ff90, accentGlow: 3, metal: 0.95, rough: 0.2, head: 'robot', antenna: true, eyes: 0x40ff90 },
  skin_cyber: { suit: 0x101820, suit2: 0x202a38, skin: 0xd0a080, accent: 0x00f0ff, accentGlow: 4, metal: 0.4, rough: 0.35, head: 'visor', hair: 0xff20a0, eyes: 0x00f0ff },
  skin_shadow: { suit: 0x08060c, suit2: 0x140c20, skin: 0x120818, accent: 0xa040ff, accentGlow: 4, metal: 0.2, rough: 0.5, head: 'hood', cape: 0x0c0614, eyes: 0xc060ff },
  skin_frost: { suit: 0xa0e0ff, suit2: 0x4a80b0, skin: 0xe0f0ff, accent: 0xffffff, accentGlow: 2, metal: 0.6, rough: 0.15, head: 'helmet', shoulderPads: true, eyes: 0xa0f0ff },
  skin_magma: { suit: 0x1a1210, suit2: 0x2a1810, skin: 0x2a1a14, accent: 0xff5010, accentGlow: 4, metal: 0.3, rough: 0.8, head: 'horns', eyes: 0xffa020 },
  skin_golden: { suit: 0xffc830, suit2: 0xb08010, skin: 0xffd060, accent: 0xffffff, accentGlow: 1.5, metal: 1, rough: 0.18, head: 'crown', shoulderPads: true, cape: 0x8a1010 },
  skin_phantom: { suit: 0x6030a0, suit2: 0x2a1050, skin: 0x8060ff, accent: 0xff60d0, accentGlow: 4, metal: 0.2, rough: 0.3, head: 'hood', eyes: 0xffffff, opacity: 0.8, cape: 0x401070 },
  skin_retro: { suit: 0x20c020, suit2: 0x106010, skin: 0xffc080, accent: 0x39ff14, accentGlow: 2, metal: 0, rough: 1, head: 'hat', hair: 0x603010 },
  skin_champion: { suit: 0xf0f0f8, suit2: 0xd0a020, skin: 0xe0b090, accent: 0xffd040, accentGlow: 3, metal: 0.7, rough: 0.25, head: 'crown', cape: 0xffd040, shoulderPads: true, eyes: 0xffe080 },

  // ── Enemies
  enemy_grunt: { suit: 0x5a2a20, suit2: 0x2a1a14, skin: 0x7a8a60, accent: 0xff4020, accentGlow: 1.5, metal: 0.2, rough: 0.8, head: 'skull', eyes: 0xff3010 },
  enemy_brute: { suit: 0x3a3a40, suit2: 0x5a2010, skin: 0x6a7a50, accent: 0xff6020, accentGlow: 1.5, metal: 0.6, rough: 0.5, head: 'horns', shoulderPads: true, eyes: 0xff6020, bulk: 1.35 },
  enemy_archer: { suit: 0x2a4a2a, suit2: 0x1a2a1a, skin: 0x8a9a70, accent: 0xffd020, accentGlow: 1, metal: 0.1, rough: 0.8, head: 'hood', cape: 0x1a3a1a, eyes: 0xffd020 },
  enemy_charger: { suit: 0x6a1a1a, suit2: 0x2a0a0a, skin: 0x6a5a40, accent: 0xff2020, accentGlow: 2, metal: 0.4, rough: 0.5, head: 'horns', eyes: 0xff2020 },
  enemy_shaman: { suit: 0x3a1a5a, suit2: 0x1a0a2a, skin: 0x7a6a8a, accent: 0xa040ff, accentGlow: 3, metal: 0.1, rough: 0.7, head: 'hood', cape: 0x2a0a4a, eyes: 0xc060ff },
  enemy_guard: { suit: 0x2a3440, suit2: 0x14181e, skin: 0xc09070, accent: 0xff3030, accentGlow: 2, metal: 0.5, rough: 0.4, head: 'visor', eyes: 0xff3030, hair: 0x1a1a1a },
  enemy_stalker: { suit: 0x0c0a0a, suit2: 0x040404, skin: 0xc8c0b8, accent: 0xffffff, accentGlow: 3, metal: 0, rough: 0.9, head: 'bald', eyes: 0xffffff, limbScale: 1.35 },
  enemy_zombie: { suit: 0x3a3a2a, suit2: 0x2a201a, skin: 0x6a7a5a, accent: 0x80ff40, accentGlow: 1, metal: 0, rough: 1, head: 'bald', eyes: 0xa0ff40 },
  enemy_warrior: { suit: 0x6a5030, suit2: 0x3a1010, skin: 0xa07050, accent: 0xff8020, accentGlow: 2, metal: 0.8, rough: 0.3, head: 'helmet', cape: 0x8a1010, shoulderPads: true, eyes: 0xff8020, bulk: 1.2 },
  enemy_clone: { suit: 0x100818, suit2: 0x05030a, skin: 0x100818, accent: 0x8030ff, accentGlow: 4, metal: 0.1, rough: 0.5, head: 'hood', eyes: 0xa040ff, opacity: 0.75 },
  boss_earth: { suit: 0x5a4a3a, suit2: 0x3a3028, skin: 0x6a5a48, accent: 0x80ff60, accentGlow: 2, metal: 0.1, rough: 1, head: 'horns', shoulderPads: true, eyes: 0x80ff60, bulk: 1.5 },
  boss_demon: { suit: 0x2a0808, suit2: 0x100404, skin: 0x8a1010, accent: 0xff4010, accentGlow: 3, metal: 0.4, rough: 0.5, head: 'horns', cape: 0x200000, eyes: 0xffc020, bulk: 1.3 },
  boss_ancient: { suit: 0xb09058, suit2: 0x6a5838, skin: 0xc0a068, accent: 0x40e0ff, accentGlow: 3, metal: 0.7, rough: 0.35, head: 'crown', shoulderPads: true, eyes: 0x40e0ff, bulk: 1.25 },
  boss_ice: { suit: 0x90d0f0, suit2: 0x3a6a90, skin: 0xc0ecff, accent: 0xffffff, accentGlow: 2.5, metal: 0.5, rough: 0.12, head: 'horns', shoulderPads: true, eyes: 0x80f0ff, bulk: 1.4 },
  boss_fire: { suit: 0x1a0c08, suit2: 0x301008, skin: 0x301410, accent: 0xff5010, accentGlow: 5, metal: 0.2, rough: 0.9, head: 'horns', eyes: 0xffd040, bulk: 1.45 },
  boss_shadow: { suit: 0x06040a, suit2: 0x0c0614, skin: 0x0a0610, accent: 0x9030ff, accentGlow: 5, metal: 0.1, rough: 0.5, head: 'hood', cape: 0x08040c, eyes: 0xd080ff, opacity: 0.85, limbScale: 1.2 },
  boss_100th: { suit: 0x1a1a22, suit2: 0xc8a030, skin: 0x303038, accent: 0xffd040, accentGlow: 4, metal: 0.9, rough: 0.2, head: 'crown', cape: 0x6a0a20, shoulderPads: true, eyes: 0xffe060, bulk: 1.2 },
};
