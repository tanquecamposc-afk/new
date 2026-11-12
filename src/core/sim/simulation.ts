/**
 * The match simulation: owns the collision world, every participant and every item on the
 * ground, and advances all of it by one fixed tick per `step()` call. It is the single source of
 * truth — renderer, HUD and audio only read from it and react to the events it emits.
 *
 * Nothing here touches the DOM, the clock or Math.random, so the same class can run inside a
 * browser tab today and inside an authoritative Node server later.
 */
import { applyDamage } from '../combat.js';
import type { MatchEvent, MatchPhase } from '../types.js';
import {
  BOT_SKILLS,
  createBotBrain,
  notifyBotOfPing,
  resetBotBrain,
  thinkBot,
  type BotBehavior,
  type BotDifficulty,
  type BotSkill,
} from './bot.js';
import { DEFAULT_MOVEMENT, DT, type MovementConfig } from './config.js';
import { createCharacter, stepCharacter, type CharacterEvent } from './character.js';
import { createCourse, resetCourse, updateCourse } from './course.js';
import { SIM_EVENTS } from './events.js';
import { applyCombatMovement, dropSlot, updateCombat } from './gunplay.js';
import { neutralInput, releaseInput, sanitizeInput, type InputFrame } from './input.js';
import {
  INVENTORY_SLOTS,
  addConsumable,
  clearInventory,
  createInventory,
  findFreeSlot,
  findWeaponSlot,
  makeWeaponItem,
  type WeaponItem,
} from './inventory.js';
import { getConsumableDef } from './items.js';
import { validateLootSpawn, type LootItem, type LootKind } from './loot.js';
import { buildWorld, type MapDefinition, type SpawnPoint } from './map.js';
import { clamp } from './math.js';
import { PathFinder, buildNavGraph, type NavGraph, type NavPoint } from './nav.js';
import { emptyTotals, type AimMode, type CombatState, type SimPlayer } from './player.js';
import { hash32, hashString } from './random.js';
import { TRAINING_COURSE_RULES, validateRules, type LoadoutEntry, type MatchRules } from './rules.js';
import { AMMO_RESERVE_CAP, AMMO_TYPES, getWeaponDef, type AmmoType } from './weapons.js';
import { makeGroundInfo, type World } from './world.js';

export { SIM_EVENTS } from './events.js';
export type { SimPlayer } from './player.js';

export interface PlayerInit {
  id: string;
  name: string;
  isBot?: boolean;
  teamId?: number;
  spawnIndex?: number;
  aimMode?: AimMode;
  /** False for target dummies: they never count toward the win condition. */
  contender?: boolean;
  loadout?: readonly LoadoutEntry[];
  startingAmmo?: Partial<Record<AmmoType, number>>;
  health?: { start: number; max: number };
  shield?: { start: number; max: number };
  /** Makes the participant a bot driven by the simulation itself. */
  bot?: { behavior: BotBehavior; difficulty?: BotDifficulty; skill?: BotSkill };
}

export interface SimulationOptions {
  matchId: string;
  map: MapDefinition;
  movement?: MovementConfig;
  /** Defaults to the checkpoint course of phase 1. */
  rules?: MatchRules;
  /** Seed of every random draw in the match (spread, bots). */
  seed?: number;
}

export interface NoiseEvent {
  x: number;
  y: number;
  z: number;
  radius: number;
  sourceId: string;
  teamId: number;
}

export interface DamageInfo {
  attacker: SimPlayer | null;
  cause: 'weapon' | 'fall' | 'void';
  weaponId?: string;
  headshot?: boolean;
  distance?: number;
  pellets?: number;
  /** Where the damage landed. */
  x: number;
  y: number;
  z: number;
}

export interface PlacementEntry {
  id: string;
  name: string;
  isBot: boolean;
  teamId: number;
  placement: number;
  eliminations: number;
  damageDealt: number;
}

export interface MatchResult {
  winnerTeamId: number | null;
  winnerIds: string[];
  endedAtTick: number;
  /** Ticks the match was live (warm-up excluded). */
  activeTicks: number;
  placements: PlacementEntry[];
}

