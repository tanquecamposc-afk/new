import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  HIT_ZONES,
  SHOT_END,
  SIM_EVENTS,
  SKIRMISH_RULES,
  TICK_RATE,
  WEAPON_DEFS,
  WEAPON_IDS,
  activeItem,
  applyDamage,
  computeHitDamage,
  currentSpreadDegrees,
  getWeaponDef,
  makeCharacterHit,
  makeRng,
  rayCharacter,
  secondsToTicks,
  validateRules,
  validateWeaponDef,
  type MatchEvent,
  type PlayerStats,
  type WeaponItem,
} from '../src/core/index.js';
import { aimAt, aimAtPlayer, combatRules, dummy, flatMap, makeArena, tapFire, type Arena } from './helpers/combat.js';

function weaponOf(arena: Arena, id: string, slot?: number): WeaponItem {
  const inventory = arena.player(id).combat.inventory;
  const item = slot === undefined ? activeItem(inventory) : inventory.slots[slot];
  assert.ok(item && item.kind === 'weapon', 'expected a weapon in the slot');
  return item;
}

function data(event: MatchEvent | undefined): Record<string, unknown> {
  assert.ok(event && event.data, 'expected an event with data');
  return event.data;
}

/** Holds ADS still long enough for the aim to settle. */
function settleAim(arena: Arena, id: string): void {
  arena.input(id).ads = true;
  arena.step(14);
}

test('weapons: the catalogue matches docs/03 and data/weapons.example.json', () => {
  const file = JSON.parse(readFileSync(new URL('../../data/weapons.example.json', import.meta.url), 'utf8')) as {
    weapons: Array<Record<string, unknown>>;
  };
  assert.equal(file.weapons.length, WEAPON_IDS.length);
  for (const entry of file.weapons) {
    const def = getWeaponDef(String(entry['id']));
    assert.ok(def, `missing weapon ${String(entry['id'])}`);
    assert.equal(def.category, entry['category']);
    assert.equal(def.baseDamage, entry['damage']);
    assert.equal(def.headshotMultiplier, entry['headshotMultiplier']);
    assert.equal(def.magazine, entry['magazineSize']);
    assert.equal(def.reloadSeconds, entry['reloadSeconds']);
    assert.equal(def.shotsPerSecond, entry['shotsPerSecond']);
    assert.equal(def.rangeMeters, entry['rangeMeters']);
  }
  assert.equal(WEAPON_DEFS['starter_shotgun']!.pellets, 8);
  assert.equal(getWeaponDef('toString'), undefined, 'prototype keys are not weapons');
  assert.throws(() => validateWeaponDef({ ...WEAPON_DEFS['starter_ar']!, shotsPerSecond: 0 }), /shotsPerSecond/);
  assert.throws(() => validateWeaponDef({ ...WEAPON_DEFS['starter_ar']!, baseDamage: Number.NaN }), /baseDamage/);
  assert.throws(() => validateWeaponDef({ ...WEAPON_DEFS['starter_ar']!, maxRangeMeters: 10 }), /maxRangeMeters/);
});

test('T03 shot: one round leaves the magazine and the hit is confirmed on the visible collider', () => {
  const arena = makeArena(flatMap(), combatRules(), [{ id: 'p', name: 'P' }, dummy('d', 1)]);
  aimAtPlayer(arena, 'p', 'd');
  assert.equal(weaponOf(arena, 'p').ammoInMag, 30);

  tapFire(arena, 'p');
  assert.equal(weaponOf(arena, 'p').ammoInMag, 29, 'exactly one round is spent');
  const shots = arena.eventsOf(SIM_EVENTS.shotFired);
  assert.equal(shots.length, 1);
  const shot = data(shots[0]);
  assert.deepEqual(shot['kinds'], [SHOT_END.player]);
  assert.equal(shot['ammoInMag'], 29);

  // The impact point reported by the simulation lies on the dummy's body cylinder.
  const ends = shot['ends'] as number[];
  const target = arena.player('d').char;
  assert.ok(Math.abs(Math.hypot(ends[0]! - target.x, ends[2]! - target.z) - HIT_ZONES.bodyRadius) < 1e-3, 'hit is on the body surface');
  assert.ok(ends[1]! > target.y && ends[1]! < target.y + target.height);

  const hits = arena.eventsOf(SIM_EVENTS.damageDealt);
  assert.equal(hits.length, 1);
  assert.equal(hits[0]!.playerId, 'p');
  assert.equal(data(hits[0])['targetId'], 'd');
  assert.equal(data(hits[0])['amount'], 25);
  assert.equal(arena.player('d').combat.stats.health, 75);
  assert.equal(arena.player('p').combat.totals.shotsHit, 1);

  // Looking away: the round is still spent, but nothing is hit and nothing is reported as hit.
  arena.input('p').yaw += 0.6;
  arena.step(8);
  tapFire(arena, 'p');
  assert.equal(weaponOf(arena, 'p').ammoInMag, 28);
  const second = data(arena.eventsOf(SIM_EVENTS.shotFired)[1]);
  assert.notDeepEqual(second['kinds'], [SHOT_END.player]);
  assert.equal(arena.eventsOf(SIM_EVENTS.damageDealt).length, 1);
  assert.equal(arena.player('d').combat.stats.health, 75);
  assert.equal(arena.player('p').combat.totals.shotsFired, 2);
});

