import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BOT_CALLSIGNS,
  BOT_SKILLS,
  DEFAULT_MOVEMENT,
  FIRING_RANGE_ID,
  LOCAL_PLAYER_ID,
  PathFinder,
  QUARRY_ARENA_ID,
  SIM_EVENTS,
  SKIRMISH_RULES,
  Simulation,
  botCanSee,
  buildFiringRange,
  buildNavGraph,
  buildQuarryArena,
  buildWorld,
  canStandAt,
  createFiringRange,
  createSkirmish,
  nearestNode,
  walkSegment,
  type BotBrain,
  type BotSkill,
  type BotState,
  type MapDefinition,
  type MatchEvent,
  type NavGraph,
  type PlayerInit,
  type StaticDef,
} from '../src/core/index.js';
import { combatRules, flatMap, makeArena, type Arena } from './helpers/combat.js';

const CFG = DEFAULT_MOVEMENT;

function wall(minX: number, minZ: number, maxX: number, maxZ: number, height = 3): StaticDef {
  return { shape: 'box', minX, minY: 0, minZ, maxX, maxY: height, maxZ, material: 'concrete', style: 'wall' };
}

function fighter(id: string, spawnIndex: number, teamId: number, extra: Partial<PlayerInit> = {}): PlayerInit {
  return { id, name: id, spawnIndex, teamId, bot: { behavior: 'fighter', difficulty: 'normal' }, ...extra };
}

function pathLength(graph: NavGraph, path: readonly number[]): number {
  let length = 0;
  for (let i = 1; i < path.length; i++) {
    length += Math.hypot(graph.x[path[i]!]! - graph.x[path[i - 1]!]!, graph.z[path[i]!]! - graph.z[path[i - 1]!]!);
  }
  return length;
}

/** Reads the state without letting the type checker narrow it between two reads. */
function stateOf(brain: BotBrain): BotState {
  return brain.state;
}

function shotsBy(arena: Arena, id: string, afterTick = 0): MatchEvent[] {
  return arena.eventsOf(SIM_EVENTS.shotFired).filter((event) => event.playerId === id && event.atTick > afterTick);
}

test('navigation: the graph only contains places a character can stand, and paths go around walls', () => {
  // A long wall across the map with a single doorway at x = 20.
  const map = flatMap({
    half: 40,
    statics: [wall(-40, -0.3, 19, 0.3), wall(21, -0.3, 40, 0.3)],
  });
  const world = buildWorld(map);
  const graph = buildNavGraph(world, CFG, { seeds: [{ x: 0, y: 0, z: 10 }] });
  assert.ok(graph.count > 5000, `expected the whole floor to be covered, got ${graph.count} nodes`);
  for (let i = 0; i < graph.count; i++) {
    assert.ok(canStandAt(world, CFG, graph.x[i]!, graph.y[i]!, graph.z[i]!), `node ${i} is inside something`);
    assert.ok(Math.abs(graph.z[i]!) > 0.7 || Math.abs(graph.x[i]! - 20) < 1, 'no node inside the wall');
  }

  const finder = new PathFinder(graph);
  const start = nearestNode(graph, 0, 0, 10);
  const goal = nearestNode(graph, 0, 0, -10);
  assert.ok(start >= 0 && goal >= 0);
  const path: number[] = [];
  assert.ok(finder.find(start, goal, path));
  assert.equal(path[0], start);
  assert.equal(path[path.length - 1], goal);
  // 20 m apart in a straight line, but the only way is through the doorway 20 m to the side.
  assert.ok(pathLength(graph, path) > 40, `path is too short to have used the doorway: ${pathLength(graph, path)}`);
  assert.ok(path.some((node) => Math.abs(graph.z[node]!) < 0.6 && Math.abs(graph.x[node]! - 20) < 1), 'the path crosses the doorway');
  // Consecutive nodes are real steps: each one can be walked.
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1]!;
    const b = path[i]!;
    assert.ok(!Number.isNaN(walkSegment(world, CFG, graph.x[a]!, graph.y[a]!, graph.z[a]!, graph.x[b]!, graph.z[b]!)));
  }
  // The same query gives the same answer.
  const again: number[] = [];
  finder.find(start, goal, again);
  assert.deepEqual(again, path);

  // Walking straight through the wall is not possible; through the doorway it is.
  assert.ok(Number.isNaN(walkSegment(world, CFG, 0, 0, 3, 0, -3)));
  assert.ok(!Number.isNaN(walkSegment(world, CFG, 20, 0, 3, 20, -3)));

  // A sealed room is unreachable: no nodes, no path.
  const sealed = flatMap({ half: 20, statics: [wall(-5, -5, 5, -4.6), wall(-5, 4.6, 5, 5), wall(-5, -5, -4.6, 5), wall(4.6, -5, 5, 5)] });
  const sealedWorld = buildWorld(sealed);
  const outside = buildNavGraph(sealedWorld, CFG, { seeds: [{ x: 10, y: 0, z: 10 }] });
  for (let i = 0; i < outside.count; i++) {
    assert.ok(Math.abs(outside.x[i]!) > 4.6 || Math.abs(outside.z[i]!) > 4.6, 'a node ended up inside the sealed room');
  }
});

