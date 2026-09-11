/**
 * Motor del juego: funciones puras sobre el estado. No dibuja, no toca el DOM y no
 * sabe nada de React, así que se puede probar con tests sin montar nada.
 *
 * Las acciones devuelven eventos ({@link GameEvent}) y es la interfaz quien decide
 * si los enseña como aviso, como cartel o como sonido.
 */
import {
  CHANCES, INFINITE_AT, LAP, MATERIALS, MOBS, PHASES, PICKS, PORTAL_COST, RARITY_WEIGHTS, SWORDS,
} from "./data";
import type { GameEvent, GameState, MaterialId, Mob, Phase, Rarity } from "./types";

const randomOf = <T,>(list: T[]): T => list[Math.floor(Math.random() * list.length)];

function weighted(pairs: Array<[MaterialId, number]>): MaterialId {
  const total = pairs.reduce((sum, [, w]) => sum + w, 0);
  let roll = Math.random() * total;
  for (const [id, w] of pairs) {
    roll -= w;
    if (roll < 0) return id;
  }
  return pairs[0][0];
}

export function createGame(): GameState {
  const state: GameState = {
    blocks: 0, phase: 0, hp: 10, maxHp: 10,
    inventory: {}, selected: null, pick: 0, sword: 0,
    platform: { 0: "grass" },
    x: 0, drawX: 0, dir: 1,
    mining: 0, mobs: [], particles: [],
    block: "grass", blockIsChest: false, blockIsSpecial: false,
    portalBuilt: false, dragon: null, won: false,
    respawning: 0, falling: 0, sound: true, time: 0,
  };
  rollBlock(state);
  return state;
}

/* ------------------------------------------------------------------ consultas */

export const phaseOf = (state: GameState): Phase => PHASES[Math.min(state.phase, PHASES.length - 1)];
export const isInfinite = (state: GameState): boolean => state.blocks >= INFINITE_AT;

export function phaseIndexFor(blocks: number): number {
  let index = 0;
  PHASES.forEach((p, i) => {
    if (blocks >= p.at) index = i;
  });
  return index;
}

/** Progreso dentro de la fase actual, de 0 a 1, y cuántos bloques faltan. */
export function progressOf(state: GameState): { ratio: number; left: number; nextName: string } {
  if (isInfinite(state)) {
    const done = (state.blocks - INFINITE_AT) % LAP;
    const lap = Math.floor((state.blocks - INFINITE_AT) / LAP) + 2;
    return { ratio: done / LAP, left: LAP - done, nextName: `vuelta ${lap}` };
  }
  const current = phaseOf(state);
  const next = PHASES[state.phase + 1];
  const to = next ? next.at : INFINITE_AT;
  const span = to - current.at;
  return {
    ratio: span <= 0 ? 1 : (state.blocks - current.at) / span,
    left: to - state.blocks,
    nextName: next ? next.name : "la Fase Infinita",
  };
}

export const canBuildPortal = (state: GameState): boolean =>
  Object.entries(PORTAL_COST).every(([id, n]) => (state.inventory[id] ?? 0) >= n);

export const canAfford = (state: GameState, cost: Record<MaterialId, number> | null): boolean =>
  !!cost && Object.entries(cost).every(([id, n]) => (state.inventory[id] ?? 0) >= n);

/* ------------------------------------------------------------------ inventario */

export function give(state: GameState, id: MaterialId, amount = 1): void {
  state.inventory[id] = (state.inventory[id] ?? 0) + amount;
  if (!state.selected) state.selected = id;
}

export function take(state: GameState, id: MaterialId, amount: number): boolean {
  if ((state.inventory[id] ?? 0) < amount) return false;
  state.inventory[id] -= amount;
  if (state.inventory[id] <= 0) {
    delete state.inventory[id];
    if (state.selected === id) state.selected = Object.keys(state.inventory)[0] ?? null;
  }
  return true;
}

/* ------------------------------------------------------------------ el bloque */

/** Decide en qué se convierte el OneBlock tras romperse. */
export function rollBlock(state: GameState): void {
  state.blockIsChest = false;
  state.blockIsSpecial = false;
  const roll = Math.random() * 100;

  if (roll < CHANCES.special) {
    state.blockIsSpecial = true;
    state.block = "lantern";
    return;
  }
  if (roll < CHANCES.special + CHANCES.chest) {
    state.blockIsChest = true;
    state.block = "oak";
    return;
  }
  if (roll < CHANCES.special + CHANCES.chest + CHANCES.mob) {
    spawnMob(state, randomOf(phaseOf(state).mobs));
  }
  // Un poco de cada fase anterior, para que nunca falten los básicos.
  if (!isInfinite(state) && state.phase > 0 && Math.random() * 100 < CHANCES.legacy) {
    state.block = weighted(PHASES[Math.floor(Math.random() * state.phase)].blocks);
    return;
  }
  const source = isInfinite(state) ? randomOf(PHASES) : phaseOf(state);
  state.block = weighted(source.blocks);
}

