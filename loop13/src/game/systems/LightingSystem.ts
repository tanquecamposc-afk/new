/** Facility lighting as a narrative tool: normal · blackout · alarm · observer flicker · core · final. */
import { world } from '../core/world';
import { backupPower } from './DoorSystem';

export function updateLighting(dt: number): void {
  const L = world.light;
  const t = world.t;
  L.pulse += dt;
  const blackout = world.flags.has('blackout') && !backupPower();
  L.alarm = t >= 600 && !world.final.active;
  if (world.final.active) L.mode = world.final.broken ? 'final' : 'core';
  else if (blackout) L.mode = 'blackout';
  else if (world.observer.visible && !world.observer.cctvOnly && world.observer.mode !== 'DORMANT' && world.observer.mode !== 'DISAPPEARING') L.mode = 'observer';
  else if (L.alarm) L.mode = 'alarm';
  else L.mode = 'normal';
  const targetPower = L.mode === 'blackout' ? 0.04 : 1;
  L.power += (targetPower - L.power) * Math.min(1, dt * (targetPower < L.power ? 12 : 1.5));
  L.flicker = Math.max(0, L.flicker - dt);
}

/** Per-lamp brightness factor, 0..1, including flicker and broken lamps. */
export function lampFactor(id: string, time: number): number {
  const L = world.light;
  let f = L.power;
  if (L.mode === 'observer' || L.flicker > 0) {
    const n = Math.sin(time * 37 + id.length * 3.1) * Math.sin(time * 13.3 + id.charCodeAt(0));
    f *= n > 0.2 ? 1 : 0.15;
  }
  if (world.flags.has('lamp_broken') && id === 'HUB_1_1') {
    const n = Math.sin(time * 23.0) + Math.sin(time * 7.7);
    f *= n > 1.2 ? 0.8 : 0.03;
  }
  return f;
}