test('navigation: ramps and upper floors of the arena are part of the graph, mantle-only spots are not', () => {
  const map = buildQuarryArena();
  const world = buildWorld(map);
  const graph = buildNavGraph(world, CFG, { seeds: map.spawns });
  const finder = new PathFinder(graph);
  const near = (x: number, y: number, z: number): number => {
    const node = nearestNode(graph, x, y, z, 2.5);
    return node >= 0 && Math.abs(graph.y[node]! - y) < 0.6 ? node : -1;
  };
  const floor = near(0, 0, 20);
  assert.ok(floor >= 0);
  for (const [name, x, y, z] of [
    ['centre platform', 3, 1.0, 3],
    ['workshop roof', -28, 3.5, -27],
    ['workshop interior', -29, 0, -27],
    ['scaffold deck', -25, 3.0, 24],
    ['shed interior', 27.5, 0, 25],
  ] as const) {
    const node = near(x, y, z);
    assert.ok(node >= 0, `${name} is not on the navigation graph`);
    const path: number[] = [];
    assert.ok(finder.find(floor, node, path), `no walking route to the ${name}`);
  }
  assert.equal(near(21, 2.4, -28.5), -1, 'the top of a container needs a climb, so bots do not path onto it');

  // Every spawn point is connected to every other one.
  const first = nearestNode(graph, map.spawns[0]!.x, 0, map.spawns[0]!.z);
  for (const spawn of map.spawns) {
    const node = nearestNode(graph, spawn.x, 0, spawn.z);
    const path: number[] = [];
    assert.ok(node >= 0 && finder.find(first, node, path), `spawn (${spawn.x}, ${spawn.z}) is cut off`);
  }
});

test('maps: the arena and the firing range are consistent and every pickup rests on something', () => {
  const check = (map: MapDefinition, expectedId: string): void => {
    assert.equal(map.id, expectedId);
    assert.equal(map.schemaVersion, 1);
    const world = buildWorld(map);
    // Constructing the simulation validates the loot table; adding a player on every spawn proves
    // none of them is blocked.
    const sim = new Simulation({ matchId: 'check', map, rules: combatRules() });
    map.spawns.forEach((_, index) => sim.addPlayer({ id: `p${index}`, name: `P${index}`, spawnIndex: index }));
    assert.equal(sim.loot.size, map.loot.length);
    for (const item of sim.loot.values()) {
      const spawn = map.loot[item.spawnIndex]!;
      assert.ok(Math.abs(item.y - spawn.y) < 0.05, `${spawn.defId} at (${spawn.x}, ${spawn.z}) rests at ${item.y}, declared ${spawn.y}`);
      assert.ok(!world.overlapsSolid(item.x, item.z, 0.15, item.y + 0.1, item.y + 0.5), `${spawn.defId} at (${spawn.x}, ${spawn.z}) is inside something`);
      assert.ok(item.x > map.bounds.minX && item.x < map.bounds.maxX && item.z > map.bounds.minZ && item.z < map.bounds.maxZ);
    }
    for (const prop of map.props) {
      assert.ok(Math.abs(prop.y - world.terrainHeight(prop.x, prop.z)) < 1e-3, 'prop floating or buried');
    }
  };
  const arena = buildQuarryArena();
  check(arena, QUARRY_ARENA_ID);
  assert.equal(arena.spawns.length, 12);
  assert.ok(arena.loot.filter((l) => l.kind === 'weapon').length >= 10);
  for (const weapon of ['starter_ar', 'starter_smg', 'starter_shotgun', 'starter_sniper', 'starter_pistol']) {
    assert.ok(arena.loot.some((l) => l.defId === weapon), `the arena has no ${weapon}`);
  }
  // Same code, same map.
  assert.deepEqual(buildQuarryArena().statics, arena.statics);
  assert.deepEqual(buildQuarryArena().props, arena.props);

  const range = buildFiringRange();
  check(range, FIRING_RANGE_ID);
  assert.equal(range.spawns.filter((s) => s.role === 'player').length, 1);
  assert.equal(range.spawns.filter((s) => s.role === 'target').length, 5);
  assert.equal(range.spawns.filter((s) => s.role === 'pacer').length, 1);
});

