/**
 * Practice bots. A bot is an ordinary participant: its brain only produces an InputFrame, and the
 * simulation moves it and resolves its shots with exactly the same rules as a human. That is why
 * a bot cannot walk through a wall or shoot through one — it has no other way to act.
 *
 * Perception is deliberately limited (docs/03 §3.6): a field of view plus a line-of-sight ray,
 * approximate hearing, and a vague sense of where pain came from. Nothing reads another player's
 * position without passing one of those tests.
 *
 * State machine: PATROL -> INVESTIGATE -> CHASE -> ATTACK -> RETREAT -> SEARCH -> PATROL, plus
 * SCAVENGE for a bot that has run dry and goes looking for a weapon or ammunition it can see.
 * Every random decision comes from the bot's own seeded generator, so matches are reproducible.
 */
import { makeRng } from '../rng.js';
import { eyeHeight } from './character.js';
import { TICK_RATE } from './config.js';
import { releaseInput, type InputFrame } from './input.js';
import { INVENTORY_SLOTS, activeItem, type Inventory } from './inventory.js';
import { consumableGain, getConsumableDef } from './items.js';
import { PICKUP_RADIUS, isAmmoType, type LootItem } from './loot.js';
import { angleDelta, approach, clamp, wrapAngle, yawToward } from './math.js';
import { nearestNode, walkSegment } from './nav.js';
import type { SimPlayer } from './player.js';
import type { Simulation } from './simulation.js';
import { fireIntervalTicks, getWeaponDef } from './weapons.js';
import { makeRayHit } from './world.js';

export type BotBehavior = 'fighter' | 'dummy' | 'pacer';
export type BotState = 'patrol' | 'investigate' | 'chase' | 'attack' | 'retreat' | 'search' | 'scavenge';
export type BotDifficulty = 'easy' | 'normal' | 'hard';
export const BOT_DIFFICULTIES: readonly BotDifficulty[] = ['easy', 'normal', 'hard'];

export interface BotSkill {
  /** Ticks between seeing a target and being able to fire at it. */
  reactionTicks: number;
  /** Size of the wandering aim error, in degrees. */
  aimErrorDegrees: number;
  turnRateDegreesPerSecond: number;
  fovDegrees: number;
  viewDistance: number;
  /** Multiplier on the radius at which noises are heard. */
  hearingScale: number;
  /** Length of a burst with an automatic weapon, in ticks. */
  burstTicks: readonly [number, number];
  pauseTicks: readonly [number, number];
  /** Chance of strafing (rather than standing still) in each tactical window. */
  strafeChance: number;
  /** Health plus shield below which the bot breaks away to heal. 0 = never. */
  retreatBelow: number;
  usesAds: boolean;
  /** Extra ticks between shots with a semi-automatic weapon. */
  semiDelayTicks: number;
  headAimChance: number;
}

export const BOT_SKILLS: Readonly<Record<BotDifficulty, Readonly<BotSkill>>> = Object.freeze({
  easy: Object.freeze({
    reactionTicks: 45,
    aimErrorDegrees: 5.4,
    turnRateDegreesPerSecond: 150,
    fovDegrees: 100,
    viewDistance: 32,
    hearingScale: 0.7,
    burstTicks: [10, 22] as const,
    pauseTicks: [38, 72] as const,
    strafeChance: 0.3,
    retreatBelow: 0,
    usesAds: false,
    semiDelayTicks: 12,
    headAimChance: 0,
  }),
  normal: Object.freeze({
    reactionTicks: 28,
    aimErrorDegrees: 3.1,
    turnRateDegreesPerSecond: 250,
    fovDegrees: 110,
    viewDistance: 44,
    hearingScale: 1,
    burstTicks: [16, 34] as const,
    pauseTicks: [22, 46] as const,
    strafeChance: 0.7,
    retreatBelow: 45,
    usesAds: true,
    semiDelayTicks: 6,
    headAimChance: 0.1,
  }),
  hard: Object.freeze({
    reactionTicks: 16,
    aimErrorDegrees: 1.8,
    turnRateDegreesPerSecond: 360,
    fovDegrees: 120,
    viewDistance: 58,
    hearingScale: 1.25,
    burstTicks: [24, 46] as const,
    pauseTicks: [12, 28] as const,
    strafeChance: 0.95,
    retreatBelow: 55,
    usesAds: true,
    semiDelayTicks: 2,
    headAimChance: 0.3,
  }),
});

export interface BotBrain {
  readonly behavior: BotBehavior;
  readonly skill: Readonly<BotSkill>;
  readonly rng: () => number;
  /** Offsets this bot's periodic work so not every bot does it on the same tick. */
  readonly phase: number;

  state: BotState;
  stateSinceTick: number;

  targetId: string | null;
  targetVisible: boolean;
  /** Tick at which the current target came into view; the reaction time counts from here. */
  seenSinceTick: number;
  lastSeenTick: number;
  lastKnownX: number;
  lastKnownY: number;
  lastKnownZ: number;

  /** Latest noise or hit worth checking (-1 = none pending). */
  stimulusTick: number;
  stimulusX: number;
  stimulusY: number;
  stimulusZ: number;
  painHandledTick: number;

  path: number[];
  pathIndex: number;
  hasGoal: boolean;
  repathAtTick: number;
  progressTick: number;
  progressX: number;
  progressZ: number;
  stuckCount: number;

