/**
 * Game orchestrator: owns the per-frame update order and the state machine.
 *   input → time → events → AI → player/physics → interaction → hazards → lighting → HUD
 * Each GamePhase decides which systems run.
 */
import { G, emptyRun, useGame } from './core/store';
import { world } from './core/world';
import { Input } from './core/input';
import { LOOP_SECONDS, formatClock, DEBUG } from './core/constants';
import { sequence, beats, tickLater } from './core/timeline';
import type { GamePhase } from './core/types';
import { updatePlayer } from './systems/PlayerSystem';
import { updateCrates } from './physics/character';
import { updateDoors } from './systems/DoorSystem';
import { updateLighting } from './systems/LightingSystem';
import { updateEvents } from './systems/EventSystem';
import { updateInteraction } from './systems/InteractionSystem';
import { updateAnomalies } from './systems/AnomalySystem';
import { updateNPCs } from './ai/NPCs';
import { updateObserver } from './ai/Observer';
import { LoopSystem } from './systems/LoopSystem';
import { Cutscenes } from './systems/Cutscenes';
import { Endings } from './systems/EndingSystem';
import { Flow, isPlayPhase } from './systems/Flow';
import { SaveSystem } from './systems/SaveSystem';
import { Memory } from './systems/MemorySystem';
import { Audio } from './audio/AudioEngine';
import { view } from './core/view';
import { roomAt } from './data/level';
import { at } from './core/constants';

interface PhaseRules { time: boolean; ai: boolean; move: boolean; interact: boolean; }
const RULES: Record<GamePhase, PhaseRules> = {
  MENU: { time: false, ai: false, move: false, interact: false },
  LOADING: { time: false, ai: false, move: false, interact: false },
  PLAYING: { time: true, ai: true, move: true, interact: true },
  CHASE: { time: true, ai: true, move: true, interact: true },
  DANGER: { time: true, ai: true, move: true, interact: true },
  PAUSED: { time: false, ai: false, move: false, interact: false },
  DIALOGUE: { time: true, ai: true, move: false, interact: false },
  PUZZLE: { time: true, ai: true, move: false, interact: false },
  CUTSCENE: { time: true, ai: true, move: false, interact: false },
  DEATH: { time: false, ai: true, move: false, interact: false },
  RESET: { time: false, ai: false, move: false, interact: false },
  ENDING: { time: false, ai: false, move: false, interact: false },
  NEW_GAME_PLUS: { time: false, ai: false, move: false, interact: false },
};

let hudTimer = 0;
let playTimeAcc = 0;

export const Game = {
  rules: (p: GamePhase) => RULES[p],

  update(rawDt: number): void {
    const dt = Math.min(rawDt, 1 / 20);
    const phase = G().phase;
    const rules = RULES[phase];

    sequence.update(dt);
    beats.update(dt);
    if (phase !== 'PAUSED') tickLater(dt);
    Cutscenes.update();

    // global keys
    if (isPlayPhase(phase)) {
      if (Input.consume('Tab')) Flow.openMemory();
      if (Input.consume('Escape')) Flow.pause();
    } else if (phase === 'PAUSED') {
      if (Input.consume('Tab') && G().panel === 'memory') Flow.unpause();
    }
    if (DEBUG) debugKeys();

    const scaled = dt * world.timeScale;
    // ── time ──
    if (rules.time && !world.frozen) {
      const ff = world.fastForward ? 14 : 1;
      world.t += scaled * ff;
      if (world.t >= LOOP_SECONDS) {
        world.t = LOOP_SECONDS;
        if (!world.final.active || !world.final.broken) LoopSystem.triggerReset();
      }
    }
    if (rules.time && !world.frozen) updateEvents(scaled);
    // ── AI ──
    if (rules.ai && !world.frozen) {
      updateNPCs(scaled);
      updateObserver(scaled);
    }
    // ── player / physics ──
    if (phase !== 'MENU' && phase !== 'RESET' && phase !== 'ENDING' && phase !== 'PAUSED') {
      updatePlayer(scaled, rules.move && !world.fastForward);
      if (!world.frozen) updateCrates(scaled);
      updateDoors(scaled);
    }
    if (rules.time && !world.frozen) updateAnomalies(scaled);
    updateInteraction(dt, rules.interact);
    if (phase !== 'PAUSED') updateLighting(dt);
    if (world.final.active) Endings.updateFinal(scaled);

    // ── first time inside the Temporal Core ──
    if (isPlayPhase(G().phase) && world.player.room === 'CORE' && !Memory.hasFlag('coreSeen')) {
      Memory.setFlag('coreSeen');
      Cutscenes.coreDiscovery(() => undefined);
    }

    // ── death ──
    if (world.player.health <= 0 && !world.player.dead && isPlayPhase(phase)) LoopSystem.die();

    // ── fast-forward (waiting on the bed) stops on events that matter ──
    if (world.fastForward && (world.t >= LOOP_SECONDS - 1 || !isPlayPhase(phase))) { world.fastForward = false; world.player.action = null; }

    // ── derived phases: CHASE / DANGER ──
    if (isPlayPhase(G().phase)) {
      const chase = world.observer.mode === 'HUNTING';
      const danger = !chase && ((world.t >= at('12:59') && ['REACTOR', 'MAINT', 'RR_CORR'].includes(world.player.room)) || world.player.health < 35);
      const next: GamePhase = chase ? 'CHASE' : danger ? 'DANGER' : 'PLAYING';
      if (next !== G().phase) G().setPhase(next);
    }

    // ── effects decay ──
    world.shake = Math.max(0, world.shake - dt * 0.8);
    world.fovBoost = Math.max(0, world.fovBoost - dt * 4);
    world.distortion = Math.max(0, world.distortion - dt * (world.final.active ? 0.2 : 0.5));
    if (world.player.sprinting) world.fovBoost = Math.max(world.fovBoost, 5);

    // ── music by situation ──
    if (isPlayPhase(G().phase)) chooseMood();

    // ── audio listener + emitters ──
    Audio.update(dt, { pos: view.camPos, forward: view.camDir });
    updateEmitters();
    Audio.setDuck(world.flags.has('blackout') && !world.generators.every(Boolean) ? 0.35 : world.final.stage >= 5 && !world.final.broken ? 0 : 1);

    // ── HUD refresh (low frequency) ──
    hudTimer -= dt;
    if (hudTimer <= 0) {
      hudTimer = 0.1;
      const p = world.player;
      const room = roomAt(p.pos.x, p.pos.z);
      G().setHud({
        clock: formatClock(world.t),
        seconds: formatClock(world.t, true).slice(6),
        health: Math.round(p.health),
        battery: Math.round(p.battery),
        flashlight: p.flashlightOn,
        hasFlashlight: world.inventory.includes('flashlight'),
        stamina: Math.round(p.stamina * 20) / 20,
        area: room?.name ?? '',
        danger: world.observer.mode === 'HUNTING' ? 'RUN' : world.t >= at('12:59:30') && p.room === 'REACTOR' ? 'RADIATION' : null,
        timeFrozen: world.frozen && world.final.active,
        fastForward: world.fastForward,
      });
      G().pruneSubtitles();
    }
    if (isPlayPhase(phase)) {
      playTimeAcc += dt;
      if (playTimeAcc > 10) { const add = playTimeAcc; playTimeAcc = 0; G().setProfile((pr) => ({ ...pr, playTime: pr.playTime + add })); }
    }
  },

  /** START: a brand-new run (keeps lifetime profile, achievements and endings). */
  newGame(ngPlus = false): void {
    Audio.init();
    Audio.resume();
    const ng = ngPlus ? G().run.ngPlus + 1 || 1 : 0;
    useGame.setState({ run: { ...emptyRun(ngPlus ? Math.max(1, ng) : 0), started: true }, ending: null });
    if (ngPlus) G().setPhase('NEW_GAME_PLUS');
    SaveSystem.save();
    LoopSystem.beginLoop('intro');
  },

  /** CONTINUE: resume the run at the start of the current loop (12:47). */
  continueGame(): void {
    Audio.init();
    Audio.resume();
    useGame.setState({ ending: null });
    LoopSystem.beginLoop('continue');
  },
};

