/**
 * End-to-end smoke test in a real browser (headless Chromium, software WebGL).
 *
 *   npm run test:e2e              build + run
 *   node tests/e2e/run.mjs --evidence    also copy screenshots to docs/evidence/
 *
 * It plays the game through its real input layer: keyboard for movement, mouse-move events for
 * the camera. Nothing is injected into the simulation — the test only READS state through the
 * read-only `window.__NEXUS__` handle and presses keys like a player would.
 */
import assert from 'node:assert/strict';
import { copyFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { runCombatSessions } from './combat.mjs';
import { ROOT, launchBrowser, openGame, startStaticServer, state, waitForState } from './lib.mjs';

const EVIDENCE = process.argv.includes('--evidence');
/** `--filter=<regex>` runs only the steps whose name matches (for iterating on one area). */
const FILTER = process.argv.find((arg) => arg.startsWith('--filter='))?.slice('--filter='.length);
const OUT = join(ROOT, 'test-results');
const SAVE_KEY = 'nexus-royale.save.v1';
const RADIANS_PER_PIXEL = 0.0022 * 0.7; // InputManager constant x default sensitivity

const results = [];
let failed = false;

async function step(name, fn) {
  if (FILTER && !new RegExp(FILTER, 'i').test(name)) {
    results.push({ name, status: 'SKIPPED', detail: 'filtered out' });
    return;
  }
  if (failed) {
    results.push({ name, status: 'NOT RUN', detail: 'an earlier step failed' });
    return;
  }
  const started = Date.now();
  try {
    const detail = (await fn()) ?? '';
    results.push({ name, status: 'PASS', detail });
    console.log(`PASS  ${name}${detail ? `  — ${detail}` : ''}  (${((Date.now() - started) / 1000).toFixed(1)}s)`);
  } catch (error) {
    failed = true;
    results.push({ name, status: 'FAIL', detail: error.message });
    console.log(`FAIL  ${name}  — ${error.message}`);
  }
}

/**
 * Waits for the simulation to advance by `ticks`. The test never assumes real-time speed: on a
 * software renderer the first seconds are slow while pipelines compile, so all gameplay timing
 * is expressed in simulation ticks.
 */
async function waitTicks(page, ticks, timeout = 90_000) {
  const start = (await state(page)).tick;
  await waitForState(page, (target) => window.__NEXUS__.getState().tick >= target, timeout, start + ticks);
}

const wrap = (angle) => {
  let a = angle % (Math.PI * 2);
  if (a > Math.PI) a -= Math.PI * 2;
  else if (a <= -Math.PI) a += Math.PI * 2;
  return a;
};

/** Turns the camera by dispatching mouse-move events with relative movement (pointer-lock path). */
async function turnBy(page, deltaYaw) {
  let pixels = -deltaYaw / RADIANS_PER_PIXEL;
  while (Math.abs(pixels) > 0.5) {
    const chunk = Math.max(-200, Math.min(200, pixels));
    await page.evaluate((dx) => document.dispatchEvent(new MouseEvent('mousemove', { movementX: dx, movementY: 0, bubbles: true })), chunk);
    pixels -= chunk;
  }
}

class Keys {
  constructor(page) {
    this.page = page;
    this.down = new Set();
  }
  async set(code, pressed) {
    if (pressed === this.down.has(code)) return;
    if (pressed) {
      this.down.add(code);
      await this.page.keyboard.down(code);
    } else {
      this.down.delete(code);
      await this.page.keyboard.up(code);
    }
  }
  async tap(code, ms = 130) {
    await this.page.keyboard.down(code);
    await this.page.waitForTimeout(ms);
    await this.page.keyboard.up(code);
    this.down.delete(code);
  }
  async releaseAll() {
    for (const code of [...this.down]) await this.set(code, false);
  }
}

/**
 * Closed-loop autopilot through the real controls: aim at each waypoint with the mouse, hold
 * forward, tap jump when stuck against something (which triggers a ledge climb when possible).
 */
async function drive(page, keys, legs) {
  for (const leg of legs) {
    const tolerance = leg.tolerance ?? 0.8;
    const deadline = Date.now() + (leg.timeoutMs ?? 60_000);
    let stuckSince = null;
    for (;;) {
      const s = await state(page);
      const c = s.player;
      assert.ok(c, 'no player');
      if (s.overlay === 'results') {
        // The course finished on the way: the match paused itself.
        await keys.releaseAll();
        return;
      }
      assert.equal(s.overlay, 'none', `match is not running (overlay=${s.overlay})`);
      const distance = Math.hypot(leg.x - c.x, leg.z - c.z);
      if (distance <= tolerance) break;
      if (Date.now() > deadline) {
        throw new Error(`autopilot timed out heading to (${leg.x}, ${leg.z}); at (${c.x.toFixed(2)}, ${c.y.toFixed(2)}, ${c.z.toFixed(2)}) state=${c.moveState}`);
      }
      const desiredYaw = Math.atan2(-(leg.x - c.x), -(leg.z - c.z));
      const error = wrap(desiredYaw - s.look.yaw);
      if (Math.abs(error) > 0.01) await turnBy(page, error);
      // Only run once roughly facing the target, so narrow doorways are approached straight.
      const facing = Math.abs(error) < 0.5;
      await keys.set('KeyW', facing);
      await keys.set('ShiftLeft', facing && (leg.sprint ?? true));
      await keys.set('KeyC', leg.crouch ?? false);

      const speed = Math.hypot(c.vx, c.vz);
      if (c.grounded && speed < 0.8 && facing) stuckSince ??= Date.now();
      else stuckSince = null;
      const wantsJump = leg.jumpWhen?.(c) ?? false;
      if (wantsJump || (stuckSince !== null && Date.now() - stuckSince > 450)) {
        await keys.tap('Space');
        stuckSince = null;
      }
      await page.waitForTimeout(20);
    }
  }
  await keys.releaseAll();
}

/** The same route the unit-level integration test follows, expressed as waypoints. */
const ROUTE = [
  { name: 'sprint lane', anchors: 1, legs: [{ x: 26, z: 26, tolerance: 1.3 }] },
  {
    name: 'steps',
    anchors: 2,
    legs: [
      { x: 30, z: 16.5, tolerance: 0.7 },
      { x: 30, z: 4, tolerance: 0.8 },
    ],
  },
  {
    name: 'container (jump + ledge climb)',
    anchors: 3,
    legs: [
      { x: 30.6, z: -5.0, tolerance: 0.7 },
      { x: 30, z: -9.2, tolerance: 0.9, sprint: false },
    ],
  },
  {
    name: 'hill',
    anchors: 4,
    legs: [
      { x: 30, z: -14.5, tolerance: 1.0 },
      { x: 30, z: -36, tolerance: 1.0 },
    ],
  },
  {
    name: 'doorway + crouch tunnel',
    anchors: 5,
    legs: [
      { x: 20, z: -28.6, tolerance: 0.5, sprint: false },
      { x: 9.6, z: -28.6, tolerance: 0.5, sprint: false },
      { x: 7.9, z: -28.6, tolerance: 0.35, sprint: false },
      { x: 4.5, z: -28.6, tolerance: 0.5, sprint: false, crouch: true },
    ],
  },
  {
    name: 'ramp + gap jump',
    anchors: 6,
    legs: [
      { x: 0.8, z: -28.6, tolerance: 0.5, sprint: false, crouch: true },
      { x: -12.5, z: -16, tolerance: 0.6 },
      { x: -20, z: -16, tolerance: 0.7 },
      { x: -32, z: -16, tolerance: 1.2, jumpWhen: (c) => c.grounded && c.y > 2.9 && c.x < -24.7 && c.x > -26.1 },
    ],
  },
  {
    name: 'house roof',
    anchors: 7,
    legs: [
      { x: -32, z: -11.4, tolerance: 0.6, sprint: false },
      { x: -32, z: -5, tolerance: 0.8 },
      { x: -24, z: -1, tolerance: 0.8 },
      { x: -26, z: 1.8, tolerance: 0.4, sprint: false },
      { x: -34.6, z: 1.8, tolerance: 0.4, sprint: false },
      { x: -30, z: 8, tolerance: 1.0, sprint: false },
    ],
  },
  {
    name: 'central pedestal',
    anchors: 8,
    legs: [
      { x: -22, z: 6, tolerance: 1.0 },
      { x: -9, z: -4, tolerance: 1.0 },
      { x: 0, z: 0, tolerance: 1.0, sprint: false },
    ],
  },
];

async function shot(page, name) {
  const file = join(OUT, `${name}.jpg`);
  await page.screenshot({ path: file, type: 'jpeg', quality: 84 });
  if (EVIDENCE) {
    await mkdir(join(ROOT, 'docs', 'evidence'), { recursive: true });
    await copyFile(file, join(ROOT, 'docs', 'evidence', `${name}.jpg`));
  }
  return file;
}

const readSave = (page) => page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? 'null'), SAVE_KEY);