  aimYaw: number;
  aimPitch: number;
  errorYaw: number;
  errorPitch: number;
  errorGoalYaw: number;
  errorGoalPitch: number;
  errorRefreshTick: number;
  aimAtHead: boolean;

  burstUntilTick: number;
  pauseUntilTick: number;
  strafeDirection: number;
  strafeUntilTick: number;
  scanUntilTick: number;
  scanDirection: number;
  retreatUntilTick: number;
  retreatCooldownUntilTick: number;
  /** Item a bot without a usable weapon is walking to (-1 = none). */
  scavengeLootId: number;
  scavengeUntilTick: number;
  paceSign: number;
}

const DEG = Math.PI / 180;
/** How often a bot looks around for new targets (its current target is checked every tick). */
const SCAN_INTERVAL = 6;
/** Inside this distance a bot notices someone even behind its back. */
const CLOSE_AWARENESS = 3.5;
/** Grace period before a target that left the view counts as lost. */
const LOSE_SIGHT_TICKS = 24;
const CHASE_TIMEOUT_TICKS = 6 * TICK_RATE;
const SEARCH_TICKS = 4 * TICK_RATE;
const INVESTIGATE_SCAN_TICKS = Math.round(2.5 * TICK_RATE);
const INVESTIGATE_TIMEOUT_TICKS = 12 * TICK_RATE;
const RETREAT_TIMEOUT_TICKS = 12 * TICK_RATE;
const RETREAT_COOLDOWN_TICKS = 15 * TICK_RATE;
const REPATH_TICKS = 30;
const PROGRESS_WINDOW_TICKS = 36;
const PACER_SPAN = 4;
/** How far a bot that needs gear can spot an item lying on the ground. */
const SCAVENGE_VIEW_DISTANCE = 45;
const SCAVENGE_TIMEOUT_TICKS = 20 * TICK_RATE;
/** A bot only opens fire within this many times its weapon's comfortable distance. */
const EFFECTIVE_RANGE_FACTOR = 2.0;

const rayHit = makeRayHit();

export function createBotBrain(behavior: BotBehavior, skill: Readonly<BotSkill>, seed: number): BotBrain {
  const rng = makeRng(seed);
  return {
    behavior,
    skill,
    rng,
    phase: Math.floor(rng() * 64),
    state: 'patrol',
    stateSinceTick: 0,
    targetId: null,
    targetVisible: false,
    seenSinceTick: 0,
    lastSeenTick: -100000,
    lastKnownX: 0,
    lastKnownY: 0,
    lastKnownZ: 0,
    stimulusTick: -1,
    stimulusX: 0,
    stimulusY: 0,
    stimulusZ: 0,
    painHandledTick: -100000,
    path: [],
    pathIndex: 0,
    hasGoal: false,
    repathAtTick: 0,
    progressTick: 0,
    progressX: 0,
    progressZ: 0,
    stuckCount: 0,
    aimYaw: 0,
    aimPitch: 0,
    errorYaw: 0,
    errorPitch: 0,
    errorGoalYaw: 0,
    errorGoalPitch: 0,
    errorRefreshTick: 0,
    aimAtHead: false,
    burstUntilTick: 0,
    pauseUntilTick: 0,
    strafeDirection: 1,
    strafeUntilTick: 0,
    scanUntilTick: 0,
    scanDirection: 1,
    retreatUntilTick: 0,
    retreatCooldownUntilTick: 0,
    scavengeLootId: -1,
    scavengeUntilTick: 0,
    paceSign: 1,
  };
}

/** Forgets everything situational (after a respawn). The random sequence keeps going. */
export function resetBotBrain(brain: BotBrain, yaw: number, tick: number): void {
  brain.state = 'patrol';
  brain.stateSinceTick = tick;
  brain.targetId = null;
  brain.targetVisible = false;
  brain.lastSeenTick = -100000;
  brain.stimulusTick = -1;
  brain.painHandledTick = tick;
  brain.path.length = 0;
  brain.hasGoal = false;
  brain.stuckCount = 0;
  brain.aimYaw = yaw;
  brain.aimPitch = 0;
  brain.errorYaw = 0;
  brain.errorPitch = 0;
  brain.burstUntilTick = 0;
  brain.pauseUntilTick = 0;
  brain.scavengeLootId = -1;
  brain.paceSign = 1;
}

/**
 * Tells a bot roughly where an enemy is (the end-of-match reveal). It is only a hint to go and
 * look: the bot still has to see its target before it can attack.
 */
export function notifyBotOfPing(brain: BotBrain, tick: number, x: number, y: number, z: number): void {
  if (brain.behavior !== 'fighter' || brain.targetVisible) return;
  setStimulus(brain, tick, x, y, z, 5);
}

/* ------------------------------------------------------------------------------------------ */
/* Entry point                                                                                 */
/* ------------------------------------------------------------------------------------------ */

/** Writes this tick's intent of a bot into `out`. */
export function thinkBot(sim: Simulation, me: SimPlayer, brain: BotBrain, out: InputFrame): void {
  releaseInput(out);
  out.seq = sim.tick;
  if (brain.behavior === 'fighter' && sim.phase === 'active') {
    perceive(sim, me, brain);
    decide(sim, me, brain);
    act(sim, me, brain, out);
    trackProgress(sim, me, brain, out);
  } else if (brain.behavior === 'pacer') {
    pace(me, brain, out);
  }
  out.yaw = brain.aimYaw;
  out.pitch = brain.aimPitch;
}

