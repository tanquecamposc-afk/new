/** Anomalies (visual impossibilities), security-camera discoveries and environmental hazards. */
import { world } from '../core/world';
import { view } from '../core/view';
import { CCTV } from '../data/level';
import { lineOfSight } from '../physics/colliders';
import { Memory } from './MemorySystem';
import { ANOMALY_LABEL, ANOMALY_POS, loopN, type AnomalyId } from './Progression';
import { at } from '../core/constants';
import { damagePlayer } from './PlayerSystem';
import { Audio } from '../audio/AudioEngine';

export const ARC_POS = { x: -4, y: 1.3, z: 18.55 };
let arcsWitnessed = 0;
let checkTimer = 0;

export function arcActive(): boolean { return (world.arcTimer % 4) < 0.55; }

export function updateAnomalies(dt: number): void {
  // hazards: the Maintenance junction panel arcs every 4 seconds
  const prev = world.arcTimer % 4;
  world.arcTimer += dt;
  const cur = world.arcTimer % 4;
  const p = world.player.pos;
  const dArc = Math.hypot(p.x - ARC_POS.x, p.z - ARC_POS.z);
  if (cur < prev) {
    if (dArc < 18) Audio.sfx('arc', { pos: ARC_POS, volume: 0.8 });
    if (dArc < 7) { arcsWitnessed++; if (arcsWitnessed >= 3) Memory.discoverClue('ARC_PATTERN'); }
  }
  if (arcActive() && dArc < 1.35 && p.y < 2) {
    if (!world.flags.has('arcHit')) { world.flags.add('arcHit'); damagePlayer(34, 'arc'); setTimeout(() => world.flags.delete('arcHit'), 700); }
  }

  checkTimer -= dt;
  if (checkTimer > 0) return;
  checkTimer = 0.25;

  // anomalies are recorded when the player actually sees them
  for (const a of world.anomalies as AnomalyId[]) {
    if (a === 'WRONG_CLOCK' || a === 'IMPOSSIBLE_DOOR' || a === 'DUPLICATE_KANE' || a === 'DOUBLE_MUG') {
      // these need closer inspection, except a clear look from nearby
      if (a !== 'DUPLICATE_KANE' && a !== 'DOUBLE_MUG') continue;
    }
    const [x, y, z] = ANOMALY_POS[a];
    if (seesPoint(x, y, z, a === 'DOUBLE_MUG' ? 3 : 9)) Memory.noteAnomaly(a, ANOMALY_LABEL[a]);
  }

  // security cameras reveal what eyes cannot
  if (world.cctv.active) {
    const cam = CCTV[world.cctv.index];
    if (cam) {
      Memory.seeCamera(cam.id);
      if (cam.id === 'CAM-03' && world.t >= at('12:55') && world.t < at('12:56:30')) {
        world.flags.add('sawObserverCctv');
        Memory.discoverClue('OBSERVER_CCTV');
        if (world.observer.symbolsDrawn >= 4) Memory.discoverClue('SYMBOLS');
      }
      if (cam.id === 'CAM-06' && loopN() >= 6) Memory.findSecret('BODY_ON_CAMERA');
      if (cam.id === 'CAM-08') { Memory.findSecret('CAM08'); }
    }
  }
}

/** Point visible to the player's camera within `maxD` metres. */
export function seesPoint(x: number, y: number, z: number, maxD: number): boolean {
  const c = view.camPos;
  const dx = x - c.x, dy = y - c.y, dz = z - c.z;
  const d = Math.hypot(dx, dy, dz);
  if (d > maxD) return false;
  const dot = (dx * view.camDir.x + dy * view.camDir.y + dz * view.camDir.z) / d;
  if (dot < 0.8) return false;
  return lineOfSight(c.x, c.y, c.z, x, y, z);
}