export function spawnMob(state: GameState, kind: string): void {
  const side = Math.random() < 0.5 ? -1 : 1;
  const x = state.platform[state.x + side * 3] ? state.x + side * 3 : 0;
  state.mobs.push({ kind, x, hp: MOBS[kind].hp, cooldown: 0, flash: 0 });
}

function rollRarity(): Rarity {
  const roll = Math.random() * 100;
  if (roll < RARITY_WEIGHTS.common) return "common";
  if (roll < RARITY_WEIGHTS.common + RARITY_WEIGHTS.uncommon) return "uncommon";
  if (roll < RARITY_WEIGHTS.common + RARITY_WEIGHTS.uncommon + RARITY_WEIGHTS.rare) return "rare";
  return "epic";
}

const RARITY_NAMES: Record<Rarity, string> = {
  common: "común", uncommon: "poco común", rare: "raro", epic: "épico",
};

function openChest(state: GameState): GameEvent[] {
  const rarity = rollRarity();
  const table = phaseOf(state).loot[rarity];
  const drops: Record<MaterialId, number> = {};
  const rolls = rarity === "epic" ? 3 : rarity === "rare" ? 2 : 1 + Math.floor(Math.random() * 2);
  for (let i = 0; i < rolls; i++) {
    const id = randomOf(table);
    const amount = 1 + Math.floor(Math.random() * (rarity === "epic" ? 3 : 2));
    give(state, id, amount);
    drops[id] = (drops[id] ?? 0) + amount;
  }
  const detail = Object.entries(drops).map(([id, n]) => `${MATERIALS[id].name} x${n}`).join(", ");
  return [
    { type: "toast", text: `Cofre ${RARITY_NAMES[rarity]}: ${detail}` },
    { type: "sound", sound: rarity === "rare" || rarity === "epic" ? "chestRare" : "chest" },
  ];
}

/** Rompe el bloque: reparte el botín, sube de fase si toca y vuelve a tirar los dados. */
export function breakBlock(state: GameState): GameEvent[] {
  const events: GameEvent[] = [{ type: "sound", sound: "break" }];

  if (state.blockIsChest) {
    events.push(...openChest(state));
  } else if (state.blockIsSpecial) {
    const loot = phaseOf(state).loot;
    [...loot.epic, ...loot.rare].forEach((id) => give(state, id, 1 + Math.floor(Math.random() * 2)));
    events.push({ type: "toast", text: "¡Bloque especial! Botín extra" }, { type: "sound", sound: "chestRare" });
  } else {
    give(state, state.block, 1);
  }

  state.blocks += 1;
  const next = phaseIndexFor(state.blocks);
  if (!isInfinite(state) && next !== state.phase) {
    state.phase = next;
    events.push(...enterPhase(state));
  } else if (state.blocks === INFINITE_AT) {
    events.push({ type: "banner", title: "FASE INFINITA", subtitle: "El bloque ya no se agota" });
  }

  rollBlock(state);
  return events;
}

function enterPhase(state: GameState): GameEvent[] {
  const phase = phaseOf(state);
  // La oleada de bienvenida: la fase nueva no llega sola.
  for (let i = 0; i < 3; i++) spawnMob(state, randomOf(phase.mobs));
  return [
    { type: "banner", title: phase.name.toUpperCase(), subtitle: `Fase ${state.phase + 1} de ${PHASES.length}` },
    { type: "toast", text: "¡Oleada de bienvenida!" },
    { type: "sound", sound: "phase" },
    { type: "phase", phase },
  ];
}

/* ------------------------------------------------------------------ acciones */

export function move(state: GameState, dir: 1 | -1): void {
  if (state.respawning > 0) return;
  state.dir = dir;
  const target = state.x + dir;
  if (Math.abs(target) <= 14) state.x = target;
}

export function place(state: GameState): GameEvent[] {
  const id = state.selected;
  if (!id || MATERIALS[id]?.quest || MATERIALS[id]?.food) return [];
  const target = state.x + state.dir;
  if (state.platform[target]) return [];
  if (!take(state, id, 1)) return [];
  state.platform[target] = id;
  return [{ type: "sound", sound: "place" }];
}

export function hit(state: GameState): GameEvent[] {
  const damage = SWORDS[state.sword].power;
  let closest: Mob | null = null;
  let best = Infinity;
  state.mobs.forEach((mob) => {
    const distance = Math.abs(mob.x - state.x);
    if (distance < best && distance <= 1.6) {
      best = distance;
      closest = mob;
    }
  });

  if (!closest && state.dragon) {
    state.dragon.hp -= damage;
    if (state.dragon.hp <= 0) return win(state);
    return [{ type: "sound", sound: "hit" }];
  }
  if (!closest) return [];

  const target = closest as Mob;
  target.hp -= damage;
  target.flash = 6;
  if (target.hp <= 0) {
    const def = MOBS[target.kind];
    if (def.drop) give(state, def.drop, 1);
    state.mobs = state.mobs.filter((m) => m !== target);
  }
  return [{ type: "sound", sound: "hit" }];
}

