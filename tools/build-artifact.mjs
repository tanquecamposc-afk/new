/**
 * Packs the production build into ONE self-contained HTML fragment (styles and script inlined,
 * no external requests) so the game can be shared as a single page.
 *
 *   npm run build:artifact   ->  dist-artifact/nexus-royale.html   (the fragment)
 *                                dist-artifact/index.html          (same thing wrapped for local testing)
 *
 * The fragment deliberately has no <html>/<head>/<body>: the host that publishes it adds them.
 */
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const dist = join(root, 'dist-web');
const out = join(root, 'dist-artifact');

const assets = await readdir(join(dist, 'assets')).catch(() => {
  throw new Error('dist-web/assets not found. Run "vite build" first.');
});
const scripts = assets.filter((name) => name.endsWith('.js'));
const styles = assets.filter((name) => name.endsWith('.css'));
if (scripts.length !== 1 || styles.length !== 1) {
  throw new Error(`expected exactly one script and one stylesheet, found ${scripts.length} and ${styles.length}`);
}

// A literal closing tag inside the code would end the inline element early.
const script = (await readFile(join(dist, 'assets', scripts[0]), 'utf8')).replaceAll('</script', '<\\/script');
const style = (await readFile(join(dist, 'assets', styles[0]), 'utf8')).replaceAll('</style', '<\\/style');

const fragment = [
  '<title>NEXUS ROYALE</title>',
  '<meta name="claude:viewport-fit-sides" content="cover">',
  `<style>${style}</style>`,
  '<div id="game-root"></div>',
  '<div id="ui-root"></div>',
  `<script type="module">${script}</script>`,
  '',
].join('\n');

const wrapped = [
  '<!doctype html>',
  '<html lang="es">',
  '<head>',
  '<meta charset="utf-8">',
  '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">',
  '</head>',
  '<body>',
  fragment,
  '</body>',
  '</html>',
  '',
].join('\n');

await mkdir(out, { recursive: true });
await writeFile(join(out, 'nexus-royale.html'), fragment);
await writeFile(join(out, 'index.html'), wrapped);
console.log(`dist-artifact/nexus-royale.html  ${(Buffer.byteLength(fragment) / 1024).toFixed(1)} kB (self-contained)`);
