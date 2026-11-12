/**
 * Ready-made matches. The client and a future server call these instead of assembling rules,
 * maps, participants and bots by hand, so every mode is set up the same way everywhere.
 */
import { makeRng } from '../rng.js';
import { buildFiringRange } from '../maps/firingRange.js';
import { buildQuarryArena } from '../maps/quarryArena.js';
import { buildTrainingGrounds } from '../maps/trainingGrounds.js';
import type { BotDifficulty } from './bot.js';
import type { MapDefinition } from './map.js';
import { hash32 } from './random.js';
import { FIRING_RANGE_RULES, SKIRMISH_RULES, TRAINING_COURSE_RULES, type LoadoutEntry } from './rules.js';
import { Simulation } from './simulation.js';
import { getWeaponDef, type AmmoType } from './weapons.js';

/** Id of the human player in a locally hosted match. */
export const LOCAL_PLAYER_ID = 'local';

export const SKIRMISH_BOT_COUNTS: readonly number[] = [3, 5, 7, 11];
export const SKIRMISH_DEFAULT_BOTS = 5;

/**
 * Call signs for practice bots. They are always shown with a BOT tag: a bot is never presented
 * as a person.
 */
export const BOT_CALLSIGNS: readonly string[] = [
  'Kestrel',
  'Onix',
  'Vega',
  'Rayo',
  'Nube',
  'Tizon',
  'Lince',
  'Eco',
  'Brasa',
  'Musgo',
  'Cierzo',
  'Opalo',
  'Nogal',
  'Zarza',
  'Faro',
  'Garua',
];

export interface MatchSetup {
  sim: Simulation;
  localId: string;
}

export interface CourseOptions {
  matchId: string;
  alias: string;
  map?: MapDefinition;
}

export function createTrainingCourse(options: CourseOptions): MatchSetup {
  const sim = new Simulation({ matchId: options.matchId, map: options.map ?? buildTrainingGrounds(), rules: TRAINING_COURSE_RULES });
  sim.addPlayer({ id: LOCAL_PLAYER_ID, name: options.alias });
  return { sim, localId: LOCAL_PLAYER_ID };
}

export interface RangeOptions {
  matchId: string;
  alias: string;
  seed?: number;
  map?: MapDefinition;
}

/** Free practice: the player plus one dummy on every `target` / `pacer` spawn of the map. */
export function createFiringRange(options: RangeOptions): MatchSetup {
  const map = options.map ?? buildFiringRange();
  const sim = new Simulation({
    matchId: options.matchId,
    map,
    rules: FIRING_RANGE_RULES,
    ...(options.seed !== undefined ? { seed: options.seed } : {}),
  });
  const playerSpawn = Math.max(0, map.spawns.findIndex((spawn) => spawn.role === 'player'));
  sim.addPlayer({ id: LOCAL_PLAYER_ID, name: options.alias, spawnIndex: playerSpawn, teamId: 0 });
  let number = 1;
  map.spawns.forEach((spawn, index) => {
    if (spawn.role !== 'target' && spawn.role !== 'pacer') return;
    sim.addPlayer({
      id: `dummy-${number}`,
      name: `Dummy ${number}`,
      isBot: true,
      // All dummies share a team: they are targets for the player, not for each other.
      teamId: 1,
      spawnIndex: index,
      contender: false,
      loadout: [],
      health: { start: 100, max: 100 },
      shield: { start: 50, max: 50 },
      bot: { behavior: spawn.role === 'pacer' ? 'pacer' : 'dummy' },
    });
    number++;
  });
  return { sim, localId: LOCAL_PLAYER_ID };
}

export interface SkirmishOptions {
  matchId: string;
  alias: string;
  seed: number;
  bots: number;
  difficulty: BotDifficulty;
  map?: MapDefinition;
}

interface BotKit {
  loadout: LoadoutEntry[];
  ammo: Partial<Record<AmmoType, number>>;
}

/** What a practice bot carries: one weapon picked by the match seed, ammunition and first aid. */
export function botKit(rng: () => number, difficulty: BotDifficulty): BotKit {
  const roll = rng();
  const weaponId =
    roll < 0.34 ? 'starter_ar' : roll < 0.58 ? 'starter_smg' : roll < 0.76 ? 'starter_shotgun' : roll < 0.93 ? 'starter_pistol' : 'starter_sniper';
  const def = getWeaponDef(weaponId)!;
  const loadout: LoadoutEntry[] = [{ weaponId }];
  const ammo: Partial<Record<AmmoType, number>> = { [def.ammoType]: def.magazine * 3 };
  // Everyone but pistol carriers has a pistol as a fallback.
  if (weaponId !== 'starter_pistol') {
    loadout.push({ weaponId: 'starter_pistol' });
    ammo.light = (ammo.light ?? 0) + 24;
  }
  loadout.push({ itemId: 'bandage', count: 2 });
  if (difficulty !== 'easy') loadout.push({ itemId: 'shield_cell', count: 1 });
  return { loadout, ammo };
}

/**
 * Free-for-all: the player and `bots` practice bots, each on their own team and spawn point.
 * The same seed always produces the same spawn order, bot kits and bot decisions.
 */
export function createSkirmish(options: SkirmishOptions): MatchSetup {
  const map = options.map ?? buildQuarryArena();
  const maxBots = Math.min(map.spawns.length - 1, BOT_CALLSIGNS.length);
  if (!Number.isInteger(options.bots) || options.bots < 1 || options.bots > maxBots) {
    throw new Error(`a skirmish on "${map.id}" takes 1 to ${maxBots} bots`);
  }
  const sim = new Simulation({ matchId: options.matchId, map, rules: SKIRMISH_RULES, seed: options.seed });

  // Seeded shuffle of the spawn points and the call signs.
  const rng = makeRng(hash32(options.seed, 0x5eed));
  const shuffle = (length: number): number[] => {
    const order = Array.from({ length }, (_, i) => i);
    for (let i = length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const tmp = order[i]!;
      order[i] = order[j]!;
      order[j] = tmp;
    }
    return order;
  };
  const spawnOrder = shuffle(map.spawns.length);
  const nameOrder = shuffle(BOT_CALLSIGNS.length);

  sim.addPlayer({ id: LOCAL_PLAYER_ID, name: options.alias, spawnIndex: spawnOrder[0]!, teamId: 0 });
  for (let i = 0; i < options.bots; i++) {
    const kit = botKit(rng, options.difficulty);
    sim.addPlayer({
      id: `bot-${i + 1}`,
      name: BOT_CALLSIGNS[nameOrder[i]!]!,
      isBot: true,
      teamId: i + 1,
      spawnIndex: spawnOrder[i + 1]!,
      loadout: kit.loadout,
      startingAmmo: kit.ammo,
      bot: { behavior: 'fighter', difficulty: options.difficulty },
    });
  }
  return { sim, localId: LOCAL_PLAYER_ID };
}
