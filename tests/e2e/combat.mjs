/**
 * Browser sessions for phase 2: the firing range (shooting, shield, reload, inventory,
 * consumables) and a whole skirmish against bots, all through the real input layer.
 *
 * Mouse buttons and the wheel are dispatched as DOM events (exactly like mouse movement in the
 * rest of the suite): with the pointer captured, headless Chromium turns a synthetic button
 * press into a huge relative movement, which a real mouse never does.
 */
import assert from 'node:assert/strict';
import { openGame, state, waitForState } from './lib.mjs';

const RADIANS_PER_PIXEL = 0.0022 * 0.7; // InputManager constant x default sensitivity
const SAVE_KEY = 'nexus-royale.save.v1';

const wrap = (angle) => {
  let a = angle % (Math.PI * 2);
  if (a > Math.PI) a -= Math.PI * 2;
  else if (a <= -Math.PI) a += Math.PI * 2;
  return a;
};

const button = (page, type, which = 0) => page.evaluate(([t, b]) => document.dispatchEvent(new MouseEvent(t, { button: b, bubbles: true })), [type, which]);
const look = (page, dx, dy) => page.evaluate(([x, y]) => document.dispatchEvent(new MouseEvent('mousemove', { movementX: x, movementY: y, bubbles: true })), [dx, dy]);
const wheel = (page, deltaY) => page.evaluate((d) => document.getElementById('game-root').dispatchEvent(new WheelEvent('wheel', { deltaY: d, bubbles: true, cancelable: true })), deltaY);
const text = (page, testId) => page.textContent(`[data-testid=${testId}]`);

/** One correction of the view toward a world point; returns the remaining error in radians. */
async function aimStep(page, s, x, y, z) {
  const o = s.aim;
  const yaw = Math.atan2(-(x - o.originX), -(z - o.originZ));
  const pitch = Math.atan2(y - o.originY, Math.hypot(x - o.originX, z - o.originZ));
  const dyaw = wrap(yaw - s.look.yaw);
  const dpitch = pitch - s.look.pitch;
  let px = -dyaw / RADIANS_PER_PIXEL;
  let py = -dpitch / RADIANS_PER_PIXEL;
  while (Math.abs(px) > 0.5 || Math.abs(py) > 0.5) {
    const cx = Math.max(-200, Math.min(200, px));
    const cy = Math.max(-200, Math.min(200, py));
    await look(page, cx, cy);
    px -= cx;
    py -= cy;
  }
  return Math.max(Math.abs(dyaw), Math.abs(dpitch));
}

/** Puts the crosshair on a world point, the way a player does: by moving the mouse until it is there. */
async function aimAt(page, x, y, z) {
  for (let i = 0; i < 20; i++) {
    const error = await aimStep(page, await state(page), x, y, z);
    if (error < 0.0015) return;
    await page.waitForTimeout(50);
  }
  throw new Error(`could not settle the aim on (${x}, ${y}, ${z})`);
}