test('rate of fire: automatic weapons hit their exact rate, semi-automatic ones need a press per shot', () => {
  const count = (weaponId: string, drive: (arena: Arena, tick: number) => void, ticks: number): number => {
    const arena = makeArena(flatMap(), combatRules({ loadout: [{ weaponId }] }), [{ id: 'p', name: 'P' }]);
    for (let tick = 1; tick <= ticks; tick++) {
      drive(arena, tick);
      arena.step();
    }
    return arena.eventsOf(SIM_EVENTS.shotFired).length;
  };
  const hold = (arena: Arena): void => {
    arena.input('p').fire = true;
  };
  assert.equal(count('starter_ar', hold, TICK_RATE), 8, 'rifle: 8 shots per second');
  assert.equal(count('starter_smg', hold, TICK_RATE), 11, 'SMG: 11 shots per second');
  assert.equal(count('starter_ar', hold, 219), 30, 'the 30th round leaves on tick 219');
  assert.equal(count('starter_pistol', hold, TICK_RATE), 1, 'holding the trigger of a pistol fires once');
  // Mashing the trigger far faster than the weapon allows is capped at its rate (4 per second).
  const mash = (arena: Arena, tick: number): void => {
    arena.input('p').fire = tick % 4 < 2;
  };
  assert.equal(count('starter_pistol', mash, TICK_RATE), 4);
  assert.equal(count('starter_shotgun', mash, 3 * TICK_RATE), 3, 'shotgun: 0.85 shots per second');
});

test('T05 reload: nothing fires while reloading and the final ammunition is exact', () => {
  const rules = combatRules({ startingAmmo: { light: 0, medium: 45, shells: 0, heavy: 0 } });
  const arena = makeArena(flatMap(), rules, [{ id: 'p', name: 'P' }]);
  const p = arena.input('p');
  const ammo = arena.player('p').combat.inventory.ammo;

  // A full magazine does not reload.
  p.reload = true;
  arena.step(2);
  p.reload = false;
  assert.equal(arena.eventsOf(SIM_EVENTS.reloadStarted).length, 0);

  p.fire = true;
  arena.step(31); // shots on ticks 1, 9, 16, 24, 31
  p.fire = false;
  arena.step();
  assert.equal(weaponOf(arena, 'p').ammoInMag, 25);

  p.reload = true;
  arena.step();
  p.reload = false;
  const started = arena.eventsOf(SIM_EVENTS.reloadStarted);
  assert.equal(started.length, 1);
  const startTick = started[0]!.atTick;
  const reloadTicks = secondsToTicks(2.0);
  assert.equal(data(started[0])['ticks'], reloadTicks);

  // Trigger held for the whole reload: not a single shot, magazine untouched until it finishes.
  const shotsBefore = arena.eventsOf(SIM_EVENTS.shotFired).length;
  p.fire = true;
  arena.step(reloadTicks - 1);
  assert.equal(arena.sim.tick, startTick + reloadTicks - 1);
  assert.equal(arena.eventsOf(SIM_EVENTS.shotFired).length, shotsBefore, 'no shot during the reload');
  assert.equal(weaponOf(arena, 'p').ammoInMag, 25);
  assert.equal(ammo.medium, 45);
  p.fire = false;
  arena.step();
  const finished = arena.eventsOf(SIM_EVENTS.reloadFinished);
  assert.equal(finished.length, 1);
  assert.equal(finished[0]!.atTick, startTick + reloadTicks);
  assert.equal(weaponOf(arena, 'p').ammoInMag, 30);
  assert.equal(ammo.medium, 40, 'exactly the five missing rounds left the reserve');

  // Not enough reserve for a full magazine: it takes what there is, never goes negative.
  ammo.medium = 3;
  weaponOf(arena, 'p').ammoInMag = 0;
  arena.step(); // empty magazine + reserve: reloads by itself
  assert.equal(arena.eventsOf(SIM_EVENTS.reloadStarted).length, 2);
  arena.step(reloadTicks);
  assert.equal(weaponOf(arena, 'p').ammoInMag, 3);
  assert.equal(ammo.medium, 0);

  // Empty weapon, empty reserve: it never fires and clicks once per trigger press.
  weaponOf(arena, 'p').ammoInMag = 0;
  const shotsSoFar = arena.eventsOf(SIM_EVENTS.shotFired).length;
  p.fire = true;
  arena.step(40);
  assert.equal(arena.eventsOf(SIM_EVENTS.dryFire).length, 1);
  p.fire = false;
  arena.step();
  p.fire = true;
  arena.step(10);
  assert.equal(arena.eventsOf(SIM_EVENTS.dryFire).length, 2);
  assert.equal(arena.eventsOf(SIM_EVENTS.shotFired).length, shotsSoFar);
  assert.equal(arena.eventsOf(SIM_EVENTS.reloadStarted).length, 2);
});

