#!/usr/bin/env node
/**
 * Genera `arcade.html`: TODO el arcade (portada + los 6 juegos) en un único
 * archivo autocontenido, sin CSS ni JS externos, para poder abrirlo en
 * cualquier sitio donde solo se admita una página suelta.
 *
 *   node construir-arcade.js
 *   node construir-arcade.js --fragmento salida.html
 *
 * Con `--fragmento` se emite la misma página pero sin las etiquetas
 * <!DOCTYPE>/<html>/<head>/<body>, para incrustarla donde el contenedor ya
 * las pone (por ejemplo, un Artifact de Claude).
 *
 * Los archivos de `juegos/` siguen siendo la fuente de verdad: este script
 * solo los empaqueta. Cada juego queda aislado en su propia pantalla:
 *   - su CSS se prefija con el selector de su contenedor,
 *   - su JS se envuelve en una función donde `document`, `addEventListener`
 *     y `Arcade.bucle` están acotados a esa pantalla,
 *   - los enlaces entre páginas se convierten en navegación interna.
 */
const fs = require('fs');
const path = require('path');

const RAIZ = __dirname;
const JUEGOS = [
  { id:'td',         archivo:'juegos/nexo-tower-defense.html' },
  { id:'comecocos',  archivo:'juegos/comecocos.html' },
  { id:'pvz',        archivo:'juegos/plantas-vs-zombies.html' },
  { id:'minas',      archivo:'juegos/minas.html' },
  { id:'blockblast', archivo:'juegos/block-blast.html' },
  { id:'serpiente',  archivo:'juegos/serpiente.html' },
  { id:'aviator',    archivo:'juegos/aviator.html' },
  { id:'pool',       archivo:'juegos/8-ball-pool.html' },
  { id:'rumble',     archivo:'juegos/rumble-stars.html' },
  { id:'mina',       archivo:'juegos/mining-tycoon.html' },
  { id:'cofres',     archivo:'juegos/cofres-minecraft.html' },
  { id:'galletas',   archivo:'juegos/cookie-clicker.html' },
  { id:'sparta',     archivo:'juegos/spartahoppers.html' },
  { id:'mercado',    archivo:'juegos/money-market.html' },
  { id:'moto',       archivo:'juegos/moto-x3m.html' },
  { id:'blackjack',  archivo:'juegos/blackjack.html' },
  { id:'ruleta',     archivo:'juegos/ruleta.html' },
  { id:'poker',      archivo:'juegos/poker-texas.html' },
  { id:'bacara',     archivo:'juegos/bacara.html' },
  { id:'dados',      archivo:'juegos/dados-craps.html' },
  { id:'chicken',    archivo:'juegos/chicken.html' },
  { id:'spire',      archivo:'juegos/spire.html' },
  { id:'limbo',      archivo:'juegos/limbo.html' },
  { id:'bigbass',    archivo:'juegos/big-bass-crash.html' },
  { id:'plinko',     archivo:'juegos/plinko.html' },
  { id:'subway',     archivo:'juegos/subway-surfers.html' },
  { id:'slope',      archivo:'juegos/slope.html' },
  { id:'hook',       archivo:'juegos/stickman-hook.html' },
  { id:'paperio',    archivo:'juegos/paper-io.html' },
  { id:'vex',        archivo:'juegos/vex.html' },
  { id:'tunnel',     archivo:'juegos/tunnel-rush.html' },
  { id:'cuerda',     archivo:'juegos/cut-the-rope.html' },
  { id:'basket',     archivo:'juegos/basket-random.html' },
  { id:'karts',      archivo:'juegos/smash-karts.html' },
  { id:'retrobowl',  archivo:'juegos/retro-bowl.html' },
  { id:'drift',      archivo:'juegos/drift-hunters.html' },
  { id:'basketstars',archivo:'juegos/basketball-stars.html' },
  { id:'unovsuno',   archivo:'juegos/1v1-lol.html' },
  { id:'cluster',    archivo:'juegos/cluster-rush.html' }
];

const leer = f => fs.readFileSync(path.join(RAIZ, f), 'utf8');

// ---------- Extracción de trozos de una página ----------
function partes(html){
  const estilos = [...html.matchAll(/<style>([\s\S]*?)<\/style>/g)].map(m => m[1]);
  const guiones = [...html.matchAll(/<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]);
  const cuerpo = html.match(/<body>([\s\S]*?)<\/body>/)[1]
    .replace(/<script[\s\S]*?<\/script>/g, '')
    .trim();
  return { estilos, guiones, cuerpo };
}

