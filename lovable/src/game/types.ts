/** Tipos del juego. Nada aquí depende de React ni del DOM. */

export type MaterialId = string;
export type MobId = string;
export type Rarity = "common" | "uncommon" | "rare" | "epic";

export interface Material {
  name: string;
  /** [color base, color de las motas] con los que se dibuja el bloque. */
  colors: [string, string];
  /** Corazones que cura al comerlo. Si falta, no es comida. */
  food?: number;
  /** Marca los objetos de misión (marco de portal, ojo de ender): no se pueden colocar. */
  quest?: boolean;
}

export interface Phase {
  id: string;
  name: string;
  /** Bloques picados necesarios para entrar en esta fase. */
  at: number;
  /** Degradado del cielo, de arriba abajo. */
  sky: [string, string];
  /** Color de la fase: barra, halo y partículas. */
  accent: string;
  /** Pares [material, peso]. El peso es probabilidad relativa, no porcentaje. */
  blocks: Array<[MaterialId, number]>;
  mobs: MobId[];
  loot: Record<Rarity, MaterialId[]>;
}

export interface MobDef {
  name: string;
  hp: number;
  /** Daño por embestida, en medios corazones. */
  dmg: number;
  colors: [string, string];
  peaceful?: boolean;
  drop?: MaterialId;
  /** Explota al golpearte y desaparece, como el creeper. */
  explodes?: boolean;
}

export interface Mob {
  kind: MobId;
  x: number;
  hp: number;
  cooldown: number;
  flash: number;
}

export interface Tool {
  name: string;
  /** Multiplicador de velocidad de picado (pico) o daño por golpe (espada). */
  power: number;
  cost: Record<MaterialId, number> | null;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
}

export interface Dragon {
  hp: number;
  max: number;
  cooldown: number;
  screenX: number;
  screenY: number;
}

/** Lo que el motor manda a la interfaz: la UI decide cómo enseñarlo. */
export type GameEvent =
  | { type: "toast"; text: string }
  | { type: "banner"; title: string; subtitle: string }
  | { type: "sound"; sound: SoundName }
  | { type: "phase"; phase: Phase };

export type SoundName =
  | "mine" | "break" | "chest" | "chestRare" | "hit" | "hurt"
  | "place" | "eat" | "upgrade" | "phase" | "die" | "win" | "dragon";

export interface GameState {
  blocks: number;
  phase: number;
  hp: number;
  maxHp: number;
  inventory: Record<MaterialId, number>;
  selected: MaterialId | null;
  pick: number;
  sword: number;
  /** Posición -> material del suelo. La posición 0 es el OneBlock. */
  platform: Record<number, MaterialId>;
  /** Casilla del jugador y su posición interpolada, para que el movimiento no sea a saltos. */
  x: number;
  drawX: number;
  dir: 1 | -1;
  /** Progreso de picado, de 0 a 1. */
  mining: number;
  mobs: Mob[];
  particles: Particle[];
  /** Material que muestra ahora mismo el OneBlock. */
  block: MaterialId;
  blockIsChest: boolean;
  blockIsSpecial: boolean;
  portalBuilt: boolean;
  dragon: Dragon | null;
  won: boolean;
  /** Frames de invulnerabilidad tras morir. */
  respawning: number;
  falling: number;
  sound: boolean;
  time: number;
}