test('reload: switching weapon cancels it (or is refused when the mode says reloads must finish)', () => {
  const loadout = [{ weaponId: 'starter_ar' }, { weaponId: 'starter_pistol' }];
  const run = (switchCancelsReload: boolean): Arena => {
    const arena = makeArena(flatMap(), combatRules({ loadout, switchCancelsReload }), [{ id: 'p', name: 'P' }]);
    weaponOf(arena, 'p', 0).ammoInMag = 10;
    arena.input('p').reload = true;
    arena.step();
    arena.input('p').reload = false;
    arena.step(30);
    arena.input('p').slot = 1;
    arena.step();
    arena.input('p').slot = -1;
    return arena;
  };

  const cancelled = run(true);
  assert.equal(cancelled.player('p').combat.inventory.active, 1);
  assert.equal(cancelled.eventsOf(SIM_EVENTS.reloadCancelled).length, 1);
  assert.equal(cancelled.player('p').combat.reload, null);
  cancelled.step(200);
  assert.equal(weaponOf(cancelled, 'p', 0).ammoInMag, 10, 'the interrupted reload never completes');
  assert.equal(cancelled.eventsOf(SIM_EVENTS.reloadFinished).length, 0);

  const refused = run(false);
  assert.equal(refused.player('p').combat.inventory.active, 0, 'the switch is refused while reloading');
  refused.step(200);
  assert.equal(weaponOf(refused, 'p', 0).ammoInMag, 30);
});

test('T04 shield: it is consumed before health and nothing ever goes negative', () => {
  const target = dummy('d', 1, { health: { start: 100, max: 100 }, shield: { start: 50, max: 50 } });
  const arena = makeArena(flatMap(), combatRules(), [{ id: 'p', name: 'P' }, target]);
  aimAtPlayer(arena, 'p', 'd');
  const stats = (): PlayerStats => arena.player('d').combat.stats;

  tapFire(arena, 'p');
  assert.deepEqual([stats().shield, stats().health], [25, 100]);
  arena.step(8);
  tapFire(arena, 'p');
  assert.deepEqual([stats().shield, stats().health], [0, 100]);
  const second = data(arena.eventsOf(SIM_EVENTS.damageDealt)[1]);
  assert.equal(second['shieldBroken'], true);
  assert.equal(second['healthDamage'], 0);
  arena.step(8);
  tapFire(arena, 'p');
  assert.deepEqual([stats().shield, stats().health], [0, 75]);

  // A hit bigger than the remaining shield spills over into health.
  const spill = applyDamage({ health: 100, shield: 20, maxHealth: 100, maxShield: 100, alive: true }, 32);
  assert.deepEqual([spill.shieldDamage, spill.healthDamage, spill.next.shield, spill.next.health], [20, 12, 0, 88]);
});

test('damage invariants: 1000 random hits never break health, shield or the single elimination', () => {
  const rng = makeRng(77);
  const oddities = [0, -5, Number.NaN, Number.POSITIVE_INFINITY, 1e9, 0.5, 33.3];
  for (let round = 0; round < 50; round++) {
    const health = 1 + Math.floor(rng() * 200);
    const shield = Math.floor(rng() * 150);
    const target = dummy('d', 1, { health: { start: health, max: health }, shield: { start: shield, max: shield } });
    const arena = makeArena(flatMap(), combatRules(), [{ id: 'p', name: 'P' }, target]);
    const victim = arena.player('d');
    const attacker = arena.player('p');
    let applied = 0;
    for (let i = 0; i < 20; i++) {
      const amount = rng() < 0.25 ? oddities[Math.floor(rng() * oddities.length)]! : rng() * 60;
      const before = victim.combat.stats.health + victim.combat.stats.shield;
      arena.sim.dealDamage(victim, amount, { attacker, cause: 'weapon', x: 0, y: 0, z: 0 });
      const s = victim.combat.stats;
      assert.ok(Number.isFinite(s.health) && Number.isFinite(s.shield), `non-finite stats after ${amount}`);
      assert.ok(s.health >= 0 && s.health <= s.maxHealth, `health out of range after ${amount}`);
      assert.ok(s.shield >= 0 && s.shield <= s.maxShield, `shield out of range after ${amount}`);
      assert.ok(s.health + s.shield <= before, 'damage never heals');
      assert.equal(s.alive, s.health > 0);
      applied += before - (s.health + s.shield);
    }
    for (const event of arena.sim.drainEvents()) arena.events.push(event);
    assert.ok(arena.eventsOf(SIM_EVENTS.playerEliminated).length <= 1, 'eliminated at most once');
    assert.ok(Math.abs(victim.combat.totals.damageTaken - applied) < 1e-6);
    assert.ok(attacker.combat.totals.eliminations <= 1);
    assert.equal(victim.combat.aliveState === 'eliminated', victim.combat.stats.health === 0);
  }
});