/* ------------------------------------------------------------------------------------------ */
/* Perception                                                                                  */
/* ------------------------------------------------------------------------------------------ */

function isEnemy(me: SimPlayer, other: SimPlayer): boolean {
  return other !== me && other.teamId !== me.teamId && other.combat.aliveState === 'alive';
}

/** Line of sight from the bot's eyes to the other body (chest or head). */
function hasSightLine(sim: Simulation, me: SimPlayer, other: SimPlayer): boolean {
  const c = me.char;
  const o = other.char;
  const eyeY = c.y + eyeHeight(c, sim.movement);
  return (
    sim.world.hasLineOfSight(c.x, eyeY, c.z, o.x, o.y + o.height * 0.6, o.z, rayHit) ||
    sim.world.hasLineOfSight(c.x, eyeY, c.z, o.x, o.y + o.height - 0.15, o.z, rayHit)
  );
}

/** Can this bot see the other player right now? Distance, field of view, then geometry. */
export function botCanSee(sim: Simulation, me: SimPlayer, brain: BotBrain, other: SimPlayer): boolean {
  const c = me.char;
  const o = other.char;
  const dx = o.x - c.x;
  const dz = o.z - c.z;
  const dy = o.y - c.y;
  const distanceSquared = dx * dx + dz * dz + dy * dy;
  const view = brain.skill.viewDistance;
  if (distanceSquared > view * view) return false;
  if (distanceSquared > CLOSE_AWARENESS * CLOSE_AWARENESS) {
    const bearing = yawToward(c.x, c.z, o.x, o.z);
    if (Math.abs(angleDelta(brain.aimYaw, bearing)) > brain.skill.fovDegrees * 0.5 * DEG) return false;
  }
  return hasSightLine(sim, me, other);
}

function acquire(brain: BotBrain, target: SimPlayer, tick: number): void {
  if (brain.targetId !== target.id) {
    brain.targetId = target.id;
    brain.targetVisible = false;
    brain.aimAtHead = brain.rng() < brain.skill.headAimChance;
  }
  if (!brain.targetVisible) brain.seenSinceTick = tick;
  brain.targetVisible = true;
  brain.lastSeenTick = tick;
  brain.lastKnownX = target.char.x;
  brain.lastKnownY = target.char.y;
  brain.lastKnownZ = target.char.z;
}

function perceive(sim: Simulation, me: SimPlayer, brain: BotBrain): void {
  const tick = sim.tick;
  const c = me.char;

  // The current target is tracked every tick.
  const current = brain.targetId !== null ? sim.getPlayer(brain.targetId) : undefined;
  if (current && isEnemy(me, current)) {
    if (botCanSee(sim, me, brain, current)) acquire(brain, current, tick);
    else brain.targetVisible = false;
  } else if (brain.targetId !== null) {
    brain.targetId = null;
    brain.targetVisible = false;
  }

  // Periodic scan for a better (closer) target.
  if ((tick + brain.phase) % SCAN_INTERVAL === 0) {
    let best: SimPlayer | null = null;
    let bestScore = Infinity;
    const roster = sim.roster;
    for (let i = 0; i < roster.length; i++) {
      const other = roster[i]!;
      if (!isEnemy(me, other)) continue;
      let score = Math.hypot(other.char.x - c.x, other.char.z - c.z);
      // Sticking with the current target avoids flip-flopping between two enemies.
      if (other.id === brain.targetId && brain.targetVisible) score *= 0.7;
      if (score >= bestScore) continue;
      if (!botCanSee(sim, me, brain, other)) continue;
      best = other;
      bestScore = score;
    }
    if (best !== null && best.id !== brain.targetId) acquire(brain, best, tick);
  }

  // Pain: being hit tells roughly where the shooter is, and reveals them if nothing is in between.
  const combat = me.combat;
  if (combat.lastDamageTick > brain.painHandledTick) {
    brain.painHandledTick = combat.lastDamageTick;
    const attacker = combat.lastAttackerId !== null ? sim.getPlayer(combat.lastAttackerId) : undefined;
    if (attacker && isEnemy(me, attacker) && !brain.targetVisible) {
      const distance = Math.hypot(attacker.char.x - c.x, attacker.char.z - c.z);
      if (distance <= brain.skill.viewDistance && hasSightLine(sim, me, attacker)) {
        acquire(brain, attacker, tick);
      } else {
        setStimulus(brain, tick, attacker.char.x, attacker.char.y, attacker.char.z, 3);
      }
    }
  }

  // Hearing: only an approximate position, and only when not already busy with a visible target.
  if (!brain.targetVisible) {
    const noises = sim.heardNoises;
    for (let i = 0; i < noises.length; i++) {
      const noise = noises[i]!;
      if (noise.sourceId === me.id || noise.teamId === me.teamId) continue;
      const distance = Math.hypot(noise.x - c.x, noise.z - c.z, noise.y - c.y);
      if (distance > noise.radius * brain.skill.hearingScale) continue;
      setStimulus(brain, tick, noise.x, noise.y, noise.z, 1 + distance * 0.12);
      break;
    }
  }
}

function setStimulus(brain: BotBrain, tick: number, x: number, y: number, z: number, blur: number): void {
  brain.stimulusTick = tick;
  brain.stimulusX = x + (brain.rng() - 0.5) * 2 * blur;
  brain.stimulusY = y;
  brain.stimulusZ = z + (brain.rng() - 0.5) * 2 * blur;
}

