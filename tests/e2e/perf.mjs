/**
 * Frame-time probe (QA case T24): measures the real frame pacing of a running match for every
 * graphics preset.   node tests/e2e/perf.mjs [width height]
 *
 * It reports what THIS machine does. In CI / cloud containers Chromium renders with SwiftShader
 * (CPU), so the numbers there say nothing about a real GPU — run it on the target hardware.
 */
import { launchBrowser, startStaticServer, waitForState } from './lib.mjs';

const width = Number(process.argv[2] ?? 1280);
const height = Number(process.argv[3] ?? 720);
const PRESETS = ['low', 'medium', 'high', 'epic'];

/** Collects requestAnimationFrame deltas for `ms` milliseconds. */
const sample = (page, ms) =>
  page.evaluate(
    (duration) =>
      new Promise((resolve) => {
        const deltas = [];
        let last = performance.now();
        const start = last;
        const tick = (now) => {
          deltas.push(now - last);
          last = now;
          if (now - start >= duration) {
            deltas.sort((a, b) => a - b);
            const sum = deltas.reduce((a, b) => a + b, 0);
            resolve({ avg: sum / deltas.length, p95: deltas[Math.floor(deltas.length * 0.95)] ?? 0, frames: deltas.length });
          } else {
            requestAnimationFrame(tick);
          }
        };
        requestAnimationFrame(tick);
      }),
    ms,
  );

const server = await startStaticServer();
const browser = await launchBrowser();
try {
  const context = await browser.newContext({ viewport: { width, height } });
  const page = await context.newPage();
  await page.goto(server.url);
  await page.waitForFunction(() => typeof window.__NEXUS__ !== 'undefined');
  const renderer = await page.evaluate(() => {
    const gl = document.createElement('canvas').getContext('webgl2');
    const ext = gl?.getExtension('WEBGL_debug_renderer_info');
    return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'unknown';
  });
  console.log(`Renderer: ${renderer}`);
  console.log(`Viewport: ${width}x${height}\n`);
  console.log('preset   avg ms   p95 ms   avg FPS   draw calls   triangles');
  for (const preset of PRESETS) {
    await page.click('[data-testid=open-settings]');
    await page.click(`[data-testid=quality-${preset}]`);
    await page.click('[data-testid=maxfps-0]');
    await page.click('[data-testid=settings-apply]');
    await page.click('[data-testid=play]');
    await page.click('[data-testid=click-to-play]');
    await waitForState(page, () => window.__NEXUS__.getState().overlay === 'none');
    await page.keyboard.down('KeyW');
    await page.keyboard.down('ShiftLeft');
    // Warm-up: let pipelines compile and the run settle before timing anything.
    await sample(page, 6000);
    const result = await sample(page, 5000);
    const info = (await page.evaluate(() => window.__NEXUS__.getState())).render;
    console.log(
      `${preset.padEnd(8)} ${result.avg.toFixed(1).padStart(6)}   ${result.p95.toFixed(1).padStart(6)}   ${(1000 / result.avg).toFixed(1).padStart(7)}   ${String(info.drawCalls).padStart(10)}   ${String(info.triangles).padStart(9)}`,
    );
    await page.keyboard.up('KeyW');
    await page.keyboard.up('ShiftLeft');
    await page.keyboard.press('KeyP');
    await page.click('[data-testid=to-lobby]');
    await page.waitForSelector('[data-testid=lobby]');
  }
} finally {
  await browser.close();
  await server.close();
}
