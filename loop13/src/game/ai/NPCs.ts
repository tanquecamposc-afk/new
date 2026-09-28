/**
 * NPC AI: schedule-driven state machines (IDLE → WALK → WORK → TALK → VANISH)
 * with A* navigation, door handling, and awareness of the player.
 */
import { world, type AnimName, type NPCState } from '../core/world';
import { at } from '../core/constants';
import { findPath } from './nav';
import { dampAngle } from '../core/rng';
import { DOORS } from '../data/level';
import { doorUsable } from '../systems/DoorSystem';
import { lineOfSight } from '../physics/colliders';
import { G } from '../core/store';
import { Memory, Achievements } from '../systems/MemorySystem';
import { Audio } from '../audio/AudioEngine';

interface Task { at: number; id: string; x: number; z: number; yaw: number; work: AnimName; vanish?: boolean; room?: string; }

const KANE_TASKS: Task[] = [
  { at: 0, id: 'corridor', x: -12.2, z: 0.2, yaw: -Math.PI / 2, work: 'idle' },
  { at: 42, id: 'lab', x: -0.75, z: 12.1, yaw: -Math.PI / 2, work: 'computer', room: 'LAB' },
  { at: at('12:51'), id: 'security', x: 6.3, z: 14.35, yaw: 0, work: 'computer', room: 'SECURITY' },
  { at: at('12:54'), id: 'archives', x: -4.1, z: -13.2, yaw: Math.PI, work: 'inspect', room: 'ARCHIVES' },
  { at: at('12:57'), id: 'vanish', x: 5.5, z: -13.1, yaw: Math.PI, work: 'idle', vanish: true },
];

function mayaTasks(loop: number): Task[] {
  if (loop % 2 === 1) {
    return [
      { at: 0, id: 'medical', x: -5.4, z: 13.6, yaw: -Math.PI / 2, work: 'inspect' },
      { at: at('12:52'), id: 'dorm', x: -20.2, z: 2.6, yaw: Math.PI, work: 'idle' },
    ];
  }
  return [
    { at: 0, id: 'dorm', x: -20.6, z: 2.4, yaw: Math.PI, work: 'idle' },
    { at: at('12:54'), id: 'medical', x: -5.4, z: 13.6, yaw: -Math.PI / 2, work: 'inspect' },
  ];
}

const npcGate = (who: 'kane' | 'maya') => (doorId: string) => {
  const d = DOORS.find((x) => x.id === doorId)!;
  return doorUsable(d, who);
};

function currentTask(tasks: Task[]): Task {
  let cur = tasks[0];
  for (const t of tasks) if (world.t >= t.at) cur = t;
  return cur;
}

/** Initial placement for a fresh loop (at their t=0 task position). */
export function placeNPCs(): void {
  const k = KANE_TASKS[0];
  world.kane.pos.set(k.x, 0, k.z);
  world.kane.yaw = k.yaw;
  world.kane.task = k.id;
  const m = mayaTasks(G().run.loop)[0];
  world.maya.pos.set(m.x, 0, m.z);
  world.maya.yaw = m.yaw;
  world.maya.task = m.id;
  world.maya.present = G().run.loop >= 3 || G().run.ngPlus > 0;
}

