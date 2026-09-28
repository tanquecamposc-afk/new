/** Door logic: automatic, timed, keypad, keycard, power, jammed, core, hidden, elevator. */
import { DOORS, type DoorDef } from '../data/level';
import { world } from '../core/world';
import { Audio } from '../audio/AudioEngine';

export function doorCenter(d: DoorDef) { return { x: d.x, y: 1.3, z: d.z }; }

export function backupPower(): boolean { return world.generators.every(Boolean); }

/** Whether a door currently lets an actor through when approached. */
export function doorUsable(d: DoorDef, actor: 'player' | 'kane' | 'maya' | 'observer'): boolean {
  const s = world.doors[d.id];
  if (s.forcedLock && actor === 'player') return false;
  switch (d.kind) {
    case 'arch': case 'auto': return true;
    case 'timed': return world.t >= 180 || actor === 'observer';
    case 'keypad': return world.keypadSolved || actor === 'kane' || actor === 'observer';
    case 'keycard': return s.unlocked || actor === 'observer';
    case 'power': return backupPower() || actor === 'observer';
    case 'jammed': return s.unlocked;
    case 'core': return (world.symbolSolved && world.relays.A && world.relays.B && world.relays.C) || actor === 'kane';
    case 'hidden': return world.hiddenOpen;
    case 'elevator': return false;
  }
}

export function updateDoors(dt: number): void {
  const p = world.player.pos;
  for (const d of DOORS) {
    const s = world.doors[d.id];
    if (d.kind === 'arch') { s.open = 1; continue; }
    if (d.kind === 'elevator') {
      s.open += (s.target - s.open) * Math.min(1, dt * 2);
      continue;
    }
    if (d.kind === 'hidden') { s.target = world.hiddenOpen ? 1 : 0; s.open += (s.target - s.open) * Math.min(1, dt * 1.5); continue; }
    const near = (x: number, z: number, r: number) => Math.hypot(x - d.x, z - d.z) < r;
    let want = false;
    if (near(p.x, p.z, 2.6) && doorUsable(d, 'player')) want = true;
    for (const npc of [world.kane, world.maya]) {
      if (npc.present && npc.vanishing <= 0 && near(npc.pos.x, npc.pos.z, 2.2) && doorUsable(d, npc.id)) want = true;
    }
    if (world.observer.mode === 'HUNTING' && near(world.observer.pos.x, world.observer.pos.z, 2.2) && !world.observer.cctvOnly) want = want || doorUsable(d, 'observer');
    if (d.kind === 'jammed' && s.unlocked) want = true;
    if (s.holdOpen > 0) { s.holdOpen -= dt; want = true; }
    const target = want ? 1 : 0;
    if (target !== s.target) {
      s.target = target;
      Audio.sfx('door', { pos: doorCenter(d), volume: 0.7 });
    }
    const speed = d.kind === 'core' ? 0.6 : 2.4;
    s.open += Math.sign(s.target - s.open) * Math.min(Math.abs(s.target - s.open), dt * speed);
  }
}