test('T06 bot sight: a wall hides the target completely — no detection, no shots, no damage', () => {
  const spawns = [
    { x: 0, y: 0, z: 8, yaw: 0 },
    { x: 0, y: 0, z: -8, yaw: Math.PI },
  ];
  const hidden = makeArena(flatMap({ spawns, statics: [wall(-12, -0.2, 12, 0.2, 4)] }), combatRules(), [
    fighter('bot', 0, 1),
    { id: 'human', name: 'Human', spawnIndex: 1, teamId: 2 },
  ]);
  const bot = hidden.player('bot');
  const human = hidden.player('human');
  assert.ok(bot.brain);
  // The bot is facing the human, 16 m away, well inside its view distance: only the wall hides it.
  assert.equal(botCanSee(hidden.sim, bot, bot.brain, human), false);
  for (let tick = 0; tick < 600; tick++) {
    hidden.step();
    assert.notEqual(bot.brain.state, 'attack');
    assert.equal(bot.brain.targetVisible && botCanSee(hidden.sim, bot, bot.brain, human) === false, false, 'the bot believes it sees through the wall');
  }
  assert.equal(shotsBy(hidden, 'bot').length, 0);
  assert.equal(human.combat.stats.health, 100);
  assert.equal(hidden.eventsOf(SIM_EVENTS.damageDealt).length, 0);

  // Same situation without the wall: it notices, reacts after its reaction time and hits.
  const open = makeArena(flatMap({ spawns }), combatRules(), [fighter('bot', 0, 1), { id: 'human', name: 'Human', spawnIndex: 1, teamId: 2 }]);
  const openBot = open.player('bot');
  assert.ok(openBot.brain);
  assert.equal(botCanSee(open.sim, openBot, openBot.brain, open.player('human')), true);
  open.step(600);
  const shots = shotsBy(open, 'bot');
  assert.ok(shots.length > 0, 'the bot never fired at a target in plain sight');
  assert.ok(shots[0]!.atTick >= BOT_SKILLS.normal.reactionTicks, 'the bot fired before its reaction time');
  assert.ok(open.player('human').combat.stats.health + open.player('human').combat.stats.shield < 100);
});

test('T06 bot perception: field of view, close awareness and hearing', () => {
  const spawns = [
    { x: 0, y: 0, z: 0, yaw: 0 }, // bot looks toward -Z
    { x: 0, y: 0, z: 20, yaw: Math.PI }, // human directly behind it
  ];
  const players: PlayerInit[] = [fighter('bot', 0, 1), { id: 'human', name: 'Human', spawnIndex: 1, teamId: 2 }];
  const arena = makeArena(flatMap({ spawns }), combatRules(), players);
  const bot = arena.player('bot');
  const human = arena.player('human');
  const brain = bot.brain;
  assert.ok(brain);

  // Geometry of what it can see, with its view direction pinned.
  const sees = (x: number, z: number, yaw = 0): boolean => {
    human.char.x = x;
    human.char.z = z;
    brain.aimYaw = yaw;
    return botCanSee(arena.sim, bot, brain, human);
  };
  assert.equal(sees(0, 20), false, 'behind its back');
  assert.equal(sees(0, -20), true, 'straight ahead');
  assert.equal(sees(14, -14), true, '45 degrees to the side is inside a 110 degree field of view');
  assert.equal(sees(20, -5), false, '76 degrees to the side is outside it');
  assert.equal(sees(0, -(BOT_SKILLS.normal.viewDistance + 2)), false, 'beyond its view distance');
  assert.equal(sees(0, 2.5), true, 'right behind it: close enough to notice anyway');
  assert.equal(sees(0, 20, Math.PI), true, 'after turning around');

  // Hearing: a shot fired behind the bot makes it investigate, and turning round it finds the target.
  human.char.x = 0;
  human.char.z = 20;
  brain.aimYaw = 0;
  arena.input('human').yaw = Math.PI / 2; // firing away from the bot
  arena.step(30);
  assert.notEqual(stateOf(brain), 'attack');
  assert.equal(brain.targetId, null);
  arena.input('human').fire = true;
  arena.step(3);
  arena.input('human').fire = false;
  assert.equal(stateOf(brain), 'investigate', 'a shot 20 m away should be heard');
  let attacked = false;
  for (let tick = 0; tick < 600 && !attacked; tick++) {
    arena.step();
    attacked = stateOf(brain) === 'attack' && brain.targetId === 'human';
  }
  assert.ok(attacked, 'investigating the noise never led the bot to its target');
});

