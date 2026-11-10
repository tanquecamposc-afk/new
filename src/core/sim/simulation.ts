/**
 * The match simulation: owns the collision world and every character, and advances all of it by
 * one fixed tick per `step()` call. It is the single source of truth — renderer, HUD and audio
 * only read from it and react to the events it emits.
 *
 * Nothing here touches the DOM, the clock or Math.random, so the same class can run inside a
 * browser tab today and inside an authoritative Node server later.
 */
import type { MatchEvent } from '../types.js';
import { DEFAULT_MOVEMENT, DT, type MovementConfig } from './config.js';
import {
  createCharacter,
  stepCharacter,
  type CharacterEvent,
  type CharacterState,
} from './character.js';
import { createCourse, resetCourse, updateCourse, type CourseState } from './course.js';
import { neutralInput, sanitizeInput, type InputFrame } from './input.js';
import { buildWorld, type MapDefinition, type SpawnPoint } from './map.js';
import { makeGroundInfo, type World } from './world.js';

export const SIM_EVENTS = Object.freeze({
  playerSpawned: 'PlayerSpawned',
  playerRespawned: 'PlayerRespawned',
  playerJumped: 'PlayerJumped',
  playerLanded: 'PlayerLanded',
  slideStarted: 'SlideStarted',
  mantleStarted: 'MantleStarted',
  checkpointReached: 'CheckpointReached',
  courseCompleted: 'CourseCompleted',
  courseRestarted: 'CourseRestarted',
  simulationError: 'SimulationError',
} as const);

export interface SimPlayer {
  readonly id: string;
  readonly name: string;
  readonly isBot: boolean;
  readonly teamId: number;
  readonly spawn: SpawnPoint;
  readonly char: CharacterState;
  /** Last sanitized input (look direction persists when no new input arrives). */
  readonly input: InputFrame;
  /** Per-player training course, when the map defines checkpoints. */
  readonly course: CourseState | null;
  respawnCount: number;
}

export interface PlayerInit {
  id: string;
  name: string;
  isBot?: boolean;
  teamId?: number;
  spawnIndex?: number;
}

export interface SimulationOptions {
  matchId: string;
  map: MapDefinition;
  movement?: MovementConfig;
}

export class Simulation {
  readonly matchId: string;
  readonly map: MapDefinition;
  readonly world: World;
  readonly movement: MovementConfig;
  readonly players = new Map<string, SimPlayer>();
  tick = 0;

  private events: MatchEvent[] = [];
  private eventSeq = 0;
  private readonly characterEvents: CharacterEvent[] = [];
  private readonly ground = makeGroundInfo();

  constructor(options: SimulationOptions) {
    if (!options.matchId) throw new Error('matchId is required');
    if (options.map.spawns.length === 0) throw new Error('map has no spawn points');
    this.matchId = options.matchId;
    this.map = options.map;
    this.movement = options.movement ?? DEFAULT_MOVEMENT;
    this.world = buildWorld(options.map);
  }

  get elapsedSeconds(): number {
    return this.tick * DT;
  }

  addPlayer(init: PlayerInit): SimPlayer {
    if (!init.id) throw new Error('player id is required');
    if (this.players.has(init.id)) throw new Error(`duplicate player id: ${init.id}`);
    const spawnIndex = init.spawnIndex ?? this.players.size % this.map.spawns.length;
    const spawn = this.map.spawns[spawnIndex];
    if (!spawn) throw new Error(`spawn index out of range: ${spawnIndex}`);

    const char = createCharacter(spawn.x, spawn.y, spawn.z, spawn.yaw, this.movement);
    const player: SimPlayer = {
      id: init.id,
      name: init.name,
      isBot: init.isBot ?? false,
      teamId: init.teamId ?? this.players.size,
      spawn,
      char,
      input: neutralInput(0, spawn.yaw, 0),
      course: this.map.checkpoints.length > 0 ? createCourse(this.map.checkpoints) : null,
      respawnCount: 0,
    };
    this.placeAtSpawn(player);
    this.players.set(player.id, player);
    this.emit(SIM_EVENTS.playerSpawned, player.id, { x: char.x, y: char.y, z: char.z });
    return player;
  }

  removePlayer(id: string): boolean {
    return this.players.delete(id);
  }

  getPlayer(id: string): SimPlayer | undefined {
    return this.players.get(id);
  }

  /**
   * Advances the whole match by one tick.
   * @param inputFor returns this tick's intent for a player; undefined means "no new input".
   */
  step(inputFor: (playerId: string) => InputFrame | undefined): void {
    this.tick++;
    for (const player of this.players.values()) {
      const raw = inputFor(player.id);
      if (raw) {
        sanitizeInput(raw, player.input);
      } else {
        // No input this tick: keep looking the same way, stop pressing everything.
        player.input.moveX = 0;
        player.input.moveZ = 0;
        player.input.jump = false;
        player.input.sprint = false;
        player.input.crouch = false;
      }

      const events = this.characterEvents;
      events.length = 0;
      stepCharacter(player.char, player.input, this.world, this.movement, DT, events);
      for (let i = 0; i < events.length; i++) this.handleCharacterEvent(player, events[i]!);

      if (player.course) this.updatePlayerCourse(player);
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

  /* ---------------------------------------------------------------------------------------- */

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
    switch (event.type) {
      case 'jump':
        this.emit(SIM_EVENTS.playerJumped, player.id);
        break;
      case 'land':
        this.emit(SIM_EVENTS.playerLanded, player.id, {
          fallHeight: event.fallHeight,
          impactSpeed: event.impactSpeed,
          material: event.material,
        });
        break;
      case 'slide_start':
        this.emit(SIM_EVENTS.slideStarted, player.id);
        break;
      case 'mantle_start':
        this.emit(SIM_EVENTS.mantleStarted, player.id, { height: event.height });
        break;
      case 'void':
        player.respawnCount++;
        this.placeAtSpawn(player);
        this.emit(SIM_EVENTS.playerRespawned, player.id, { reason: 'void' });
        break;
      case 'invalid_state':
        this.emit(SIM_EVENTS.simulationError, player.id, { code: 'E_CHARACTER_NAN' });
        break;
      case 'slide_end':
      case 'mantle_end':
        break;
    }
  }

  /** Puts a character on the ground at its spawn point with a clean movement state. */
  private placeAtSpawn(player: SimPlayer): void {
    const cfg = this.movement;
    const spawn = player.spawn;
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

  private emit(type: string, playerId: string, data?: Record<string, unknown>): void {
    const event: MatchEvent = {
      id: `${this.matchId}:${this.tick}:${this.eventSeq++}`,
      type,
      playerId,
      atTick: this.tick,
      ...(data ? { data } : {}),
    };
    this.events.push(event);
  }
}
