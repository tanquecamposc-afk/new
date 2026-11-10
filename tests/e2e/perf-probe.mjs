// Measures frame time per quality preset (software GL here, so only relative numbers matter).
import { launchBrowser, openGame, startStaticServer, waitForState } from './lib.mjs';
const server = await startStaticServer();
const browser = await launchBrowser();
const measure = (page, ms = 4000) => page.evaluate((duration) => new Promise((resolve) => {
  let frames = 0; const start = performance.now();
  const tick = (now) => { frames++; if (now - start >= duration) resolve(Math.round((now - start) / frames * 10) / 10); else requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
}), ms);
const size = process.argv[2] === 'small' ? { width: 960, height: 540 } : { width: 1280, height: 720 };
try {
  const { page } = await openGame(browser, server.url, size);
  for (const quality of ['medium', 'low', 'high', 'medium', 'low']) {
    await page.click('[data-testid=open-settings]');
    await page.click(`[data-testid=quality-${quality}]`);
    await page.click('[data-testid=maxfps-0]');
    await page.click('[data-testid=settings-apply]');
    await page.waitForTimeout(1500);
    const lobby = await measure(page, 3000);
    await page.click('[data-testid=play]');
    await page.click('[data-testid=click-to-play]');
    try {
      await waitForState(page, () => window.__NEXUS__.getState().overlay === 'none', 8000);
    } catch (error) {
      const s = await page.evaluate(() => window.__NEXUS__.getState());
      console.log('STUCK', JSON.stringify({ overlay: s.overlay, paused: s.paused, look: s.lookMode, tick: s.tick }), await page.evaluate(() => document.pointerLockElement?.tagName ?? null));
      throw error;
    }
    await page.waitForTimeout(1500);
    const match = await measure(page);
    const info = (await page.evaluate(() => window.__NEXUS__.getState())).render;
    console.log(`${quality.padEnd(7)} lobby ${lobby} ms  match ${match} ms  calls ${info.drawCalls} tris ${info.triangles}`);
    await page.keyboard.press('KeyP');
    await page.click('[data-testid=to-lobby]');
  }
} finally { await browser.close(); await server.close(); }
