/**
 * Timed world events, synchronised with the loop clock. Each event has an id,
 * start (and optional end) time, zone, optional NPC, a condition and
 * consequences. Events fire at most once per loop.
 */
import { at, formatClock } from '../core/constants';
import { world } from '../core/world';
import { G } from '../core/store';
import { Audio } from '../audio/AudioEngine';
import { say } from './Voice';
import { Memory } from './MemorySystem';
import { backupPower } from './DoorSystem';
import { terminalMessage, loopN, has } from './Progression';
import type { AreaId } from '../core/types';
import { damagePlayer } from './PlayerSystem';

export interface GameEvent {
  id: string;
  start: number;
  end?: number;
  zone: AreaId | 'ALL';
  npc?: string;
  description: string;
  condition?: () => boolean;
  onStart: () => void;
  onEnd?: () => void;
  /** Called every frame while active (start ≤ t < end). */
  tick?: (dt: number) => void;
}

const inRoom = (...ids: string[]) => ids.includes(world.player.room);

export const EVENTS: GameEvent[] = [
  {
    id: 'KANE_ENTERS_LAB', start: at('12:48'), zone: 'LABORATORY', npc: 'kane', description: 'Dr. Kane enters the Laboratory.',
    onStart: () => { if (inRoom('LAB', 'HUB')) Audio.sfx('door', { pos: { x: 0.5, y: 1.3, z: 8 }, volume: 0.4 }); },
  },
  {
    id: 'ARCHIVES_OPEN', start: at('12:50'), zone: 'ARCHIVES', description: 'The Archives unlock for scheduled access.',
    onStart: () => {
      world.doors.d_archives.unlocked = true;
      say('A-13', 'The Archives are now open for scheduled access.');
      if (inRoom('HUB', 'ARCHIVES')) Memory.discoverClue('ARCHIVES_TIMED');
    },
  },
  {
    id: 'POWER_FAILURE', start: at('12:52'), end: at('12:52:28'), zone: 'ALL', description: 'Main grid failure.',
    onStart: () => {
      world.flags.add('blackout');
      if (backupPower()) {
        say('A-13', 'Grid failure. Auxiliary power is holding. …How?');
        Memory.discoverClue('BACKUP_POWER');
      } else {
        Audio.sfx('powerDown');
        Audio.silence(6);
        world.shake = 0.25;
        say('A-13', 'Power fluctuation detected. Please remain calm.');
        Memory.discoverClue('POWER_FAIL');
      }
    },
    onEnd: () => {
      world.flags.delete('blackout');
      if (!backupPower()) { Audio.sfx('powerUp'); say('A-13', 'Power restored. Nothing happened.'); }
    },
  },
  {
    id: 'PHONE_RINGS', start: at('12:52:30'), end: at('12:53:00'), zone: 'HUB', description: 'The Hub phone rings. Nobody is there.',
    condition: () => loopN() >= 2,
    onStart: () => { world.phoneRinging = true; },
    onEnd: () => { world.phoneRinging = false; },
  },
  {
    id: 'SELF_TYPING', start: at('12:53:20'), zone: 'SECURITY', description: 'A terminal types by itself.',
    condition: () => loopN() >= 5,
    onStart: () => { world.flags.add('selfTyping'); Audio.sfx('type', { pos: { x: 8, y: 1.1, z: 15 } }); setTimeout(() => Audio.sfx('type', { pos: { x: 8, y: 1.1, z: 15 } }), 800); },
  },
  {
    id: 'TERMINAL_MESSAGE', start: at('12:54'), end: at('12:54:40'), zone: 'ALL', description: 'Every screen shows the same message.',
    onStart: () => {
      world.terminalMessage = terminalMessage();
      Audio.sfx('glitch', { volume: 0.4 });
      if (!inRoom('MAINT', 'SERVICE', 'UNKNOWN', 'REACTOR', 'RR_CORR')) Memory.discoverClue('TERMINAL_MSG');
    },
    onEnd: () => { world.terminalMessage = null; },
  },
  {
    id: 'OBSERVER_ON_CAMERA', start: at('12:55'), end: at('12:56:30'), zone: 'ARCHIVES', npc: 'observer', description: 'A figure appears in the Archives — only on camera.',
    onStart: () => {
      if (loopN() >= 5 || has('OBSERVER_CCTV')) say('A-13', 'Minor anomaly in the Archives. Please disregard the cameras.');
    },
    tick: () => {
      if (inRoom('ARCHIVES') && (G().run.flags.includes('sawObserverCctvThisLoop') || world.flags.has('sawObserverCctv'))) {
        Memory.discoverClue('EMPTY_ROOM');
      }
    },
  },
  {
    id: 'ALARM', start: at('12:57'), zone: 'ALL', npc: 'kane', description: 'Alarm. Kane disappears.',
    onStart: () => {
      Audio.sfx('swell');
      say('A-13', 'Attention. Reactor instability. Please proceed calmly to the main exit.');
      Audio.setMood('TENSION');
      Memory.discoverClue('ALARM_1257');
    },
  },
  {
    id: 'REACTOR_OVERLOAD', start: at('12:59'), zone: 'REACTOR', description: 'The reactor begins to overload. Doors lock. The Observer may appear.',
    onStart: () => {
      world.doors.d_restricted.forcedLock = true;
      world.doors.d_security.forcedLock = !inRoom('SECURITY');
      world.shake = 0.4;
      Audio.sfx('resetBoom', { volume: 0.5 });
      say('A-13', 'Reactor overload. Sixty seconds. There is nothing to worry about.');
      if (inRoom('REACTOR', 'MAINT', 'RR_CORR', 'RESTRICTED')) Memory.discoverClue('REACTOR_1259');
    },
    tick: (dt) => {
      world.shake = Math.max(world.shake, 0.05 + (world.t - at('12:59')) / 60 * 0.25);
      // lethal radiation in the reactor hall after 12:59:30
      if (world.t >= at('12:59:30') && inRoom('REACTOR')) {
        world.player.radiation += dt;
        damagePlayer(dt * 22, 'radiation');
      }
    },
  },
];

export function updateEvents(dt: number): void {
  const t = world.t;
  for (const e of EVENTS) {
    const key = e.id;
    if (!world.fired[key] && t >= e.start && (e.end === undefined || t < e.end + 1)) {
      world.fired[key] = true;
      if (!e.condition || e.condition()) {
        world.flags.add(`ev:${key}`);
        e.onStart();
      }
    }
    if (world.flags.has(`ev:${key}`)) {
      if (e.end !== undefined && t >= e.end && !world.fired[`${key}:end`]) {
        world.fired[`${key}:end`] = true;
        world.flags.delete(`ev:${key}`);
        e.onEnd?.();
      } else if (e.tick && t >= e.start && (e.end === undefined || t < e.end)) e.tick(dt);
    }
  }
}

/** For the Memory → timeline view: events the player has witnessed. */
export function describeEvent(e: GameEvent): string { return `${formatClock(e.start)} — ${e.description}`; }