function stepNPC(n: NPCState, tasks: Task[], dt: number): void {
  if (!n.present) return;
  if (n.vanishing > 0) {
    n.vanishing += dt;
    n.anim = 'idle';
    if (n.vanishing > 2.2) n.present = false;
    return;
  }
  const task = currentTask(tasks);
  if (task.id !== n.task) {
    n.task = task.id;
    n.path = [];
    n.pathIdx = 0;
    n.taskTarget = { x: task.x, z: task.z, yaw: task.yaw };
    const p = findPath(n.pos.x, n.pos.z, task.x, task.z, npcGate(n.id));
    if (p) { n.path = p; n.pathIdx = 1; }
    else { n.pos.set(task.x, 0, task.z); } // unreachable (shouldn't happen): teleport
  }
  const p = world.player.pos;
  const dPlayer = Math.hypot(p.x - n.pos.x, p.z - n.pos.z);
  if (n.talking) {
    n.anim = 'talk';
    n.yaw = dampAngle(n.yaw, Math.atan2(p.x - n.pos.x, p.z - n.pos.z), 6, dt);
    return;
  }
  if (n.path.length && n.pathIdx < n.path.length) {
    const wp = n.path[n.pathIdx];
    const dx = wp.x - n.pos.x, dz = wp.z - n.pos.z;
    const d = Math.hypot(dx, dz);
    // wait for a door ahead to open
    const blocked = DOORS.some((door) => {
      const s = world.doors[door.id];
      if (s.open >= 0.8 || door.kind === 'arch') return false;
      if (Math.hypot(door.x - n.pos.x, door.z - n.pos.z) > 1.6) return false;
      return crossesDoor(door, n.pos.x, n.pos.z, wp.x, wp.z);
    });
    // late for the schedule → hurry
    const speed = world.t - (tasks.find((t) => t.id === n.task)?.at ?? 0) > 25 ? 2.2 : n.speed;
    if (blocked) { n.anim = 'idle'; }
    else if (d < 0.15) n.pathIdx++;
    else {
      const step = Math.min(d, speed * dt);
      n.pos.x += (dx / d) * step;
      n.pos.z += (dz / d) * step;
      n.yaw = dampAngle(n.yaw, Math.atan2(dx, dz), 8, dt);
      n.anim = speed > 2 ? 'run' : 'walk';
    }
    if (n.pathIdx >= n.path.length) onArrive(n, task);
    return;
  }
  // working at the task spot
  n.anim = task.work;
  n.yaw = dampAngle(n.yaw, task.yaw, 5, dt);
  // glance at the player when close
  const look = dPlayer < 4.5 ? Math.atan2(p.x - n.pos.x, p.z - n.pos.z) - n.yaw : 0;
  n.headYaw += (Math.max(-1.1, Math.min(1.1, normalize(look))) - n.headYaw) * Math.min(1, dt * 3);
  // later loops: Kane sometimes stares straight at you for a few seconds
  if (n.id === 'kane' && G().run.loop >= 5 && dPlayer < 12 && n.lookAtPlayer <= 0 && Math.random() < dt * 0.02) n.lookAtPlayer = 3;
  if (n.lookAtPlayer > 0) {
    n.lookAtPlayer -= dt;
    n.yaw = dampAngle(n.yaw, Math.atan2(p.x - n.pos.x, p.z - n.pos.z), 4, dt);
    n.anim = 'idle';
  }
}

/** Does the segment a→b pass through the door opening? */
function crossesDoor(door: (typeof DOORS)[number], ax: number, az: number, bx: number, bz: number): boolean {
  const [na, nb] = door.axis === 'x' ? [az - door.z, bz - door.z] : [ax - door.x, bx - door.x];
  if (na * nb > 0) return false;
  const t = na / (na - nb || 1e-6);
  const along = door.axis === 'x' ? ax + (bx - ax) * t - door.x : az + (bz - az) * t - door.z;
  return Math.abs(along) <= door.width / 2 + 0.2;
}

function normalize(a: number): number {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

function onArrive(n: NPCState, task: Task): void {
  n.path = [];
  if (task.vanish) {
    n.vanishing = 0.01;
    Audio.sfx('glitch', { pos: n.pos, volume: 0.5 });
    const p = world.player.pos;
    if (Math.hypot(p.x - n.pos.x, p.z - n.pos.z) < 14 && lineOfSight(p.x, 1.6, p.z, n.pos.x, 1.6, n.pos.z)) {
      Memory.findSecret('KANE_VANISH');
      Memory.discoverClue('ALARM_1257');
    }
    return;
  }
  if (n.id === 'kane' && task.room && !n.arrived.includes(task.room)) {
    const p = world.player.pos;
    const near = Math.hypot(p.x - n.pos.x, p.z - n.pos.z) < 11;
    if (near) {
      n.arrived.push(task.room);
      if (task.room === 'LAB') Memory.discoverClue('KANE_MET');
      if (n.arrived.length >= 2) Memory.discoverClue('KANE_ROUTE');
      if (['LAB', 'SECURITY', 'ARCHIVES'].every((r) => n.arrived.includes(r))) Achievements.unlock('SHADOW');
    }
  }
}

export function updateNPCs(dt: number): void {
  stepNPC(world.kane, KANE_TASKS, dt);
  stepNPC(world.maya, mayaTasks(G().run.loop), dt);
  // noticing Kane at work in the lab also counts as meeting him
  const k = world.kane;
  if (k.present && k.task === 'lab' && !k.path.length) {
    const p = world.player.pos;
    if (Math.hypot(p.x - k.pos.x, p.z - k.pos.z) < 7 && world.player.room === 'LAB') Memory.discoverClue('KANE_MET');
  }
}