test('hit zones: a head shot uses the multiplier and crouching makes the target smaller', () => {
  const target = dummy('d', 1, { health: { start: 200, max: 200 } });
  const arena = makeArena(flatMap(), combatRules(), [{ id: 'p', name: 'P' }, target]);
  aimAtPlayer(arena, 'p', 'd', 'head');
  settleAim(arena, 'p');
  aimAtPlayer(arena, 'p', 'd', 'head');
  tapFire(arena, 'p');
  const hit = data(arena.eventsOf(SIM_EVENTS.damageDealt)[0]);
  assert.equal(hit['headshot'], true);
  assert.equal(hit['amount'], 45, '25 x 1.8');
  assert.equal(arena.player('p').combat.totals.headshots, 1);

  // Geometry of the zones themselves: [zone, distance] of a ray, or null when it misses.
  const standing = { x: 0, y: 0, z: -10, height: 1.8 };
  const crouched = { x: 0, y: 0, z: -10, height: 1.2 };
  const cast = (ox: number, oy: number, oz: number, dy: number, dz: number, target: typeof standing, maxT = 50): [string, number] | null => {
    const out = makeCharacterHit();
    return rayCharacter(ox, oy, oz, 0, dy, dz, target, maxT, out) ? [out.zone, out.t] : null;
  };
  const head = cast(0, 1.7, 0, 0, -1, standing);
  assert.ok(head && head[0] === 'head');
  assert.ok(Math.abs(head[1] - (10 - Math.sqrt(0.2 * 0.2 - 0.1 * 0.1))) < 1e-9);
  const body = cast(0, 1.0, 0, 0, -1, standing);
  assert.ok(body && body[0] === 'body');
  assert.ok(Math.abs(body[1] - (10 - HIT_ZONES.bodyRadius)) < 1e-9);
  assert.equal(cast(0, 1.7, 0, 0, -1, crouched), null, 'the shot passes over a crouched target');
  assert.equal(cast(0, 1.1, 0, 0, -1, crouched)?.[0], 'head');
  assert.equal(cast(0.6, 1.0, 0, 0, -1, standing), null, 'wide of the body');
  assert.equal(cast(0, 1.0, 0, 0, -1, standing, 5), null, 'out of range');
  assert.equal(cast(0, 1.0, 0, 0, 1, standing), null, 'pointing away');
  assert.equal(cast(0, 5, -10, -1, 0, standing)?.[0], 'head', 'from straight above: the head');
});

test('damage falloff: full damage inside the base range, less beyond it, never below the floor', () => {
  const sniper = WEAPON_DEFS['starter_sniper']!;
  assert.equal(computeHitDamage(sniper, false, 160), 90);
  assert.equal(computeHitDamage(sniper, false, 200), 72);
  assert.equal(computeHitDamage(sniper, true, 200), 144);
  assert.equal(computeHitDamage(WEAPON_DEFS['starter_ar']!, false, 1000), Math.round(25 * 0.55));

  // Through the simulation: a sniper shot at 200 m, aimed and standing still (zero spread).
  const map = flatMap({
    half: 120,
    spawns: [
      { x: 0, y: 0, z: 100, yaw: 0 },
      { x: 0, y: 0, z: -100, yaw: Math.PI },
    ],
  });
  const arena = makeArena(map, combatRules({ loadout: [{ weaponId: 'starter_sniper' }] }), [
    { id: 'p', name: 'P', aimMode: 'eye' },
    dummy('d', 1),
  ]);
  aimAtPlayer(arena, 'p', 'd');
  settleAim(arena, 'p');
  assert.equal(currentSpreadDegrees(arena.sim, arena.player('p'), sniper), 0);
  tapFire(arena, 'p');
  const hit = data(arena.eventsOf(SIM_EVENTS.damageDealt)[0]);
  assert.equal(hit['amount'], 72);
  assert.ok(Math.abs((hit['distance'] as number) - (200 - HIT_ZONES.bodyRadius)) < 0.01);
});