export interface LootContent {
  kind: LootKind;
  defId: string;
  count: number;
  weapon: WeaponItem | null;
}

const LONG_AGO = -1_000_000;
/** Radius of the ring in which a fallen player's belongings are scattered. */
const SCATTER_RADIUS = 0.75;
const LAND_NOISE_MIN_FALL = 2.5;
const LAND_NOISE_RADIUS = 10;
const SPRINT_NOISE_RADIUS = 9;
const SPRINT_NOISE_INTERVAL = 20;

export class Simulation {
  readonly matchId: string;
  readonly map: MapDefinition;
  readonly world: World;
  readonly movement: MovementConfig;
  readonly rules: MatchRules;
  readonly seed: number;
  readonly players = new Map<string, SimPlayer>();
  /** Participants in join order: the order in which a tick visits them (rotated every tick). */
  readonly roster: SimPlayer[] = [];
  readonly loot = new Map<number, LootItem>();
  tick = 0;
  phase: MatchPhase;
  /** Tick at which the match went live. */
  activeSinceTick = 0;
  result: MatchResult | null = null;
  /** Navigation data, built the first time a bot that walks joins. */
  nav: NavGraph | null = null;
  pathFinder: PathFinder | null = null;
  /** Noises made during the previous tick: what bots can hear now. */
  heardNoises: NoiseEvent[] = [];

  private pendingNoises: NoiseEvent[] = [];
  private events: MatchEvent[] = [];
  private eventSeq = 0;
  private nextLootId = 1;
  private nextWeaponInstanceId = 1;
  private readonly lootRespawns: Array<{ spawnIndex: number; atTick: number }> = [];
  private readonly characterEvents: CharacterEvent[] = [];
  private readonly ground = makeGroundInfo();
  private readonly botInput = neutralInput();

  constructor(options: SimulationOptions) {
    if (!options.matchId) throw new Error('matchId is required');
    if (options.map.spawns.length === 0) throw new Error('map has no spawn points');
    const rules = options.rules ?? TRAINING_COURSE_RULES;
    validateRules(rules);
    for (const spawn of options.map.loot) validateLootSpawn(spawn);
    this.matchId = options.matchId;
    this.map = options.map;
    this.movement = options.movement ?? DEFAULT_MOVEMENT;
    this.rules = rules;
    this.seed = (options.seed ?? hashString(options.matchId)) >>> 0;
    this.world = buildWorld(options.map);
    this.phase = rules.warmupTicks > 0 ? 'warmup' : 'active';
    if (rules.combat) for (let i = 0; i < this.map.loot.length; i++) this.spawnMapLoot(i);
  }

  get elapsedSeconds(): number {
    return this.tick * DT;
  }

  /** Ticks left of the countdown before the match goes live. */
  get warmupTicksLeft(): number {
    return this.phase === 'warmup' ? Math.max(0, this.rules.warmupTicks - this.tick) : 0;
  }

  addPlayer(init: PlayerInit): SimPlayer {
    if (!init.id) throw new Error('player id is required');
    if (this.players.has(init.id)) throw new Error(`duplicate player id: ${init.id}`);
    const spawnIndex = init.spawnIndex ?? this.players.size % this.map.spawns.length;
    const spawn = this.map.spawns[spawnIndex];
    if (!spawn) throw new Error(`spawn index out of range: ${spawnIndex}`);
    for (const entry of init.loadout ?? []) {
      if ('weaponId' in entry ? !getWeaponDef(entry.weaponId) : !getConsumableDef(entry.itemId)) throw new Error('unknown item in a player loadout');
    }

    const rngSalt = hashString(init.id);
    const brain = init.bot
      ? createBotBrain(init.bot.behavior, init.bot.skill ?? BOT_SKILLS[init.bot.difficulty ?? 'normal'], hash32(this.seed, rngSalt, 0xb07))
      : null;
    const startingAmmo = init.startingAmmo ? { ...this.rules.startingAmmo, ...init.startingAmmo } : null;

    const player: SimPlayer = {
      id: init.id,
      name: init.name,
      isBot: init.isBot ?? brain !== null,
      teamId: init.teamId ?? this.players.size,
      spawn,
      char: createCharacter(spawn.x, spawn.y, spawn.z, spawn.yaw, this.movement),
      input: neutralInput(0, spawn.yaw, 0),
      course: this.rules.course && this.map.checkpoints.length > 0 ? createCourse(this.map.checkpoints) : null,
      respawnCount: 0,
      combat: this.blankCombat(),
      aimMode: init.aimMode ?? (brain ? 'eye' : 'camera'),
      contender: init.contender ?? true,
      rngSalt,
      brain,
      loadout: init.loadout ?? null,
      startingAmmo,
      healthOverride: init.health ?? null,
      shieldOverride: init.shield ?? null,
    };
    this.placeAtSpawn(player);
    this.resetCombat(player);
    this.players.set(player.id, player);
    this.roster.push(player);
    if (brain) {
      resetBotBrain(brain, spawn.yaw, this.tick);
      if (brain.behavior === 'fighter') this.ensureNavigation();
    }
    this.emit(SIM_EVENTS.playerSpawned, player.id, { x: player.char.x, y: player.char.y, z: player.char.z });
    return player;
  }

