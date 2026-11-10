// Quick visual check: opens the build, captures the lobby and a moment of play.
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { ROOT, launchBrowser, openGame, startStaticServer, state, waitForState } from './lib.mjs';

const out = join(ROOT, 'test-results');
await mkdir(out, { recursive: true });
const server = await startStaticServer();
const browser = await launchBrowser();
try {
  const { page, problems } = await openGame(browser, server.url);
  await page.waitForTimeout(1500);
  console.log('lobby state', JSON.stringify(await state(page)));
  await page.screenshot({ path: join(out, 'peek-lobby.png') });
  await page.click('[data-testid=play]');
  await page.click('[data-testid=click-to-play]');
  await waitForState(page, () => window.__NEXUS__.getState().overlay === 'none');
  await page.keyboard.down('KeyW');
  await page.keyboard.down('ShiftLeft');
  await page.waitForTimeout(2500);
  console.log('running state', JSON.stringify(await state(page)));
  await page.screenshot({ path: join(out, 'peek-run.png') });
  await page.keyboard.up('KeyW');
  await page.keyboard.up('ShiftLeft');
  console.log('problems', JSON.stringify(problems, null, 1));
} finally {
  await browser.close();
  await server.close();
}
