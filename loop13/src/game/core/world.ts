/**
 * Mutable simulation state of ONE loop. Everything in here is physical and is
 * rebuilt from scratch on every reset (see LoopSystem.resetWorld).
 * Knowledge lives in the store's `run`/`profile` and is never touched by a reset.
 */
import { Vector3 } from 'three';
import type { ItemId, LightMode } from './types';
import { DOORS, DYNAMIC_CRATES, SPAWN } from '../data/level';
import type { RelayId } from './constants';

export type AnimName =
  | 'idle' | 'walk' | 'run' | 'sprint' | 'crouchIdle' | 'crouchWalk' | 'jump' | 'fall' | 'land'
  | 'interact' | 'openDoor' | 'pickup' | 'inspect' | 'computer' | 'hurt' | 'stumble' | 'death' | 'lying'
  | 'sit' | 'talk' | 'reach';

export interface DoorState { open: number; target: number; unlocked: boolean; forcedLock: boolean; holdOpen: number; }

export interface PlayerState {
  pos: Vector3;
  vel: Vector3;
  yaw: number;
  grounded: boolean;
  crouching: boolean;
  sprinting: boolean;
  running: boolean;
  speed: number;
  health: number;
  stamina: number;
  flashlightOn: boolean;
  battery: number;
  action: AnimName | null;
  actionTime: number;
  actionDuration: number;
  landT: number;
  hurtT: number;
  dead: boolean;
  room: string;
  airTime: number;
  stepDist: number;
  lastStepSide: number;
  radiation: number;
}

export interface NPCState {
  id: 'kane' | 'maya';
  present: boolean;
  pos: Vector3;
  yaw: number;
  anim: AnimName;
  speed: number;
  path: { x: number; z: number }[];
  pathIdx: number;
  task: string;
  taskTarget: { x: number; z: number; yaw: number } | null;
  talking: boolean;
  lookAtPlayer: number;
  headYaw: number;
  vanishing: number;
  talkedThisLoop: number;
  arrived: string[];
}

export type ObserverMode = 'DORMANT' | 'WATCHING' | 'FOLLOWING' | 'HUNTING' | 'DISAPPEARING' | 'MANIPULATING';

export interface ObserverState {
  mode: ObserverMode;
  pos: Vector3;
  yaw: number;
  visible: boolean;
  cctvOnly: boolean;
  opacity: number;
  timer: number;
  seenTime: number;
  cooldown: number;
  path: { x: number; z: number }[];
  pathIdx: number;
  repath: number;
  chaseTime: number;
  anim: AnimName;
  interactive: boolean;
  lastSeenByPlayer: number;
  symbolsDrawn: number;
}

export interface CrateState { pos: Vector3; vel: Vector3; size: number; }

export interface World {
  t: number;
  timeScale: number;
  frozen: boolean;
  fastForward: boolean;
  player: PlayerState;
  doors: Record<string, DoorState>;
  pickups: Record<string, boolean>;
  inventory: ItemId[];
  crates: CrateState[];
  generators: [boolean, boolean, boolean];
  relays: Record<RelayId, boolean>;
  keypadSolved: boolean;
  symbolSolved: boolean;
  hiddenOpen: boolean;
  anchors: boolean[];
  anchorOrder: number[];
  light: { mode: LightMode; power: number; flicker: number; alarm: boolean; pulse: number };
  fired: Record<string, boolean>;
  kane: NPCState;
  maya: NPCState;
  observer: ObserverState;
  anomalies: string[];
  flags: Set<string>;
  shake: number;
  fovBoost: number;
  distortion: number;
  cctv: { active: boolean; index: number; since: number };
  phoneRinging: boolean;
  arcTimer: number;
  terminalMessage: string | null;
  final: { active: boolean; stage: number; broken: boolean; timer: number };
  interactHold: { id: string | null; t: number };
  lastInteract: number;
  loopSeed: number;
}

function npc(id: 'kane' | 'maya', x: number, z: number, yaw: number): NPCState {
  return {
    id, present: true, pos: new Vector3(x, 0, z), yaw, anim: 'idle', speed: 1.35, path: [], pathIdx: 0,
    task: 'idle', taskTarget: null, talking: false, lookAtPlayer: 0, headYaw: 0, vanishing: 0,
    talkedThisLoop: 0, arrived: [],
  };
}

export function createWorld(seed = 1): World {
  const doors: Record<string, DoorState> = {};
  for (const d of DOORS) {
    doors[d.id] = { open: d.kind === 'arch' ? 1 : 0, target: d.kind === 'arch' ? 1 : 0, unlocked: d.kind === 'auto' || d.kind === 'arch', forcedLock: false, holdOpen: 0 };
  }
  return {
    t: 0,
    timeScale: 1,
    frozen: false,
    fastForward: false,
    player: {
      pos: new Vector3(SPAWN.x, 0, SPAWN.z), vel: new Vector3(), yaw: SPAWN.yaw, grounded: true,
      crouching: false, sprinting: false, running: false, speed: 0, health: 100, stamina: 1,
      flashlightOn: false, battery: 100, action: null, actionTime: 0, actionDuration: 0, landT: 0, hurtT: 0,
      dead: false, room: 'MEDICAL', airTime: 0, stepDist: 0, lastStepSide: 0, radiation: 0,
    },
    doors,
    pickups: {},
    inventory: [],
    crates: DYNAMIC_CRATES.map((c) => ({ pos: new Vector3(c.x, c.size / 2, c.z), vel: new Vector3(), size: c.size })),
    generators: [false, false, false],
    relays: { A: false, B: false, C: false },
    keypadSolved: false,
    symbolSolved: false,
    hiddenOpen: false,
    anchors: [false, false, false, false],
    anchorOrder: [],
    light: { mode: 'normal', power: 1, flicker: 0, alarm: false, pulse: 0 },
    fired: {},
    kane: npc('kane', -12.2, 0.2, -Math.PI / 2),
    maya: npc('maya', -5, 14.5, -Math.PI / 2),
    observer: {
      mode: 'DORMANT', pos: new Vector3(0, -50, 0), yaw: 0, visible: false, cctvOnly: false, opacity: 0, timer: 0,
      seenTime: 0, cooldown: 20, path: [], pathIdx: 0, repath: 0, chaseTime: 0, anim: 'idle', interactive: false,
      lastSeenByPlayer: -999, symbolsDrawn: 0,
    },
    anomalies: [],
    flags: new Set(),
    shake: 0,
    fovBoost: 0,
    distortion: 0,
    cctv: { active: false, index: 0, since: 0 },
    phoneRinging: false,
    arcTimer: 0,
    terminalMessage: null,
    final: { active: false, stage: 0, broken: false, timer: 0 },
    interactHold: { id: null, t: 0 },
    lastInteract: 0,
    loopSeed: seed,
  };
}

/** The single live world instance. Mutated in place so references stay valid. */
export const world: World = createWorld();

export function replaceWorld(next: World): void {
  Object.assign(world, next);
}
