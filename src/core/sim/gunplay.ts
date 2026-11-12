/**
 * Weapons, consumables and pickups: everything a player does with what they carry.
 *
 * The contract of every action here is the one of docs/02 §2.8: the input only *requests*; the
 * simulation validates the player's state, the weapon timers, the ammunition and the geometry,
 * changes the state and emits an event. Nothing on the client decides that a shot landed.
 *
 * Weapon state machine (docs/02 §2.5): ready -> firing -> cooldown -> ready, or
 * ready -> reloading -> ready. An empty weapon never fires and nothing fires while reloading.
 */
import { computeHitDamage, heal } from '../combat.js';
import { makeRng } from '../rng.js';
import { computeCameraRig, makeCameraRig } from './cameraRig.js';
import { eyeHeight } from './character.js';
import { DEFAULT_CAMERA, TICK_RATE, secondsToTicks } from './config.js';
import { makeCharacterHit, rayCharacter } from './hitscan.js';
import { NO_SLOT } from './input.js';
import {
  activeItem,
  addAmmo,
  addConsumable,
  findFreeSlot,
  findWeaponSlot,
  type ConsumableItem,
  type InventoryItem,
  type WeaponItem,
} from './inventory.js';
import { consumableGain, getConsumableDef } from './items.js';
import { AMMO_AUTO_PICKUP_RADIUS, PICKUP_MAX_HEIGHT_DIFFERENCE, PICKUP_RADIUS, isAmmoType, type LootItem } from './loot.js';
import { approach } from './math.js';
import type { SimPlayer } from './player.js';
import { hash32 } from './random.js';
import { SIM_EVENTS } from './events.js';
import type { Simulation } from './simulation.js';
import { AMMO_RESERVE_CAP, fireIntervalTicks, getWeaponDef, type WeaponDef } from './weapons.js';
import { makeRayHit, type SurfaceMaterial } from './world.js';

const DEG = Math.PI / 180;
/** Ticks to go from hip to fully aimed. */
const ADS_IN_TICKS = 10;
const ADS_MOVE_SCALE = 0.8;
const USE_MOVE_SCALE = 0.75;
/** A semi-automatic trigger press is remembered this long while the weapon cools down. */
const FIRE_BUFFER_TICKS = 8;
const CONSUMABLE_EQUIP_TICKS = 8;
const CROUCH_SPREAD_FACTOR = 0.8;

/** What a pellet ended on, as reported in ShotFired events. */
export const SHOT_END = Object.freeze({ none: 0, world: 1, player: 2 } as const);

const rig = makeCameraRig();
const rayHit = makeRayHit();
const charHit = makeCharacterHit();

interface PendingHit {
  victim: SimPlayer;
  damage: number;
  pellets: number;
  headshot: boolean;
  distance: number;
  x: number;
  y: number;
  z: number;
}
const pendingHits: PendingHit[] = [];

/* ------------------------------------------------------------------------------------------ */
/* Movement side effects of combat (applied to the input before the character moves)           */
/* ------------------------------------------------------------------------------------------ */

/** Firing, aiming and using an item stop a sprint; aiming and using also slow the walk. */
export function applyCombatMovement(player: SimPlayer): void {
  const combat = player.combat;
  const input = player.input;
  const aiming = input.ads && activeItem(combat.inventory)?.kind === 'weapon' && combat.reload === null;
  if (input.fire || aiming || combat.use !== null) input.sprint = false;
  let scale = 1;
  if (aiming) scale = ADS_MOVE_SCALE;
  if (combat.use !== null) scale = Math.min(scale, USE_MOVE_SCALE);
  if (scale < 1) {
    input.moveX *= scale;
    input.moveZ *= scale;
  }
}

/* ------------------------------------------------------------------------------------------ */
/* Per-tick update                                                                             */
/* ------------------------------------------------------------------------------------------ */