/* ------------------------------------------------------------------------------------------ */
/* Decisions                                                                                   */
/* ------------------------------------------------------------------------------------------ */

function setState(brain: BotBrain, state: BotState, tick: number): void {
  if (brain.state === state) return;
  brain.state = state;
  brain.stateSinceTick = tick;
  brain.hasGoal = false;
  brain.path.length = 0;
  brain.scanUntilTick = 0;
  brain.stuckCount = 0;
}

/** Slot of a consumable that would do something right now, or -1. */
function findHealSlot(me: SimPlayer): number {
  const stats = me.combat.stats;
  const slots = me.combat.inventory.slots;
  let best = -1;
  let bestGain = 0;
  for (let i = 0; i < INVENTORY_SLOTS; i++) {
    const item = slots[i];
    if (!item || item.kind !== 'consumable') continue;
    const def = getConsumableDef(item.itemId);
    if (!def) continue;
    const gain =
      def.restores === 'health'
        ? consumableGain(def, stats.health, stats.maxHealth)
        : consumableGain(def, stats.shield, stats.maxShield);
    if (gain > bestGain) {
      best = i;
      bestGain = gain;
    }
  }
  return best;
}

function decide(sim: Simulation, me: SimPlayer, brain: BotBrain): void {
  const tick = sim.tick;
  const combat = me.combat;
  const vitality = combat.stats.health + combat.stats.shield;
  const sinceState = tick - brain.stateSinceTick;

  if (
    brain.state !== 'retreat' &&
    brain.skill.retreatBelow > 0 &&
    vitality < brain.skill.retreatBelow &&
    tick >= brain.retreatCooldownUntilTick &&
    tick - combat.lastDamageTick < 4 * TICK_RATE &&
    findHealSlot(me) >= 0
  ) {
    setState(brain, 'retreat', tick);
    brain.retreatUntilTick = tick + RETREAT_TIMEOUT_TICKS;
    brain.retreatCooldownUntilTick = tick + RETREAT_COOLDOWN_TICKS;
    chooseCover(sim, me, brain);
    return;
  }

  // Out of usable weapons: go and find something to fight with.
  if (brain.state !== 'retreat' && brain.state !== 'scavenge' && usableWeaponSlot(me.combat.inventory, 10) < 0) {
    const loot = findUsefulLoot(sim, me);
    if (loot !== null) {
      setState(brain, 'scavenge', tick);
      brain.scavengeLootId = loot.id;
      brain.scavengeUntilTick = tick + SCAVENGE_TIMEOUT_TICKS;
      setGoal(sim, me, brain, loot.x, loot.y, loot.z);
      return;
    }
  }

  switch (brain.state) {
    case 'scavenge': {
      const armed = usableWeaponSlot(me.combat.inventory, 10) >= 0;
      if (armed || tick >= brain.scavengeUntilTick || !sim.loot.has(brain.scavengeLootId)) {
        brain.scavengeLootId = -1;
        setState(brain, armed && brain.targetVisible ? 'attack' : 'patrol', tick);
      }
      break;
    }
    case 'patrol':
    case 'investigate':
    case 'search':
      if (brain.targetVisible) {
        setState(brain, 'attack', tick);
      } else if (brain.stimulusTick >= 0) {
        setState(brain, 'investigate', tick);
        brain.stateSinceTick = tick;
        setGoal(sim, me, brain, brain.stimulusX, brain.stimulusY, brain.stimulusZ);
        brain.scanUntilTick = 0;
        brain.stimulusTick = -1;
      } else if (brain.state === 'search' && sinceState > SEARCH_TICKS) {
        brain.targetId = null;
        setState(brain, 'patrol', tick);
      } else if (brain.state === 'investigate') {
        const scanned = !brain.hasGoal && brain.scanUntilTick > 0 && tick >= brain.scanUntilTick;
        if (scanned || sinceState > INVESTIGATE_TIMEOUT_TICKS) setState(brain, 'patrol', tick);
      }
      break;
    case 'attack':
      brain.stimulusTick = -1;
      if (brain.targetId === null) {
        setState(brain, 'patrol', tick);
      } else if (!brain.targetVisible && tick - brain.lastSeenTick > LOSE_SIGHT_TICKS) {
        setState(brain, 'chase', tick);
        setGoal(sim, me, brain, brain.lastKnownX, brain.lastKnownY, brain.lastKnownZ);
      }
      break;
    case 'chase':
      if (brain.targetId === null) setState(brain, 'patrol', tick);
      else if (brain.targetVisible) setState(brain, 'attack', tick);
      else if (!brain.hasGoal || sinceState > CHASE_TIMEOUT_TICKS) setState(brain, 'search', tick);
      break;
    case 'retreat': {
      const done = tick >= brain.retreatUntilTick || (findHealSlot(me) < 0 && combat.use === null);
      if (done) setState(brain, brain.targetVisible ? 'attack' : 'search', tick);
      break;
    }
  }
}

/* ------------------------------------------------------------------------------------------ */
/* Navigation                                                                                  */
/* ------------------------------------------------------------------------------------------ */

