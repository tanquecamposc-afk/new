/** Shared fixtures for combat, loot and bot tests. */
import {
  DEFAULT_CAMERA,
  FIRING_RANGE_RULES,
  Simulation,
  computeCameraRig,
  eyeHeight,
  makeCameraRig,
  neutralInput,
  yawToward,
  type InputFrame,
  type LootSpawnDef,
  type MapDefinition,
  type MatchEvent,
  type MatchRules,
  type PlayerInit,
  type SimPlayer,
  type SpawnPoint,
  type StaticDef,
  type TerrainData,
} from '../../src/core/index.js';

export interface FlatMapOptions {
  half?: number;
  statics?: StaticDef[];
  spawns?: SpawnPoint[];
  loot?: LootSpawnDef[];
}

/** A flat square map at height 0 with solid bounds. */
export function flatMap(options: FlatMapOptions = {}): MapDefinition {
  const half = options.half ?? 60;
  const cell = 4;
  const cols = (half * 2) / cell;
  const terrain: TerrainData = {
    originX: -half,
    originZ: -half,
    cellSize: cell,
    cols,
    rows: cols,
    heights: new Float32Array((cols + 1) * (cols + 1)),
    surface: new Uint8Array((cols + 1) * (cols + 1)),
  };
  return {
    schemaVersion: 1,
    id: 'test_flat',
    nameKey: 'map.test',
    bounds: { minX: -half, maxX: half, minZ: -half, maxZ: half },
    solidBounds: true,
    killY: -50,
    terrain,
    statics: options.statics ?? [],
    props: [],
    spawns: options.spawns ?? [
      { x: 0, y: 0, z: 0, yaw: 0 },
      { x: 0, y: 0, z: -10, yaw: Math.PI },
    ],
    checkpoints: [],
    labels: [],
    markings: [],
    loot: options.loot ?? [],
  };
}

/** Combat rules without a countdown, respawns or surprises; override what a test needs. */
export function combatRules(overrides: Partial<MatchRules> = {}): MatchRules {
  return {
    ...FIRING_RANGE_RULES,
    modeId: 'test_combat',
    respawn: 'none',
    respawnDelayTicks: 0,
    lootRespawnTicks: 0,
    health: { start: 100, max: 100 },
    shield: { start: 0, max: 100 },
    loadout: [{ weaponId: 'starter_ar' }],
    startingAmmo: { light: 100, medium: 100, shells: 100, heavy: 100 },
    ...overrides,
  };
}

export interface Arena {
  sim: Simulation;
  events: MatchEvent[];
  /** Inputs applied on the next steps, per player id. Missing = neutral (keeps looking). */
  inputs: Map<string, InputFrame>;
  /** Steps the simulation and collects its events. */
  step(ticks?: number): void;
  input(id: string): InputFrame;
  player(id: string): SimPlayer;
  eventsOf(type: string): MatchEvent[];
}

export function makeArena(map: MapDefinition, rules: MatchRules, players: PlayerInit[], seed = 1234): Arena {
  const sim = new Simulation({ matchId: 'test', map, rules, seed });
  const inputs = new Map<string, InputFrame>();
  for (const init of players) {
    const player = sim.addPlayer(init);
    if (!init.bot) inputs.set(init.id, neutralInput(0, player.spawn.yaw, 0));
  }
  const events: MatchEvent[] = sim.drainEvents();
  let seq = 0;
  const arena: Arena = {
    sim,
    events,
    inputs,
    step(ticks = 1) {
      for (let i = 0; i < ticks; i++) {
        seq++;
        sim.step((id) => {
          const input = inputs.get(id);
          if (input) input.seq = seq;
          return input;
        });
        for (const event of sim.drainEvents()) events.push(event);
      }
    },
    input(id) {
      const input = inputs.get(id);
      if (!input) throw new Error(`no input for ${id}`);
      return input;
    },
    player(id) {
      const player = sim.getPlayer(id);
      if (!player) throw new Error(`no player ${id}`);
      return player;
    },
    eventsOf(type) {
      return events.filter((event) => event.type === type);
    },
  };
  return arena;
}

const rig = makeCameraRig();

/**
 * Points a player's view at a world position the way a person does: by moving the crosshair onto
 * it. For camera-aimed players the shot leaves from the shoulder pivot, so the angles are solved
 * iteratively from that pivot.
 */
export function aimAt(arena: Arena, id: string, x: number, y: number, z: number): void {
  const player = arena.player(id);
  const input = arena.input(id);
  const c = player.char;
  const eye = eyeHeight(c, arena.sim.movement);
  let ox = c.x;
  let oy = c.y + eye;
  let oz = c.z;
  let yaw = yawToward(ox, oz, x, z);
  let pitch = Math.atan2(y - oy, Math.hypot(x - ox, z - oz));
  if (player.aimMode === 'camera') {
    for (let i = 0; i < 12; i++) {
      computeCameraRig(arena.sim.world, c.x, c.y, c.z, eye, yaw, pitch, DEFAULT_CAMERA, player.combat.adsBlend, rig);
      ox = rig.pivotX;
      oy = rig.pivotY;
      oz = rig.pivotZ;
      yaw = yawToward(ox, oz, x, z);
      pitch = Math.atan2(y - oy, Math.hypot(x - ox, z - oz));
    }
  }
  input.yaw = yaw;
  input.pitch = pitch;
}

/** Aims at the chest (or the head) of another player. */
export function aimAtPlayer(arena: Arena, id: string, targetId: string, zone: 'body' | 'head' = 'body'): void {
  const t = arena.player(targetId).char;
  aimAt(arena, id, t.x, t.y + (zone === 'head' ? t.height - 0.2 : t.height * 0.55), t.z);
}

/** One full press and release of the trigger (two ticks). */
export function tapFire(arena: Arena, id: string): void {
  arena.input(id).fire = true;
  arena.step();
  arena.input(id).fire = false;
  arena.step();
}

/** A motionless target that never shoots back. */
export function dummy(id: string, spawnIndex: number, extra: Partial<PlayerInit> = {}): PlayerInit {
  return { id, name: id, spawnIndex, teamId: 99, isBot: true, contender: false, loadout: [], bot: { behavior: 'dummy' }, ...extra };
}
