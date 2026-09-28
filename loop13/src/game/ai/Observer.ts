/**
 * THE OBSERVER — not an enemy, a presence.
 * States: DORMANT · WATCHING · FOLLOWING · HUNTING · DISAPPEARING · MANIPULATING
 * Progression (see observerStage): cameras only → distant → follows → hunts → direct contact.
 */
import { world, type ObserverMode } from '../core/world';
import { at } from '../core/constants';
import { view } from '../core/view';
import { findPath, isWalkable } from './nav';
import { lineOfSight } from '../physics/colliders';
import { dampAngle, clamp } from '../core/rng';
import { observerStage, chaseThisLoop } from '../systems/Progression';
import { Memory, Achievements } from '../systems/MemorySystem';
import { Audio } from '../audio/AudioEngine';
import { G } from '../core/store';
import { roomAt } from '../data/level';
import { damagePlayer } from '../systems/PlayerSystem';
import { say } from '../systems/Voice';
import { Cutscenes } from '../systems/Cutscenes';

const O = () => world.observer;
const ARCHIVE_SPOT = { x: -8.9, z: -18.7 };

function setMode(m: ObserverMode): void {
  const o = O();
  if (o.mode === m) return;
  o.mode = m;
  o.timer = 0;
  o.seenTime = 0;
}

export function hideObserver(cooldown = 25): void {
  const o = O();
  setMode('DORMANT');
  o.visible = false;
  o.cctvOnly = false;
  o.interactive = false;
  o.opacity = 0;
  o.pos.set(0, -50, 0);
  o.cooldown = cooldown;
}

/** Is the Observer currently on screen for the player (view cone + line of sight)? */
export function playerSeesObserver(): boolean {
  const o = O();
  if (!o.visible || o.cctvOnly || o.opacity < 0.3) return false;
  const c = view.camPos;
  const dx = o.pos.x - c.x, dy = o.pos.y + 1.5 - c.y, dz = o.pos.z - c.z;
  const d = Math.hypot(dx, dy, dz);
  if (d > 38) return false;
  const dot = (dx * view.camDir.x + dy * view.camDir.y + dz * view.camDir.z) / d;
  if (dot < Math.cos((view.fov * 0.5 * Math.PI) / 180) * 0.92) return false;
  return lineOfSight(c.x, c.y, c.z, o.pos.x, o.pos.y + 1.5, o.pos.z);
}

function faceP(dt: number): void {
  const o = O(), p = world.player.pos;
  o.yaw = dampAngle(o.yaw, Math.atan2(p.x - o.pos.x, p.z - o.pos.z), 3, dt);
}

/** Find a spot ~dist metres from the player, visible along the camera's view, in the same area. */
function spotInView(minD: number, maxD: number, behind = false): { x: number; z: number } | null {
  const p = world.player.pos;
  const f = { x: view.camDir.x, z: view.camDir.z };
  const fl = Math.hypot(f.x, f.z) || 1;
  f.x /= fl; f.z /= fl;
  for (let tries = 0; tries < 24; tries++) {
    const ang = (Math.random() - 0.5) * (behind ? 1.4 : 0.7) + (behind ? Math.PI : 0);
    const cs = Math.cos(ang), sn = Math.sin(ang);
    const dx = f.x * cs - f.z * sn, dz = f.x * sn + f.z * cs;
    const d = minD + Math.random() * (maxD - minD);
    const x = p.x + dx * d, z = p.z + dz * d;
    if (!isWalkable(x, z)) continue;
    const room = roomAt(x, z);
    if (!room || room.id === 'UNKNOWN' || room.id === 'ELEVATOR') continue;
    const vis = lineOfSight(p.x, 1.6, p.z, x, 1.6, z);
    if (behind || vis) return { x, z };
  }
  return null;
}

let heartbeat = 0;