/**
 * Prefija cada selector de una hoja de estilos para que solo afecte a su
 * pantalla. Respeta los bloques @media/@supports y deja intactos @keyframes
 * (sus "selectores" son porcentajes, no elementos).
 */
function acotarCss(css, prefijo){
  const salida = [];
  let i = 0;
  while (i < css.length){
    const llave = css.indexOf('{', i);
    if (llave === -1){ salida.push(css.slice(i)); break; }
    const cabecera = css.slice(i, llave).trim();
    const fin = cierre(css, llave);
    const cuerpo = css.slice(llave + 1, fin);

    if (cabecera.startsWith('@keyframes') || cabecera.startsWith('@-webkit-keyframes')){
      salida.push(cabecera + '{' + cuerpo + '}');
    } else if (cabecera.startsWith('@media') || cabecera.startsWith('@supports')){
      salida.push(cabecera + '{' + acotarCss(cuerpo, prefijo) + '}');
    } else if (cabecera.startsWith('@')){
      salida.push(cabecera + '{' + cuerpo + '}');
    } else {
      const sel = cabecera.split(',').map(s => prefijarSelector(s.trim(), prefijo)).join(', ');
      salida.push(sel + '{' + cuerpo + '}');
    }
    i = fin + 1;
  }
  return salida.join('\n');
}
function cierre(txt, abre){
  let n = 0;
  for (let k = abre; k < txt.length; k++){
    if (txt[k] === '{') n++;
    else if (txt[k] === '}' && --n === 0) return k;
  }
  return txt.length;
}
function prefijarSelector(sel, prefijo){
  if (!sel) return sel;
  // :root y html/body pasan a ser la propia pantalla
  if (/^(:root|html|body)$/.test(sel)) return prefijo;
  if (/^(html|body)\b/.test(sel)) return prefijo + sel.replace(/^(html|body)/, '');
  if (sel === '*') return prefijo + ' *';
  return prefijo + ' ' + sel;
}

// ---------- Montaje ----------
const cssComun = leer('juegos/arcade.css');
const jsComun = leer('juegos/arcade.js');
const portada = partes(leer('index.html'));

// La portada: sus enlaces a los juegos pasan a ser navegación interna
let jsPortada = portada.guiones.join('\n')
  .replace(/a\.href = j\.archivo;/, "a.href = 'javascript:void 0';\n  a.dataset.juego = j.id;");

const pantallas = JUEGOS.map(j => {
  const p = partes(leer(j.archivo));
  const prefijo = '#pantalla-' + j.id;
  const css = p.estilos.map(e => acotarCss(e, prefijo)).join('\n');
  // Los enlaces "volver al arcade" pasan a ser botones internos
  const cuerpo = p.cuerpo
    .replace(/href="\.\.\/index\.html"/g, 'href="javascript:void 0" data-volver="1"')
    .replace(/href="index\.html"/g, 'href="javascript:void 0" data-volver="1"');
  return { ...j, css, cuerpo, js: p.guiones.join('\n') };
});

const estilos = `<style>
/* ====== Estilos comunes ====== */
${cssComun}

/* ====== Cambio de pantalla ======
   Lleva !important a propósito: el CSS de cada juego se acota con el selector
   de su contenedor (#pantalla-xxx), y una regla suya heredada de "body" tiene
   más especificidad que .pantalla. Sin esto, esa pantalla no se ocultaría. */
.pantalla{display:none !important; width:100%; flex-direction:column; align-items:center;}
.pantalla.activa{display:flex !important;}
body{display:block; padding:0; margin:0;}
#pantalla-portada{align-items:center;}

/* ====== Estilos de la portada ====== */
${acotarCss(portada.estilos.join('\n'), '#pantalla-portada')}

/* ====== Estilos de cada juego ====== */
${pantallas.map(p => `/* --- ${p.id} --- */\n${p.css}`).join('\n\n')}
</style>`;

const marcado = `<div class="pantalla activa" id="pantalla-portada">
${portada.cuerpo}
</div>

${pantallas.map(p => `<div class="pantalla" id="pantalla-${p.id}">\n${p.cuerpo}\n</div>`).join('\n\n')}`;