test('shotgun: eight pellets per shell, each with its own ray, one shell per shot', () => {
  const map = flatMap({
    spawns: [
      { x: 0, y: 0, z: 0, yaw: 0 },
      { x: 0, y: 0, z: -2, yaw: Math.PI },
    ],
  });
  const target = dummy('d', 1, { health: { start: 300, max: 300 } });
  const arena = makeArena(map, combatRules({ loadout: [{ weaponId: 'starter_shotgun' }] }), [{ id: 'p', name: 'P', aimMode: 'eye' }, target]);
  aimAtPlayer(arena, 'p', 'd');
  tapFire(arena, 'p');
  assert.equal(weaponOf(arena, 'p').ammoInMag, 4);
  const shot = data(arena.eventsOf(SIM_EVENTS.shotFired)[0]);
  assert.equal((shot['kinds'] as number[]).length, 8);
  assert.equal((shot['ends'] as number[]).length, 24);
  const body = data(arena.eventsOf(SIM_EVENTS.damageDealt)[0]);
  assert.equal(body['pellets'], 8);
  assert.equal(body['amount'], 80, '8 pellets x 10');
  assert.equal(arena.player('p').combat.totals.shotsHit, 1, 'one shot hit, however many pellets');

  // All eight in the head: 8 x round(10 x 1.5).
  arena.step(80);
  aimAtPlayer(arena, 'p', 'd', 'head');
  tapFire(arena, 'p');
  const head = data(arena.eventsOf(SIM_EVENTS.damageDealt)[1]);
  assert.equal(head['headshot'], true);
  assert.equal(head['amount'], 120);
});

test('spread: reproducible from the seed, different with another seed, always inside the cone', () => {
  const pattern = (seed: number): number[][] => {
    const arena = makeArena(flatMap(), combatRules({ loadout: [{ weaponId: 'starter_shotgun' }] }), [{ id: 'p', name: 'P', aimMode: 'eye' }], seed);
    for (let i = 0; i < 4; i++) {
      tapFire(arena, 'p');
      arena.step(75);
    }
    return arena.eventsOf(SIM_EVENTS.shotFired).map((event) => data(event)['ends'] as number[]);
  };
  const first = pattern(42);
  assert.equal(first.length, 4);
  assert.deepEqual(pattern(42), first, 'same seed, same pellets');
  assert.notDeepEqual(pattern(43), first, 'another seed, another pattern');
  assert.notDeepEqual(first[0], first[1], 'consecutive shells differ');

  // Every pellet of every shot stays within the reported spread angle of the aim direction.
  const arena = makeArena(flatMap(), combatRules({ loadout: [{ weaponId: 'starter_smg' }] }), [{ id: 'p', name: 'P', aimMode: 'eye' }], 9);
  arena.input('p').fire = true;
  arena.input('p').pitch = 0.2;
  arena.input('p').moveZ = 1;
  arena.step(120);
  const shots = arena.eventsOf(SIM_EVENTS.shotFired);
  assert.ok(shots.length > 15);
  for (const event of shots) {
    const d = data(event);
    const ends = d['ends'] as number[];
    const dx = ends[0]! - (d['ox'] as number);
    const dy = ends[1]! - (d['oy'] as number);
    const dz = ends[2]! - (d['oz'] as number);
    const length = Math.hypot(dx, dy, dz);
    // Aim direction: yaw 0, pitch 0.2 -> (0, sin, -cos).
    const cos = (dy * Math.sin(0.2) - dz * Math.cos(0.2)) / length;
    const angle = (Math.acos(Math.min(1, cos)) * 180) / Math.PI;
    assert.ok(angle <= (d['spreadDegrees'] as number) + 1e-6, `pellet ${angle} outside cone ${String(d['spreadDegrees'])}`);
  }
  // Bloom: sustained fire while moving is less accurate than the first shot.
  assert.ok((data(shots[shots.length - 1])['spreadDegrees'] as number) > (data(shots[0])['spreadDegrees'] as number));
});