export function updateCombat(sim: Simulation, player: SimPlayer): void {
  const combat = player.combat;
  const input = player.input;
  const inventory = combat.inventory;

  const firePressed = input.fire && !combat.fireHeld;
  const reloadPressed = input.reload && !combat.reloadHeld;
  const interactPressed = input.interact && !combat.interactHeld;
  combat.fireHeld = input.fire;
  combat.reloadHeld = input.reload;
  combat.interactHeld = input.interact;
  if (firePressed) {
    combat.fireBufferTicks = FIRE_BUFFER_TICKS;
    combat.dryFireReported = false;
  } else if (combat.fireBufferTicks > 0) {
    combat.fireBufferTicks--;
  }

  if (input.slot !== NO_SLOT && input.slot !== inventory.active && inventory.slots[input.slot]) {
    // While a reload must run to completion the switch is refused, not queued.
    if (combat.reload === null || sim.rules.switchCancelsReload) selectSlot(sim, player, input.slot);
  }

  if (combat.reload !== null && sim.tick >= combat.reload.finishTick) finishReload(sim, player);
  if (combat.use !== null && sim.tick >= combat.use.finishTick) finishUse(sim, player);

  collectAmmo(sim, player);
  if (interactPressed) tryPickup(sim, player);

  const item = activeItem(inventory);
  const def = item !== null && item.kind === 'weapon' ? getWeaponDef(item.weaponId) : undefined;
  const wantsAds = input.ads && def !== undefined && combat.reload === null && player.char.moveState !== 'mantle';
  combat.adsBlend = approach(combat.adsBlend, wantsAds ? 1 : 0, 1 / ADS_IN_TICKS);
  if (combat.bloomDegrees > 0) {
    const recover = def !== undefined ? def.bloomRecoverDegreesPerSecond : 10;
    combat.bloomDegrees = Math.max(0, combat.bloomDegrees - recover / TICK_RATE);
  }

  if (item === null) return;
  if (item.kind === 'weapon') {
    if (def !== undefined) updateWeapon(sim, player, item, def, reloadPressed);
  } else if (combat.fireBufferTicks > 0 && combat.use === null && sim.tick >= combat.equipReadyTick) {
    combat.fireBufferTicks = 0;
    startUse(sim, player, item);
  }
}

function updateWeapon(sim: Simulation, player: SimPlayer, item: WeaponItem, def: WeaponDef, reloadPressed: boolean): void {
  const combat = player.combat;
  if (combat.reload !== null) return; // nothing fires while reloading
  if (player.char.moveState === 'mantle') return; // both hands are on the ledge
  if (sim.tick < combat.equipReadyTick) return;

  const reserve = combat.inventory.ammo[def.ammoType];
  if (reloadPressed && item.ammoInMag < def.magazine && reserve > 0) {
    startReload(sim, player, item, def);
    return;
  }

  const ready = sim.tick + 1e-6 >= item.nextFireTick;
  // A press that arrives while the weapon is still cycling is remembered for a few ticks.
  const wantsShot = combat.fireBufferTicks > 0 || (def.automatic && player.input.fire);

  if (item.ammoInMag <= 0) {
    if (reserve > 0) {
      if (ready && (sim.rules.autoReload || wantsShot)) startReload(sim, player, item, def);
    } else if (wantsShot && !combat.dryFireReported) {
      combat.dryFireReported = true;
      combat.fireBufferTicks = 0;
      sim.emit(SIM_EVENTS.dryFire, player.id, { weaponId: def.id });
    }
    return;
  }

  if (wantsShot && ready) {
    combat.fireBufferTicks = 0;
    fireWeapon(sim, player, item, def);
  }
}

/* ------------------------------------------------------------------------------------------ */
/* Shooting                                                                                    */
/* ------------------------------------------------------------------------------------------ */

/** Half-angle of the spread cone the next shot would have, in degrees. */
export function currentSpreadDegrees(sim: Simulation, player: SimPlayer, def: WeaponDef): number {
  const c = player.char;
  const combat = player.combat;
  let spread = def.hipSpreadDegrees + (def.adsSpreadDegrees - def.hipSpreadDegrees) * combat.adsBlend;
  spread += combat.bloomDegrees;
  spread += def.moveSpreadDegrees * Math.min(1, Math.hypot(c.vx, c.vz) / sim.movement.sprintSpeed);
  if (!c.grounded) spread += def.airSpreadDegrees;
  else if (c.crouching && !c.sliding) spread *= CROUCH_SPREAD_FACTOR;
  return spread;
}