function setGoal(sim: Simulation, me: SimPlayer, brain: BotBrain, x: number, y: number, z: number): boolean {
  const graph = sim.nav;
  const finder = sim.pathFinder;
  brain.hasGoal = false;
  brain.path.length = 0;
  brain.repathAtTick = sim.tick + REPATH_TICKS;
  if (!graph || !finder) return false;
  const c = me.char;
  const start = nearestNode(graph, c.x, c.y, c.z, 4);
  const goal = nearestNode(graph, x, y, z, 8);
  if (start < 0 || goal < 0) return false;
  if (!finder.find(start, goal, brain.path)) {
    brain.path.length = 0;
    return false;
  }
  // The first node is where the bot already is (or just behind it).
  brain.pathIndex = brain.path.length > 1 ? 1 : 0;
  brain.hasGoal = true;
  return true;
}

function choosePatrolGoal(sim: Simulation, me: SimPlayer, brain: BotBrain): void {
  const graph = sim.nav;
  if (!graph || graph.count === 0) return;
  const c = me.char;
  let best = -1;
  let bestDistance = -1;
  for (let attempt = 0; attempt < 6; attempt++) {
    const node = Math.min(graph.count - 1, Math.floor(brain.rng() * graph.count));
    const distance = Math.hypot(graph.x[node]! - c.x, graph.z[node]! - c.z);
    if (distance > bestDistance) {
      best = node;
      bestDistance = distance;
    }
    if (distance >= 18) break;
  }
  if (best >= 0) setGoal(sim, me, brain, graph.x[best]!, graph.y[best]!, graph.z[best]!);
}

/** Picks somewhere out of the threat's sight to heal. */
function chooseCover(sim: Simulation, me: SimPlayer, brain: BotBrain): void {
  const graph = sim.nav;
  if (!graph || graph.count === 0) return;
  const c = me.char;
  const threatX = brain.lastKnownX;
  const threatY = brain.lastKnownY + 1.5;
  const threatZ = brain.lastKnownZ;
  let best = -1;
  let bestScore = -Infinity;
  for (let attempt = 0; attempt < 24; attempt++) {
    const node = Math.min(graph.count - 1, Math.floor(brain.rng() * graph.count));
    const nx = graph.x[node]!;
    const ny = graph.y[node]!;
    const nz = graph.z[node]!;
    const fromMe = Math.hypot(nx - c.x, nz - c.z);
    if (fromMe > 40 || fromMe < 4) continue;
    const fromThreat = Math.hypot(nx - threatX, nz - threatZ);
    const hidden = !sim.world.hasLineOfSight(threatX, threatY, threatZ, nx, ny + 1.2, nz, rayHit);
    const score = (hidden ? 60 : 0) + fromThreat - fromMe * 0.6;
    if (score > bestScore) {
      best = node;
      bestScore = score;
    }
  }
  if (best >= 0) setGoal(sim, me, brain, graph.x[best]!, graph.y[best]!, graph.z[best]!);
}

/** Sets the movement axes so the bot walks toward a world point while looking along `aimYaw`. */
function steerToward(me: SimPlayer, brain: BotBrain, out: InputFrame, x: number, z: number, sprint: boolean): void {
  const c = me.char;
  const dx = x - c.x;
  const dz = z - c.z;
  const length = Math.hypot(dx, dz);
  if (length < 1e-4) return;
  const ux = dx / length;
  const uz = dz / length;
  const sin = Math.sin(brain.aimYaw);
  const cos = Math.cos(brain.aimYaw);
  out.moveZ = -ux * sin - uz * cos;
  out.moveX = ux * cos - uz * sin;
  out.sprint = sprint && out.moveZ > 0.7;
}

/**
 * Advances along the current path. Returns true when there is nothing left to walk (arrived or
 * no path). `lookAlong` receives the point the bot is heading to.
 */
function followPath(sim: Simulation, me: SimPlayer, brain: BotBrain, out: InputFrame, sprint: boolean): boolean {
  const graph = sim.nav;
  if (!graph || !brain.hasGoal || brain.path.length === 0) {
    brain.hasGoal = false;
    return true;
  }
  const c = me.char;

  // String pulling: skip ahead to the farthest of the next few nodes that can be walked to in a
  // straight line, so the route does not look like a staircase of grid cells.
  if (c.grounded && (sim.tick + brain.phase) % 8 === 0) {
    const limit = Math.min(brain.path.length - 1, brain.pathIndex + 6);
    for (let i = limit; i > brain.pathIndex; i--) {
      const node = brain.path[i]!;
      const endY = walkSegment(sim.world, sim.movement, c.x, c.y, c.z, graph.x[node]!, graph.z[node]!);
      if (!Number.isNaN(endY) && Math.abs(endY - graph.y[node]!) < 0.5) {
        brain.pathIndex = i;
        break;
      }
    }
  }

  let node = brain.path[brain.pathIndex]!;
  const last = brain.pathIndex >= brain.path.length - 1;
  if (Math.hypot(graph.x[node]! - c.x, graph.z[node]! - c.z) < (last ? 0.5 : 0.65)) {
    if (last) {
      brain.hasGoal = false;
      brain.path.length = 0;
      return true;
    }
    brain.pathIndex++;
    node = brain.path[brain.pathIndex]!;
  }
  steerToward(me, brain, out, graph.x[node]!, graph.z[node]!, sprint);
  return false;
}

/** Point the bot is currently walking to, for looking where it goes. */
function waypointYaw(sim: Simulation, me: SimPlayer, brain: BotBrain): number | null {
  const graph = sim.nav;
  if (!graph || !brain.hasGoal || brain.path.length === 0) return null;
  const node = brain.path[Math.min(brain.path.length - 1, brain.pathIndex + 1)]!;
  const c = me.char;
  if (Math.hypot(graph.x[node]! - c.x, graph.z[node]! - c.z) < 0.3) return null;
  return yawToward(c.x, c.z, graph.x[node]!, graph.z[node]!);
}