test('cover: a wall between shooter and target stops every shot', () => {
  const map = flatMap({ statics: [{ shape: 'box', minX: -3, minY: 0, minZ: -5.2, maxX: 3, maxY: 3, maxZ: -5, material: 'concrete', style: 'wall' }] });
  const arena = makeArena(map, combatRules(), [{ id: 'p', name: 'P' }, dummy('d', 1)]);
  aimAtPlayer(arena, 'p', 'd');
  arena.input('p').fire = true;
  arena.step(60);
  const shots = arena.eventsOf(SIM_EVENTS.shotFired);
  assert.equal(shots.length, 8);
  for (const event of shots) {
    const d = data(event);
    assert.deepEqual(d['kinds'], [SHOT_END.world]);
    assert.deepEqual(d['materials'], ['concrete']);
    assert.ok(Math.abs((d['ends'] as number[])[2]! - -5) < 1e-6, 'the round stops on the near face of the wall');
  }
  assert.equal(arena.eventsOf(SIM_EVENTS.damageDealt).length, 0);
  assert.equal(arena.player('d').combat.stats.health, 100);
});

test('elimination: happens once, the eliminated neither act nor take damage', () => {
  const map = flatMap({
    spawns: [
      { x: -1, y: 0, z: 0, yaw: 0 },
      { x: 1, y: 0, z: 0, yaw: 0 },
      { x: 0, y: 0, z: -10, yaw: Math.PI },
    ],
  });
  const players = [
    { id: 'a', name: 'A', teamId: 1 },
    { id: 'b', name: 'B', teamId: 2 },
    { id: 'v', name: 'V', teamId: 3, health: { start: 30, max: 100 } },
  ];
  const arena = makeArena(map, combatRules({ loadout: [{ weaponId: 'starter_pistol' }] }), players);
  aimAtPlayer(arena, 'a', 'v');
  aimAtPlayer(arena, 'b', 'v');
  // Both shooters fire on the very same tick at a target that one bullet finishes.
  arena.input('a').fire = true;
  arena.input('b').fire = true;
  arena.input('v').fire = true;
  arena.step();
  const eliminated = arena.eventsOf(SIM_EVENTS.playerEliminated);
  assert.equal(eliminated.length, 1, 'one elimination event for one victim');
  assert.equal(eliminated[0]!.playerId, 'v');
  const victim = arena.player('v');
  assert.equal(victim.combat.aliveState, 'eliminated');
  assert.equal(victim.combat.stats.health, 0);
  assert.equal(arena.player('a').combat.totals.eliminations + arena.player('b').combat.totals.eliminations, 1);
  assert.equal(arena.eventsOf(SIM_EVENTS.damageDealt).length, 1, 'the second bullet finds nobody to hurt');
  assert.equal(data(eliminated[0])['byId'], victim.combat.eliminatedBy);

  // The eliminated player's trigger does nothing, and further fire passes through where it stood.
  arena.input('a').fire = false;
  arena.input('b').fire = false;
  arena.step(20);
  arena.input('a').fire = true;
  arena.step(40);
  assert.equal(arena.eventsOf(SIM_EVENTS.shotFired).filter((event) => event.playerId === 'v').length, 0);
  assert.equal(arena.eventsOf(SIM_EVENTS.playerEliminated).length, 1);
  assert.equal(arena.eventsOf(SIM_EVENTS.damageDealt).length, 1);
  assert.equal(victim.combat.totals.damageTaken, 30);
  assert.equal(arena.sim.dealDamage(victim, 50, { attacker: null, cause: 'fall', x: 0, y: 0, z: 0 }), false);
});

test('friendly fire is off by default: team mates cannot hurt each other', () => {
  const players = [
    { id: 'a', name: 'A', teamId: 1 },
    { id: 'b', name: 'B', teamId: 1 },
  ];
  const off = makeArena(flatMap(), combatRules(), players);
  aimAtPlayer(off, 'a', 'b');
  off.input('a').fire = true;
  off.step(30);
  assert.equal(off.eventsOf(SIM_EVENTS.damageDealt).length, 0);
  assert.equal(off.player('b').combat.stats.health, 100);

  const on = makeArena(flatMap(), combatRules({ friendlyFire: true }), players);
  aimAtPlayer(on, 'a', 'b');
  on.input('a').fire = true;
  on.step(30);
  assert.ok(on.player('b').combat.stats.health < 100);
});