const guion = `<script>
/* ====== Utilidades comunes ====== */
${jsComun}

/* ====== Enrutador ====== */
const Enrutador = {
  actual: 'portada',
  arrancados: {},
  ir(id){
    Guardado.ahora();             // lo jugado se guarda antes de soltar la pantalla
    AlSalir.ahora();              // música y temporizadores propios de cada juego
    Sonido.pararMotor();          // ningún sonido continuo sobrevive al cambio de pantalla
    document.querySelectorAll('.pantalla').forEach(p => p.classList.remove('activa'));
    const destino = document.getElementById('pantalla-' + id);
    if (!destino) return;
    destino.classList.add('activa');
    this.actual = id;
    scrollTo(0, 0);
    // al volver, la portada repinta cartera y récords
    if (id === 'portada' && window.refrescarPortada) window.refrescarPortada();
    if (!this.arrancados[id] && JUEGOS_INICIO[id]){
      this.arrancados[id] = true;
      JUEGOS_INICIO[id]();          // el juego se carga la primera vez que entras
    }
  }
};
const JUEGOS_INICIO = {};

/**
 * Envuelve el código de un juego para que crea que tiene la página entera:
 * document, addEventListener y Arcade.bucle quedan acotados a su pantalla,
 * de modo que ni los IDs ni las teclas se pisan entre juegos.
 */
function registrarJuego(id, codigo){
  JUEGOS_INICIO[id] = function(){
    const raiz = document.getElementById('pantalla-' + id);
    const activa = () => Enrutador.actual === id;

    const escucha = (tipo, fn, op) =>
      window.addEventListener(tipo, e => { if (activa()) fn(e); }, op);

    const doc = new Proxy(document, {
      get(d, k){
        if (k === 'getElementById') return x => raiz.querySelector('#' + CSS.escape(x));
        if (k === 'querySelector') return s => raiz.querySelector(s);
        if (k === 'querySelectorAll') return s => raiz.querySelectorAll(s);
        // document.addEventListener también se acota: si no, un juego que
        // escuche el teclado en el documento seguiría respondiendo desde
        // cualquier otra pantalla.
        if (k === 'addEventListener'){
          return (tipo, fn, op) =>
            d.addEventListener(tipo, e => { if (activa()) fn(e); }, op);
        }
        const v = d[k];
        return typeof v === 'function' ? v.bind(d) : v;
      },
      set(d, k, v){ d[k] = v; return true; }
    });
    const arcadeLocal = Object.create(Arcade);
    arcadeLocal.bucle = fn => Arcade.bucle(dt => { if (activa()) fn(dt); });

    codigo(doc, escucha, arcadeLocal);
  };
}

/* ====== Portada ====== */
(function(){
${jsPortada}

  document.getElementById('rejilla').addEventListener('click', ev => {
    const carta = ev.target.closest('[data-juego]');
    if (!carta) return;
    ev.preventDefault();
    Sonido.activar();
    Enrutador.ir(carta.dataset.juego);
  });
})();

/* ====== Volver al arcade desde cualquier juego ====== */
document.addEventListener('click', ev => {
  const volver = ev.target.closest('[data-volver]');
  if (!volver) return;
  ev.preventDefault();
  Enrutador.ir('portada');
});

/* ====== Los seis juegos ====== */
${pantallas.map(p => `registrarJuego(${JSON.stringify(p.id)}, function(document, addEventListener, Arcade){
${p.js}
});`).join('\n\n')}
</script>`;

const TITULO = '<title>ARCADE NEXO</title>';

const iFragmento = process.argv.indexOf('--fragmento');
const salida = iFragmento === -1
  ? `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
${TITULO}
${estilos}
</head>
<body>

${marcado}

${guion}
</body>
</html>
`
  // Sin envoltorio: el contenedor ya pone <!DOCTYPE>, <html>, <head> y <body>
  : `${TITULO}
${estilos}

${marcado}

${guion}
`;

const destino = iFragmento === -1
  ? path.join(RAIZ, 'arcade.html')
  : path.resolve(process.argv[iFragmento + 1] || 'arcade-fragmento.html');

fs.writeFileSync(destino, salida);
const kb = (Buffer.byteLength(salida) / 1024).toFixed(0);
console.log(`${path.basename(destino)} generado: ${kb} KB, ${salida.split('\n').length} líneas, ${JUEGOS.length} juegos.`);