  removePlayer(id: string): boolean {
    const player = this.players.get(id);
    if (!player) return false;
    this.players.delete(id);
    const index = this.roster.indexOf(player);
    if (index >= 0) this.roster.splice(index, 1);
    return true;
  }

  getPlayer(id: string): SimPlayer | undefined {
    return this.players.get(id);
  }

  /** Contenders still alive (target dummies never count). */
  aliveContenders(): number {
    let alive = 0;
    for (const player of this.roster) if (player.contender && player.combat.aliveState === 'alive') alive++;
    return alive;
  }

  /**
   * Advances the whole match by one tick.
   * @param inputFor returns this tick's intent for a human player; undefined = "no new input".
   *                 Bots are driven by the simulation and never consult it.
   */
  step(inputFor: (playerId: string) => InputFrame | undefined): void {
    this.tick++;
    if (this.phase === 'warmup' && this.tick > this.rules.warmupTicks) {
      this.phase = 'active';
      this.activeSinceTick = this.tick;
      this.emit(SIM_EVENTS.matchPhaseChanged, '', { phase: 'active' });
      this.resolveIfDecided(null);
    }
    this.processRespawns();
    if (this.phase === 'active' && this.rules.showdown.enabled) this.updateShowdown();

    // Bots hear what happened during the previous tick.
    const heard = this.pendingNoises;
    this.pendingNoises = this.heardNoises;
    this.pendingNoises.length = 0;
    this.heardNoises = heard;

    // Start from a different participant every tick so nobody always acts first.
    const count = this.roster.length;
    const first = count > 0 ? this.tick % count : 0;
    for (let n = 0; n < count; n++) {
      const player = this.roster[(first + n) % count];
      if (player) this.stepPlayer(player, inputFor);
    }
  }

  /** Sends a player back to the start line and resets their course clock. */
  restartCourse(playerId: string): boolean {
    const player = this.players.get(playerId);
    if (!player || !player.course) return false;
    resetCourse(player.course);
    this.placeAtSpawn(player);
    this.emit(SIM_EVENTS.courseRestarted, player.id);
    return true;
  }

  /** Returns and clears the events emitted since the last call. */
  drainEvents(): MatchEvent[] {
    const out = this.events;
    this.events = [];
    return out;
  }

  /* ---- services used by the combat and bot modules ----------------------------------------- */

  /** Records an event. Public for the systems of the simulation; not for clients. */
  emit(type: string, playerId: string, data?: Record<string, unknown>): void {
    const event: MatchEvent = {
      id: `${this.matchId}:${this.tick}:${this.eventSeq++}`,
      type,
      playerId,
      atTick: this.tick,
      ...(data ? { data } : {}),
    };
    this.events.push(event);
  }

  /** A sound bots may react to on the next tick. */
  addNoise(x: number, y: number, z: number, radius: number, source: SimPlayer): void {
    this.pendingNoises.push({ x, y, z, radius, sourceId: source.id, teamId: source.teamId });
  }

