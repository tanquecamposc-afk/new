import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AMMO_BOX_SIZE,
  AMMO_RESERVE_CAP,
  CONSUMABLE_DEFS,
  CONSUMABLE_IDS,
  FIRING_RANGE_RULES,
  INVENTORY_SLOTS,
  NO_SLOT,
  SIM_EVENTS,
  WEAPON_DEFS,
  activeItem,
  addAmmo,
  addConsumable,
  consumableGain,
  createInventory,
  cycleSlot,
  findFreeSlot,
  findPickupCandidate,
  makeWeaponItem,
  neutralInput,
  sanitizeInput,
  validateLootSpawn,
  type LootSpawnDef,
  type MatchEvent,
} from '../src/core/index.js';
import { aimAt, combatRules, flatMap, makeArena, tapFire, type Arena } from './helpers/combat.js';

function data(event: MatchEvent | undefined): Record<string, unknown> {
  assert.ok(event && event.data, 'expected an event with data');
  return event.data;
}

function press(arena: Arena, id: string, button: 'interact' | 'reload'): void {
  arena.input(id)[button] = true;
  arena.step();
  arena.input(id)[button] = false;
  arena.step();
}

function select(arena: Arena, id: string, slot: number): void {
  arena.input(id).slot = slot;
  arena.step();
  arena.input(id).slot = NO_SLOT;
}

function slotSummary(arena: Arena, id: string): string[] {
  return arena.player(id).combat.inventory.slots.map((item) =>
    item === null ? '-' : item.kind === 'weapon' ? item.weaponId : `${item.itemId}x${item.count}`,
  );
}

test('inventory: five slots, stacks respect their limit, ammunition is capped and never negative', () => {
  const inventory = createInventory();
  assert.equal(inventory.slots.length, INVENTORY_SLOTS);
  assert.equal(findFreeSlot(inventory), 0);

  const bandage = CONSUMABLE_DEFS['bandage']!;
  assert.deepEqual(addConsumable(inventory, bandage, 10), { added: 10, slot: 0 });
  // 10 + 8: tops the first stack up to 15 and opens a second one with the other 3.
  assert.deepEqual(addConsumable(inventory, bandage, 8), { added: 8, slot: 1 });
  assert.deepEqual(
    inventory.slots.map((item) => (item && item.kind === 'consumable' ? item.count : 0)),
    [15, 3, 0, 0, 0],
  );
  assert.deepEqual(addConsumable(inventory, bandage, -4), { added: 0, slot: -1 });
  assert.deepEqual(addConsumable(inventory, bandage, Number.NaN), { added: 0, slot: -1 });

  // Fill the rest with weapons: a new stack no longer fits, an existing one still does.
  for (let slot = 2; slot < INVENTORY_SLOTS; slot++) inventory.slots[slot] = makeWeaponItem(WEAPON_DEFS['starter_ar']!, slot);
  assert.equal(findFreeSlot(inventory), -1);
  assert.deepEqual(addConsumable(inventory, CONSUMABLE_DEFS['medkit']!, 1), { added: 0, slot: -1 });
  assert.deepEqual(addConsumable(inventory, bandage, 20), { added: 12, slot: 1 });

  assert.equal(addAmmo(inventory, 'light', 50), 50);
  assert.equal(addAmmo(inventory, 'light', AMMO_RESERVE_CAP), AMMO_RESERVE_CAP - 50);
  assert.equal(inventory.ammo.light, AMMO_RESERVE_CAP);
  assert.equal(addAmmo(inventory, 'light', 10), 0);
  assert.equal(addAmmo(inventory, 'medium', -5), 0);
  assert.equal(addAmmo(inventory, 'medium', Number.NaN), 0);
  assert.equal(inventory.ammo.medium, 0);

  // A magazine can never be created over its size or below zero.
  assert.equal(makeWeaponItem(WEAPON_DEFS['starter_pistol']!, 1, 99).ammoInMag, 12);
  assert.equal(makeWeaponItem(WEAPON_DEFS['starter_pistol']!, 1, -3).ammoInMag, 0);

  // Cycling skips empty slots and wraps around.
  const sparse = createInventory();
  sparse.slots[1] = makeWeaponItem(WEAPON_DEFS['starter_ar']!, 1);
  sparse.slots[4] = makeWeaponItem(WEAPON_DEFS['starter_smg']!, 2);
  sparse.active = 1;
  assert.equal(cycleSlot(sparse, 1), 4);
  sparse.active = 4;
  assert.equal(cycleSlot(sparse, 1), 1);
  assert.equal(cycleSlot(sparse, -1), 1);
  assert.equal(cycleSlot(createInventory(), 1), 0);
});

