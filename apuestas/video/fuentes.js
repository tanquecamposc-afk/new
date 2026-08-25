/* ===========================================================
   video/fuentes.js — deja las tipografías en un CSS local

   Chromium tarda ~12 s en resolver fonts.googleapis.com dentro del
   contenedor, y esa espera se veía entera en la grabación. Este script
   baja las familias una sola vez y las deja incrustadas como data: URI
   en video/.fuentes/fuentes.css, que tour.js inyecta al arrancar.

   Uso: node video/fuentes.js   (tour.js lo llama solo si falta el caché)
   =========================================================== */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '.fuentes');
const CSS = path.join(DIR, 'fuentes.css');
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36';
const FUENTE = 'https://fonts.googleapis.com/css2?family=Archivo:wght@600;700;800;900' +
  '&family=Barlow:wght@400;500;600;700;800&display=swap';

const baja = url => execFileSync('curl', ['-sfL', '-A', UA, url], { maxBuffer: 32 * 1024 * 1024 });

function construir() {
  const hoja = baja(FUENTE).toString('utf8');

  // Google antepone a cada bloque el nombre del subconjunto en un comentario.
  // Con latin y latin-ext alcanza para el español, y el archivo pesa la mitad.
  const bloques = [];
  let sub = '', actual = null;
  for (const linea of hoja.split('\n')) {
    const c = linea.match(/^\/\* (\S+) \*\/$/);
    if (c) { sub = c[1]; continue; }
    if (linea.startsWith('@font-face')) { actual = { sub, texto: [linea] }; continue; }
    if (!actual) continue;
    actual.texto.push(linea);
    if (linea.trim() === '}') {
      if (actual.sub === 'latin' || actual.sub === 'latin-ext') bloques.push(actual.texto.join('\n'));
      actual = null;
    }
  }

  const cache = new Map();
  const css = bloques.map(bloque => bloque.replace(/url\((https:\/\/[^)]+)\)/g, (_, url) => {
    if (!cache.has(url)) cache.set(url, `url(data:font/woff2;base64,${baja(url).toString('base64')})`);
    return cache.get(url);
  })).join('\n');

  fs.mkdirSync(DIR, { recursive: true });
  fs.writeFileSync(CSS, css);
  return css;
}

function leer() {
  if (fs.existsSync(CSS)) return fs.readFileSync(CSS, 'utf8');
  return construir();
}

module.exports = { leer, construir, CSS };

if (require.main === module) {
  const css = construir();
  console.log('tipografías en caché:', CSS, (css.length / 1024).toFixed(0) + ' KB');
}