test('T06 bot fire discipline: it stops shooting as soon as the target is behind cover', () => {
  // The wall stands to the side of the duel; the human will be moved behind it.
  const spawns = [
    { x: 0, y: 0, z: 10, yaw: 0 },
    { x: 0, y: 0, z: -6, yaw: Math.PI },
  ];
  const arena = makeArena(flatMap({ spawns, statics: [wall(8, -3, 20, -2.6, 4)] }), combatRules(), [
    fighter('bot', 0, 1, { loadout: [{ weaponId: 'starter_ar' }], startingAmmo: { medium: 600 } }),
    { id: 'human', name: 'Human', spawnIndex: 1, teamId: 2, health: { start: 100000, max: 100000 } },
  ]);
  const bot = arena.player('bot');
  const human = arena.player('human');
  assert.ok(bot.brain);
  let firing = false;
  for (let tick = 0; tick < 400 && !firing; tick++) {
    arena.step();
    firing = shotsBy(arena, 'bot').length >= 3;
  }
  assert.ok(firing, 'the bot should be shooting at the visible target');

  // Teleport the human behind the wall (a test shortcut for "ran into cover").
  human.char.x = 14;
  human.char.z = -6;
  const hiddenAt = arena.sim.tick;
  const healthWhenHidden = human.combat.stats.health;
  for (let tick = 0; tick < 480; tick++) {
    arena.step();
    // Keep the human where it is: this test is about the bot.
    human.char.x = 14;
    human.char.z = -6;
    if (botCanSee(arena.sim, bot, bot.brain, human)) break; // it walked around the wall: test over
    assert.equal(shotsBy(arena, 'bot', hiddenAt + 1).filter((e) => e.atTick === arena.sim.tick).length, 0, `the bot fired at tick ${arena.sim.tick} with no line of sight`);
  }
  assert.equal(human.combat.stats.health, healthWhenHidden, 'nothing got through the wall');
  assert.notEqual(bot.brain.state, 'patrol', 'it should be hunting for the target it lost');
});

test('T06 bot movement: in a full arena match no bot ever ends a tick inside geometry or outside the map', () => {
  const map = buildQuarryArena();
  for (const seed of [11, 22, 33]) {
    const { sim } = createSkirmish({ matchId: `nav-${seed}`, alias: 'Idle', seed, bots: 11, difficulty: 'normal', map });
    const world = sim.world;
    let ticks = 0;
    let moved = 0;
    const start = new Map(sim.roster.map((p) => [p.id, { x: p.char.x, z: p.char.z }]));
    while (sim.phase !== 'results' && ticks < 60 * 150) {
      sim.step(() => undefined);
      sim.drainEvents();
      ticks++;
      for (const player of sim.roster) {
        if (!player.brain || player.combat.aliveState !== 'alive') continue;
        const c = player.char;
        assert.ok(
          !world.overlapsSolid(c.x, c.z, CFG.radius * 0.9, c.y + CFG.stepHeight + 0.05, c.y + c.height - 0.05),
          `seed ${seed} tick ${ticks}: ${player.name} is inside geometry at (${c.x.toFixed(2)}, ${c.y.toFixed(2)}, ${c.z.toFixed(2)})`,
        );
        assert.ok(c.y >= world.terrainHeight(c.x, c.z) - 0.05, `${player.name} is under the terrain`);
        assert.ok(c.x >= map.bounds.minX && c.x <= map.bounds.maxX && c.z >= map.bounds.minZ && c.z <= map.bounds.maxZ, `${player.name} left the map`);
        assert.ok(Number.isFinite(c.x + c.y + c.z + c.vx + c.vy + c.vz));
      }
    }
    for (const player of sim.roster) {
      const from = start.get(player.id)!;
      if (player.brain && Math.hypot(player.char.x - from.x, player.char.z - from.z) > 5) moved++;
    }
    assert.ok(moved >= 8, `seed ${seed}: only ${moved} of 11 bots went anywhere`);
    assert.equal(sim.phase, 'results', `seed ${seed}: the match did not finish`);
  }
});