/** Fast settings for software rendering: low quality, half resolution, no FPS cap. */
const FAST_SAVE = {
  schemaVersion: 1,
  updatedAt: 0,
  profile: { alias: 'Corredor', bestCourseTicks: {}, coursesCompleted: 0 },
  settings: { display: { qualityPreset: 'low', renderScale: 0.5, maxFps: 0 } },
};

async function main() {
  await mkdir(OUT, { recursive: true });
  const server = await startStaticServer();
  const browser = await launchBrowser();
  const problems = [];
  try {
    /* ------------------------------------------------------------------------------------ */
    /* Session 1: default settings, real pointer lock.                                       */
    /* ------------------------------------------------------------------------------------ */
    const first = await openGame(browser, server.url);
    let page = first.page;

    await step('boot: lobby renders a live 3D scene', async () => {
      await page.waitForSelector('[data-testid=lobby]');
      await waitForState(page, () => (window.__NEXUS__.getState().render?.triangles ?? 0) > 10000);
      const s = await state(page);
      assert.equal(s.screen, 'lobby');
      assert.equal(s.fatalError, null);
      assert.ok(s.render.drawCalls >= 20, `only ${s.render.drawCalls} draw calls`);
      const canvas = await page.evaluate(() => {
        const c = document.querySelector('canvas.game-canvas');
        return c ? { w: c.width, h: c.height } : null;
      });
      assert.ok(canvas && canvas.w >= 640 && canvas.h >= 360, 'canvas missing or tiny');
      // The lobby camera drifts: a static picture would report the same position twice.
      const a = (await state(page)).camera;
      await page.waitForTimeout(900);
      const b = (await state(page)).camera;
      assert.ok(Math.hypot(a.x - b.x, a.z - b.z) > 0.001, 'lobby camera is not moving');
      await shot(page, 'fase1-lobby-1280x720');
      return `${s.render.drawCalls} draw calls, ${s.render.triangles} triangles`;
    });

    await step('T25 keyboard only: Enter on the focused JUGAR button starts the match', async () => {
      const focused = await page.evaluate(() => document.activeElement?.getAttribute('data-testid'));
      assert.equal(focused, 'play', 'JUGAR should have focus when the lobby opens');
      await page.keyboard.press('Enter');
      await waitForState(page, () => window.__NEXUS__.getState().overlay === 'clickToPlay');
      const s = await state(page);
      assert.equal(s.screen, 'match');
      assert.equal(s.paused, true, 'the match must wait for the player');
      assert.equal(s.tick, 0);
    });

    await step('pointer lock: taking control captures the mouse and the clock waits for input', async () => {
      await page.click('[data-testid=click-to-play]');
      await waitForState(page, () => window.__NEXUS__.getState().overlay === 'none');
      await page.waitForTimeout(400);
      const s = await state(page);
      const locked = await page.evaluate(() => document.pointerLockElement?.id ?? null);
      assert.equal(s.lookMode, 'locked');
      assert.equal(locked, 'game-root');
      assert.equal(s.course.started, false, 'the course clock started without any input');
      assert.ok(s.tick > 0, 'simulation is not ticking');
      return `pointerLockElement=#${locked}`;
    });

    const keys = new Keys(page);

    await step('T01 WASD is relative to the camera (W forward, D right, S back)', async () => {
      const start = (await state(page)).player;
      await keys.set('KeyW', true);
      await waitForState(page, () => window.__NEXUS__.getState().player.vx > 4.9);
      await waitTicks(page, 45);
      await keys.set('KeyW', false);
      const afterW = (await state(page)).player;
      // Spawn faces +X: forward must be +X with no sideways drift.
      assert.ok(afterW.x - start.x > 2.5, `W moved ${afterW.x - start.x} m on x`);
      assert.ok(Math.abs(afterW.z - start.z) < 0.05, `W drifted ${afterW.z - start.z} m sideways`);

      await waitTicks(page, 20);
      await keys.set('KeyD', true);
      await waitTicks(page, 45);
      await keys.set('KeyD', false);
      const afterD = (await state(page)).player;
      assert.ok(afterD.z - afterW.z > 1.5, `D (strafe right) moved ${afterD.z - afterW.z} m on z`);

      await waitTicks(page, 20);
      await keys.set('KeyS', true);
      await waitTicks(page, 45);
      await keys.set('KeyS', false);
      await waitTicks(page, 20);
      const afterS = (await state(page)).player;
      assert.ok(afterS.x < afterD.x - 1, 'S did not move backwards');
      assert.equal((await state(page)).course.started, true, 'moving should start the course clock');
      return `forward ${(afterW.x - start.x).toFixed(1)} m, strafe ${(afterD.z - afterW.z).toFixed(1)} m`;
    });

    await step('sprint reaches 7 m/s and walking 5 m/s', async () => {
      await keys.set('KeyW', true);
      await waitForState(page, () => Math.abs(Math.hypot(window.__NEXUS__.getState().player.vx, window.__NEXUS__.getState().player.vz) - 5) < 0.01);
      const walk = (await state(page)).player;
      assert.equal(walk.moveState, 'walk');
      await keys.set('ShiftLeft', true);
      await waitForState(page, () => window.__NEXUS__.getState().player.moveState === 'sprint' && Math.abs(window.__NEXUS__.getState().player.vx - 7) < 0.01);
      await keys.releaseAll();
      return 'walk 5.0 m/s, sprint 7.0 m/s';
    });

    await step('T02 jump leaves the ground and lands back on it', async () => {
      await waitForState(page, () => window.__NEXUS__.getState().player.grounded && Math.hypot(window.__NEXUS__.getState().player.vx, window.__NEXUS__.getState().player.vz) < 0.01);
      const before = (await state(page)).player;
      const peak = page.evaluate(
        () =>
          new Promise((resolve) => {
            let max = 0;
            let air = false;
            const poll = () => {
              const p = window.__NEXUS__.getState().player;
              if (!p.grounded) air = true;
              if (p.y > max) max = p.y;
              if (air && p.grounded) resolve(max);
              else requestAnimationFrame(poll);
            };
            poll();
          }),
      );
      await keys.tap('Space');
      const height = await peak;
      const after = (await state(page)).player;
      assert.ok(height - before.y > 0.85 && height - before.y < 1.1, `jump apex ${height - before.y} m (expected about 1.07)`);
      assert.ok(Math.abs(after.y - before.y) < 1e-6, 'did not land at the starting height');
      return `apex ${(height - before.y).toFixed(2)} m`;
    });

    await step('camera: mouse movement turns the view, the crosshair camera follows', async () => {
      const before = await state(page);
      await turnBy(page, 0.6);
      // The camera picks the new direction up on the next rendered frame.
      await waitForState(page, () => Math.abs(window.__NEXUS__.getState().camera.yaw - window.__NEXUS__.getState().look.yaw) < 1e-9);
      const after = await state(page);
      assert.ok(Math.abs(wrap(after.look.yaw - before.look.yaw) - 0.6) < 0.01, `yaw changed by ${wrap(after.look.yaw - before.look.yaw)}`);
      // Vertical look, clamped so the camera can never flip over.
      await page.evaluate(() => document.dispatchEvent(new MouseEvent('mousemove', { movementX: 0, movementY: 150, bubbles: true })));
      const down = await state(page);
      assert.ok(down.look.pitch < after.look.pitch - 0.2, 'mouse down should look down');
      for (let i = 0; i < 12; i++) await page.evaluate(() => document.dispatchEvent(new MouseEvent('mousemove', { movementX: 0, movementY: -200, bubbles: true })));
      const up = await state(page);
      assert.ok(up.look.pitch <= 1.3501, `pitch not clamped: ${up.look.pitch}`);
      await page.evaluate(() => document.dispatchEvent(new MouseEvent('mousemove', { movementX: 0, movementY: 620, bubbles: true })));
    });

    await step('T01 a wall stops the player (house wall, 30 s rule: never pass through)', async () => {
      await keys.tap('Backspace');
      await waitForState(page, () => Math.abs(window.__NEXUS__.getState().player.x + 28) < 1e-6 && window.__NEXUS__.getState().course.started === false);
      // Face north (-Z) and run into the south wall of the house at z = 13.
      const s = await state(page);
      await turnBy(page, wrap(0 - s.look.yaw));
      await keys.set('KeyW', true);
      await keys.set('ShiftLeft', true);
      await waitForState(page, () => {
        const p = window.__NEXUS__.getState().player;
        return p.z < 13.5 && Math.abs(p.vz) < 0.01;
      });
      const samples = [];
      for (let i = 0; i < 6; i++) {
        await waitTicks(page, 20);
        samples.push((await state(page)).player.z);
      }
      await keys.releaseAll();
      for (const z of samples) assert.ok(Math.abs(z - 13.4) < 1e-6, `player at z=${z}, expected to rest at 13.4 (wall face + radius)`);
      return 'rests at z=13.400 during 2 s of pushing';
    });

    await step('pause is explicit: P freezes the simulation, resume continues it', async () => {
      await keys.tap('KeyP');
      await waitForState(page, () => window.__NEXUS__.getState().overlay === 'pause');
      const a = await state(page);
      await page.waitForTimeout(500);
      const b = await state(page);
      assert.equal(a.tick, b.tick, 'simulation advanced while paused');
      assert.equal(await page.evaluate(() => document.pointerLockElement), null, 'pointer still locked while paused');
      assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('data-testid')), 'resume');
      await shot(page, 'fase1-pausa-1280x720');
      await page.keyboard.press('Enter');
      await waitForState(page, () => window.__NEXUS__.getState().overlay === 'none');
      await waitForState(page, (tick) => window.__NEXUS__.getState().tick > tick, 10_000, b.tick);
      assert.ok((await state(page)).tick > b.tick);
    });

    await step('T20 settings: live preview, cancel restores, apply persists, reset returns defaults', async () => {
      await keys.tap('KeyP');
      await page.click('[data-testid=pause-settings]');
      await page.waitForSelector('[data-testid=settings]');
      // FOV 75 -> 90 with the keyboard on the slider.
      await page.focus('[data-testid=fov]');
      for (let i = 0; i < 15; i++) await page.keyboard.press('ArrowRight');
      await waitForState(page, () => Math.abs(window.__NEXUS__.getState().camera.fovDegrees - 90) < 0.5);
      const mediumCalls = (await state(page)).render.drawCalls;
      await page.click('[data-testid=quality-low]');
      // Low removes the shadow pass: the renderer really draws less, it is not a label change.
      await waitForState(page, (calls) => window.__NEXUS__.getState().quality === 'low' && window.__NEXUS__.getState().render.drawCalls < calls - 8, 30_000, mediumCalls);
      const lowCalls = (await state(page)).render.drawCalls;
      assert.equal((await state(page)).fatalError, null);
      await shot(page, 'fase1-ajustes-1280x720');

      // Cancel: everything goes back and nothing is written.
      await page.click('[data-testid=settings-cancel]');
      await waitForState(page, () => window.__NEXUS__.getState().quality === 'medium' && Math.abs(window.__NEXUS__.getState().camera.fovDegrees - 75) < 0.5);
      assert.equal(await readSave(page), null, 'cancel must not save');
      await waitForState(page, (calls) => window.__NEXUS__.getState().render.drawCalls > calls + 8, 30_000, lowCalls);

      // Apply: saved to storage.
      await page.click('[data-testid=pause-settings]');
      await page.focus('[data-testid=fov]');
      for (let i = 0; i < 15; i++) await page.keyboard.press('ArrowRight');
      await page.click('[data-testid=show-fps]');
      await page.click('[data-testid=settings-apply]');
      await page.waitForSelector('[data-testid=fps]');
      const saved = await readSave(page);
      assert.equal(saved.settings.display.fov, 90);
      assert.equal(saved.settings.display.showFps, true);

      // Reset inside the panel returns the draft to defaults (then cancel keeps the saved 90).
      await page.click('[data-testid=pause-settings]');
      await page.click('[data-testid=settings-reset]');
      await waitForState(page, () => Math.abs(window.__NEXUS__.getState().camera.fovDegrees - 75) < 0.5);
      await page.click('[data-testid=settings-cancel]');
      await waitForState(page, () => Math.abs(window.__NEXUS__.getState().camera.fovDegrees - 90) < 0.5);
      return `low ${lowCalls} vs medium ${mediumCalls} draw calls; FOV 90 saved`;
    });

    await step('language switch changes real UI text (es-PE <-> en)', async () => {
      await page.click('[data-testid=pause-settings]');
      await page.click('[data-testid=tab-accessibility]');
      await page.click('[data-testid=locale-en]');
      await page.click('[data-testid=settings-apply]');
      await page.waitForFunction(() => document.querySelector('[data-testid=resume]')?.textContent === 'Resume');
      assert.equal(await page.evaluate(() => document.documentElement.lang), 'en');
      await page.click('[data-testid=pause-settings]');
      await page.click('[data-testid=tab-accessibility]');
      await page.click('[data-testid=locale-es-PE]');
      await page.click('[data-testid=settings-apply]');
      await page.waitForFunction(() => document.querySelector('[data-testid=resume]')?.textContent === 'Reanudar');
    });

    await step('settings survive a page reload; pause menu returns to the lobby', async () => {
      await page.click('[data-testid=to-lobby]');
      await page.waitForSelector('[data-testid=lobby]');
      assert.equal((await state(page)).screen, 'lobby');
      await page.reload({ waitUntil: 'load' });
      await page.waitForFunction(() => typeof window.__NEXUS__ !== 'undefined');
      await page.waitForSelector('[data-testid=lobby]');
      const saved = await readSave(page);
      assert.equal(saved.settings.display.fov, 90);
      assert.equal(saved.settings.locale, 'es-PE');
    });
    await first.context.close();

    /* ------------------------------------------------------------------------------------ */
    /* Session 2: no pointer lock available (embedded previews): drag-to-look fallback.      */
    /* ------------------------------------------------------------------------------------ */
    await step('fallback: without pointer lock the game is still playable (drag and arrow keys)', async () => {
      const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
      await context.addInitScript(() => {
        Element.prototype.requestPointerLock = undefined;
      });
      const p = await context.newPage();
      p.on('pageerror', (error) => problems.push(`pageerror(fallback): ${error.message}`));
      await p.goto(server.url);
      await p.waitForFunction(() => typeof window.__NEXUS__ !== 'undefined');
      await p.click('[data-testid=play]');
      await p.click('[data-testid=click-to-play]');
      await p.waitForFunction(() => window.__NEXUS__.getState().overlay === 'none' && window.__NEXUS__.getState().lookMode === 'drag');
      const before = (await p.evaluate(() => window.__NEXUS__.getState())).look.yaw;
      await p.mouse.move(640, 400);
      await p.mouse.down();
      await p.mouse.move(540, 400, { steps: 5 });
      await p.mouse.up();
      await p.waitForTimeout(200);
      const dragged = (await p.evaluate(() => window.__NEXUS__.getState())).look.yaw;
      assert.ok(wrap(dragged - before) > 0.2, `dragging left should turn left, yaw changed by ${wrap(dragged - before)}`);
      await p.keyboard.down('ArrowRight');
      await p.waitForFunction((yaw) => window.__NEXUS__.getState().look.yaw < yaw - 0.3, dragged);
      await p.keyboard.up('ArrowRight');
      // Esc reaches the page in this mode and must pause.
      await p.keyboard.press('Escape');
      await p.waitForFunction(() => window.__NEXUS__.getState().overlay === 'pause');
      await context.close();
      return 'drag look + arrow keys + Esc pause';
    });

    /* ------------------------------------------------------------------------------------ */
    /* Session 3: play the whole circuit through the real controls.                          */
    /* ------------------------------------------------------------------------------------ */
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    await context.addInitScript(
      ([key, save]) => {
        if (!localStorage.getItem(key)) localStorage.setItem(key, save);
      },
      [SAVE_KEY, JSON.stringify(FAST_SAVE)],
    );
    page = await context.newPage();
    page.on('console', (message) => {
      if (message.type() === 'error') problems.push(`console.error: ${message.text()}`);
    });
    page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`));
    await page.goto(server.url);
    await page.waitForFunction(() => typeof window.__NEXUS__ !== 'undefined');
    const runKeys = new Keys(page);

    await step('full circuit: 8 anchors reached in order with keyboard and mouse', async () => {
      await page.click('[data-testid=play]');
      await page.click('[data-testid=click-to-play]');
      await waitForState(page, () => window.__NEXUS__.getState().overlay === 'none');
      const notes = [];
      for (const section of ROUTE) {
        await drive(page, runKeys, section.legs);
        if (section.anchors === 8) break; // the last anchor ends the run and shows the results
        const s = await state(page);
        assert.equal(s.course.nextIndex, section.anchors, `after "${section.name}" expected ${section.anchors} anchors, have ${s.course.nextIndex}`);
        assert.equal(await page.textContent('[data-testid=anchors-reached]'), String(section.anchors), 'HUD anchor counter out of sync');
        notes.push(`${section.name} ok`);
        if (section.anchors === 3) await shot(page, 'fase1-partida-contenedor-1280x720');
      }
      await waitForState(page, () => window.__NEXUS__.getState().overlay === 'results', 30_000);
      const s = await state(page);
      assert.equal(s.course.finished, true);
      assert.equal(s.paused, true);
      return notes.join(', ');
    });

    await step('T08 results: one result, time shown, new best persisted, back to the lobby', async () => {
      await page.waitForSelector('[data-testid=results]');
      const time = await page.textContent('[data-testid=result-time]');
      assert.match(time ?? '', /^\d\d:\d\d\.\d\d$/);
      assert.ok(await page.isVisible('[data-testid=new-best]'), 'first run should be a new best');
      const saved = await readSave(page);
      const ticks = saved.profile.bestCourseTicks.training_grounds;
      assert.ok(Number.isInteger(ticks) && ticks > 20 * 60 && ticks < 300 * 60, `stored ticks ${ticks}`);
      assert.equal(saved.profile.coursesCompleted, 1);
      await shot(page, 'fase1-resultados-1280x720');

      await page.click('[data-testid=results-lobby]');
      await page.waitForSelector('[data-testid=lobby]');
      assert.equal(await page.textContent('[data-testid=best-time]'), time, 'lobby does not show the recorded time');
      await page.reload({ waitUntil: 'load' });
      await page.waitForSelector('[data-testid=lobby]');
      assert.equal(await page.textContent('[data-testid=best-time]'), time, 'best time lost after reload');
      return `time ${time} (${ticks} ticks)`;
    });

    await step('visual evidence at 1280x720 and 1920x1080 (high quality)', async () => {
      await page.click('[data-testid=open-settings]');
      await page.click('[data-testid=quality-high]');
      await page.focus('[data-testid=render-scale]');
      await page.keyboard.press('End');
      await page.click('[data-testid=settings-apply]');
      assert.equal((await readSave(page)).settings.display.renderScale, 1);
      await page.click('[data-testid=play]');
      await page.click('[data-testid=click-to-play]');
      await waitForState(page, () => window.__NEXUS__.getState().overlay === 'none');
      await runKeys.set('KeyW', true);
      await runKeys.set('ShiftLeft', true);
      await waitTicks(page, 150);
      await shot(page, 'fase1-partida-1280x720');
      await page.setViewportSize({ width: 1920, height: 1080 });
      await waitTicks(page, 40);
      await shot(page, 'fase1-partida-1920x1080');
      await runKeys.releaseAll();
      // Nothing may overflow the window at either size.
      const overflow = await page.evaluate(() => {
        const bad = [];
        for (const el of document.querySelectorAll('#ui-root .panel, #ui-root .compass, #ui-root .hud-hint')) {
          const r = el.getBoundingClientRect();
          if (r.left < -1 || r.top < -1 || r.right > innerWidth + 1 || r.bottom > innerHeight + 1) bad.push(el.className);
        }
        return bad;
      });
      assert.deepEqual(overflow, [], 'HUD elements outside the window');
      await runKeys.tap('KeyP');
      await page.click('[data-testid=to-lobby]');
      await page.waitForSelector('[data-testid=lobby]');
      await page.waitForTimeout(800);
      await shot(page, 'fase1-lobby-1920x1080');
    });

    /* ------------------------------------------------------------------------------------ */
    /* Session 4: the single-file build on a phone (touch stick, drag look, on-screen buttons). */
    /* ------------------------------------------------------------------------------------ */
    const packed = await startStaticServer(join(ROOT, 'dist-artifact'));
    try {
      const phone = await browser.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 });
      await phone.addInitScript(
        ([key, save]) => {
          if (!localStorage.getItem(key)) localStorage.setItem(key, save);
        },
        [SAVE_KEY, JSON.stringify(FAST_SAVE)],
      );
      const mobile = await phone.newPage();
      mobile.on('console', (message) => {
        if (message.type() === 'error') problems.push(`console.error(touch): ${message.text()}`);
      });
      mobile.on('pageerror', (error) => problems.push(`pageerror(touch): ${error.message}`));
      const cdp = await phone.newCDPSession(mobile);
      const touch = (type, points) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points });
      const inViewport = (selectors) =>
        mobile.evaluate((list) => {
          const bad = [];
          for (const selector of list) {
            for (const el of document.querySelectorAll(selector)) {
              const r = el.getBoundingClientRect();
              if (r.width === 0 && r.height === 0) continue;
              if (r.left < -1 || r.top < -1 || r.right > innerWidth + 1 || r.bottom > innerHeight + 1) bad.push(`${selector} [${Math.round(r.left)},${Math.round(r.top)},${Math.round(r.right)},${Math.round(r.bottom)}]`);
            }
          }
          if (document.documentElement.scrollWidth > innerWidth + 1) bad.push('page scrolls horizontally');
          return bad;
        }, selectors);

      await step('single-file build on a phone (844x390): lobby fits and starts by touch', async () => {
        await mobile.goto(packed.url);
        await mobile.waitForFunction(() => typeof window.__NEXUS__ !== 'undefined');
        await mobile.waitForSelector('[data-testid=lobby]');
        assert.deepEqual(await inViewport(['[data-testid=play]', '.mode-card', '.topbar']), []);
        await shot(mobile, 'fase1-movil-lobby-844x390');
        await mobile.tap('[data-testid=play]');
        await mobile.tap('[data-testid=click-to-play]');
        await waitForState(mobile, () => window.__NEXUS__.getState().overlay === 'none');
        const s = await state(mobile);
        assert.equal(s.touch, true, 'touch mode not detected');
        assert.equal(s.lookMode, 'drag');
        await mobile.waitForSelector('[data-testid=touch-jump]');
        assert.deepEqual(await inViewport(['.touch-btn', '.hud-course', '.compass', '.hud-hint']), []);
      });

      await step('touch: stick moves and sprints, second finger looks, buttons jump / crouch / pause', async () => {
        const start = (await state(mobile)).player;
        // Left thumb: push the stick fully forward (beyond its radius) -> sprint.
        await touch('touchStart', [{ x: 130, y: 260, id: 1 }]);
        await touch('touchMove', [{ x: 130, y: 170, id: 1 }]);
        await waitForState(mobile, () => window.__NEXUS__.getState().player.moveState === 'sprint', 60_000);
        assert.ok(await mobile.isVisible('.touch-stick'), 'stick is not drawn');
        // Right thumb at the same time: drag left -> the view turns left while still running.
        const yawBefore = (await state(mobile)).look.yaw;
        await touch('touchStart', [{ x: 130, y: 170, id: 1 }, { x: 620, y: 200, id: 2 }]);
        await touch('touchMove', [{ x: 130, y: 170, id: 1 }, { x: 540, y: 200, id: 2 }]);
        // The browser delivers the touch asynchronously: wait for the view to actually turn.
        await waitForState(mobile, (yaw) => Math.abs(window.__NEXUS__.getState().look.yaw - yaw) > 0.2, 20_000, yawBefore);
        const yawAfter = (await state(mobile)).look.yaw;
        assert.ok(wrap(yawAfter - yawBefore) > 0.2, `dragging left should turn left: ${wrap(yawAfter - yawBefore)}`);
        assert.equal((await state(mobile)).player.moveState, 'sprint', 'looking interrupted the stick');
        await touch('touchEnd', []);
        await waitForState(mobile, () => Math.hypot(window.__NEXUS__.getState().player.vx, window.__NEXUS__.getState().player.vz) < 0.01, 60_000);
        const moved = (await state(mobile)).player;
        assert.ok(Math.hypot(moved.x - start.x, moved.z - start.z) > 2, 'the stick did not move the character');
        assert.equal(await mobile.isVisible('.touch-stick'), false, 'stick stays on screen after release');

        // Jump button (held like a real press).
        const jump = await mobile.locator('[data-testid=touch-jump]').boundingBox();
        await touch('touchStart', [{ x: jump.x + jump.width / 2, y: jump.y + jump.height / 2, id: 3 }]);
        await waitForState(mobile, () => window.__NEXUS__.getState().player.grounded === false, 60_000);
        await touch('touchEnd', []);
        await waitForState(mobile, () => window.__NEXUS__.getState().player.grounded === true, 60_000);

        // Crouch is a toggle on touch.
        await mobile.tap('[data-testid=touch-crouch]');
        await waitForState(mobile, () => window.__NEXUS__.getState().player.moveState === 'crouch', 60_000);
        await mobile.tap('[data-testid=touch-crouch]');
        await waitForState(mobile, () => window.__NEXUS__.getState().player.moveState === 'idle', 60_000);
        await shot(mobile, 'fase1-movil-partida-844x390');

        await mobile.tap('[data-testid=touch-pause]');
        await waitForState(mobile, () => window.__NEXUS__.getState().overlay === 'pause');
        assert.deepEqual(await inViewport(['.menu', '.menu .btn']), []);
        await mobile.tap('[data-testid=to-lobby]');
        await mobile.waitForSelector('[data-testid=lobby]');
        return 'stick + sprint, simultaneous look, jump, crouch toggle, pause';
      });

      await step('phone portrait (390x844): nothing overflows in lobby, match, pause or settings', async () => {
        await mobile.setViewportSize({ width: 390, height: 844 });
        await mobile.waitForTimeout(400);
        assert.deepEqual(await inViewport(['[data-testid=play]', '.mode-card', '.topbar']), []);
        await shot(mobile, 'fase1-movil-lobby-390x844');
        await mobile.tap('[data-testid=play]');
        await mobile.tap('[data-testid=click-to-play]');
        await waitForState(mobile, () => window.__NEXUS__.getState().overlay === 'none');
        await mobile.waitForSelector('[data-testid=touch-jump]');
        assert.deepEqual(await inViewport(['.touch-btn', '.hud-course', '.compass', '.hud-hint']), []);
        await shot(mobile, 'fase1-movil-partida-390x844');
        await mobile.tap('[data-testid=touch-pause]');
        await mobile.tap('[data-testid=pause-settings]');
        await mobile.waitForSelector('[data-testid=settings]');
        assert.deepEqual(await inViewport(['.settings', '.settings .btn', '.segment', 'input[type=range]']), []);
        await mobile.tap('[data-testid=settings-cancel]');
        await mobile.tap('[data-testid=to-lobby]');
        await mobile.waitForSelector('[data-testid=lobby]');
      });
      await phone.close();

      /* Sessions 5-7: phase 2 (firing range, skirmish against bots, combat by touch). */
      await runCombatSessions({ browser, serverUrl: server.url, packedUrl: packed.url, step, shot, waitTicks, Keys, drive, problems, FAST_SAVE });
    } finally {
      await packed.close();
    }

    await step('no console errors, page errors or failed requests', async () => {
      assert.deepEqual([...first.problems, ...problems], []);
    });
  } finally {
    await browser.close();
    await server.close();
  }

  const ran = results.filter((r) => r.status !== 'SKIPPED');
  const passed = ran.filter((r) => r.status === 'PASS').length;
  console.log(`\n${passed}/${ran.length} e2e steps passed${ran.length < results.length ? ` (${results.length - ran.length} skipped by --filter)` : ''}`);
  for (const r of ran.filter((x) => x.status !== 'PASS')) console.log(`  ${r.status}: ${r.name} — ${r.detail}`);
  process.exitCode = passed === ran.length ? 0 : 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
