/**
 * Shared helpers for the browser tests: a tiny static server for the production build and a
 * Chromium launcher with software WebGL so the game renders on machines without a GPU.
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

export const ROOT = resolve(fileURLToPath(new URL('../..', import.meta.url)));
export const DIST = join(ROOT, 'dist-web');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.map': 'application/json',
};

/** Serves a build folder (dist-web by default) on a free local port. */
export async function startStaticServer(directory = DIST) {
  if (!existsSync(join(directory, 'index.html'))) {
    throw new Error(`${directory}/index.html not found. Run the build first.`);
  }
  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url ?? '/', 'http://localhost');
      let path = normalize(decodeURIComponent(url.pathname));
      if (path.endsWith('/')) path += 'index.html';
      const file = join(directory, path);
      if (!file.startsWith(directory)) {
        response.writeHead(403).end();
        return;
      }
      const info = await stat(file);
      if (!info.isFile()) throw new Error('not a file');
      response.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-store' });
      response.end(await readFile(file));
    } catch {
      response.writeHead(404, { 'content-type': 'text/plain' }).end('not found');
    }
  });
  await new Promise((done) => server.listen(0, '127.0.0.1', done));
  const { port } = server.address();
  return { url: `http://127.0.0.1:${port}/`, close: () => new Promise((done) => server.close(done)) };
}

/** Launches headless Chromium. Set PW_CHROMIUM_PATH to use a specific browser binary. */
export async function launchBrowser() {
  const executablePath = process.env.PW_CHROMIUM_PATH;
  return chromium.launch({
    ...(executablePath ? { executablePath } : {}),
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'],
  });
}

/** Opens the game and collects everything the page logs as an error. */
export async function openGame(browser, url, viewport = { width: 1280, height: 720 }) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const problems = [];
  page.on('console', (message) => {
    if (message.type() === 'error') problems.push(`console.error: ${message.text()}`);
  });
  page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`));
  page.on('requestfailed', (request) => problems.push(`requestfailed: ${request.url()}`));
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction(() => typeof window.__NEXUS__ !== 'undefined', null, { timeout: 30_000 });
  return { context, page, problems };
}

export const state = (page) => page.evaluate(() => window.__NEXUS__.getState());

/** Waits until `predicate(arg)` is true; the predicate runs in the page. */
export function waitForState(page, predicate, timeout = 30_000, arg = null) {
  return page.waitForFunction(predicate, arg, { timeout, polling: 50 });
}
