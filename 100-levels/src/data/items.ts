export type Rarity = 'common' | 'rare' | 'epic' | 'legendary' | 'mythic';
export type ItemCategory = 'skin' | 'weapon' | 'effect' | 'object';
export type EffectSlot = 'aura' | 'trail' | 'jump' | 'attack';

export interface ItemDef {
  id: string;
  name: string;
  category: ItemCategory;
  slot?: EffectSlot;
  rarity: Rarity;
  /** Shop price. 0 = not sold (default, chest-only or reward). */
  price: number;
  desc: string;
  icon: string;
  color: string;
  /** Source text for items that cannot be purchased. */
  source?: string;
}

export const RARITY_COLOR: Record<Rarity, string> = {
  common: '#b8c2d6',
  rare: '#3da5ff',
  epic: '#b14dff',
  legendary: '#ffb627',
  mythic: '#ff2d6f',
};
export const RARITY_ORDER: Rarity[] = ['common', 'rare', 'epic', 'legendary', 'mythic'];

export const ITEMS: ItemDef[] = [
  // ── SKINS
  { id: 'skin_runner', name: 'Runner', category: 'skin', rarity: 'common', price: 0, desc: 'Standard issue suit.', icon: '🧍', color: '#3aa0ff', source: 'Default' },
  { id: 'skin_knight', name: 'Knight', category: 'skin', rarity: 'rare', price: 600, desc: 'Polished plate armour and a crested helm.', icon: '🛡️', color: '#c9d2e0' },
  { id: 'skin_ninja', name: 'Ninja', category: 'skin', rarity: 'rare', price: 700, desc: 'Silent cloth, masked face, flowing scarf.', icon: '🥷', color: '#2b2b35' },
  { id: 'skin_explorer', name: 'Explorer', category: 'skin', rarity: 'rare', price: 650, desc: 'Wide hat, backpack and field gear.', icon: '🤠', color: '#b8834a' },
  { id: 'skin_robot', name: 'Robot', category: 'skin', rarity: 'epic', price: 1200, desc: 'Chrome chassis with glowing optics.', icon: '🤖', color: '#9fb4c8' },
  { id: 'skin_cyber', name: 'Cyber', category: 'skin', rarity: 'epic', price: 1500, desc: 'Neon-lined tactical suit.', icon: '💠', color: '#00f0ff' },
  { id: 'skin_shadow', name: 'Shadow', category: 'skin', rarity: 'legendary', price: 2500, desc: 'Woven from the darkness itself.', icon: '🌑', color: '#8a3dff' },
  { id: 'skin_frost', name: 'Frost', category: 'skin', rarity: 'rare', price: 0, desc: 'Crystalline armour.', icon: '❄️', color: '#9be8ff', source: 'Chests' },
  { id: 'skin_magma', name: 'Magma', category: 'skin', rarity: 'epic', price: 0, desc: 'Cracked obsidian with molten veins.', icon: '🌋', color: '#ff5a1f', source: 'Chests' },
  { id: 'skin_golden', name: 'Golden', category: 'skin', rarity: 'legendary', price: 0, desc: 'Solid gold. Obviously.', icon: '👑', color: '#ffcf3d', source: 'Legendary chests' },
  { id: 'skin_phantom', name: 'Phantom', category: 'skin', rarity: 'mythic', price: 0, desc: 'A spectral body of starlight.', icon: '👻', color: '#ff2d6f', source: 'Mythic chests' },
  { id: 'skin_retro', name: 'Retro', category: 'skin', rarity: 'epic', price: 0, desc: 'Straight from 1985.', icon: '👾', color: '#39ff14', source: 'Secret 01 — Classic Mode' },
  { id: 'skin_champion', name: 'The Champion', category: 'skin', rarity: 'mythic', price: 0, desc: 'Worn by those who finished 100 levels.', icon: '🏆', color: '#ffe066', source: 'Complete Level 100' },

  // ── WEAPONS
  { id: 'wpn_sword', name: 'Sword', category: 'weapon', rarity: 'common', price: 0, desc: 'Balanced blade. Ability: Whirlwind.', icon: '🗡️', color: '#d0d8e6', source: 'Default' },
  { id: 'wpn_katana', name: 'Katana', category: 'weapon', rarity: 'rare', price: 900, desc: 'Fast, long reach. Ability: Iaido dash.', icon: '⚔️', color: '#ff4d6d' },
  { id: 'wpn_axe', name: 'Axe', category: 'weapon', rarity: 'rare', price: 800, desc: 'Slow, brutal. Ability: Earthsplitter.', icon: '🪓', color: '#b0703a' },
  { id: 'wpn_daggers', name: 'Daggers', category: 'weapon', rarity: 'epic', price: 1300, desc: 'Twin blades, lightning combos. Ability: Flurry.', icon: '🔪', color: '#7cffc4' },
  { id: 'wpn_bow', name: 'Hunter Bow', category: 'weapon', rarity: 'rare', price: 0, desc: 'Ranged. Hold right-click to aim. Ability: Volley.', icon: '🏹', color: '#c89b5a', source: 'Level 24' },
  { id: 'wpn_staff', name: 'Storm Staff', category: 'weapon', rarity: 'epic', price: 0, desc: 'Casts bolts. Ability: Chain Lightning.', icon: '🪄', color: '#7a9bff', source: 'Level 27' },
  { id: 'wpn_flame', name: 'Flame Blade', category: 'weapon', rarity: 'legendary', price: 0, desc: 'Burning sword. Ability: Inferno.', icon: '🔥', color: '#ff7a1f', source: 'Legendary chests' },
  { id: 'wpn_void', name: 'Void Edge', category: 'weapon', rarity: 'mythic', price: 0, desc: 'Cuts through reality. Ability: Rift.', icon: '🌌', color: '#b14dff', source: 'Mythic chests' },

  // ── EFFECTS
  { id: 'fx_aura_azure', name: 'Azure Aura', category: 'effect', slot: 'aura', rarity: 'rare', price: 500, desc: 'A calm blue glow.', icon: '🔵', color: '#3da5ff' },
  { id: 'fx_aura_inferno', name: 'Inferno Aura', category: 'effect', slot: 'aura', rarity: 'epic', price: 1100, desc: 'Flames rise around you.', icon: '🔥', color: '#ff6a1f' },
  { id: 'fx_aura_void', name: 'Void Aura', category: 'effect', slot: 'aura', rarity: 'legendary', price: 0, desc: 'Particles of the abyss.', icon: '🟣', color: '#a13dff', source: 'Chests' },
  { id: 'fx_trail_cyan', name: 'Neon Trail', category: 'effect', slot: 'trail', rarity: 'common', price: 300, desc: 'A neon ribbon follows you.', icon: '〰️', color: '#00f0ff' },
  { id: 'fx_trail_fire', name: 'Blaze Trail', category: 'effect', slot: 'trail', rarity: 'rare', price: 700, desc: 'Leave fire in your wake.', icon: '☄️', color: '#ff7a1f' },
  { id: 'fx_trail_rainbow', name: 'Prism Trail', category: 'effect', slot: 'trail', rarity: 'legendary', price: 0, desc: 'All the colours.', icon: '🌈', color: '#ff4dd2', source: 'Chests' },
  { id: 'fx_jump_spark', name: 'Spark Jump', category: 'effect', slot: 'jump', rarity: 'common', price: 250, desc: 'Sparks burst when you jump.', icon: '✨', color: '#ffe066' },
  { id: 'fx_jump_ring', name: 'Shock Ring', category: 'effect', slot: 'jump', rarity: 'rare', price: 600, desc: 'A ring of energy on every jump.', icon: '⭕', color: '#3dffa2' },
  { id: 'fx_jump_flame', name: 'Rocket Jump', category: 'effect', slot: 'jump', rarity: 'epic', price: 0, desc: 'Flames on takeoff.', icon: '🚀', color: '#ff5a1f', source: 'Chests' },
  { id: 'fx_atk_fire', name: 'Fire Slash', category: 'effect', slot: 'attack', rarity: 'rare', price: 650, desc: 'Attacks leave fire arcs.', icon: '🔥', color: '#ff6a1f' },
  { id: 'fx_atk_ice', name: 'Ice Slash', category: 'effect', slot: 'attack', rarity: 'rare', price: 650, desc: 'Attacks shatter frost.', icon: '🧊', color: '#9be8ff' },
  { id: 'fx_atk_volt', name: 'Volt Slash', category: 'effect', slot: 'attack', rarity: 'epic', price: 1000, desc: 'Attacks crackle with lightning.', icon: '⚡', color: '#ffe93d' },

  // ── OBJECTS
  { id: 'obj_potion', name: 'Health Potion', category: 'object', rarity: 'common', price: 120, desc: 'Press R in a level to restore 50 HP.', icon: '🧪', color: '#ff4d6d' },
  { id: 'obj_revive', name: 'Phoenix Feather', category: 'object', rarity: 'epic', price: 600, desc: 'Automatically revives you once per level.', icon: '🪶', color: '#ffb627' },
];