test('fall damage: starts above 8 m, scales with the height and goes through the shield first', () => {
  const tower = (height: number, shield: number): Arena => {
    const map = flatMap({
      statics: [{ shape: 'box', minX: -2, minY: 0, minZ: -2, maxX: 2, maxY: height, maxZ: 2, material: 'concrete', style: 'platform' }],
      spawns: [{ x: 0, y: height, z: 0, yaw: 0 }],
    });
    const arena = makeArena(map, combatRules({ shield: { start: shield, max: 100 } }), [{ id: 'p', name: 'P' }]);
    arena.input('p').moveZ = 1;
    arena.step(40);
    arena.input('p').moveZ = 0;
    arena.step(200);
    assert.ok(arena.player('p').char.grounded && arena.player('p').char.y < 0.01, 'the player reached the ground');
    return arena;
  };
  const safe = tower(7.5, 0);
  assert.equal(safe.eventsOf(SIM_EVENTS.damageDealt).length, 0);
  assert.equal(safe.player('p').combat.stats.health, 100);

  const hurt = tower(12, 0);
  const fall = data(hurt.eventsOf(SIM_EVENTS.damageDealt)[0]);
  assert.equal(fall['cause'], 'fall');
  assert.equal(fall['amount'], 56, '(12 - 8) x 14');
  assert.equal(hurt.player('p').combat.stats.health, 44);

  const shielded = tower(12, 30);
  assert.deepEqual([shielded.player('p').combat.stats.shield, shielded.player('p').combat.stats.health], [0, 74]);

  const fatal = tower(20, 0);
  assert.equal(fatal.player('p').combat.aliveState, 'eliminated');
  assert.equal(data(fatal.eventsOf(SIM_EVENTS.playerEliminated)[0])['cause'], 'fall');
});

test('aiming: ADS tightens the spread, sprinting is cancelled by firing and aiming slows the walk', () => {
  const arena = makeArena(flatMap(), combatRules(), [{ id: 'p', name: 'P' }]);
  const ar = WEAPON_DEFS['starter_ar']!;
  const p = arena.player('p');
  assert.equal(currentSpreadDegrees(arena.sim, p, ar), ar.hipSpreadDegrees);
  arena.input('p').ads = true;
  arena.step(5);
  assert.ok(p.combat.adsBlend > 0 && p.combat.adsBlend < 1, 'aiming takes a moment');
  arena.step(10);
  assert.equal(p.combat.adsBlend, 1);
  assert.ok(Math.abs(currentSpreadDegrees(arena.sim, p, ar) - ar.adsSpreadDegrees) < 1e-9);

  // Aiming while holding sprint: walking pace at most, scaled down.
  arena.input('p').moveZ = 1;
  arena.input('p').sprint = true;
  arena.step(60);
  assert.ok(Math.hypot(p.char.vx, p.char.vz) <= arena.sim.movement.walkSpeed * 0.8 + 1e-6);
  arena.input('p').ads = false;
  arena.step(60);
  assert.ok(Math.hypot(p.char.vx, p.char.vz) > arena.sim.movement.walkSpeed + 1, 'sprinting again');
  arena.input('p').fire = true;
  arena.step(30);
  assert.ok(Math.hypot(p.char.vx, p.char.vz) <= arena.sim.movement.walkSpeed + 1e-6, 'firing drops the sprint');
});

test('match flow: countdown freezes everyone, the last one standing wins exactly once', () => {
  const map = flatMap({
    spawns: [
      { x: 0, y: 0, z: 0, yaw: 0 },
      { x: -2, y: 0, z: -8, yaw: Math.PI },
      { x: 2, y: 0, z: -8, yaw: Math.PI },
    ],
  });
  const rules = { ...SKIRMISH_RULES, loadout: [{ weaponId: 'starter_ar' }], startingAmmo: { light: 0, medium: 200, shells: 0, heavy: 0 } };
  validateRules(rules);
  const arena = makeArena(map, rules, [
    { id: 'p', name: 'P', teamId: 0 },
    { id: 'x', name: 'X', teamId: 1 },
    { id: 'y', name: 'Y', teamId: 2 },
  ]);
  assert.equal(arena.sim.phase, 'warmup');
  assert.equal(arena.sim.aliveContenders(), 3);

  // During the countdown nobody moves, shoots or gets hurt.
  aimAtPlayer(arena, 'p', 'x');
  arena.input('p').fire = true;
  arena.input('p').moveZ = 1;
  arena.step(rules.warmupTicks);
  assert.equal(arena.sim.phase, 'warmup');
  assert.equal(arena.sim.warmupTicksLeft, 0);
  assert.equal(arena.player('p').char.z, 0);
  assert.equal(arena.eventsOf(SIM_EVENTS.shotFired).length, 0);
  assert.equal(arena.sim.dealDamage(arena.player('x'), 50, { attacker: null, cause: 'fall', x: 0, y: 0, z: 0 }), false);
  arena.input('p').moveZ = 0;

  arena.step();
  assert.equal(arena.sim.phase, 'active');
  assert.deepEqual(data(arena.eventsOf(SIM_EVENTS.matchPhaseChanged)[0]), { phase: 'active' });

  // Eliminate X, then Y.
  for (const id of ['x', 'y']) {
    for (let guard = 0; guard < 400 && arena.player(id).combat.aliveState === 'alive'; guard++) {
      aimAtPlayer(arena, 'p', id);
      arena.input('p').fire = true;
      arena.step();
    }
    assert.equal(arena.player(id).combat.aliveState, 'eliminated');
  }
  assert.equal(arena.sim.phase, 'results');
  const ended = arena.eventsOf(SIM_EVENTS.matchEnded);
  assert.equal(ended.length, 1);
  assert.deepEqual(data(ended[0])['winnerIds'], ['p']);
  const result = arena.sim.result;
  assert.ok(result);
  assert.deepEqual(
    result.placements.map((entry) => [entry.id, entry.placement, entry.eliminations]),
    [
      ['p', 1, 2],
      ['y', 2, 0],
      ['x', 3, 0],
    ],
  );
  assert.equal(result.activeTicks, result.endedAtTick - arena.sim.activeSinceTick);
  // Dropped gear of the fallen is on the ground for the winner.
  assert.ok([...arena.sim.loot.values()].some((item) => item.kind === 'weapon'));

  // After the end: no second result, no more damage.
  arena.step(120);
  assert.equal(arena.eventsOf(SIM_EVENTS.matchEnded).length, 1);
  assert.equal(arena.sim.dealDamage(arena.player('p'), 500, { attacker: null, cause: 'fall', x: 0, y: 0, z: 0 }), false);
  assert.equal(arena.player('p').combat.stats.health, 100);
});