function fireWeapon(sim: Simulation, player: SimPlayer, item: WeaponItem, def: WeaponDef): void {
  const c = player.char;
  const input = player.input;
  const combat = player.combat;

  const spreadDegrees = currentSpreadDegrees(sim, player, def);
  item.ammoInMag -= 1;
  // While firing continuously the schedule keeps its fractional part, so the average rate is
  // exact (8 shots per second is 7.5 ticks apart: 7, 8, 7, 8...). After a pause it restarts.
  const scheduled = sim.tick - item.nextFireTick < 1 ? item.nextFireTick : sim.tick;
  item.nextFireTick = scheduled + fireIntervalTicks(def, TICK_RATE);
  const shotIndex = item.shotsFired++;
  combat.lastShotTick = sim.tick;
  combat.totals.shotsFired++;

  // View basis: forward, right (horizontal) and up.
  const sinYaw = Math.sin(input.yaw);
  const cosYaw = Math.cos(input.yaw);
  const cosPitch = Math.cos(input.pitch);
  const fx = -sinYaw * cosPitch;
  const fy = Math.sin(input.pitch);
  const fz = -cosYaw * cosPitch;
  const rx = cosYaw;
  const rz = -sinYaw;
  const ux = sinYaw * fy;
  const uy = -sinYaw * fx - cosYaw * fz;
  const uz = cosYaw * fy;

  const eye = eyeHeight(c, sim.movement);
  let ox = c.x;
  let oy = c.y + eye;
  let oz = c.z;
  if (player.aimMode === 'camera') {
    // The shot leaves from the camera's shoulder pivot along the view direction, so it lands
    // exactly under the crosshair. The pivot is already kept out of walls by the rig.
    computeCameraRig(sim.world, c.x, c.y, c.z, eye, input.yaw, input.pitch, DEFAULT_CAMERA, combat.adsBlend, rig);
    ox = rig.pivotX;
    oy = rig.pivotY;
    oz = rig.pivotZ;
  }

  // Reproducible spread: the same match seed, shooter, weapon instance and shot number always
  // give the same pellet pattern, whatever anyone else is doing.
  const rng = makeRng(hash32(sim.seed, player.rngSalt, item.instanceId, shotIndex));
  const spreadRadians = spreadDegrees * DEG;
  const ends: number[] = [];
  const kinds: number[] = [];
  const materials: SurfaceMaterial[] = [];
  pendingHits.length = 0;

  for (let p = 0; p < def.pellets; p++) {
    const theta = spreadRadians * Math.sqrt(rng());
    const phi = rng() * Math.PI * 2;
    const k = Math.tan(theta);
    const a = k * Math.cos(phi);
    const b = k * Math.sin(phi);
    let dx = fx + rx * a + ux * b;
    let dy = fy + uy * b;
    let dz = fz + rz * a + uz * b;
    const inv = 1 / Math.hypot(dx, dy, dz);
    dx *= inv;
    dy *= inv;
    dz *= inv;

    let t = def.maxRangeMeters;
    let kind: number = SHOT_END.none;
    let material: SurfaceMaterial = 'concrete';
    if (sim.world.raycast(ox, oy, oz, dx, dy, dz, t, rayHit)) {
      t = rayHit.t;
      kind = SHOT_END.world;
      material = rayHit.material;
    }

    let victim: SimPlayer | null = null;
    let headshot = false;
    const roster = sim.roster;
    for (let i = 0; i < roster.length; i++) {
      const other = roster[i]!;
      if (other === player || other.combat.aliveState !== 'alive') continue;
      if (other.teamId === player.teamId && !sim.rules.friendlyFire) continue;
      if (rayCharacter(ox, oy, oz, dx, dy, dz, other.char, t, charHit)) {
        t = charHit.t;
        victim = other;
        headshot = charHit.zone === 'head';
      }
    }

    const hx = ox + dx * t;
    const hy = oy + dy * t;
    const hz = oz + dz * t;
    ends.push(hx, hy, hz);
    kinds.push(victim !== null ? SHOT_END.player : kind);
    materials.push(material);

    if (victim !== null) {
      const damage = computeHitDamage(def, headshot, t);
      let entry: PendingHit | undefined;
      for (let i = 0; i < pendingHits.length; i++) {
        if (pendingHits[i]!.victim === victim) {
          entry = pendingHits[i];
          break;
        }
      }
      if (entry === undefined) {
        pendingHits.push({ victim, damage, pellets: 1, headshot, distance: t, x: hx, y: hy, z: hz });
      } else {
        entry.damage += damage;
        entry.pellets++;
        entry.headshot = entry.headshot || headshot;
        entry.distance = Math.min(entry.distance, t);
      }
    }
  }

  combat.bloomDegrees = Math.min(def.bloomMaxDegrees, combat.bloomDegrees + def.bloomPerShotDegrees);
  const steady = 1 - 0.35 * combat.adsBlend;
  const kickPitch = def.recoilPitchDegrees * DEG * (0.85 + 0.3 * rng()) * steady;
  const kickYaw = def.recoilYawDegrees * DEG * (rng() * 2 - 1) * steady;

  sim.emit(SIM_EVENTS.shotFired, player.id, {
    weaponId: def.id,
    ox,
    oy,
    oz,
    ends,
    kinds,
    materials,
    ammoInMag: item.ammoInMag,
    spreadDegrees,
    kickPitch,
    kickYaw,
  });
  sim.addNoise(c.x, c.y + eye, c.z, def.noiseRadius, player);

  if (pendingHits.length > 0) combat.totals.shotsHit++;
  // Copy first: applying damage can eliminate players and re-enter this module.
  const hits = pendingHits.slice();
  for (const hit of hits) {
    sim.dealDamage(hit.victim, hit.damage, {
      attacker: player,
      cause: 'weapon',
      weaponId: def.id,
      headshot: hit.headshot,
      distance: hit.distance,
      pellets: hit.pellets,
      x: hit.x,
      y: hit.y,
      z: hit.z,
    });
  }
}