export function updateObserver(dt: number): void {
  const o = O();
  const t = world.t;
  const stage = observerStage();
  const p = world.player.pos;
  o.timer += dt;
  o.cooldown = Math.max(0, o.cooldown - dt);
  const dist = Math.hypot(p.x - o.pos.x, p.z - o.pos.z);
  const seen = playerSeesObserver();
  if (seen) { o.seenTime += dt; o.lastSeenByPlayer = t; onSeen(stage); }

  // opacity follows visibility with a glitchy fade
  const targetOp = o.visible ? (o.mode === 'DISAPPEARING' ? 0 : 1) : 0;
  o.opacity += (targetOp - o.opacity) * Math.min(1, dt * (o.mode === 'DISAPPEARING' ? 5 : 1.5));

  // heartbeat when it's close
  if (o.visible && !o.cctvOnly && dist < 12) {
    heartbeat -= dt;
    if (heartbeat <= 0) { heartbeat = 0.5 + dist / 12; Audio.sfx('heartbeat'); }
  }

  if (world.final.active) { updateFinal(dt); return; }

  // ── scripted: 12:55 on CAM-03 only, tracing symbols on the Archive wall ──
  if (t >= at('12:55') && t < at('12:56:30') && o.mode !== 'HUNTING') {
    if (o.mode !== 'MANIPULATING' || !o.cctvOnly) {
      setMode('MANIPULATING');
      o.cctvOnly = true;
      o.visible = true;
      o.pos.set(ARCHIVE_SPOT.x, 0, ARCHIVE_SPOT.z);
      o.yaw = -Math.PI / 2;
      o.symbolsDrawn = 0;
    }
    o.anim = 'reach';
    o.symbolsDrawn = Math.min(4, Math.floor((t - at('12:55')) / 18) + 1);
    return;
  }
  if (o.cctvOnly && o.mode === 'MANIPULATING') { hideObserver(10); return; }

  // ── 12:59 hunt ──
  if (t >= at('12:59') && t < at('12:59:40') && o.mode !== 'HUNTING' && !world.flags.has('chaseDone') && chaseThisLoop() && world.player.room !== 'CORE' && world.player.room !== 'ANTE') {
    const s = spotInView(12, 18) ?? spotInView(8, 14, true);
    if (s) {
      setMode('HUNTING');
      o.visible = true;
      o.cctvOnly = false;
      o.pos.set(s.x, 0, s.z);
      o.chaseTime = 0;
      Audio.sfx('sting');
      Audio.setMood('CHASE');
      say('A-13', 'Please do not run. Running is not permitted.');
    }
  }

  switch (o.mode) {
    case 'DORMANT': {
      // New Game+: it is standing at the foot of your bed when you wake up
      if (world.flags.has('ngpWake') && G().run.ngPlus > 0 && t < 30) {
        world.flags.delete('ngpWake');
        setMode('WATCHING');
        o.visible = true;
        o.pos.set(-4.3, 0, 13.3);
        o.yaw = -Math.PI / 2;
        break;
      }
      if (o.cooldown > 0 || stage === 0 || t < 45) break;
      if (stage >= 4 && t > at('12:52:40') && !world.flags.has('observerMet') && !world.flags.has('observerContactTried')) {
        // direct contact: waiting in the Hub
        world.flags.add('observerContactTried');
        setMode('WATCHING');
        o.visible = true;
        o.interactive = true;
        o.pos.set(-2.6, 0, -1.6);
        o.yaw = 0;
        break;
      }
      if (Math.random() > dt / 18) break;
      if (stage >= 2 && Math.random() < 0.5) {
        const s = spotInView(9, 13, true);
        if (s) { setMode('FOLLOWING'); o.visible = true; o.pos.set(s.x, 0, s.z); faceP(10); }
      } else {
        const s = spotInView(stage >= 2 ? 11 : 16, stage >= 2 ? 16 : 24);
        if (s) { setMode('WATCHING'); o.visible = true; o.pos.set(s.x, 0, s.z); faceP(10); }
      }
      break;
    }
    case 'WATCHING': {
      faceP(dt);
      o.anim = 'idle';
      if (o.interactive) {
        if (o.timer > 60) { setMode('DISAPPEARING'); }
        break;
      }
      if (o.seenTime > 1.4 || dist < (stage >= 2 ? 6 : 10) || o.timer > 14) setMode('DISAPPEARING');
      break;
    }
    case 'FOLLOWING': {
      faceP(dt);
      if (seen) {
        o.anim = 'idle';
        if (o.seenTime > 2.5) setMode('DISAPPEARING');
      } else if (dist > 2.4) {
        o.repath -= dt;
        if (o.repath <= 0 || !o.path.length) { o.path = findPath(o.pos.x, o.pos.z, p.x, p.z) ?? []; o.pathIdx = 1; o.repath = 0.6; }
        moveAlong(dt, 1.7);
        o.anim = 'walk';
        if (o.seenTime > 0.2) world.flags.add('observerMovedUnseen');
      } else {
        // close behind you: lights die, a whisper, gone
        world.light.flicker = 1.2;
        Audio.sfx('whisper', { pos: { x: o.pos.x, y: 1.6, z: o.pos.z }, volume: 1 });
        say('???', '…look at me.');
        setMode('DISAPPEARING');
      }
      if (o.timer > 40) setMode('DISAPPEARING');
      break;
    }
    case 'HUNTING': {
      o.chaseTime += dt;
      faceP(dt * 3);
      o.repath -= dt;
      if (o.repath <= 0 || !o.path.length) { o.path = findPath(o.pos.x, o.pos.z, p.x, p.z) ?? []; o.pathIdx = 1; o.repath = 0.4; }
      // "I always stop when I'm seen": looking at it slows it down
      const sp = seen ? 1.4 : 4.3;
      moveAlong(dt, sp);
      o.anim = seen ? 'walk' : 'run';
      world.fovBoost = Math.max(world.fovBoost, 6);
      world.shake = Math.max(world.shake, 0.08);
      if (dist < 0.95 && !world.player.dead) {
        damagePlayer(999, 'observer');
      }
      if (o.chaseTime > 24 || world.player.room === 'CORE' || world.player.room === 'ANTE') {
        world.flags.add('chaseDone');
        if (!world.player.dead) { Achievements.unlock('SURVIVOR'); Memory.discoverClue('OBSERVER_FOLLOWS'); }
        Audio.silence(5);
        setMode('DISAPPEARING');
      }
      break;
    }
    case 'DISAPPEARING': {
      o.anim = 'idle';
      if (o.timer < 0.05) Audio.sfx('glitch', { pos: { x: o.pos.x, y: 1.5, z: o.pos.z }, volume: 0.6 });
      if (o.timer > 0.6) {
        if (world.flags.has('observerMovedUnseen')) Memory.discoverClue('OBSERVER_FOLLOWS');
        hideObserver(30 + Math.random() * 40);
        if (G().phase === 'CHASE') Audio.setMood('TENSION');
      }
      break;
    }
    case 'MANIPULATING': break;
  }
}