export function eat(state: GameState): GameEvent[] {
  const id = state.selected;
  if (!id) return [];
  const food = MATERIALS[id]?.food;
  if (!food) return [];
  if (state.hp >= state.maxHp) return [{ type: "toast", text: "Ya estás al máximo" }];
  take(state, id, 1);
  state.hp = Math.min(state.maxHp, state.hp + food);
  return [{ type: "sound", sound: "eat" }];
}

export function upgrade(state: GameState, kind: "pick" | "sword"): GameEvent[] {
  const list = kind === "pick" ? PICKS : SWORDS;
  const index = kind === "pick" ? state.pick : state.sword;
  const next = list[index + 1];
  if (!next || !canAfford(state, next.cost)) return [];
  Object.entries(next.cost ?? {}).forEach(([id, n]) => take(state, id, n));
  if (kind === "pick") state.pick += 1;
  else state.sword += 1;
  return [{ type: "toast", text: `Ahora llevas ${next.name}` }, { type: "sound", sound: "upgrade" }];
}

export function buildPortal(state: GameState): GameEvent[] {
  if (!canBuildPortal(state)) return [];
  Object.entries(PORTAL_COST).forEach(([id, n]) => take(state, id, n));
  state.portalBuilt = true;
  return [{ type: "banner", title: "PORTAL ABIERTO", subtitle: "Entra y acaba con el Dragón" }];
}

export function enterPortal(state: GameState): GameEvent[] {
  state.dragon = { hp: 120, max: 120, cooldown: 0, screenX: 0, screenY: 0 };
  return [
    { type: "banner", title: "EL DRAGÓN DEL END", subtitle: "Pégale hasta tumbarlo" },
    { type: "sound", sound: "dragon" },
  ];
}

function win(state: GameState): GameEvent[] {
  state.dragon = null;
  state.won = true;
  return [
    { type: "banner", title: "¡DRAGÓN DERROTADO!", subtitle: "Has terminado el OneBlock" },
    { type: "sound", sound: "win" },
  ];
}

export function damage(state: GameState, amount: number): GameEvent[] {
  if (state.respawning > 0) return [];
  state.hp -= amount;
  if (state.hp <= 0) return die(state);
  return [{ type: "sound", sound: "hurt" }];
}

/** Al morir se pierde una cuarta parte de cada montón: el castigo del vacío. */
export function die(state: GameState): GameEvent[] {
  state.respawning = 90;
  state.hp = state.maxHp;
  Object.keys(state.inventory).forEach((id) => {
    const lost = Math.ceil(state.inventory[id] * 0.25);
    state.inventory[id] -= lost;
    if (state.inventory[id] <= 0) delete state.inventory[id];
  });
  state.selected = Object.keys(state.inventory)[0] ?? null;
  state.mobs = [];
  state.x = 0;
  state.drawX = 0;
  state.falling = 0;
  return [
    { type: "banner", title: "HAS MUERTO", subtitle: "Pierdes una cuarta parte del inventario" },
    { type: "sound", sound: "die" },
  ];
}

/* ------------------------------------------------------------------ tick */

/**
 * Un paso de simulación. `dt` va en frames de 60 Hz (1 = un frame), para que el
 * juego corra igual en una pantalla de 60 Hz que en una de 144.
 */
export function update(state: GameState, dt: number, mining: boolean): GameEvent[] {
  const events: GameEvent[] = [];
  state.time += dt;
  if (state.respawning > 0) state.respawning -= dt;

  state.drawX += (state.x - state.drawX) * 0.22 * dt;

  // Caer al vacío
  if (!state.platform[state.x] && state.respawning <= 0) {
    state.falling += dt * 0.5;
    if (state.falling > 6) {
      state.falling = 0;
      events.push(...die(state));
    }
  } else {
    state.falling = 0;
  }

  // Picar: solo desde el propio bloque o desde el borde de al lado
  if (mining && state.respawning <= 0 && Math.abs(state.x) <= 1) {
    state.mining += dt * 0.016 * PICKS[state.pick].power;
    if (state.mining >= 1) {
      state.mining = 0;
      events.push(...breakBlock(state));
    }
  } else if (state.mining > 0) {
    state.mining = Math.max(0, state.mining - dt * 0.02);
  }

  // Mobs
  state.mobs.forEach((mob) => {
    const def = MOBS[mob.kind];
    if (mob.flash > 0) mob.flash -= dt;
    if (def.peaceful) return;
    const dir = Math.sign(state.x - mob.x);
    if (Math.abs(mob.x - state.x) > 0.9) {
      mob.x += dir * 0.012 * dt;
      return;
    }
    mob.cooldown -= dt;
    if (mob.cooldown <= 0) {
      mob.cooldown = 60;
      events.push(...damage(state, def.dmg));
      if (def.explodes) state.mobs = state.mobs.filter((m) => m !== mob);
    }
  });
  if (state.mobs.length > 8) state.mobs.splice(0, state.mobs.length - 8);

  // Dragón
  if (state.dragon) {
    state.dragon.cooldown -= dt;
    if (state.dragon.cooldown <= 0) {
      state.dragon.cooldown = 150;
      events.push(...damage(state, 4), { type: "toast", text: "El dragón te embiste" });
    }
  }

  return events;
}