test('skirmish: bot matches finish with exactly one winner and are reproducible from the seed', () => {
  const map = buildQuarryArena();
  const play = (seed: number, bots: number): { log: string; winner: string; ticks: number; placements: number[] } => {
    const { sim } = createSkirmish({ matchId: 'm', alias: 'Idle', seed, bots, difficulty: 'normal', map });
    const log: string[] = [];
    let ended = 0;
    while (sim.phase !== 'results' && sim.tick < 60 * 240) {
      sim.step(() => undefined);
      for (const event of sim.drainEvents()) {
        if (event.type === SIM_EVENTS.matchEnded) ended++;
        if (event.type === SIM_EVENTS.playerEliminated || event.type === SIM_EVENTS.matchEnded) log.push(`${event.atTick}:${event.type}:${event.playerId}:${JSON.stringify(event.data)}`);
      }
    }
    // Keep stepping: a finished match must stay finished.
    for (let i = 0; i < 300; i++) {
      sim.step(() => undefined);
      for (const event of sim.drainEvents()) if (event.type === SIM_EVENTS.matchEnded) ended++;
    }
    assert.equal(ended, 1, `seed ${seed}: MatchEnded was emitted ${ended} times`);
    const result = sim.result;
    assert.ok(result, `seed ${seed}: no result`);
    assert.equal(result.winnerIds.length, 1);
    assert.equal(sim.aliveContenders(), 1);
    assert.equal(sim.getPlayer(result.winnerIds[0]!)?.combat.aliveState, 'alive');
    const placements = result.placements.map((entry) => entry.placement);
    assert.deepEqual(placements, Array.from({ length: bots + 1 }, (_, i) => i + 1), 'placements are 1..N without gaps or ties');
    const totalEliminations = result.placements.reduce((sum, entry) => sum + entry.eliminations, 0);
    assert.ok(totalEliminations <= bots, 'more eliminations credited than players eliminated');
    return { log: log.join('\n'), winner: result.winnerIds[0]!, ticks: result.endedAtTick, placements };
  };

  const first = play(7, 7);
  const again = play(7, 7);
  assert.equal(again.log, first.log, 'same seed, same match');
  assert.equal(again.ticks, first.ticks);
  const other = play(8, 7);
  assert.notEqual(other.log, first.log, 'another seed, another match');
  for (const seed of [1, 2, 3, 4, 5]) play(seed, 3);
  play(9, 11);

  // Setup: every bot has a call sign of its own and is flagged as a bot; the human is not.
  const { sim, localId } = createSkirmish({ matchId: 's', alias: 'Yo', seed: 3, bots: 11, difficulty: 'easy', map });
  assert.equal(localId, LOCAL_PLAYER_ID);
  const names = sim.roster.filter((p) => p.isBot).map((p) => p.name);
  assert.equal(new Set(names).size, 11);
  for (const name of names) assert.ok(BOT_CALLSIGNS.includes(name));
  assert.equal(sim.getPlayer(localId)?.isBot, false);
  assert.equal(new Set(sim.roster.map((p) => p.teamId)).size, 12, 'everyone is on their own team');
  assert.equal(new Set(sim.roster.map((p) => `${p.spawn.x},${p.spawn.z}`)).size, 12, 'nobody shares a spawn point');
  assert.throws(() => createSkirmish({ matchId: 'x', alias: 'Yo', seed: 1, bots: 0, difficulty: 'easy', map }), /1 to 11 bots/);
  assert.throws(() => createSkirmish({ matchId: 'x', alias: 'Yo', seed: 1, bots: 12, difficulty: 'easy', map }), /1 to 11 bots/);
});