/* ------------------------------------------------------------------------------------------ */
/* Reloading and switching                                                                     */
/* ------------------------------------------------------------------------------------------ */

function startReload(sim: Simulation, player: SimPlayer, item: WeaponItem, def: WeaponDef): void {
  const combat = player.combat;
  const ticks = secondsToTicks(def.reloadSeconds);
  combat.reload = { slot: combat.inventory.active, instanceId: item.instanceId, startTick: sim.tick, finishTick: sim.tick + ticks };
  combat.fireBufferTicks = 0;
  sim.emit(SIM_EVENTS.reloadStarted, player.id, { weaponId: def.id, ticks });
}

function finishReload(sim: Simulation, player: SimPlayer): void {
  const combat = player.combat;
  const reload = combat.reload;
  combat.reload = null;
  if (reload === null) return;
  const item = combat.inventory.slots[reload.slot];
  if (!item || item.kind !== 'weapon' || item.instanceId !== reload.instanceId) return;
  const def = getWeaponDef(item.weaponId);
  if (!def) return;
  const ammo = combat.inventory.ammo;
  const moved = Math.max(0, Math.min(def.magazine - item.ammoInMag, ammo[def.ammoType]));
  item.ammoInMag += moved;
  ammo[def.ammoType] -= moved;
  sim.emit(SIM_EVENTS.reloadFinished, player.id, { weaponId: def.id, ammoInMag: item.ammoInMag, reserve: ammo[def.ammoType] });
}

/** Aborts whatever the player was doing with their hands (reload, item use). */
export function cancelActions(sim: Simulation, player: SimPlayer, reason: string): void {
  const combat = player.combat;
  if (combat.reload !== null) {
    combat.reload = null;
    sim.emit(SIM_EVENTS.reloadCancelled, player.id, { reason });
  }
  if (combat.use !== null) {
    const itemId = combat.use.itemId;
    combat.use = null;
    sim.emit(SIM_EVENTS.itemUseCancelled, player.id, { itemId, reason });
  }
}

function describeItem(item: InventoryItem): { kind: string; defId: string } {
  return item.kind === 'weapon' ? { kind: 'weapon', defId: item.weaponId } : { kind: 'consumable', defId: item.itemId };
}