/** A bot that pushes against something without getting anywhere hops, re-plans, then gives up. */
function trackProgress(sim: Simulation, me: SimPlayer, brain: BotBrain, out: InputFrame): void {
  const c = me.char;
  const moving = Math.abs(out.moveX) + Math.abs(out.moveZ) > 0.3;
  if (!moving) {
    brain.progressTick = sim.tick;
    brain.progressX = c.x;
    brain.progressZ = c.z;
    brain.stuckCount = 0;
    return;
  }
  if (sim.tick - brain.progressTick < PROGRESS_WINDOW_TICKS) return;
  const moved = Math.hypot(c.x - brain.progressX, c.z - brain.progressZ);
  brain.progressTick = sim.tick;
  brain.progressX = c.x;
  brain.progressZ = c.z;
  if (moved >= 0.5) {
    brain.stuckCount = 0;
    return;
  }
  brain.stuckCount++;
  out.jump = true;
  brain.strafeDirection = -brain.strafeDirection;
  brain.repathAtTick = sim.tick;
  if (brain.stuckCount >= 2) {
    brain.hasGoal = false;
    brain.path.length = 0;
    brain.stuckCount = 0;
  }
}

/* ------------------------------------------------------------------------------------------ */
/* Acting                                                                                      */
/* ------------------------------------------------------------------------------------------ */

function turnToward(brain: BotBrain, yaw: number, pitch: number, maxStep: number): void {
  brain.aimYaw = wrapAngle(brain.aimYaw + clamp(angleDelta(brain.aimYaw, yaw), -maxStep, maxStep));
  brain.aimPitch = approach(brain.aimPitch, clamp(pitch, -1.2, 1.2), maxStep);
}

function randomTicks(brain: BotBrain, range: readonly [number, number]): number {
  return range[0] + Math.floor(brain.rng() * (range[1] - range[0] + 1));
}

/** Lower is better: how far a weapon's comfortable distance is from the fight at hand. */
function weaponFit(idealRange: number, distance: number, ammoInMag: number): number {
  // An empty magazine is a reload away from being useful, which counts against it.
  return Math.abs(Math.log((idealRange + 2) / (distance + 2))) + (ammoInMag <= 0 ? 0.6 : 0);
}

/**
 * Slot of the weapon best suited to a fight at `distance` among those that can still shoot
 * (rounds in the magazine or in reserve). -1 when the bot has nothing to shoot with.
 */
function usableWeaponSlot(inventory: Inventory, distance: number): number {
  let best = -1;
  let bestFit = Infinity;
  for (let i = 0; i < INVENTORY_SLOTS; i++) {
    const item = inventory.slots[i];
    if (!item || item.kind !== 'weapon') continue;
    const def = getWeaponDef(item.weaponId);
    if (!def) continue;
    if (item.ammoInMag <= 0 && inventory.ammo[def.ammoType] <= 0) continue;
    const fit = weaponFit(def.idealRangeMeters, distance, item.ammoInMag);
    if (fit < bestFit) {
      best = i;
      bestFit = fit;
    }
  }
  return best;
}

/** Asks for the best usable weapon, without interrupting a reload or dithering between two. */
function ensureWeaponSelected(me: SimPlayer, out: InputFrame, distance = 15): void {
  const combat = me.combat;
  const inventory = combat.inventory;
  if (combat.reload !== null) return;
  const best = usableWeaponSlot(inventory, distance);
  if (best < 0 || best === inventory.active) return;
  const current = activeItem(inventory);
  const other = inventory.slots[best];
  if (current !== null && current.kind === 'weapon' && other && other.kind === 'weapon') {
    const def = getWeaponDef(current.weaponId);
    const otherDef = getWeaponDef(other.weaponId);
    if (def && otherDef && (current.ammoInMag > 0 || inventory.ammo[def.ammoType] > 0)) {
      // Keep a working weapon unless the other one suits the distance clearly better.
      const gain = weaponFit(def.idealRangeMeters, distance, current.ammoInMag) - weaponFit(otherDef.idealRangeMeters, distance, other.ammoInMag);
      if (gain < 0.5) return;
    }
  }
  out.slot = best;
}

/** Nearest item on the ground that would let an unarmed bot shoot again, if it can see one. */
function findUsefulLoot(sim: Simulation, me: SimPlayer): LootItem | null {
  const inventory = me.combat.inventory;
  const c = me.char;
  const eyeY = c.y + eyeHeight(c, sim.movement);
  let best: LootItem | null = null;
  let bestDistance = SCAVENGE_VIEW_DISTANCE;
  for (const item of sim.loot.values()) {
    let useful = false;
    if (item.kind === 'weapon' && item.weapon) {
      const def = getWeaponDef(item.defId);
      useful = def !== undefined && (item.weapon.ammoInMag > 0 || inventory.ammo[def.ammoType] > 0);
    } else if (item.kind === 'ammo' && isAmmoType(item.defId)) {
      for (let i = 0; i < INVENTORY_SLOTS && !useful; i++) {
        const held = inventory.slots[i];
        if (held && held.kind === 'weapon') useful = getWeaponDef(held.weaponId)?.ammoType === item.defId;
      }
    }
    if (!useful) continue;
    const distance = Math.hypot(item.x - c.x, item.z - c.z, item.y - c.y);
    if (distance >= bestDistance) continue;
    if (!sim.world.hasLineOfSight(c.x, eyeY, c.z, item.x, item.y + 0.4, item.z, rayHit)) continue;
    best = item;
    bestDistance = distance;
  }
  return best;
}

