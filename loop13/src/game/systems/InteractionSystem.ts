/** Finds what the player is looking at, shows "E — ACTION", handles press and hold interactions. */
import { world } from '../core/world';
import { view } from '../core/view';
import { Input } from '../core/input';
import { G } from '../core/store';
import { ALL_INTERACTABLES, type Interactable } from './Interactables';
import { PLAYER } from '../core/constants';
import { lineOfSight } from '../physics/colliders';
import { Audio } from '../audio/AudioEngine';
import { playAction } from './PlayerSystem';

let focus: Interactable | null = null;
let lastLabel: string | null = null;
let lastHold = -1;

export function currentFocus(): Interactable | null { return focus; }

export function updateInteraction(dt: number, enabled: boolean): void {
  const p = world.player;
  focus = null;
  if (enabled && !p.dead) {
    let best = -Infinity;
    const chest = { x: p.pos.x, y: p.pos.y + (p.crouching ? 0.9 : 1.35), z: p.pos.z };
    const fx = view.camDir.x, fz = view.camDir.z;
    const fl = Math.hypot(fx, fz) || 1;
    for (const it of ALL_INTERACTABLES) {
      const pos = it.pos();
      const dx = pos.x - chest.x, dy = pos.y - chest.y, dz = pos.z - chest.z;
      const hd = Math.hypot(dx, dz);
      const d = Math.hypot(hd, dy * 0.6);
      const range = it.range ?? PLAYER.interactRange;
      if (d > range) continue;
      // must be roughly in front of the camera (horizontal)
      const dot = hd > 0.05 ? (dx * fx + dz * fz) / (hd * fl) : 1;
      if (dot < 0.35) continue;
      const label = it.label();
      if (!label) continue;
      if (!lineOfSight(chest.x, chest.y, chest.z, pos.x - dx * 0.12, pos.y, pos.z - dz * 0.12)) continue;
      const score = dot * 2 - d * 0.6;
      if (score > best) { best = score; focus = it; }
    }
  }

  const label = focus ? focus.label() : null;
  // hold interactions (generators, jammed doors)
  let hold = 0;
  if (focus && focus.hold && label && !/NEEDS|ONLINE/.test(label)) {
    if (Input.down('KeyE')) {
      if (world.interactHold.id !== focus.id) { world.interactHold = { id: focus.id, t: 0 }; playAction('interact', 0.4); }
      world.interactHold.t += dt;
      p.action = 'interact'; p.actionTime = 0; p.actionDuration = 0.3;
      hold = Math.min(1, world.interactHold.t / focus.hold);
      if (world.interactHold.t >= focus.hold) {
        world.interactHold = { id: null, t: 0 };
        focus.act();
      } else if (Math.random() < dt * 6) Audio.sfx('metal', { pos: focus.pos(), volume: 0.08 });
    } else world.interactHold = { id: null, t: 0 };
    Input.consume('KeyE');
  } else {
    world.interactHold = { id: null, t: 0 };
    if (focus && label && Input.consume('KeyE')) {
      const now = performance.now();
      if (now - world.lastInteract > 250) { // debounce double presses
        world.lastInteract = now;
        focus.act();
      }
    } else Input.consume('KeyE');
  }

  const holdRounded = Math.round(hold * 20) / 20;
  if (label !== lastLabel || holdRounded !== lastHold) {
    lastLabel = label;
    lastHold = holdRounded;
    G().setHud({ prompt: label, hold: holdRounded, promptDisabled: !!label && /NEEDS|REQUIRED|ONLINE|SYNCHRONIZED|ACCEPTED|AWAKE/.test(label) });
  }
}
