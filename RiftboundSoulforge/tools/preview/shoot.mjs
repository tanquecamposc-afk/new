import { chromium } from 'playwright';
import http from 'http'; import fs from 'fs'; import path from 'path';
const root = process.cwd();
const server = http.createServer((req, res) => {
  const p = path.join(root, decodeURIComponent(req.url.split('?')[0]));
  if (!fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); res.end(); return; }
  const ext = path.extname(p); res.writeHead(200, { 'Content-Type': ext === '.js' ? 'text/javascript' : ext === '.json' ? 'application/json' : 'text/html' });
  fs.createReadStream(p).pipe(res);
}).listen(8765);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
page.on('console', m => { if (m.type() === 'error') console.log('console:', m.text()); });
page.on('pageerror', e => console.log('pageerror:', e.message));
for (const v of (process.argv[2] || 'nexus').split(',')) {
  await page.goto(`http://localhost:8765/index.html?view=${v}`);
  await page.waitForFunction('window.done === true', null, { timeout: 180000 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `shot_${v}.png` });
  console.log('shot', v);
}
await browser.close(); server.close();