function moveAlong(dt: number, speed: number): void {
  const o = O();
  if (!o.path.length || o.pathIdx >= o.path.length) return;
  const wp = o.path[o.pathIdx];
  const dx = wp.x - o.pos.x, dz = wp.z - o.pos.z;
  const d = Math.hypot(dx, dz);
  if (d < 0.2) { o.pathIdx++; return; }
  const step = Math.min(d, speed * dt);
  o.pos.x += (dx / d) * step;
  o.pos.z += (dz / d) * step;
}

function onSeen(stage: number): void {
  const o = O();
  if (!world.flags.has('seenObserverThisLoop')) {
    world.flags.add('seenObserverThisLoop');
    Achievements.unlock('WATCHER');
    if (!Memory.hasFlag('observerSeenInPerson')) {
      Memory.setFlag('observerSeenInPerson');
      Audio.sfx('sting');
      Audio.silence(8);
      Cutscenes.firstObserver({ x: o.pos.x, y: 1.6, z: o.pos.z });
    } else Audio.sfx('observer', { pos: { x: o.pos.x, y: 1.5, z: o.pos.z } });
    if (stage >= 1) Memory.discoverClue('OBSERVER_DISTANT');
  }
}

/** During the final sequence the Observer stands at the Core, watching. */
function updateFinal(dt: number): void {
  const o = O();
  const p = world.player.pos;
  if (world.final.stage >= 5) return; // handled by the ending cutscene
  if (o.mode !== 'WATCHING') {
    setMode('WATCHING');
    o.visible = true;
    o.cctvOnly = false;
    o.pos.set(7.5, 0, -30.2);
  }
  // it comes closer every time the loop pushes back
  const target = 30.2 - world.final.stage * 1.5 - world.final.timer * 0.01;
  o.pos.z += (-clamp(target, 26, 31) - o.pos.z) * Math.min(1, dt);
  o.yaw = dampAngle(o.yaw, Math.atan2(p.x - o.pos.x, p.z - o.pos.z), 2, dt);
  o.anim = 'idle';
}