  /**
   * The only way anyone loses health. Shield absorbs first (src/core/combat.ts); nothing is
   * applied outside the live phase, to the already eliminated, or during spawn protection.
   * @returns true when damage was applied
   */
  dealDamage(target: SimPlayer, amount: number, info: DamageInfo): boolean {
    if (this.phase !== 'active') return false;
    const combat = target.combat;
    if (combat.aliveState !== 'alive') return false;
    if (this.tick < combat.protectedUntilTick) return false;
    if (!(amount > 0) || !Number.isFinite(amount)) return false;
    let incoming = amount;
    if (info.attacker !== null && info.attacker !== target && info.attacker.brain !== null && target.brain !== null) {
      incoming = Math.max(1, Math.round(amount * this.rules.botVsBotDamageScale));
    }

    const hadShield = combat.stats.shield > 0;
    const result = applyDamage(combat.stats, incoming);
    combat.stats = result.next;
    const dealt = result.shieldDamage + result.healthDamage;
    combat.totals.damageTaken += dealt;
    combat.lastDamageTick = this.tick;
    const attacker = info.attacker !== null && info.attacker !== target ? info.attacker : null;
    combat.lastAttackerId = attacker ? attacker.id : null;
    if (attacker) {
      attacker.combat.totals.damageDealt += dealt;
      if (info.headshot) attacker.combat.totals.headshots++;
    }

    const origin = attacker ? attacker.char : target.char;
    this.emit(SIM_EVENTS.damageDealt, attacker ? attacker.id : target.id, {
      targetId: target.id,
      cause: info.cause,
      amount: dealt,
      shieldDamage: result.shieldDamage,
      healthDamage: result.healthDamage,
      shieldBroken: hadShield && result.next.shield <= 0,
      headshot: info.headshot === true,
      eliminated: result.eliminated,
      weaponId: info.weaponId ?? null,
      distance: info.distance ?? 0,
      pellets: info.pellets ?? 1,
      x: info.x,
      y: info.y,
      z: info.z,
      fromX: origin.x,
      fromY: origin.y,
      fromZ: origin.z,
      health: result.next.health,
      shield: result.next.shield,
    });
    if (result.eliminated) this.eliminate(target, attacker, info);
    return true;
  }

  /** Creates an item on the ground and returns it. */
  spawnLoot(content: LootContent, x: number, y: number, z: number, spawnIndex = -1): LootItem {
    const item: LootItem = {
      id: this.nextLootId++,
      kind: content.kind,
      defId: content.defId,
      count: content.kind === 'weapon' ? 1 : content.count,
      weapon: content.weapon,
      x,
      y,
      z,
      spawnIndex,
    };
    this.loot.set(item.id, item);
    this.emit(SIM_EVENTS.lootSpawned, '', { lootId: item.id, kind: item.kind, defId: item.defId, count: item.count, x, y, z });
    return item;
  }

  /**
   * Drops something next to a player, resting on the ground.
   * @param scatterIndex -1 = at the feet; 0.. = positions around the player (a fallen inventory)
   */
  dropLoot(player: SimPlayer, content: LootContent, scatterIndex = -1): LootItem {
    const c = player.char;
    let x = c.x;
    let z = c.z;
    if (scatterIndex >= 0) {
      const angle = scatterIndex * 2.399963;
      x += Math.cos(angle) * SCATTER_RADIUS;
      z += Math.sin(angle) * SCATTER_RADIUS;
    }
    let y = this.restingHeight(x, z, c.y);
    if (scatterIndex >= 0 && this.world.overlapsSolid(x, z, 0.2, y + 0.1, y + 0.6)) {
      x = c.x;
      z = c.z;
      y = this.restingHeight(x, z, c.y);
    }
    return this.spawnLoot(content, x, y, z);
  }

  /** Takes an item out of the world. Map pickups may come back later, depending on the rules. */
  removeLoot(item: LootItem): void {
    if (!this.loot.delete(item.id)) return;
    if (item.spawnIndex >= 0 && this.rules.lootRespawnTicks > 0) {
      this.lootRespawns.push({ spawnIndex: item.spawnIndex, atTick: this.tick + this.rules.lootRespawnTicks });
    }
  }