test('bot skill: a hard bot beats an easy one most of the time, and a hurt bot retreats to heal', () => {
  const spawns = [
    { x: -14, y: 0, z: 0, yaw: -Math.PI / 2 },
    { x: 14, y: 0, z: 0, yaw: Math.PI / 2 },
  ];
  const cover = [wall(-1, -6, 1, -3, 2.5), wall(-1, 3, 1, 6, 2.5), wall(-6, -1, -5, 1, 1.2), wall(5, -1, 6, 1, 1.2)];
  const map = flatMap({ half: 30, spawns, statics: cover });
  const rules = { ...SKIRMISH_RULES, warmupTicks: 0, botVsBotDamageScale: 1 };
  const kit = { loadout: [{ weaponId: 'starter_ar' }], startingAmmo: { medium: 300 } };
  let hardWins = 0;
  const duels = 24;
  for (let seed = 1; seed <= duels; seed++) {
    // Alternate sides so the layout cannot favour one of them.
    const hardFirst = seed % 2 === 0;
    const arena = makeArena(
      map,
      rules,
      [
        { id: 'a', name: 'A', spawnIndex: 0, teamId: 1, ...kit, bot: { behavior: 'fighter', difficulty: hardFirst ? 'hard' : 'easy' } },
        { id: 'b', name: 'B', spawnIndex: 1, teamId: 2, ...kit, bot: { behavior: 'fighter', difficulty: hardFirst ? 'easy' : 'hard' } },
      ],
      seed,
    );
    for (let tick = 0; tick < 60 * 120 && arena.sim.phase !== 'results'; tick++) arena.step();
    assert.equal(arena.sim.phase, 'results', `duel ${seed} did not finish`);
    const winner = arena.sim.result!.winnerIds[0];
    if ((winner === 'a') === hardFirst) hardWins++;
  }
  assert.ok(hardWins >= duels * 0.7, `hard bots won only ${hardWins} of ${duels} duels against easy bots`);

  // Retreat: a wounded bot with bandages breaks away, heals, and comes back.
  const skill: BotSkill = { ...BOT_SKILLS.normal, retreatBelow: 70 };
  const arena = makeArena(
    map,
    combatRules({ health: { start: 100, max: 100 } }),
    [
      {
        id: 'bot',
        name: 'Bot',
        spawnIndex: 0,
        teamId: 1,
        loadout: [{ weaponId: 'starter_ar' }, { itemId: 'bandage', count: 3 }],
        bot: { behavior: 'fighter', skill },
      },
      { id: 'human', name: 'Human', spawnIndex: 1, teamId: 2 },
    ],
    5,
  );
  const bot = arena.player('bot');
  arena.step(5);
  arena.sim.dealDamage(bot, 60, { attacker: arena.player('human'), cause: 'weapon', x: 0, y: 0, z: 0 });
  assert.equal(bot.combat.stats.health, 40);
  let retreated = false;
  for (let tick = 0; tick < 60 * 14; tick++) {
    arena.step();
    retreated = retreated || bot.brain?.state === 'retreat';
    // The human never shoots: this test only watches the bot look after itself.
    arena.player('human').combat.stats = { ...arena.player('human').combat.stats, health: 100 };
  }
  assert.ok(retreated, 'the bot never retreated');
  const used = arena.eventsOf(SIM_EVENTS.itemUsed).filter((event) => event.playerId === 'bot');
  assert.ok(used.length >= 1, 'the bot never used a bandage');
  assert.ok(bot.combat.stats.health > 40, 'the bot did not heal');
});

test('bots that run dry look for something to shoot with instead of standing around', () => {
  const spawns = [
    { x: 0, y: 0, z: 0, yaw: 0 },
    { x: 0, y: 0, z: -30, yaw: Math.PI },
  ];
  const map = flatMap({
    spawns,
    loot: [{ kind: 'weapon', defId: 'starter_smg', count: 1, x: 6, y: 0, z: -4 }],
  });
  const arena = makeArena(map, combatRules({ startingAmmo: { light: 60, medium: 0, shells: 0, heavy: 0 } }), [
    // An empty sniper rifle and no heavy rounds: useless.
    fighter('bot', 0, 1, { loadout: [{ weaponId: 'starter_sniper' }], startingAmmo: { heavy: 0 } }),
    { id: 'human', name: 'Human', spawnIndex: 1, teamId: 2, health: { start: 5000, max: 5000 } },
  ]);
  const bot = arena.player('bot');
  const weapon = bot.combat.inventory.slots[0];
  assert.ok(weapon && weapon.kind === 'weapon');
  weapon.ammoInMag = 0;
  let scavenged = false;
  for (let tick = 0; tick < 60 * 20; tick++) {
    arena.step();
    scavenged = scavenged || bot.brain?.state === 'scavenge';
  }
  assert.ok(scavenged, 'the bot never went looking for gear');
  assert.ok(bot.combat.inventory.slots.some((item) => item?.kind === 'weapon' && item.weaponId === 'starter_smg'), 'the bot did not pick the SMG up');
  assert.ok(shotsBy(arena, 'bot').length > 0, 'armed again, the bot should fight');
});