export async function runCombatSessions(tools) {
  const { browser, serverUrl, packedUrl, step, shot, waitTicks, Keys, drive, problems, FAST_SAVE } = tools;
  const other = async (page, id) => (await state(page)).others.find((o) => o.id === id);
  /**
   * One trigger pull. Press and release arrive together, as a click quicker than a frame: the
   * input layer still gives the simulation exactly one tick of "fire".
   */
  const click = async (page, which = 0) => {
    await page.evaluate((b) => {
      document.dispatchEvent(new MouseEvent('mousedown', { button: b, bubbles: true }));
      document.dispatchEvent(new MouseEvent('mouseup', { button: b, bubbles: true }));
    }, which);
    await waitTicks(page, 4);
  };

  /* ---------------------------------------------------------------------------------------- */
  /* Session 5: firing range.                                                                  */
  /* ---------------------------------------------------------------------------------------- */
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  await context.addInitScript(([key, save]) => {
    if (localStorage.getItem(key) === null) localStorage.setItem(key, JSON.stringify(save));
  }, [SAVE_KEY, FAST_SAVE]);
  const page = await context.newPage();
  page.on('console', (message) => {
    if (message.type() === 'error') problems.push(`console.error(combat): ${message.text()}`);
  });
  page.on('pageerror', (error) => problems.push(`pageerror(combat): ${error.message}`));
  const keys = new Keys(page);

  await step('lobby: three playable modes, the choice is remembered after a reload', async () => {
    // A fixed seed makes the bot matches of this session reproducible.
    await page.goto(`${serverUrl}?seed=3`, { waitUntil: 'load' });
    await page.waitForFunction(() => typeof window.__NEXUS__ !== 'undefined', null, { timeout: 120_000 });
    await page.waitForSelector('[data-testid=lobby]');
    assert.equal(await text(page, 'mode-title'), 'Circuito de Anclas');
    await page.click('[data-testid=mode-skirmish]');
    assert.equal(await text(page, 'mode-title'), 'Escaramuza');
    await page.waitForSelector('[data-testid=bots-5]');
    await page.click('[data-testid=mode-range]');
    assert.equal(await text(page, 'mode-title'), 'Galería de Tiro');
    assert.equal(await page.$('[data-testid=bots-5]'), null, 'skirmish options belong to the skirmish only');
    await page.reload({ waitUntil: 'load' });
    await page.waitForSelector('[data-testid=lobby]');
    assert.equal(await text(page, 'mode-title'), 'Galería de Tiro', 'the selected mode was not remembered');
    // A phase 1 save (schema 1) was migrated on the way.
    const save = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), SAVE_KEY);
    assert.equal(save.schemaVersion, 2);
    assert.equal(save.profile.lastMode, 'range');
  });

  await step('range: starts armed, hurt and with dummies and gear on the benches', async () => {
    await page.click('[data-testid=play]');
    await page.click('[data-testid=click-to-play]');
    await waitForState(page, () => window.__NEXUS__.getState().overlay === 'none');
    await waitTicks(page, 20);
    const s = await state(page);
    assert.equal(s.mode, 'range');
    assert.equal(s.phase, 'active');
    assert.deepEqual([s.combat.health, s.combat.shield, s.combat.weaponId, s.combat.ammoInMag], [60, 0, 'starter_ar', 30]);
    assert.equal(s.others.length, 6);
    assert.ok(s.others.every((o) => o.alive && !o.contender && o.shield === 50 && o.health === 100));
    assert.ok(s.loot.length >= 10);
    assert.equal(await text(page, 'health'), '60');
    assert.equal(await text(page, 'ammo-mag'), '30');
    assert.equal(await text(page, 'weapon-name'), 'Rifle Estela');
    assert.equal(await page.getAttribute('[data-testid=slot-0]', 'data-active'), 'true');
    return `${s.others.length} dummies, ${s.loot.length} pickups`;
  });

  let rounds = 30;
  await step('T03 shot: one round spent, hit confirmed by the simulation on the dummy under the crosshair', async () => {
    const dummy = (await state(page)).others.find((o) => Math.abs(o.z - -6) < 0.5);
    assert.ok(dummy, 'no dummy at the 10 m mark');
    await aimAt(page, dummy.x, dummy.y + 1.0, dummy.z);
    await waitTicks(page, 2);
    const aimed = await state(page);
    assert.deepEqual([aimed.aim.kind, aimed.aim.targetId], ['player', dummy.id], 'the crosshair is not on the dummy');
    assert.equal(await page.$('[data-testid=hit-marker]'), null, 'a hit marker is showing before any shot');
    assert.ok((await text(page, 'target-info')).includes('MANIQUÍ'));

    await click(page);
    const after = await state(page);
    rounds -= 1;
    assert.equal(after.combat.ammoInMag, rounds, 'exactly one round should be spent');
    assert.equal(after.combat.totals.shotsFired, 1);
    assert.equal(after.combat.totals.shotsHit, 1, 'the shot at the dummy under the crosshair did not register');
    // T04: the shield takes the damage first.
    const hit = await other(page, dummy.id);
    assert.deepEqual([hit.shield, hit.health], [25, 100]);
    await waitTicks(page, 8);
    assert.equal(await text(page, 'ammo-mag'), String(rounds));
    assert.equal(await page.getAttribute('[data-testid=hit-marker]', 'data-kind'), 'shield');
    assert.equal(await text(page, 'target-shield'), '25');
    return `hit at ${after.aim.distance.toFixed(1)} m`;
  });

  await step('T04 shield: it is used up before health, then health drops', async () => {
    const dummy = (await state(page)).others.find((o) => Math.abs(o.z - -6) < 0.5);
    await aimAt(page, dummy.x, dummy.y + 1.0, dummy.z);
    await click(page);
    rounds -= 1;
    let now = await other(page, dummy.id);
    assert.deepEqual([now.shield, now.health], [0, 100], 'the second hit should finish the shield and leave health alone');
    await waitTicks(page, 8);
    await aimAt(page, dummy.x, dummy.y + 1.0, dummy.z);
    await click(page);
    rounds -= 1;
    now = await other(page, dummy.id);
    assert.deepEqual([now.shield, now.health], [0, 75]);
    await waitTicks(page, 8);
    assert.equal(await page.getAttribute('[data-testid=hit-marker]', 'data-kind'), 'body');
    assert.equal(await text(page, 'target-health'), '75');
    assert.equal((await state(page)).combat.ammoInMag, rounds);
  });

  await step('cover: the dummy behind the wall cannot be hit', async () => {
    const hidden = (await state(page)).others.find((o) => Math.abs(o.x - 9) < 0.5 && Math.abs(o.z - -29) < 0.5);
    assert.ok(hidden, 'no dummy behind the wall');
    await aimAt(page, hidden.x, hidden.y + 1.0, hidden.z);
    await waitTicks(page, 2);
    assert.equal((await state(page)).aim.kind, 'world', 'the wall should be under the crosshair');
    const hitsBefore = (await state(page)).combat.totals.shotsHit;
    for (let i = 0; i < 3; i++) {
      await click(page);
      rounds -= 1;
      await waitTicks(page, 6);
    }
    const s = await state(page);
    assert.equal(s.combat.ammoInMag, rounds);
    assert.equal(s.combat.totals.shotsHit, hitsBefore, 'a shot went through the wall');
    const still = await other(page, hidden.id);
    assert.deepEqual([still.shield, still.health], [50, 100]);
  });

  await step('T05 reload: no shot while reloading, magazine and reserve end up exact', async () => {
    const before = await state(page);
    const reserve = before.combat.ammo.medium;
    const spent = 30 - before.combat.ammoInMag;
    assert.ok(spent > 0);
    await keys.tap('KeyR');
    await waitForState(page, () => window.__NEXUS__.getState().combat.reloading === true);
    await page.waitForSelector('[data-testid=action-progress]');
    // Hold the trigger through the whole reload.
    await button(page, 'mousedown');
    await waitTicks(page, 60);
    const during = await state(page);
    assert.equal(during.combat.reloading, true);
    assert.equal(during.combat.totals.shotsFired, before.combat.totals.shotsFired, 'the weapon fired while reloading');
    assert.equal(during.combat.ammoInMag, before.combat.ammoInMag, 'the magazine changed before the reload finished');
    await button(page, 'mouseup');
    await waitForState(page, () => window.__NEXUS__.getState().combat.reloading === false, 60_000);
    const after = await state(page);
    // The trigger was released before the reload ended, so nothing has been fired since.
    const firedSince = after.combat.totals.shotsFired - before.combat.totals.shotsFired;
    assert.equal(after.combat.ammoInMag, 30 - firedSince);
    assert.equal(after.combat.ammo.medium, reserve - spent, 'the reserve should lose exactly the rounds that were missing');
    rounds = after.combat.ammoInMag;
    await waitTicks(page, 10);
    assert.equal(await text(page, 'ammo-reserve'), String(reserve - spent));
    return `reserve ${reserve} -> ${reserve - spent}`;
  });

  await step('inventory: pick up from the bench with E, change slot with the number keys and the wheel', async () => {
    // Walk up to the SMG lying on the left bench.
    const smg = (await state(page)).loot.find((item) => item.defId === 'starter_smg');
    assert.ok(smg, 'no SMG on the range');
    await drive(page, keys, [{ x: smg.x, z: smg.z + 1.5, tolerance: 0.35, sprint: false }]);
    await aimAt(page, smg.x, smg.y + 0.3, smg.z);
    await waitTicks(page, 12);
    assert.ok((await text(page, 'pickup-prompt')).includes('Subfusil Colibrí'), 'the pickup prompt should name the item');
    await keys.tap('KeyE');
    await waitForState(page, () => window.__NEXUS__.getState().combat.slots[3]?.id === 'starter_smg');
    let s = await state(page);
    assert.equal(s.combat.active, 0, 'picking up does not change the weapon in hand');
    assert.equal(s.loot.some((item) => item.id === smg.id), false, 'the item should be gone from the ground');

    await keys.tap('Digit4');
    await waitForState(page, () => window.__NEXUS__.getState().combat.active === 3);
    await waitTicks(page, 10);
    assert.equal(await text(page, 'weapon-name'), 'Subfusil Colibrí');
    assert.equal(await page.getAttribute('[data-testid=slot-3]', 'data-active'), 'true');
    assert.equal(await text(page, 'ammo-mag'), '32');

    await wheel(page, 100); // next occupied slot: wraps around to the first
    await waitForState(page, () => window.__NEXUS__.getState().combat.active === 0);
    await wheel(page, -100);
    await waitForState(page, () => window.__NEXUS__.getState().combat.active === 3);
    await keys.tap('Digit5'); // empty slot: nothing happens
    await waitTicks(page, 6);
    s = await state(page);
    assert.equal(s.combat.active, 3);
    return 'E, 4, wheel up/down';
  });

  await step('consumables: a bandage takes its time, heals to its cap and then refuses', async () => {
    const bandage = (await state(page)).loot.find((item) => item.defId === 'bandage');
    assert.ok(bandage, 'no bandages on the range');
    await drive(page, keys, [{ x: bandage.x, z: bandage.z + 1.5, tolerance: 0.35, sprint: false }]);
    await aimAt(page, bandage.x, bandage.y + 0.3, bandage.z);
    await waitTicks(page, 12);
    await keys.tap('KeyE');
    await waitForState(page, () => window.__NEXUS__.getState().combat.slots[4]?.id === 'bandage');
    assert.equal((await state(page)).combat.slots[4].count, 5);

    await keys.tap('Digit5');
    await waitForState(page, () => window.__NEXUS__.getState().combat.active === 4);
    await waitTicks(page, 12);
    await click(page);
    await waitForState(page, () => window.__NEXUS__.getState().combat.using === true);
    assert.equal((await state(page)).combat.health, 60, 'nothing should heal before the channel completes');
    await waitForState(page, () => window.__NEXUS__.getState().combat.using === false, 90_000);
    let s = await state(page);
    assert.equal(s.combat.health, 75, 'a bandage restores 15 up to 75');
    assert.equal(s.combat.slots[4].count, 4);
    await waitTicks(page, 10);
    assert.equal(await text(page, 'health'), '75');

    // At the cap it does not start and is not spent.
    await click(page);
    await waitTicks(page, 20);
    s = await state(page);
    assert.equal(s.combat.using, false);
    assert.equal(s.combat.slots[4].count, 4);
    assert.equal(s.combat.health, 75);
  });

  await step('range: eliminating a dummy counts, announces it, and the dummy comes back', async () => {
    await keys.tap('Digit1');
    await waitForState(page, () => window.__NEXUS__.getState().combat.active === 0);
    const dummy = (await state(page)).others.find((o) => Math.abs(o.z - -6) < 0.5);
    for (let guard = 0; guard < 40; guard++) {
      const now = await other(page, dummy.id);
      if (!now.alive) break;
      await aimAt(page, now.x, now.y + 1.0, now.z);
      await click(page);
      await waitTicks(page, 5);
    }
    assert.equal((await other(page, dummy.id)).alive, false, 'the dummy should be eliminated');
    await page.waitForSelector('[data-testid=banner]');
    assert.equal(await page.getAttribute('[data-testid=banner]', 'data-kind'), 'elimination');
    assert.equal(await text(page, 'eliminations'), '1');
    assert.equal((await state(page)).overlay, 'none', 'eliminating a dummy must not end anything');
    await waitForState(page, (id) => window.__NEXUS__.getState().others.find((o) => o.id === id).alive === true, 90_000, dummy.id);
    const back = await other(page, dummy.id);
    assert.deepEqual([back.shield, back.health], [50, 100]);
  });

  await step('range: evidence at 1280x720 (high quality), pause menu restarts the range', async () => {
    await page.keyboard.press('KeyP');
    await page.click('[data-testid=pause-settings]');
    await page.click('[data-testid=quality-high]');
    await page.fill('[data-testid=render-scale]', '1');
    await page.click('[data-testid=settings-cancel]');
    // Cancel restores the saved (fast) settings: use the live preview only for the screenshot.
    await page.click('[data-testid=pause-settings]');
    await page.click('[data-testid=quality-high]');
    await page.fill('[data-testid=render-scale]', '1');
    await page.click('[data-testid=settings-apply]');
    await page.click('[data-testid=resume]');
    await waitForState(page, () => window.__NEXUS__.getState().overlay === 'none');
    const dummy = (await state(page)).others.find((o) => Math.abs(o.z - -21) < 0.5);
    await aimAt(page, dummy.x, dummy.y + 1.0, dummy.z);
    await button(page, 'mousedown', 2);
    await waitTicks(page, 14);
    await button(page, 'mousedown');
    await waitTicks(page, 9);
    await shot(page, 'fase2-galeria-1280x720');
    await button(page, 'mouseup');
    await button(page, 'mouseup', 2);

    await page.keyboard.press('KeyP');
    await page.waitForSelector('[data-testid=pause-menu]');
    assert.equal(await text(page, 'restart'), 'Reiniciar galería');
    await page.click('[data-testid=restart]');
    await waitForState(page, () => window.__NEXUS__.getState().overlay === 'none');
    await waitTicks(page, 5);
    const s = await state(page);
    assert.deepEqual([s.combat.health, s.combat.ammoInMag, s.combat.totals.shotsFired], [60, 30, 0], 'a restart should give a fresh range');
    // Back to the fast settings for the rest of the session.
    await page.keyboard.press('KeyP');
    await page.click('[data-testid=pause-settings]');
    await page.click('[data-testid=quality-low]');
    await page.fill('[data-testid=render-scale]', '0.5');
    await page.click('[data-testid=settings-apply]');
    await page.click('[data-testid=to-lobby]');
    await page.waitForSelector('[data-testid=lobby]');
  });

  /* ---------------------------------------------------------------------------------------- */
  /* Session 6: a whole skirmish.                                                              */
  /* ---------------------------------------------------------------------------------------- */
  await step('skirmish: the countdown freezes everyone, then the match goes live', async () => {
    await page.click('[data-testid=mode-skirmish]');
    await page.click('[data-testid=bots-3]');
    await page.click('[data-testid=difficulty-easy]');
    await page.click('[data-testid=play]');
    await page.click('[data-testid=click-to-play]');
    await waitForState(page, () => window.__NEXUS__.getState().overlay === 'none');
    const start = await state(page);
    assert.equal(start.mode, 'skirmish');
    assert.equal(start.phase, 'warmup');
    assert.equal(start.others.length, 3);
    assert.ok(start.others.every((o) => o.isBot && o.contender), 'opponents must be flagged as bots');
    assert.deepEqual([start.combat.health, start.combat.shield, start.combat.weaponId], [100, 50, 'starter_pistol']);
    await page.waitForSelector('[data-testid=countdown]');
    await keys.set('KeyW', true);
    await button(page, 'mousedown');
    await waitTicks(page, 40);
    const frozen = await state(page);
    assert.equal(frozen.phase, 'warmup');
    assert.ok(Math.hypot(frozen.player.x - start.player.x, frozen.player.z - start.player.z) < 1e-6, 'the player moved during the countdown');
    assert.equal(frozen.combat.totals.shotsFired, 0, 'a shot was fired during the countdown');
    await button(page, 'mouseup');
    await keys.set('KeyW', false);
    await waitForState(page, () => window.__NEXUS__.getState().phase === 'active', 120_000);
    assert.equal(await page.$('[data-testid=countdown]'), null);
    assert.equal(await text(page, 'alive-count'), '4');
  });

  /** Fights with the real controls until the results screen: aim at the nearest bot, shoot when on target. */
  const fight = async () => {
    let firing = false;
    const deadline = Date.now() + 8 * 60_000;
    for (;;) {
      const s = await state(page);
      if (s.overlay === 'results') break;
      assert.ok(Date.now() < deadline, 'the skirmish did not reach a result in time');
      if (!s.combat.alive) {
        if (firing) await button(page, 'mouseup');
        firing = false;
        await keys.releaseAll();
        await page.waitForTimeout(150);
        continue;
      }
      const targets = s.others.filter((o) => o.alive).sort((a, b) => Math.hypot(a.x - s.player.x, a.z - s.player.z) - Math.hypot(b.x - s.player.x, b.z - s.player.z));
      const target = targets[0];
      if (!target) {
        await page.waitForTimeout(100);
        continue;
      }
      await aimStep(page, s, target.x, target.y + target.height * 0.6, target.z);
      const onTarget = s.aim.kind === 'player';
      // A pistol needs a new press for every shot: release each cycle so the next one is a press.
      if (firing) {
        await button(page, 'mouseup');
        firing = false;
      } else if (onTarget) {
        await button(page, 'mousedown');
        firing = true;
      }
      await keys.set('KeyW', !onTarget);
      await page.waitForTimeout(30);
    }
    if (firing) await button(page, 'mouseup');
    await keys.releaseAll();
  };

  let matches = 0;
  let wins = 0;
  let eliminations = 0;
  await step('skirmish: fought through the real controls to a result, with consistent standings', async () => {
    // A lost match is a valid result too; play up to three so that at least one bot falls to us.
    for (let attempt = 0; attempt < 3; attempt++) {
      await fight();
      matches++;
      await page.waitForSelector('[data-testid=results]');
      const s = await state(page);
      const result = s.result;
      assert.equal(result.kind, 'skirmish');
      assert.equal(result.total, 4);
      assert.equal(await page.getAttribute('[data-testid=skirmish-outcome]', 'data-won'), String(result.won));
      assert.equal(await text(page, 'skirmish-outcome'), result.won ? 'VICTORIA' : 'ELIMINADO');
      assert.equal(await text(page, 'result-placement'), `#${result.placement}`);
      assert.equal(result.won, result.placement === 1, 'only first place is a win');
      assert.equal(result.won, s.combat.alive, 'the winner is alive, the eliminated are not');
      assert.equal(await text(page, 'result-eliminations'), String(result.eliminations));
      assert.equal(result.eliminations, s.combat.totals.eliminations);
      assert.equal(result.standings.length, 4);
      assert.equal(result.standings.filter((row) => row.local).length, 1);
      assert.equal(result.standings.filter((row) => row.isBot).length, 3);
      assert.equal(await page.locator('[data-testid=results] .standings .tag-bot').count(), 3, 'every bot row carries a BOT tag');
      if (result.won) wins++;
      eliminations += result.eliminations;
      if (attempt === 0) await shot(page, 'fase2-escaramuza-resultados');
      if (eliminations > 0) break;
      await page.click('[data-testid=run-again]');
      await waitForState(page, () => window.__NEXUS__.getState().overlay === 'none');
      await waitForState(page, () => window.__NEXUS__.getState().phase === 'active', 120_000);
    }
    assert.ok(eliminations > 0, `no bot was eliminated by the player in ${matches} matches`);
    return `${matches} match(es), ${wins} won, ${eliminations} elimination(s)`;
  });

  await step('skirmish: statistics are saved once per match and shown in the lobby', async () => {
    await page.click('[data-testid=results-lobby]');
    await page.waitForSelector('[data-testid=lobby]');
    assert.equal(await text(page, 'skirmish-played'), String(matches));
    assert.equal(await text(page, 'skirmish-wins'), String(wins));
    assert.equal(await text(page, 'skirmish-eliminations'), String(eliminations));
    const save = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), SAVE_KEY);
    assert.deepEqual([save.profile.skirmish.played, save.profile.skirmish.wins, save.profile.skirmish.eliminations], [matches, wins, eliminations]);
    assert.deepEqual(save.profile.skirmishOptions, { bots: 3, difficulty: 'easy' });
    await page.reload({ waitUntil: 'load' });
    await page.waitForSelector('[data-testid=lobby]');
    assert.equal(await text(page, 'skirmish-played'), String(matches), 'statistics did not survive a reload');
  });
  await step('skirmish: standing still among eleven hard bots ends in a defeat screen that says who did it', async () => {
    await page.click('[data-testid=bots-11]');
    await page.click('[data-testid=difficulty-hard]');
    await page.click('[data-testid=play]');
    await page.click('[data-testid=click-to-play]');
    await waitForState(page, () => window.__NEXUS__.getState().overlay === 'none');
    assert.equal((await state(page)).others.length, 11);
    // Do nothing at all: the bots have to find the player on their own.
    await waitForState(page, () => window.__NEXUS__.getState().overlay === 'results', 8 * 60_000);
    const s = await state(page);
    const result = s.result;
    assert.equal(result.kind, 'skirmish');
    assert.equal(result.won, false);
    assert.equal(s.combat.alive, false);
    assert.ok(result.placement >= 2 && result.placement <= 12, `placement ${result.placement}`);
    assert.equal(result.total, 12);
    assert.equal(await text(page, 'skirmish-outcome'), 'ELIMINADO');
    assert.equal(await text(page, 'result-placement'), `#${result.placement}`);
    assert.ok(result.eliminatedBy, 'the result should name who eliminated the player');
    assert.ok((await page.textContent('[data-testid=results]')).includes(result.eliminatedBy));
    // Whoever is still fighting has no position yet; nobody else shares the player's.
    assert.equal(result.standings.filter((row) => row.placement === result.placement).length, 1);
    await shot(page, 'fase2-escaramuza-derrota');
    await page.click('[data-testid=results-lobby]');
    await page.waitForSelector('[data-testid=lobby]');
    assert.equal(await text(page, 'skirmish-played'), String(matches + 1));
    assert.equal(await text(page, 'skirmish-wins'), String(wins), 'a defeat must not count as a win');
    return `placed #${result.placement} of 12, eliminated by ${result.eliminatedBy}`;
  });
  await context.close();

  await step('skirmish: evidence at 1280x720 and 1920x1080 (high quality)', async () => {
    const hd = await openGame(browser, `${serverUrl}?seed=11`, { width: 1920, height: 1080 });
    try {
      const p = hd.page;
      await p.click('[data-testid=mode-skirmish]');
      await p.click('[data-testid=open-settings]');
      await p.click('[data-testid=quality-high]');
      await p.click('[data-testid=settings-apply]');
      await p.click('[data-testid=bots-7]');
      await shot(p, 'fase2-lobby-1920x1080');
      await p.click('[data-testid=play]');
      await p.click('[data-testid=click-to-play]');
      await waitForState(p, () => window.__NEXUS__.getState().overlay === 'none');
      await p.waitForSelector('[data-testid=countdown]');
      await shot(p, 'fase2-escaramuza-1920x1080');
      await p.setViewportSize({ width: 1280, height: 720 });
      await waitForState(p, () => window.__NEXUS__.getState().phase === 'active', 180_000);
      const s = await state(p);
      await shot(p, 'fase2-escaramuza-1280x720');
      problems.push(...hd.problems);
      return `${s.render.drawCalls} draw calls, ${s.render.triangles} triangles with 8 runners`;
    } finally {
      await hd.context.close();
    }
  });

  /* ---------------------------------------------------------------------------------------- */
  /* Session 7: combat on a phone, with the single-file build.                                 */
  /* ---------------------------------------------------------------------------------------- */
  await step('touch (844x390, single-file build): fire, reload and slots work with on-screen controls', async () => {
    const phone = await browser.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 });
    await phone.addInitScript(([key, save]) => {
      if (localStorage.getItem(key) === null) localStorage.setItem(key, JSON.stringify(save));
    }, [SAVE_KEY, FAST_SAVE]);
    const mobile = await phone.newPage();
    mobile.on('console', (message) => {
      if (message.type() === 'error') problems.push(`console.error(touch combat): ${message.text()}`);
    });
    mobile.on('pageerror', (error) => problems.push(`pageerror(touch combat): ${error.message}`));
    try {
      await mobile.goto(packedUrl, { waitUntil: 'load' });
      await mobile.waitForFunction(() => typeof window.__NEXUS__ !== 'undefined', null, { timeout: 120_000 });
      await mobile.tap('[data-testid=mode-range]');
      await mobile.tap('[data-testid=play]');
      await mobile.tap('[data-testid=click-to-play]');
      await waitForState(mobile, () => window.__NEXUS__.getState().overlay === 'none');
      await mobile.waitForSelector('[data-testid=touch-fire]');

      // Everything the thumbs need is on screen and nothing is cut off.
      const outside = await mobile.evaluate(() => {
        const bad = [];
        for (const selector of ['.touch-btn', '.hud-vitals', '.hud-weapon', '.slot', '.hud-status', '.compass']) {
          for (const element of document.querySelectorAll(selector)) {
            const r = element.getBoundingClientRect();
            if (r.width === 0 || r.left < -0.5 || r.top < -0.5 || r.right > window.innerWidth + 0.5 || r.bottom > window.innerHeight + 0.5) bad.push(selector);
          }
        }
        return bad;
      });
      assert.deepEqual(outside, [], 'part of the combat HUD is outside the screen');

      const cdp = await phone.newCDPSession(mobile);
      const centre = async (testId) => {
        const box = await mobile.locator(`[data-testid=${testId}]`).boundingBox();
        return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
      };
      // Hold the fire button: the rifle keeps firing while the finger is down.
      const fire = await centre('touch-fire');
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: fire.x, y: fire.y, id: 1 }] });
      await waitForState(mobile, () => window.__NEXUS__.getState().combat.totals.shotsFired >= 4, 90_000);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await waitTicks(mobile, 12);
      const fired = (await state(mobile)).combat.totals.shotsFired;
      await waitTicks(mobile, 20);
      assert.equal((await state(mobile)).combat.totals.shotsFired, fired, 'the weapon kept firing after the finger was lifted');

      await mobile.tap('[data-testid=touch-reload]');
      await waitForState(mobile, () => window.__NEXUS__.getState().combat.reloading === true, 60_000);
      // Tapping a slot selects it (and cancels the reload, as the rules say).
      await mobile.tap('[data-testid=slot-2]');
      await waitForState(mobile, () => window.__NEXUS__.getState().combat.active === 2, 60_000);
      assert.equal((await state(mobile)).combat.weaponId, 'starter_pistol');
      assert.equal((await state(mobile)).combat.reloading, false);

      // Aim is a toggle on touch.
      await mobile.tap('[data-testid=touch-aim]');
      await waitForState(mobile, () => window.__NEXUS__.getState().combat.ads > 0.9, 60_000);
      await mobile.tap('[data-testid=touch-aim]');
      await waitForState(mobile, () => window.__NEXUS__.getState().combat.ads < 0.1, 60_000);
      await shot(mobile, 'fase2-movil-galeria-844x390');
      return `${fired} shots by touch`;
    } finally {
      await phone.close();
    }
  });
}