test('input: combat buttons are sanitized like everything else', () => {
  const dirty = { ...neutralInput(), fire: 1, ads: 'yes', reload: null, interact: true, slot: 2.5 } as unknown as Parameters<typeof sanitizeInput>[0];
  const clean = sanitizeInput(dirty);
  assert.deepEqual([clean.fire, clean.ads, clean.reload, clean.interact, clean.slot], [false, false, false, true, NO_SLOT]);
  for (const slot of [-2, 5, 99, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.equal(sanitizeInput({ ...neutralInput(), slot }).slot, NO_SLOT);
  }
  assert.equal(sanitizeInput({ ...neutralInput(), slot: 4 }).slot, 4);
});

test('consumables: definitions follow docs/03 and never exceed their caps', () => {
  assert.deepEqual([...CONSUMABLE_IDS].sort(), ['bandage', 'medkit', 'shield_battery', 'shield_cell']);
  const cell = CONSUMABLE_DEFS['shield_cell']!;
  assert.equal(consumableGain(cell, 0, 100), 25);
  assert.equal(consumableGain(cell, 40, 100), 10);
  assert.equal(consumableGain(cell, 50, 100), 0);
  assert.equal(consumableGain(cell, 90, 100), 0);
  // A mode with a smaller shield pool limits the item too.
  assert.equal(consumableGain(cell, 20, 30), 10);
  assert.equal(consumableGain(CONSUMABLE_DEFS['bandage']!, 70, 100), 5);
  assert.equal(consumableGain(CONSUMABLE_DEFS['medkit']!, 1, 100), 99);
  assert.equal(consumableGain(CONSUMABLE_DEFS['shield_battery']!, 80, 100), 20);
});

test('consumables: using one takes its channel time, heals up to the cap and spends one unit', () => {
  const rules = combatRules({
    health: { start: 60, max: 100 },
    loadout: [
      { weaponId: 'starter_pistol' },
      { itemId: 'bandage', count: 2 },
      { itemId: 'shield_cell', count: 3 },
      { itemId: 'shield_battery', count: 1 },
      { itemId: 'medkit', count: 1 },
    ],
  });
  const arena = makeArena(flatMap(), rules, [{ id: 'p', name: 'P' }]);
  const combat = arena.player('p').combat;
  assert.deepEqual(slotSummary(arena, 'p'), ['starter_pistol', 'bandagex2', 'shield_cellx3', 'shield_batteryx1', 'medkitx1']);

  // Bandage: 3 s, +15 up to 75.
  select(arena, 'p', 1);
  assert.equal(combat.inventory.active, 1);
  arena.step(10);
  tapFire(arena, 'p');
  const started = arena.eventsOf(SIM_EVENTS.itemUseStarted);
  assert.equal(started.length, 1);
  const useTicks = CONSUMABLE_DEFS['bandage']!.useTicks;
  assert.equal(data(started[0])['ticks'], useTicks);
  arena.step(useTicks - 3);
  assert.equal(combat.stats.health, 60, 'nothing happens before the channel completes');
  arena.step(3);
  assert.equal(combat.stats.health, 75);
  assert.deepEqual(data(arena.eventsOf(SIM_EVENTS.itemUsed)[0]), { itemId: 'bandage', restores: 'health', amount: 15, remaining: 1 });

  // At the cap the item refuses to start and is not spent.
  tapFire(arena, 'p');
  assert.equal(data(arena.eventsOf(SIM_EVENTS.itemUseRejected)[0])['reason'], 'full');
  assert.equal(slotSummary(arena, 'p')[1], 'bandagex1');

  // Shield cells: 25 each, up to 50.
  select(arena, 'p', 2);
  for (const expected of [25, 50]) {
    arena.step(10);
    tapFire(arena, 'p');
    arena.step(CONSUMABLE_DEFS['shield_cell']!.useTicks);
    assert.equal(combat.stats.shield, expected);
  }
  arena.step(10);
  tapFire(arena, 'p');
  assert.equal(arena.eventsOf(SIM_EVENTS.itemUseRejected).length, 2);
  assert.equal(slotSummary(arena, 'p')[2], 'shield_cellx1');

  // Battery: 50 -> 100. The stack is used up, so the slot empties and the weapon comes back.
  select(arena, 'p', 3);
  arena.step(10);
  tapFire(arena, 'p');
  arena.step(CONSUMABLE_DEFS['shield_battery']!.useTicks);
  assert.equal(combat.stats.shield, 100);
  assert.equal(slotSummary(arena, 'p')[3], '-');
  assert.equal(combat.inventory.active, 0, 'back to the weapon');

  // Medkit: full health after 8 s.
  select(arena, 'p', 4);
  arena.step(10);
  tapFire(arena, 'p');
  arena.step(CONSUMABLE_DEFS['medkit']!.useTicks);
  assert.equal(combat.stats.health, 100);
  assert.equal(arena.eventsOf(SIM_EVENTS.itemUsed).length, 5);
});

test('consumables: switching away cancels the channel, and it slows you down while it lasts', () => {
  const rules = combatRules({ health: { start: 40, max: 100 }, loadout: [{ weaponId: 'starter_pistol' }, { itemId: 'medkit', count: 1 }] });
  const arena = makeArena(flatMap(), rules, [{ id: 'p', name: 'P' }]);
  const p = arena.player('p');
  select(arena, 'p', 1);
  arena.step(10);
  tapFire(arena, 'p');
  assert.ok(p.combat.use !== null);

  arena.input('p').moveZ = 1;
  arena.input('p').sprint = true;
  arena.step(90);
  assert.ok(Math.hypot(p.char.vx, p.char.vz) <= arena.sim.movement.walkSpeed * 0.75 + 1e-6, 'no sprinting while healing');
  arena.input('p').moveZ = 0;
  arena.input('p').sprint = false;

  select(arena, 'p', 0);
  assert.equal(p.combat.use, null);
  assert.equal(data(arena.eventsOf(SIM_EVENTS.itemUseCancelled)[0])['reason'], 'switch');
  arena.step(600);
  assert.equal(p.combat.stats.health, 40, 'a cancelled medkit heals nothing');
  assert.equal(slotSummary(arena, 'p')[1], 'medkitx1', 'and is not spent');
  assert.equal(arena.eventsOf(SIM_EVENTS.itemUsed).length, 0);
});

test('pickups: interact takes what is in front, ammunition is collected by walking over it', () => {
  const loot: LootSpawnDef[] = [
    { kind: 'weapon', defId: 'starter_smg', count: 1, x: 1.2, y: 0, z: -1.2 },
    { kind: 'consumable', defId: 'bandage', count: 3, x: -1.2, y: 0, z: -1.2 },
    { kind: 'ammo', defId: 'light', count: AMMO_BOX_SIZE.light, x: 0, y: 0, z: -6 },
  ];
  const rules = combatRules({ startingAmmo: { light: 0, medium: 60, shells: 0, heavy: 0 } });
  const arena = makeArena(flatMap({ loot }), rules, [{ id: 'p', name: 'P' }]);
  const p = arena.player('p');
  assert.equal(arena.sim.loot.size, 3);

  // Look at the SMG: it is the candidate, and interact picks it into the first free slot.
  aimAt(arena, 'p', 1.2, 0.5, -1.2);
  arena.step();
  assert.equal(findPickupCandidate(arena.sim, p)?.defId, 'starter_smg');
  press(arena, 'p', 'interact');
  assert.deepEqual(slotSummary(arena, 'p'), ['starter_ar', 'starter_smg', '-', '-', '-']);
  assert.equal(p.combat.inventory.active, 0, 'the weapon in hand does not change');
  const picked = data(arena.eventsOf(SIM_EVENTS.itemPickedUp)[0]);
  assert.deepEqual([picked['kind'], picked['defId'], picked['slot'], picked['auto']], ['weapon', 'starter_smg', 1, false]);

  // Now the bandages.
  aimAt(arena, 'p', -1.2, 0.5, -1.2);
  arena.step();
  press(arena, 'p', 'interact');
  assert.deepEqual(slotSummary(arena, 'p'), ['starter_ar', 'starter_smg', 'bandagex3', '-', '-']);
  assert.equal(arena.sim.loot.size, 1);

  // Nothing left in reach: interact does nothing.
  press(arena, 'p', 'interact');
  assert.equal(arena.eventsOf(SIM_EVENTS.itemPickedUp).length, 2);

  // Walk over the ammunition box.
  aimAt(arena, 'p', 0, 1, -30);
  arena.input('p').moveZ = 1;
  arena.step(90);
  assert.equal(p.combat.inventory.ammo.light, AMMO_BOX_SIZE.light);
  assert.equal(arena.sim.loot.size, 0);
  const auto = data(arena.eventsOf(SIM_EVENTS.itemPickedUp)[2]);
  assert.deepEqual([auto['kind'], auto['defId'], auto['count'], auto['auto']], ['ammo', 'light', AMMO_BOX_SIZE.light, true]);
});

test('pickups: with a full inventory the item in hand is swapped onto the ground, magazine and all', () => {
  const loot: LootSpawnDef[] = [{ kind: 'weapon', defId: 'starter_sniper', count: 1, x: 0, y: 0, z: -1.2 }];
  const rules = combatRules({
    loadout: [
      { weaponId: 'starter_ar' },
      { weaponId: 'starter_smg' },
      { weaponId: 'starter_shotgun' },
      { weaponId: 'starter_pistol' },
      { itemId: 'bandage', count: 4 },
    ],
  });
  const arena = makeArena(flatMap({ loot }), rules, [{ id: 'p', name: 'P' }]);
  const p = arena.player('p');
  // Spend part of the rifle's magazine so we can recognise it later.
  arena.input('p').fire = true;
  arena.step(31);
  arena.input('p').fire = false;
  arena.step();
  const rifle = activeItem(p.combat.inventory);
  assert.ok(rifle && rifle.kind === 'weapon' && rifle.ammoInMag === 25);

  press(arena, 'p', 'interact');
  assert.deepEqual(slotSummary(arena, 'p'), ['starter_sniper', 'starter_smg', 'starter_shotgun', 'starter_pistol', 'bandagex4']);
  assert.equal(arena.sim.loot.size, 1, 'one item went down for the one that came up');
  const dropped = [...arena.sim.loot.values()][0]!;
  assert.equal(dropped.defId, 'starter_ar');
  assert.equal(dropped.weapon, rifle, 'the very same weapon instance is on the ground');
  assert.equal(dropped.weapon?.ammoInMag, 25);
  assert.equal(arena.eventsOf(SIM_EVENTS.itemDropped).length, 1);

  // Picking it back up returns the half-used magazine, and the sniper goes down.
  press(arena, 'p', 'interact');
  assert.equal(slotSummary(arena, 'p')[0], 'starter_ar');
  const back = activeItem(p.combat.inventory);
  assert.ok(back && back.kind === 'weapon' && back.ammoInMag === 25);
  assert.equal([...arena.sim.loot.values()][0]!.defId, 'starter_sniper');
});

test('pickups: one item can only be claimed by one player, even on the same tick', () => {
  const loot: LootSpawnDef[] = [{ kind: 'consumable', defId: 'medkit', count: 1, x: 0, y: 0, z: 0 }];
  const map = flatMap({
    loot,
    spawns: [
      { x: -0.8, y: 0, z: 0, yaw: -Math.PI / 2 },
      { x: 0.8, y: 0, z: 0, yaw: Math.PI / 2 },
    ],
  });
  const arena = makeArena(map, combatRules(), [
    { id: 'a', name: 'A' },
    { id: 'b', name: 'B' },
  ]);
  arena.input('a').interact = true;
  arena.input('b').interact = true;
  arena.step();
  const picked = arena.eventsOf(SIM_EVENTS.itemPickedUp);
  assert.equal(picked.length, 1);
  assert.equal(arena.sim.loot.size, 0);
  const holders = ['a', 'b'].filter((id) => slotSummary(arena, id).includes('medkitx1'));
  assert.deepEqual(holders, [picked[0]!.playerId]);
});

test('pickups: not through walls, not from too far, and map pickups come back when the mode says so', () => {
  const wall = { shape: 'box' as const, minX: -3, minY: 0, minZ: -1, maxX: 3, maxY: 3, maxZ: -0.8, material: 'concrete' as const, style: 'wall' as const };
  const behindWall: LootSpawnDef[] = [{ kind: 'weapon', defId: 'starter_smg', count: 1, x: 0, y: 0, z: -1.5 }];
  const blocked = makeArena(flatMap({ loot: behindWall, statics: [wall] }), combatRules(), [{ id: 'p', name: 'P' }]);
  assert.equal(findPickupCandidate(blocked.sim, blocked.player('p')), null, 'a wall is in the way');
  press(blocked, 'p', 'interact');
  assert.equal(blocked.sim.loot.size, 1);

  const far: LootSpawnDef[] = [{ kind: 'weapon', defId: 'starter_smg', count: 1, x: 0, y: 0, z: -2.6 }];
  const tooFar = makeArena(flatMap({ loot: far }), combatRules(), [{ id: 'p', name: 'P' }]);
  assert.equal(findPickupCandidate(tooFar.sim, tooFar.player('p')), null);

  // Respawning pickups (firing range rules).
  const near: LootSpawnDef[] = [{ kind: 'consumable', defId: 'bandage', count: 2, x: 0, y: 0, z: -1 }];
  const range = makeArena(flatMap({ loot: near }), combatRules({ lootRespawnTicks: 120 }), [{ id: 'p', name: 'P' }]);
  press(range, 'p', 'interact');
  assert.equal(range.sim.loot.size, 0);
  range.step(110);
  assert.equal(range.sim.loot.size, 0);
  range.step(20);
  assert.equal(range.sim.loot.size, 1, 'the pickup is back');
  assert.equal([...range.sim.loot.values()][0]!.count, 2);
  assert.equal(FIRING_RANGE_RULES.lootRespawnTicks > 0, true);

  // Bad map data is rejected before a match can start.
  assert.throws(() => validateLootSpawn({ kind: 'weapon', defId: 'nope', count: 1, x: 0, y: 0, z: 0 }), /unknown weapon/);
  assert.throws(() => validateLootSpawn({ kind: 'consumable', defId: 'bandage', count: 99, x: 0, y: 0, z: 0 }), /bad count/);
  assert.throws(() => validateLootSpawn({ kind: 'ammo', defId: 'plasma', count: 5, x: 0, y: 0, z: 0 }), /unknown ammo/);
  assert.throws(() => validateLootSpawn({ kind: 'ammo', defId: 'light', count: 5, x: Number.NaN, y: 0, z: 0 }), /non-finite/);
});

test('elimination drops the whole inventory on the ground where the player fell', () => {
  const map = flatMap({
    spawns: [
      { x: 0, y: 0, z: 0, yaw: 0 },
      { x: 0, y: 0, z: -8, yaw: Math.PI },
    ],
  });
  const rules = combatRules({
    dropLootOnElimination: true,
    loadout: [{ weaponId: 'starter_ar' }, { weaponId: 'starter_pistol' }, { itemId: 'shield_cell', count: 2 }],
    startingAmmo: { light: 24, medium: 60, shells: 0, heavy: 0 },
  });
  const arena = makeArena(map, rules, [
    { id: 'p', name: 'P', teamId: 1 },
    { id: 'v', name: 'V', teamId: 2 },
  ]);
  const victim = arena.player('v');
  arena.sim.dealDamage(victim, 500, { attacker: arena.player('p'), cause: 'weapon', x: 0, y: 0, z: 0 });
  assert.equal(victim.combat.aliveState, 'eliminated');
  const dropped = [...arena.sim.loot.values()].map((item) => `${item.kind}:${item.defId}:${item.count}`).sort();
  assert.deepEqual(dropped, ['ammo:light:24', 'ammo:medium:60', 'consumable:shield_cell:2', 'weapon:starter_ar:1', 'weapon:starter_pistol:1']);
  for (const item of arena.sim.loot.values()) {
    assert.ok(Math.hypot(item.x - victim.char.x, item.z - victim.char.z) < 1.2, 'dropped next to the body');
    assert.equal(item.y, 0, 'resting on the ground');
  }
  assert.deepEqual(slotSummary(arena, 'v'), ['-', '-', '-', '-', '-']);
  assert.deepEqual(Object.values(victim.combat.inventory.ammo), [0, 0, 0, 0]);
});