/** Makes `slot` the selected one. The caller has checked that it holds something. */
export function selectSlot(sim: Simulation, player: SimPlayer, slot: number): void {
  const combat = player.combat;
  const item = combat.inventory.slots[slot];
  if (!item) return;
  cancelActions(sim, player, 'switch');
  combat.inventory.active = slot;
  const def = item.kind === 'weapon' ? getWeaponDef(item.weaponId) : undefined;
  combat.equipReadyTick = sim.tick + (def ? def.equipTicks : CONSUMABLE_EQUIP_TICKS);
  combat.bloomDegrees = 0;
  combat.fireBufferTicks = 0;
  sim.emit(SIM_EVENTS.slotSelected, player.id, { slot, ...describeItem(item) });
}

/* ------------------------------------------------------------------------------------------ */
/* Consumables                                                                                 */
/* ------------------------------------------------------------------------------------------ */

function startUse(sim: Simulation, player: SimPlayer, item: ConsumableItem): void {
  const combat = player.combat;
  const def = getConsumableDef(item.itemId);
  if (!def) return;
  const stats = combat.stats;
  const current = def.restores === 'health' ? stats.health : stats.shield;
  const max = def.restores === 'health' ? stats.maxHealth : stats.maxShield;
  if (consumableGain(def, current, max) <= 0) {
    sim.emit(SIM_EVENTS.itemUseRejected, player.id, { itemId: def.id, reason: 'full' });
    return;
  }
  combat.use = { slot: combat.inventory.active, itemId: def.id, startTick: sim.tick, finishTick: sim.tick + def.useTicks };
  sim.emit(SIM_EVENTS.itemUseStarted, player.id, { itemId: def.id, ticks: def.useTicks });
}

function finishUse(sim: Simulation, player: SimPlayer): void {
  const combat = player.combat;
  const use = combat.use;
  combat.use = null;
  if (use === null) return;
  const inventory = combat.inventory;
  const item = inventory.slots[use.slot];
  if (!item || item.kind !== 'consumable' || item.itemId !== use.itemId) return;
  const def = getConsumableDef(item.itemId);
  if (!def) return;
  const stats = combat.stats;
  const current = def.restores === 'health' ? stats.health : stats.shield;
  const max = def.restores === 'health' ? stats.maxHealth : stats.maxShield;
  const gain = consumableGain(def, current, max);
  if (gain > 0) combat.stats = heal(stats, gain, def.restores);
  item.count -= 1;
  sim.emit(SIM_EVENTS.itemUsed, player.id, { itemId: def.id, restores: def.restores, amount: gain, remaining: item.count });
  if (item.count <= 0) {
    inventory.slots[use.slot] = null;
    const next = findWeaponSlot(inventory);
    if (inventory.active === use.slot && next >= 0) selectSlot(sim, player, next);
  }
}

/* ------------------------------------------------------------------------------------------ */
/* Pickups                                                                                     */
/* ------------------------------------------------------------------------------------------ */

function withinReach(player: SimPlayer, item: LootItem, radius: number): boolean {
  const c = player.char;
  const dx = item.x - c.x;
  const dz = item.z - c.z;
  return dx * dx + dz * dz <= radius * radius && Math.abs(item.y - c.y) <= PICKUP_MAX_HEIGHT_DIFFERENCE;
}

/** The item the interact key would pick up right now, or null. Also drives the HUD prompt. */
export function findPickupCandidate(sim: Simulation, player: SimPlayer): LootItem | null {
  if (player.combat.aliveState !== 'alive') return null;
  const c = player.char;
  const forwardX = -Math.sin(player.input.yaw);
  const forwardZ = -Math.cos(player.input.yaw);
  const chestY = c.y + c.height * 0.6;
  let best: LootItem | null = null;
  let bestScore = Infinity;
  for (const item of sim.loot.values()) {
    if (!withinReach(player, item, PICKUP_RADIUS)) continue;
    if (item.kind === 'ammo' && isAmmoType(item.defId) && player.combat.inventory.ammo[item.defId] >= AMMO_RESERVE_CAP) continue;
    const dx = item.x - c.x;
    const dz = item.z - c.z;
    const distance = Math.hypot(dx, dz);
    // Whatever is in front of the player wins over something slightly closer behind them.
    const facing = distance > 1e-3 ? (dx * forwardX + dz * forwardZ) / distance : 1;
    const score = distance - 0.5 * facing;
    if (score >= bestScore) continue;
    if (!sim.world.hasLineOfSight(c.x, chestY, c.z, item.x, item.y + 0.35, item.z, rayHit)) continue;
    best = item;
    bestScore = score;
  }
  return best;
}