function act(sim: Simulation, me: SimPlayer, brain: BotBrain, out: InputFrame): void {
  const tick = sim.tick;
  const turnStep = (brain.skill.turnRateDegreesPerSecond * DEG) / TICK_RATE;
  const c = me.char;

  switch (brain.state) {
    case 'patrol': {
      ensureWeaponSelected(me, out);
      if (!brain.hasGoal) choosePatrolGoal(sim, me, brain);
      if (!brain.hasGoal) {
        // Off the navigation graph (knocked somewhere odd): head for the middle of the map.
        const bounds = sim.world.bounds;
        const centreX = (bounds.minX + bounds.maxX) * 0.5;
        const centreZ = (bounds.minZ + bounds.maxZ) * 0.5;
        turnToward(brain, yawToward(c.x, c.z, centreX, centreZ), 0, turnStep * 0.5);
        steerToward(me, brain, out, centreX, centreZ, false);
        break;
      }
      followPath(sim, me, brain, out, false);
      const heading = waypointYaw(sim, me, brain);
      if (heading !== null) {
        // Look where it walks, sweeping a little from side to side.
        turnToward(brain, heading + Math.sin((tick + brain.phase * 7) * 0.035) * 0.55, 0, turnStep * 0.5);
        steerAgain(sim, me, brain, out, false);
      }
      break;
    }
    case 'investigate': {
      ensureWeaponSelected(me, out);
      if (brain.hasGoal) {
        const far = Math.hypot(brain.stimulusX - c.x, brain.stimulusZ - c.z) > 14;
        const arrived = followPath(sim, me, brain, out, far);
        const heading = waypointYaw(sim, me, brain);
        if (heading !== null) {
          turnToward(brain, heading, 0, turnStep * 0.7);
          steerAgain(sim, me, brain, out, far);
        }
        if (arrived) brain.scanUntilTick = tick + INVESTIGATE_SCAN_TICKS;
      } else {
        if (brain.scanUntilTick === 0) brain.scanUntilTick = tick + INVESTIGATE_SCAN_TICKS;
        brain.aimYaw = wrapAngle(brain.aimYaw + brain.scanDirection * 1.9 * (1 / TICK_RATE));
        brain.aimPitch = approach(brain.aimPitch, 0, turnStep);
      }
      break;
    }
    case 'chase': {
      ensureWeaponSelected(me, out);
      followPath(sim, me, brain, out, true);
      const heading = waypointYaw(sim, me, brain) ?? yawToward(c.x, c.z, brain.lastKnownX, brain.lastKnownZ);
      turnToward(brain, heading, 0, turnStep * 0.8);
      steerAgain(sim, me, brain, out, true);
      break;
    }
    case 'search': {
      ensureWeaponSelected(me, out);
      brain.aimYaw = wrapAngle(brain.aimYaw + brain.scanDirection * 1.6 * (1 / TICK_RATE));
      brain.aimPitch = approach(brain.aimPitch, 0, turnStep);
      break;
    }
    case 'retreat':
      actRetreat(sim, me, brain, out, turnStep);
      break;
    case 'scavenge': {
      const loot = sim.loot.get(brain.scavengeLootId);
      if (!loot) break;
      const arrived = followPath(sim, me, brain, out, true);
      turnToward(brain, yawToward(c.x, c.z, loot.x, loot.z), 0, turnStep);
      if (arrived) steerToward(me, brain, out, loot.x, loot.z, false);
      else steerAgain(sim, me, brain, out, true);
      // Ammunition is collected by walking over it; anything else needs the interact key.
      if (Math.hypot(loot.x - c.x, loot.z - c.z) < PICKUP_RADIUS * 0.8) out.interact = (tick + brain.phase) % 6 < 2;
      break;
    }
    case 'attack':
      actAttack(sim, me, brain, out, turnStep);
      break;
  }
}

/** Re-derives the movement axes after the look direction changed this tick. */
function steerAgain(sim: Simulation, me: SimPlayer, brain: BotBrain, out: InputFrame, sprint: boolean): void {
  const graph = sim.nav;
  if (!graph || !brain.hasGoal || brain.path.length === 0) return;
  const node = brain.path[brain.pathIndex]!;
  steerToward(me, brain, out, graph.x[node]!, graph.z[node]!, sprint);
}

function actRetreat(sim: Simulation, me: SimPlayer, brain: BotBrain, out: InputFrame, turnStep: number): void {
  const tick = sim.tick;
  const c = me.char;
  const combat = me.combat;
  const arrived = followPath(sim, me, brain, out, true);
  const exposed = brain.targetVisible || tick - brain.lastSeenTick < 20;

  // Run looking where it goes; once in place, watch the direction the threat came from.
  const heading = arrived ? yawToward(c.x, c.z, brain.lastKnownX, brain.lastKnownZ) : waypointYaw(sim, me, brain);
  if (heading !== null) turnToward(brain, heading, 0, turnStep * 0.8);
  if (!arrived) steerAgain(sim, me, brain, out, true);

  if (arrived || !exposed) {
    const slot = findHealSlot(me);
    if (slot >= 0) {
      if (combat.inventory.active !== slot) out.slot = slot;
      else if (combat.use === null) out.fire = (tick + brain.phase) % 20 < 2;
    }
  }
}