  /* ---------------------------------------------------------------------------------------- */

  private stepPlayer(player: SimPlayer, inputFor: (playerId: string) => InputFrame | undefined): void {
    const combat = player.combat;
    if (combat.aliveState !== 'alive') return;

    if (player.brain) {
      thinkBot(this, player, player.brain, this.botInput);
      sanitizeInput(this.botInput, player.input);
    } else {
      const raw = inputFor(player.id);
      if (raw) sanitizeInput(raw, player.input);
      else releaseInput(player.input); // keeps looking the same way, stops pressing everything
    }
    // Countdown: everyone may look around, nobody moves or acts.
    if (this.phase === 'warmup') releaseInput(player.input);

    const live = this.rules.combat && this.phase === 'active';
    if (live) applyCombatMovement(player);

    const events = this.characterEvents;
    events.length = 0;
    stepCharacter(player.char, player.input, this.world, this.movement, DT, events);
    for (let i = 0; i < events.length; i++) this.handleCharacterEvent(player, events[i]!);
    if (combat.aliveState !== 'alive') return; // the fall was fatal

    if (player.char.moveState === 'sprint' && (this.tick + player.rngSalt) % SPRINT_NOISE_INTERVAL === 0) {
      this.addNoise(player.char.x, player.char.y, player.char.z, SPRINT_NOISE_RADIUS, player);
    }
    if (player.course) this.updatePlayerCourse(player);
    if (live) updateCombat(this, player);
  }

  private updatePlayerCourse(player: SimPlayer): void {
    const course = player.course!;
    const c = player.char;
    const moving = player.input.moveX !== 0 || player.input.moveZ !== 0 || player.input.jump;
    const update = updateCourse(course, this.tick, c.x, c.y + c.height * 0.5, c.z, moving);
    if (!update) return;
    const split = course.splits[update.reachedIndex] ?? 0;
    this.emit(SIM_EVENTS.checkpointReached, player.id, {
      index: update.reachedIndex,
      total: course.checkpoints.length,
      splitTicks: split,
    });
    if (update.finished) {
      this.emit(SIM_EVENTS.courseCompleted, player.id, { ticks: split, checkpoints: course.checkpoints.length });
    }
  }

  private handleCharacterEvent(player: SimPlayer, event: CharacterEvent): void {
    const c = player.char;
    switch (event.type) {
      case 'jump':
        this.emit(SIM_EVENTS.playerJumped, player.id);
        break;
      case 'land': {
        this.emit(SIM_EVENTS.playerLanded, player.id, {
          fallHeight: event.fallHeight,
          impactSpeed: event.impactSpeed,
          material: event.material,
        });
        if (event.fallHeight > LAND_NOISE_MIN_FALL) this.addNoise(c.x, c.y, c.z, LAND_NOISE_RADIUS, player);
        const fall = this.rules.fallDamage;
        if (this.rules.combat && fall.enabled && event.fallHeight > fall.startMeters) {
          const amount = Math.round((event.fallHeight - fall.startMeters) * fall.perMeter);
          this.dealDamage(player, amount, { attacker: null, cause: 'fall', x: c.x, y: c.y, z: c.z });
        }
        break;
      }
      case 'slide_start':
        this.emit(SIM_EVENTS.slideStarted, player.id);
        break;
      case 'mantle_start':
        this.emit(SIM_EVENTS.mantleStarted, player.id, { height: event.height });
        break;
      case 'void':
        if (this.rules.combat && this.rules.voidOutcome === 'eliminate' && this.phase === 'active') {
          this.eliminate(player, null, { attacker: null, cause: 'void', x: c.x, y: c.y, z: c.z });
        } else {
          player.respawnCount++;
          this.placeAtSpawn(player);
          this.emit(SIM_EVENTS.playerRespawned, player.id, { reason: 'void' });
        }
        break;
      case 'invalid_state':
        this.emit(SIM_EVENTS.simulationError, player.id, { code: 'E_CHARACTER_NAN' });
        break;
      case 'slide_end':
      case 'mantle_end':
        break;
    }
  }

