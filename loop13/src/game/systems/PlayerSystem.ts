/** Player control: movement (walk/run/sprint/crouch/jump), flashlight, stamina, health, hazards, footsteps. */
import { FLASHLIGHT, PLAYER } from '../core/constants';
import { Input } from '../core/input';
import { view } from '../core/view';
import { world, type AnimName } from '../core/world';
import { moveCharacter, pushCrate } from '../physics/character';
import { solidBoxes } from '../physics/colliders';
import { roomAt } from '../data/level';
import { dampAngle } from '../core/rng';
import { Audio } from '../audio/AudioEngine';
import { G } from '../core/store';
import { Memory } from './MemorySystem';
import { Inventory } from './Inventory';

export function playAction(anim: AnimName, duration: number): void {
  const p = world.player;
  p.action = anim;
  p.actionTime = 0;
  p.actionDuration = duration;
}

export function damagePlayer(amount: number, kind: 'arc' | 'radiation' | 'observer' | 'fall'): void {
  const p = world.player;
  if (p.dead) return;
  p.health = Math.max(0, p.health - amount);
  p.hurtT = 0.45;
  world.shake = Math.max(world.shake, kind === 'arc' ? 0.6 : 0.35);
  Audio.sfx('hurt');
  if (p.health > 0 && p.health < 35 && Inventory.has('medkit')) {
    Inventory.use('medkit');
  }
}

let sprintHold = 0;
let breathTimer = 0;