function actAttack(sim: Simulation, me: SimPlayer, brain: BotBrain, out: InputFrame, turnStep: number): void {
  const tick = sim.tick;
  const skill = brain.skill;
  const c = me.char;
  const target = brain.targetId !== null ? sim.getPlayer(brain.targetId) : undefined;
  if (!target) return;

  // Aim at where the target is while visible, at where it was last seen otherwise.
  const o = target.char;
  const tx = brain.targetVisible ? o.x : brain.lastKnownX;
  const tz = brain.targetVisible ? o.z : brain.lastKnownZ;
  const baseY = brain.targetVisible ? o.y : brain.lastKnownY;
  const aimY = baseY + (brain.aimAtHead ? o.height - 0.2 : o.height * 0.62);
  const eyeY = c.y + eyeHeight(c, sim.movement);
  const distance = Math.hypot(tx - c.x, tz - c.z);
  ensureWeaponSelected(me, out, distance);
  const desiredYaw = yawToward(c.x, c.z, tx, tz);
  const desiredPitch = Math.atan2(aimY - eyeY, Math.max(distance, 0.1));

  // The aim wanders around the target; moving targets and moving shooters wander more.
  if (tick >= brain.errorRefreshTick) {
    const targetSpeed = Math.min(1, Math.hypot(o.vx, o.vz) / sim.movement.sprintSpeed);
    const ownSpeed = Math.min(1, Math.hypot(c.vx, c.vz) / sim.movement.sprintSpeed);
    const scale = skill.aimErrorDegrees * DEG * (1 + 0.8 * targetSpeed + 0.4 * ownSpeed);
    brain.errorGoalYaw = (brain.rng() - brain.rng()) * scale;
    brain.errorGoalPitch = (brain.rng() - brain.rng()) * scale * 0.6;
    brain.errorRefreshTick = tick + 14 + Math.floor(brain.rng() * 22);
  }
  brain.errorYaw += (brain.errorGoalYaw - brain.errorYaw) * 0.12;
  brain.errorPitch += (brain.errorGoalPitch - brain.errorPitch) * 0.12;
  turnToward(brain, desiredYaw + brain.errorYaw, desiredPitch + brain.errorPitch, turnStep);

  const item = activeItem(me.combat.inventory);
  const def = item !== null && item.kind === 'weapon' ? getWeaponDef(item.weaponId) : undefined;
  const ideal = def ? def.idealRangeMeters : 15;

  // Movement: close in when too far, back off when too close, otherwise strafe.
  if (!brain.targetVisible || distance > ideal * 1.6) {
    if (!brain.hasGoal || tick >= brain.repathAtTick) setGoal(sim, me, brain, tx, baseY, tz);
    followPath(sim, me, brain, out, false);
  } else {
    brain.hasGoal = false;
    if (tick >= brain.strafeUntilTick) {
      brain.strafeUntilTick = tick + 30 + Math.floor(brain.rng() * 60);
      brain.strafeDirection = brain.rng() < skill.strafeChance ? (brain.rng() < 0.5 ? -1 : 1) : 0;
    }
    out.moveX = brain.strafeDirection;
    if (distance < ideal * 0.5) out.moveZ = -1;
    else if (distance > ideal * 1.15) out.moveZ = 0.6;
  }

  if (!def || !brain.targetVisible) return;
  out.ads = skill.usesAds && distance > 14;

  // Pull the trigger only with the target in view, after the reaction time, when the barrel is
  // actually pointing near it and it is within the weapon's useful range.
  const reacted = tick - brain.seenSinceTick >= skill.reactionTicks;
  const cone = Math.max(3 * DEG, Math.atan2(0.5, Math.max(distance, 0.5))) + skill.aimErrorDegrees * DEG * 1.5;
  const aligned = Math.abs(angleDelta(brain.aimYaw, desiredYaw)) < cone && Math.abs(brain.aimPitch - desiredPitch) < cone;
  if (!reacted || !aligned || distance > ideal * EFFECTIVE_RANGE_FACTOR) return;

  if (def.automatic) {
    if (tick >= brain.burstUntilTick && tick >= brain.pauseUntilTick) {
      brain.burstUntilTick = tick + randomTicks(brain, skill.burstTicks);
      brain.pauseUntilTick = brain.burstUntilTick + randomTicks(brain, skill.pauseTicks);
    }
    out.fire = tick < brain.burstUntilTick;
  } else {
    const period = Math.max(4, Math.ceil(fireIntervalTicks(def, TICK_RATE)) + skill.semiDelayTicks);
    out.fire = (tick - brain.seenSinceTick) % period < 2;
  }
}

/** Target dummy that strafes from side to side in front of the firing line. */
function pace(me: SimPlayer, brain: BotBrain, out: InputFrame): void {
  const spawn = me.spawn;
  const c = me.char;
  const rightX = Math.cos(spawn.yaw);
  const rightZ = -Math.sin(spawn.yaw);
  const offset = (c.x - spawn.x) * rightX + (c.z - spawn.z) * rightZ;
  if (offset * brain.paceSign >= PACER_SPAN) brain.paceSign = -brain.paceSign;
  brain.aimYaw = spawn.yaw;
  brain.aimPitch = 0;
  out.moveX = 0.6 * brain.paceSign;
}