  /* ---- elimination, respawn and the end of the match --------------------------------------- */

  /** Takes a player out. Idempotent: an eliminated player cannot be eliminated again. */
  private eliminate(target: SimPlayer, attacker: SimPlayer | null, info: DamageInfo): void {
    const combat = target.combat;
    if (combat.aliveState !== 'alive') return;
    const aliveBefore = this.aliveContenders();
    combat.aliveState = 'eliminated';
    combat.stats = { ...combat.stats, health: 0, alive: false };
    combat.eliminatedAtTick = this.tick;
    combat.eliminatedBy = attacker ? attacker.id : null;
    combat.reload = null;
    combat.use = null;
    combat.adsBlend = 0;
    combat.fireHeld = false;
    if (target.contender && this.rules.win !== 'none') combat.placement = aliveBefore;
    if (attacker) attacker.combat.totals.eliminations++;

    const c = target.char;
    this.emit(SIM_EVENTS.playerEliminated, target.id, {
      byId: attacker ? attacker.id : null,
      cause: info.cause,
      weaponId: info.weaponId ?? null,
      headshot: info.headshot === true,
      placement: combat.placement,
      x: c.x,
      y: c.y,
      z: c.z,
    });

    if (this.rules.dropLootOnElimination) this.dropInventory(target);
    if (this.rules.respawn === 'timer') combat.respawnAtTick = this.tick + this.rules.respawnDelayTicks;
    this.resolveIfDecided(target);
  }

  private dropInventory(player: SimPlayer): void {
    const inventory = player.combat.inventory;
    let index = 0;
    for (let slot = 0; slot < INVENTORY_SLOTS; slot++) {
      if (inventory.slots[slot]) dropSlot(this, player, slot, index++);
    }
    for (const type of AMMO_TYPES) {
      const amount = inventory.ammo[type];
      if (amount <= 0) continue;
      inventory.ammo[type] = 0;
      this.dropLoot(player, { kind: 'ammo', defId: type, count: amount, weapon: null }, index++);
    }
  }

  /**
   * Ends the match when at most one team is left. Runs after every elimination and is guarded by
   * the phase, so two eliminations in the same tick can never produce two winners. If everybody
   * fell in the same tick, the one eliminated last is the winner.
   */
  private resolveIfDecided(lastEliminated: SimPlayer | null): void {
    if (this.rules.win !== 'last_team_alive' || this.phase !== 'active' || this.result) return;
    let winnerTeamId: number | null = null;
    let teamsAlive = 0;
    for (const player of this.roster) {
      if (!player.contender || player.combat.aliveState !== 'alive') continue;
      if (teamsAlive === 0 || player.teamId !== winnerTeamId) {
        if (teamsAlive > 0) return; // two different teams still standing
        winnerTeamId = player.teamId;
        teamsAlive = 1;
      }
    }
    if (teamsAlive === 0) winnerTeamId = lastEliminated ? lastEliminated.teamId : null;

    this.phase = 'results';
    const winnerIds: string[] = [];
    const placements: PlacementEntry[] = [];
    for (const player of this.roster) {
      if (!player.contender) continue;
      if (player.teamId === winnerTeamId) {
        player.combat.placement = 1;
        winnerIds.push(player.id);
      }
      placements.push({
        id: player.id,
        name: player.name,
        isBot: player.isBot,
        teamId: player.teamId,
        placement: player.combat.placement ?? 1,
        eliminations: player.combat.totals.eliminations,
        damageDealt: player.combat.totals.damageDealt,
      });
    }
    placements.sort((a, b) => a.placement - b.placement || a.id.localeCompare(b.id));
    this.result = {
      winnerTeamId,
      winnerIds,
      endedAtTick: this.tick,
      activeTicks: this.tick - this.activeSinceTick,
      placements,
    };
    this.emit(SIM_EVENTS.matchPhaseChanged, '', { phase: 'results' });
    this.emit(SIM_EVENTS.matchEnded, '', { winnerTeamId, winnerIds: [...winnerIds], activeTicks: this.result.activeTicks });
  }