test('firing range: dummies stand still or pace, never shoot, and come back after being eliminated', () => {
  const { sim, localId } = createFiringRange({ matchId: 'range', alias: 'Yo', seed: 4 });
  assert.equal(sim.rules.modeId, 'firing_range');
  assert.equal(sim.phase, 'active', 'no countdown on the range');
  const dummies = sim.roster.filter((p) => p.id !== localId);
  assert.equal(dummies.length, 6);
  assert.ok(dummies.every((d) => d.isBot && !d.contender && d.combat.stats.shield === 50 && d.combat.stats.health === 100));
  const player = sim.getPlayer(localId)!;
  assert.deepEqual([player.combat.stats.health, player.combat.stats.shield], [60, 0], 'the player starts hurt so healing can be practised');

  const statics = dummies.filter((d) => d.brain?.behavior === 'dummy');
  const pacer = dummies.find((d) => d.brain?.behavior === 'pacer')!;
  const before = statics.map((d) => [d.char.x, d.char.z]);
  let minOffset = 0;
  let maxOffset = 0;
  const events: MatchEvent[] = [];
  for (let tick = 0; tick < 60 * 12; tick++) {
    sim.step(() => undefined);
    events.push(...sim.drainEvents());
    const offset = pacer.char.x - pacer.spawn.x;
    minOffset = Math.min(minOffset, offset);
    maxOffset = Math.max(maxOffset, offset);
  }
  assert.deepEqual(statics.map((d) => [d.char.x, d.char.z]), before, 'static dummies do not move');
  assert.ok(minOffset < -3.5 && maxOffset > 3.5, `the pacer should cover about 4 m to each side, got ${minOffset}..${maxOffset}`);
  assert.ok(minOffset > -5 && maxOffset < 5);
  assert.equal(events.filter((e) => e.type === SIM_EVENTS.shotFired).length, 0, 'dummies never shoot');

  // Eliminate one: it is out, then back at its spot with full health after the respawn delay.
  const victim = statics[0]!;
  sim.dealDamage(victim, 1000, { attacker: player, cause: 'weapon', x: 0, y: 0, z: 0 });
  assert.equal(victim.combat.aliveState, 'eliminated');
  assert.equal(sim.phase, 'active', 'eliminating a dummy does not end anything');
  for (let tick = 0; tick < sim.rules.respawnDelayTicks + 2; tick++) sim.step(() => undefined);
  assert.equal(victim.combat.aliveState, 'alive');
  assert.deepEqual([victim.combat.stats.health, victim.combat.stats.shield], [100, 50]);
  assert.equal(player.combat.totals.eliminations, 1);
});

test('performance: sixteen bots fighting cost a small fraction of a 60 Hz tick', () => {
  const map = buildQuarryArena();
  // Quick respawns keep all sixteen in the fight for the whole measurement.
  const rules = { ...SKIRMISH_RULES, warmupTicks: 0, win: 'none' as const, respawn: 'timer' as const, respawnDelayTicks: 60, dropLootOnElimination: false };
  const sim = new Simulation({ matchId: 'perf', map, rules, seed: 99 });
  for (let i = 0; i < 16; i++) {
    sim.addPlayer({ id: `bot-${i}`, name: `Bot ${i}`, teamId: i, spawnIndex: i % map.spawns.length, bot: { behavior: 'fighter', difficulty: 'hard' } });
  }
  // Warm up the JIT, then measure.
  for (let i = 0; i < 300; i++) {
    sim.step(() => undefined);
    sim.drainEvents();
  }
  const ticks = 1800;
  const start = performance.now();
  for (let i = 0; i < ticks; i++) {
    sim.step(() => undefined);
    sim.drainEvents();
  }
  const perTick = (performance.now() - start) / ticks;
  const alive = sim.roster.filter((p) => p.combat.aliveState === 'alive').length;
  console.log(`    16 bots (${alive} alive at the end): ${perTick.toFixed(3)} ms per tick (budget 16.67 ms)`);
  assert.ok(alive >= 10, 'most bots should be alive and active');
  assert.ok(perTick < 4, `simulation too slow: ${perTick.toFixed(2)} ms per tick`);
});