function collectAmmo(sim: Simulation, player: SimPlayer): void {
  if (sim.loot.size === 0) return;
  for (const item of sim.loot.values()) {
    if (item.kind !== 'ammo' || !withinReach(player, item, AMMO_AUTO_PICKUP_RADIUS)) continue;
    takeAmmo(sim, player, item, true);
  }
}

function takeAmmo(sim: Simulation, player: SimPlayer, item: LootItem, auto: boolean): void {
  if (!isAmmoType(item.defId)) return;
  const added = addAmmo(player.combat.inventory, item.defId, item.count);
  if (added <= 0) return;
  if (added >= item.count) sim.removeLoot(item);
  else item.count -= added;
  sim.emit(SIM_EVENTS.itemPickedUp, player.id, { lootId: item.id, kind: 'ammo', defId: item.defId, count: added, auto });
}

/** Puts the contents of a slot on the ground at the player's feet. */
export function dropSlot(sim: Simulation, player: SimPlayer, slot: number, scatterIndex = -1): void {
  const combat = player.combat;
  const item = combat.inventory.slots[slot];
  if (!item) return;
  if (combat.reload !== null && combat.reload.slot === slot) cancelActions(sim, player, 'drop');
  if (combat.use !== null && combat.use.slot === slot) cancelActions(sim, player, 'drop');
  combat.inventory.slots[slot] = null;
  const dropped =
    item.kind === 'weapon'
      ? sim.dropLoot(player, { kind: 'weapon', defId: item.weaponId, count: 1, weapon: item }, scatterIndex)
      : sim.dropLoot(player, { kind: 'consumable', defId: item.itemId, count: item.count, weapon: null }, scatterIndex);
  sim.emit(SIM_EVENTS.itemDropped, player.id, { lootId: dropped.id, ...describeItem(item) });
}

function tryPickup(sim: Simulation, player: SimPlayer): void {
  const target = findPickupCandidate(sim, player);
  if (target === null) return;
  const combat = player.combat;
  const inventory = combat.inventory;

  if (target.kind === 'ammo') {
    takeAmmo(sim, player, target, false);
    return;
  }

  if (target.kind === 'consumable') {
    const def = getConsumableDef(target.defId);
    if (!def) return;
    const stored = addConsumable(inventory, def, target.count);
    let slot = stored.slot;
    let taken = stored.added;
    if (taken === 0) {
      // No room at all: trade it for whatever is in hand.
      slot = inventory.active;
      taken = Math.min(target.count, def.maxStack);
      dropSlot(sim, player, slot);
      inventory.slots[slot] = { kind: 'consumable', itemId: def.id, count: taken };
      combat.equipReadyTick = sim.tick + CONSUMABLE_EQUIP_TICKS;
    }
    if (taken >= target.count) sim.removeLoot(target);
    else target.count -= taken;
    sim.emit(SIM_EVENTS.itemPickedUp, player.id, { lootId: target.id, kind: 'consumable', defId: def.id, count: taken, slot, auto: false });
    return;
  }

  const weapon = target.weapon;
  const def = getWeaponDef(target.defId);
  if (!weapon || !def) return;
  let slot = findFreeSlot(inventory);
  const handsWereEmpty = activeItem(inventory) === null;
  if (slot < 0) {
    slot = inventory.active;
    dropSlot(sim, player, slot);
  }
  sim.removeLoot(target);
  inventory.slots[slot] = weapon;
  if (handsWereEmpty) inventory.active = slot;
  if (inventory.active === slot) {
    combat.equipReadyTick = sim.tick + def.equipTicks;
    combat.bloomDegrees = 0;
  }
  sim.emit(SIM_EVENTS.itemPickedUp, player.id, { lootId: target.id, kind: 'weapon', defId: def.id, count: 1, slot, auto: false });
}