  /**
   * End-game reveal: at fixed intervals, once few contenders remain or the match has run long,
   * everyone learns where everyone is. Humans get it as an event (the HUD marks the compass);
   * bots get an approximate position to go and investigate.
   */
  private updateShowdown(): void {
    const showdown = this.rules.showdown;
    const activeTicks = this.tick - this.activeSinceTick;
    if (activeTicks <= 0 || activeTicks % showdown.pingEveryTicks !== 0) return;
    const alive = this.aliveContenders();
    if (alive < 2 || (alive > showdown.contendersAtMost && activeTicks < showdown.afterTicks)) return;

    const positions: Array<{ id: string; x: number; y: number; z: number }> = [];
    for (const player of this.roster) {
      if (!player.contender || player.combat.aliveState !== 'alive') continue;
      positions.push({ id: player.id, x: player.char.x, y: player.char.y, z: player.char.z });
    }
    this.emit(SIM_EVENTS.showdownPing, '', { positions });

    for (const bot of this.roster) {
      if (!bot.brain || bot.combat.aliveState !== 'alive') continue;
      let nearest: SimPlayer | null = null;
      let nearestDistance = Infinity;
      for (const other of this.roster) {
        if (other === bot || !other.contender || other.teamId === bot.teamId || other.combat.aliveState !== 'alive') continue;
        const distance = Math.hypot(other.char.x - bot.char.x, other.char.z - bot.char.z);
        if (distance < nearestDistance) {
          nearest = other;
          nearestDistance = distance;
        }
      }
      if (nearest) notifyBotOfPing(bot.brain, this.tick, nearest.char.x, nearest.char.y, nearest.char.z);
    }
  }

  private processRespawns(): void {
    for (const player of this.roster) {
      const at = player.combat.respawnAtTick;
      if (at === null || this.tick < at) continue;
      player.respawnCount++;
      this.placeAtSpawn(player);
      this.resetCombat(player);
      if (player.brain) resetBotBrain(player.brain, player.spawn.yaw, this.tick);
      this.emit(SIM_EVENTS.playerRespawned, player.id, { reason: 'timer' });
    }
    if (this.lootRespawns.length === 0) return;
    for (let i = this.lootRespawns.length - 1; i >= 0; i--) {
      const entry = this.lootRespawns[i]!;
      if (this.tick < entry.atTick) continue;
      this.lootRespawns.splice(i, 1);
      this.spawnMapLoot(entry.spawnIndex);
    }
  }

  /* ---- setup helpers ----------------------------------------------------------------------- */

  private blankCombat(): CombatState {
    return {
      stats: { health: 1, shield: 0, maxHealth: 1, maxShield: 0, alive: true },
      aliveState: 'alive',
      inventory: createInventory(),
      adsBlend: 0,
      bloomDegrees: 0,
      fireHeld: false,
      reloadHeld: false,
      interactHeld: false,
      fireBufferTicks: 0,
      dryFireReported: false,
      equipReadyTick: 0,
      reload: null,
      use: null,
      lastShotTick: LONG_AGO,
      lastDamageTick: LONG_AGO,
      lastAttackerId: null,
      eliminatedAtTick: null,
      eliminatedBy: null,
      placement: null,
      respawnAtTick: null,
      protectedUntilTick: 0,
      totals: emptyTotals(),
    };
  }