function chooseMood(): void {
  const ph = G().phase;
  if (world.final.active) { Audio.setMood(world.final.stage >= 5 ? 'SILENCE' : 'DANGER'); return; }
  if (ph === 'CHASE') { Audio.setMood('CHASE'); return; }
  if (world.t >= at('12:59')) { Audio.setMood('DANGER'); return; }
  if (world.t >= at('12:57') || world.flags.has('blackout')) { Audio.setMood('TENSION'); return; }
  const area = roomAt(world.player.pos.x, world.player.pos.z)?.area;
  if (area === 'UNKNOWN' || area === 'TEMPORAL_CORE' || area === 'ARCHIVES') { Audio.setMood('MYSTERY'); return; }
  Audio.setMood('EXPLORATION');
}

function updateEmitters(): void {
  if (!Audio.ready) return;
  const active = G().phase !== 'MENU';
  Audio.emitter('reactor', 'reactor', { x: 24.5, y: 2, z: 18 }, active);
  Audio.emitter('core', 'core', { x: 7.5, y: 3, z: -24.5 }, active);
  Audio.emitter('phone', 'phone', { x: -8.1, y: 1, z: -5.6 }, active && world.phoneRinging);
  Audio.emitter('radio', 'radio', { x: -6.6, y: 1.2, z: 20.65 }, active);
  Audio.emitter('srv_sec', 'server', { x: 4.8, y: 1, z: 13.6 }, active);
  Audio.emitter('srv_res', 'server', { x: 22.7, y: 1, z: 7.1 }, active);
  Audio.emitter('fan_hub', 'fan', { x: -9.8, y: 3, z: 4 }, active);
  Audio.emitter('alarm', 'alarm', { x: view.camPos.x, y: view.camPos.y + 3, z: view.camPos.z }, active && world.light.alarm && G().phase !== 'RESET');
  Audio.emitter('arc', 'arc', { x: -4, y: 1.3, z: 18.55 }, active);
  world.generators.forEach((on, i) => Audio.emitter(`gen${i}`, 'generator', [{ x: -11, y: 1, z: 20.7 }, { x: 9, y: 1, z: 20.7 }, { x: 30.2, y: 1, z: 23.9 }][i], active && on));
}

function debugKeys(): void {
  if (Input.consume('F6')) world.t = Math.min(LOOP_SECONDS - 1, world.t + 30);
  if (Input.consume('F7')) world.t = Math.min(LOOP_SECONDS - 1, world.t + 5);
  if (Input.consume('F8')) world.t = LOOP_SECONDS - 3;
}

// Debug / test hook
if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__loop13 = { world, G, Game, view, LoopSystem, Input };
}