export function updatePlayer(dt: number, controllable: boolean): void {
  const p = world.player;
  if (p.dead) return;
  const axis = controllable ? Input.axis() : { x: 0, z: 0 };
  const moving = axis.x !== 0 || axis.z !== 0;
  const wantCrouch = controllable && (Input.down('ControlLeft') || Input.down('ControlRight') || Input.down('KeyC'));
  const shift = controllable && (Input.down('ShiftLeft') || Input.down('ShiftRight'));

  p.crouching = wantCrouch && p.grounded ? true : wantCrouch ? p.crouching : false;
  // shift → run; holding shift a moment with stamina → sprint
  sprintHold = shift && moving ? sprintHold + dt : 0;
  p.running = shift && moving && !p.crouching;
  p.sprinting = p.running && sprintHold > 0.9 && p.stamina > 0.05;
  if (p.sprinting) p.stamina = Math.max(0, p.stamina - dt / 7);
  else p.stamina = Math.min(1, p.stamina + dt / (p.running ? 14 : 5));

  const speed = p.crouching ? PLAYER.crouchSpeed : p.sprinting ? PLAYER.sprintSpeed : p.running ? PLAYER.runSpeed : PLAYER.walkSpeed;
  const busy = p.action !== null && ['pickup', 'interact', 'openDoor', 'computer', 'inspect'].includes(p.action);
  const slow = busy ? 0.15 : p.hurtT > 0 ? 0.6 : 1;
  // camera-relative direction
  let dx = 0, dz = 0;
  if (moving) {
    const len = Math.hypot(axis.x, axis.z);
    const ax = axis.x / len, az = axis.z / len;
    const sy = Math.sin(view.yaw), cy = Math.cos(view.yaw);
    // forward = direction camera looks (−z at yaw 0)
    const fx = -sy, fz = -cy;
    const rx = cy, rz = -sy;
    dx = fx * -az + rx * ax;
    dz = fz * -az + rz * ax;
    p.yaw = dampAngle(p.yaw, Math.atan2(dx, dz), 10, dt);
  }
  const accel = p.grounded ? 12 : 3;
  const tvx = dx * speed * slow, tvz = dz * speed * slow;
  p.vel.x += (tvx - p.vel.x) * Math.min(1, accel * dt);
  p.vel.z += (tvz - p.vel.z) * Math.min(1, accel * dt);

  if (controllable && Input.consume('Space') && p.grounded && !p.crouching && !busy) {
    p.vel.y = PLAYER.jumpVelocity;
    p.grounded = false;
    Audio.sfx('jump', { pos: p.pos, volume: 0.6 });
  }

  const height = p.crouching ? PLAYER.crouchHeight : PLAYER.height;
  const boxes = solidBoxes(true);
  const res = moveCharacter(p.pos, p.vel, PLAYER.radius, height, dt, boxes, (box, nx, nz) => {
    if (box.id?.startsWith('crate:')) {
      const crate = world.crates[Number(box.id.slice(6))];
      const along = Math.hypot(p.vel.x, p.vel.z);
      if (crate && along > 0.5) pushCrate(crate, nx, nz, dt * 14);
    }
  });
  if (!p.grounded && res.grounded) {
    if (res.landedSpeed > 3) { p.landT = 0.35; Audio.sfx('land', { pos: p.pos, volume: Math.min(1, res.landedSpeed / 8) }); }
    if (res.landedSpeed > 11) damagePlayer((res.landedSpeed - 11) * 8, 'fall');
  }
  p.airTime = res.grounded ? 0 : p.airTime + dt;
  p.grounded = res.grounded;
  p.speed = Math.hypot(p.vel.x, p.vel.z);
  p.landT = Math.max(0, p.landT - dt);
  p.hurtT = Math.max(0, p.hurtT - dt);

  if (p.action) {
    p.actionTime += dt;
    if (p.actionTime >= p.actionDuration) p.action = null;
  }

  // footsteps from travelled distance
  if (p.grounded && p.speed > 0.4) {
    p.stepDist += p.speed * dt;
    const stride = p.crouching ? 0.55 : p.sprinting ? 1.05 : p.running ? 0.9 : 0.72;
    if (p.stepDist > stride) {
      p.stepDist = 0;
      const room = roomAt(p.pos.x, p.pos.z);
      Audio.sfx('step', { pos: { x: p.pos.x, y: p.pos.y, z: p.pos.z }, surface: room?.floor ?? 'concrete', volume: p.crouching ? 0.35 : p.sprinting ? 1 : 0.7 });
    }
  }

  // breathing when exhausted / hurt / scared
  breathTimer -= dt;
  const stressed = p.stamina < 0.35 || p.health < 40 || world.observer.mode === 'HUNTING';
  if (stressed && breathTimer <= 0) { breathTimer = 2.2; Audio.sfx('breath', { volume: 0.06 + (1 - p.stamina) * 0.05 }); }

  // flashlight
  if (controllable && Input.consume('KeyF')) {
    if (Inventory.has('flashlight')) {
      if (p.battery <= 0 && Inventory.has('battery')) Inventory.use('battery');
      p.flashlightOn = !p.flashlightOn && p.battery > 0;
      Audio.sfx('flashlight', { pos: p.pos });
    } else {
      G().pushNotification({ kind: 'info', title: 'FLASHLIGHT', text: 'You do not have a flashlight.' });
    }
  }
  if (p.flashlightOn) {
    p.battery = Math.max(0, p.battery - FLASHLIGHT.drainPerSecond * dt);
    if (p.battery <= 0) {
      if (Inventory.has('battery')) Inventory.use('battery');
      else { p.flashlightOn = false; G().pushNotification({ kind: 'info', title: 'FLASHLIGHT', text: 'Battery depleted.' }); }
    }
  }

  // room tracking
  const room = roomAt(p.pos.x, p.pos.z);
  if (room && room.id !== p.room) {
    p.room = room.id;
    Memory.visitRoom(room.id);
    Audio.setZone(room.area);
  }
}

/** Animation the player body should be in right now. */
export function playerAnim(): AnimName {
  const p = world.player;
  if (p.dead) return 'death';
  if (p.hurtT > 0.25) return 'hurt';
  if (p.action) return p.action;
  if (!p.grounded && p.airTime > 0.08) return p.vel.y > 0 ? 'jump' : 'fall';
  if (p.landT > 0.15) return 'land';
  if (p.crouching) return p.speed > 0.3 ? 'crouchWalk' : 'crouchIdle';
  if (p.speed > 5.4) return 'sprint';
  if (p.speed > 3.4) return 'run';
  if (p.speed > 0.3) return 'walk';
  return 'idle';
}