  /** Full health, the mode's (or the participant's) loadout and clean timers. Totals persist. */
  private resetCombat(player: SimPlayer): void {
    const combat = player.combat;
    const health = player.healthOverride ?? this.rules.health;
    const shield = player.shieldOverride ?? this.rules.shield;
    combat.stats = {
      health: clamp(health.start, 1, health.max),
      shield: clamp(shield.start, 0, shield.max),
      maxHealth: health.max,
      maxShield: shield.max,
      alive: true,
    };
    combat.aliveState = 'alive';
    combat.adsBlend = 0;
    combat.bloomDegrees = 0;
    combat.fireHeld = false;
    combat.reloadHeld = false;
    combat.interactHeld = false;
    combat.fireBufferTicks = 0;
    combat.dryFireReported = false;
    combat.equipReadyTick = this.tick;
    combat.reload = null;
    combat.use = null;
    combat.lastShotTick = LONG_AGO;
    combat.lastDamageTick = LONG_AGO;
    combat.lastAttackerId = null;
    combat.eliminatedAtTick = null;
    combat.eliminatedBy = null;
    combat.placement = null;
    combat.respawnAtTick = null;
    combat.protectedUntilTick = this.tick + this.rules.spawnProtectionTicks;

    const inventory = combat.inventory;
    clearInventory(inventory);
    if (!this.rules.combat) return;
    for (const entry of player.loadout ?? this.rules.loadout) {
      if ('weaponId' in entry) {
        const def = getWeaponDef(entry.weaponId);
        const slot = findFreeSlot(inventory);
        if (def && slot >= 0) inventory.slots[slot] = makeWeaponItem(def, this.nextWeaponInstanceId++);
      } else {
        const def = getConsumableDef(entry.itemId);
        if (def) addConsumable(inventory, def, entry.count);
      }
    }
    const ammo = player.startingAmmo ?? this.rules.startingAmmo;
    for (const type of AMMO_TYPES) inventory.ammo[type] = clamp(Math.floor(ammo[type]), 0, AMMO_RESERVE_CAP);
    inventory.active = Math.max(0, findWeaponSlot(inventory));
  }

  private spawnMapLoot(spawnIndex: number): void {
    const spawn = this.map.loot[spawnIndex];
    if (!spawn) return;
    for (const item of this.loot.values()) if (item.spawnIndex === spawnIndex) return; // still there
    const y = this.restingHeight(spawn.x, spawn.z, spawn.y);
    let weapon: WeaponItem | null = null;
    if (spawn.kind === 'weapon') {
      const def = getWeaponDef(spawn.defId);
      if (!def) return;
      weapon = makeWeaponItem(def, this.nextWeaponInstanceId++);
    }
    this.spawnLoot({ kind: spawn.kind, defId: spawn.defId, count: spawn.count, weapon }, spawn.x, y, spawn.z, spawnIndex);
  }

  /** Height of the surface an item dropped near `nearY` comes to rest on. */
  private restingHeight(x: number, z: number, nearY: number): number {
    return this.world.groundAt(x, z, nearY + this.movement.stepHeight, 0.05, this.ground) ? this.ground.y : nearY;
  }

  /** Builds the navigation graph from the spawn points (once per match). */
  private ensureNavigation(): void {
    if (this.nav) return;
    const seeds: NavPoint[] = [];
    for (const spawn of this.map.spawns) {
      seeds.push({ x: spawn.x, y: this.restingHeight(spawn.x, spawn.z, spawn.y), z: spawn.z });
    }
    const graph = buildNavGraph(this.world, this.movement, { seeds });
    if (graph.count === 0) throw new Error(`map "${this.map.id}" has no walkable space around its spawn points`);
    this.nav = graph;
    this.pathFinder = new PathFinder(graph);
  }

  /** Puts a character on the ground at its spawn point with a clean movement state. */
  private placeAtSpawn(player: SimPlayer): void {
    const cfg = this.movement;
    const spawn: SpawnPoint = player.spawn;
    const fresh = createCharacter(spawn.x, spawn.y, spawn.z, spawn.yaw, cfg);
    if (this.world.groundAt(spawn.x, spawn.z, spawn.y + cfg.stepHeight, cfg.supportRadius, this.ground)) {
      fresh.y = this.ground.y;
      fresh.grounded = true;
      fresh.ticksSinceGrounded = 0;
      fresh.groundColliderId = this.ground.colliderId;
      fresh.groundMaterial = this.ground.material;
      fresh.moveState = 'idle';
      fresh.peakY = fresh.y;
    }
    if (this.world.overlapsSolid(fresh.x, fresh.z, cfg.radius * 0.95, fresh.y + 0.05, fresh.y + cfg.standHeight)) {
      throw new Error(`spawn point of map "${this.map.id}" is blocked at (${spawn.x}, ${spawn.y}, ${spawn.z})`);
    }
    Object.assign(player.char, fresh);
    player.input.yaw = spawn.yaw;
    player.input.pitch = 0;
  }
}