test('match flow: two fatal falls on the same tick still produce exactly one winner', () => {
  const map = flatMap({
    statics: [{ shape: 'box', minX: -6, minY: 0, minZ: -2, maxX: 6, maxY: 20, maxZ: 2, material: 'concrete', style: 'platform' }],
    spawns: [
      { x: -3, y: 20, z: 0, yaw: 0 },
      { x: 3, y: 20, z: 0, yaw: 0 },
    ],
  });
  const rules = { ...SKIRMISH_RULES, warmupTicks: 0 };
  const arena = makeArena(map, rules, [
    { id: 'a', name: 'A', teamId: 1 },
    { id: 'b', name: 'B', teamId: 2 },
  ]);
  arena.input('a').moveZ = 1;
  arena.input('b').moveZ = 1;
  arena.step(300);
  // Both hit the ground on the same tick with a lethal fall. Participants are resolved one after
  // another, so the first elimination ends the match and the other runner is the winner: the tie
  // is broken by the order of that tick, and nothing can produce a second result.
  const landings = arena.eventsOf(SIM_EVENTS.playerLanded).filter((event) => (data(event)['fallHeight'] as number) > 19);
  assert.equal(landings.length, 2);
  assert.equal(landings[0]!.atTick, landings[1]!.atTick, 'both landed on the same tick');
  const eliminated = arena.eventsOf(SIM_EVENTS.playerEliminated);
  assert.equal(eliminated.length, 1);
  assert.equal(arena.eventsOf(SIM_EVENTS.matchEnded).length, 1);
  const result = arena.sim.result;
  assert.ok(result);
  assert.equal(result.winnerIds.length, 1);
  assert.notEqual(result.winnerIds[0], eliminated[0]!.playerId);
  assert.equal(arena.player(result.winnerIds[0]!).combat.aliveState, 'alive');
  assert.deepEqual(result.placements.map((entry) => entry.placement), [1, 2]);
});

test('determinism: the same seed and inputs give the same events; rules are validated', () => {
  const run = (seed: number): string => {
    const arena = makeArena(flatMap(), combatRules({ loadout: [{ weaponId: 'starter_smg' }] }), [{ id: 'p', name: 'P' }, dummy('d', 1)], seed);
    const rng = makeRng(5);
    for (let tick = 0; tick < 600; tick++) {
      const input = arena.input('p');
      aimAtPlayer(arena, 'p', 'd');
      input.yaw += (rng() - 0.5) * 0.1;
      input.fire = rng() < 0.8;
      input.moveX = rng() < 0.5 ? -1 : 1;
      input.reload = rng() < 0.01;
      arena.step();
    }
    return JSON.stringify(arena.events);
  };
  const first = run(1);
  assert.equal(run(1), first);
  assert.notEqual(run(2), first);

  assert.throws(() => validateRules(combatRules({ health: { start: 0, max: 100 } })), /start alive/);
  assert.throws(() => validateRules(combatRules({ loadout: [{ weaponId: 'laser_cannon' }] })), /unknown weapon/);
  assert.throws(() => validateRules(combatRules({ loadout: [{ itemId: 'bandage', count: 99 }] })), /bad count/);
  assert.throws(() => validateRules(combatRules({ warmupTicks: -1 })), /warmupTicks/);
  assert.throws(() => validateRules({ ...SKIRMISH_RULES, respawn: 'timer' }), /timed respawn/);
});