export const itemById = (id: string) => ITEMS.find((i) => i.id === id);

export const DEFAULT_OWNED = ['skin_runner', 'wpn_sword'];

export const CONSUMABLES = ['obj_potion', 'obj_revive'];

export interface ChestDef {
  rarity: Rarity;
  name: string;
  price: number;
  coins: [number, number];
  /** Probability weights for item rarity drops. */
  itemChance: number;
  pool: Rarity[];
}

export const CHESTS: Record<Rarity, ChestDef> = {
  common: { rarity: 'common', name: 'Common Chest', price: 150, coins: [40, 120], itemChance: 0.35, pool: ['common', 'rare'] },
  rare: { rarity: 'rare', name: 'Rare Chest', price: 400, coins: [120, 300], itemChance: 0.55, pool: ['common', 'rare', 'epic'] },
  epic: { rarity: 'epic', name: 'Epic Chest', price: 900, coins: [250, 600], itemChance: 0.7, pool: ['rare', 'epic', 'legendary'] },
  legendary: { rarity: 'legendary', name: 'Legendary Chest', price: 2000, coins: [500, 1200], itemChance: 0.85, pool: ['epic', 'legendary', 'mythic'] },
  mythic: { rarity: 'mythic', name: 'Mythic Chest', price: 0, coins: [1200, 2500], itemChance: 1, pool: ['legendary', 'mythic'] },
};
