// Versión PRINCIPIANTE de la Vía Expresa Elevada, pensada para Tinkercad.
//
// La idea es que sea fácil de manejar: puras cajas, pocas piezas y ningún
// detalle chiquito. Igual está completa — tiene la pista elevada, sus
// columnas, la pista de abajo, la estación del Metropolitano, la ciclovía,
// las veredas y unos cuantos carros y árboles.
//
// TODO está en medidas reales: 1 unidad = 1 metro. La lista de medidas de
// la guía sale de estas mismas líneas, así que nunca se desfasa del modelo.
//
// Uso:  node tools/genera-modelo-tinkercad.mjs
//
// Genera:
//   via-expresa-tinkercad.obj  → el que se importa a Tinkercad (sin colores,
//                                porque Tinkercad no lee archivos .mtl)
//   via-expresa-tinkercad.stl  → lo mismo, por si prefieres importar STL
//   via-expresa-tinkercad.glb  → con colores, para mirarlo antes en la compu
//   medidas-tinkercad.md       → la tabla de medidas, pieza por pieza
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/* ===================== colores (solo para el GLB) ===================== */
const MATS = {
  pasto:    [0.45, 0.65, 0.30],
  tierra:   [0.36, 0.28, 0.19],
  pista:    [0.28, 0.30, 0.34],
  concreto: [0.78, 0.80, 0.82],
  anden:    [0.85, 0.86, 0.87],
  ciclovia: [0.20, 0.52, 0.40],
  bus:      [0.80, 0.81, 0.83],
  rojo:     [0.75, 0.22, 0.19],
  azul:     [0.24, 0.42, 0.66],
  amarillo: [0.93, 0.76, 0.14],
  tronco:   [0.42, 0.31, 0.20],
  copa:     [0.28, 0.50, 0.24],
};

/* ===================== piezas ===================== */
const V = [], F = [], LISTA = [];
let grupo = 'Modelo';
const o = n => { grupo = n; };
// VCOL guarda el color de cada vértice. Sirve para el OBJ multicolor: aparte
// del archivo .mtl, el color va escrito en la misma línea del vértice, así
// los programas que no leen el .mtl igual lo muestran de colores.
const VCOL = [];
let matActual = 'pasto';
const v = (x, y, z) => (V.push([x, y, z]), VCOL.push(MATS[matActual]), V.length);
const face = (m, ...ids) => F.push({ m, o: grupo, ids });
const n2 = x => (Math.round(x * 100) / 100);

// Una caja, colocada por su esquina. `largo` va a lo largo de la vía (eje X),
// `ancho` cruzando la vía (eje Z) y `alto` hacia arriba (eje Y).
// Las caras van en sentido antihorario vistas desde afuera, para que las
// normales apunten hacia afuera; si no, en Tinkercad y en las impresoras 3D
// la pieza puede salir del revés.
function caja(nombre, x, y, z, largo, alto, ancho, m) {
  matActual = m;
  const [x0, x1] = [x, x + largo], [y0, y1] = [y, y + alto], [z0, z1] = [z, z + ancho];
  const a = v(x0, y0, z0), b = v(x1, y0, z0), c = v(x1, y0, z1), d = v(x0, y0, z1);
  const e = v(x0, y1, z0), f = v(x1, y1, z0), g = v(x1, y1, z1), h = v(x0, y1, z1);
  face(m, h, g, f, e);   // arriba
  face(m, a, b, c, d);   // abajo
  face(m, a, e, f, b);   // atrás
  face(m, d, c, g, h);   // adelante
  face(m, b, f, g, c);   // derecha
  face(m, a, d, h, e);   // izquierda
  if (nombre) LISTA.push({ grupo, nombre, largo: n2(largo), ancho: n2(ancho), alto: n2(alto), y: n2(y) });
}
// la misma caja pero centrada en X y en Z (más cómodo para colocar cosas)
const cajaC = (nombre, cx, y, cz, largo, alto, ancho, m) =>
  caja(nombre, cx - largo / 2, y, cz - ancho / 2, largo, alto, ancho, m);

function carro(nombre, cx, y, cz, color) {
  cajaC(nombre, cx, y, cz, 4, 1, 2, color);            // el cuerpo
  cajaC(nombre && 'Cabina del carro', cx, y + 1, cz, 2, 0.8, 1.8, color);
}
function arbol(nombre, cx, cz) {
  cajaC(nombre, cx, 0.4, cz, 0.6, 3, 0.6, 'tronco');
  cajaC(nombre && 'Copa del árbol', cx, 3.4, cz, 3, 3, 3, 'copa');
}

/* =====================================================================
   EL MODELO — 90 m de largo (X) × 50 m de ancho (Z)

   Cruzando la vía, de un borde al otro:
     vereda · ciclovía · jardín · pista de siempre · mediana con las columnas ·
     Metropolitano (2 carriles + estación) · jardín · vereda

   La pista elevada mide justo lo mismo que la mediana y va encima de ella,
   así no tapa nada de lo de abajo y todo se puede ver.
===================================================================== */
const LARGO = 90, ANCHO = 50;
const X0 = -LARGO / 2, Z0 = -ANCHO / 2;
const ALTURA = 8;          // altura libre debajo de la pista elevada
const PISO = 0.4;          // grosor del pasto

/* --- 1. el terreno --- */
o('1. Terreno');
caja('Plancha de base', X0, -1, Z0, LARGO, 1, ANCHO, 'tierra');
caja('Pasto', X0, 0, Z0, LARGO, PISO, ANCHO, 'pasto');

/* --- 2. lo que va a nivel del piso: losas delgaditas sobre el pasto --- */
o('2. A nivel del piso');
caja('Vereda (x2, una en cada borde)', X0, PISO, -25, LARGO, 0.3, 3, 'concreto');
caja(null, X0, PISO, 22, LARGO, 0.3, 3, 'concreto');
caja('Ciclovía', X0, PISO, -22, LARGO, 0.3, 3, 'ciclovia');
caja('Pista de siempre (3 carriles)', X0, PISO, -16, LARGO, 0.3, 9, 'pista');
caja('Carril del Metropolitano (x2)', X0, PISO, 7, LARGO, 0.3, 4, 'pista');
caja(null, X0, PISO, 15, LARGO, 0.3, 4, 'pista');

/* --- 3. la estación del Metropolitano --- */
o('3. Estación del Metropolitano');
caja('Andén', -15, PISO, 11, 30, 1, 4, 'anden');
cajaC('Poste del techo (x2)', -12, PISO + 1, 13, 0.8, 3.5, 0.8, 'concreto');
cajaC(null, 12, PISO + 1, 13, 0.8, 3.5, 0.8, 'concreto');
caja('Techo de la estación', -16, PISO + 4.5, 10.5, 32, 0.6, 5, 'concreto');
cajaC('Bus del Metropolitano', -2, PISO, 9, 12, 3, 2.6, 'bus');

/* --- 4. las columnas, cada 25 m --- */
o('4. Columnas');
for (const [i, x] of [-25, 0, 25].entries()) {
  cajaC(i ? null : 'Base de la columna (x3)', x, PISO, 0, 5, 0.8, 5, 'concreto');
  cajaC(i ? null : 'Columna (x3)', x, PISO + 0.8, 0, 2.5, ALTURA - 1.8, 2.5, 'concreto');
  cajaC(i ? null : 'Palo cruzado (x3)', x, PISO + ALTURA - 1, 0, 3, 1, 14, 'concreto');
}

/* --- 5. la pista elevada --- */
o('5. Pista elevada');
const YP = PISO + ALTURA;
caja('Losa de la pista', X0 + 5, YP, -7, LARGO - 10, 1.5, 14, 'concreto');
caja('Barrera del borde (x2)', X0 + 5, YP + 1.5, -7, LARGO - 10, 1, 1, 'concreto');
caja(null, X0 + 5, YP + 1.5, 6, LARGO - 10, 1, 1, 'concreto');
caja('Barrera del medio', X0 + 5, YP + 1.5, -0.5, LARGO - 10, 0.8, 1, 'concreto');

/* --- 6. carros, para que se note el tamaño --- */
o('6. Carros');
carro('Carro (x6)', -25, YP + 1.5, -3.5, 'rojo');   // arriba, en la pista elevada
carro(null, 10, YP + 1.5, -3.5, 'azul');
carro(null, -5, YP + 1.5, 3.5, 'amarillo');
carro(null, 28, YP + 1.5, 3.5, 'rojo');
carro(null, -20, PISO, -13, 'azul');               // abajo, en la pista de siempre
carro(null, 15, PISO, -9.5, 'amarillo');

/* --- 7. árboles, en las dos franjas de jardín --- */
o('7. Árboles');
for (const [i, x] of [-35, -12, 12, 35].entries()) arbol(i ? null : 'Árbol (x7)', x, -17.5);
for (const x of [-28, 0, 28]) arbol(null, x, 20.5);

/* =====================================================================
   ARCHIVOS
===================================================================== */
mkdirSync(join(ROOT, 'modelo-3d'), { recursive: true });
const OUT = n => join(ROOT, 'modelo-3d', n);

/* ---------- OBJ para Tinkercad (sin colores) ---------- */
const objText = (() => {
  const L = ['# Vía Expresa Elevada — versión para Tinkercad (nivel principiante)',
    `# Proyecto de EPT · 1 unidad = 1 metro · mide ${LARGO} x ${ANCHO} unidades`,
    '# Tinkercad no lee archivos de color, así que este OBJ va sin ellos.', ''];
  for (const [x, y, z] of V) L.push(`v ${x.toFixed(2)} ${y.toFixed(2)} ${z.toFixed(2)}`);
  let g = null;
  for (const f of F) {
    if (f.o !== g) { L.push(`o ${f.o.replace(/[^\w]+/g, '_')}`); g = f.o; }
    L.push('f ' + f.ids.join(' '));
  }
  return L.join('\n') + '\n';
})();
writeFileSync(OUT('via-expresa-tinkercad.obj'), objText);

/* ---------- OBJ MULTICOLOR ----------
   Lleva los colores de dos maneras a la vez, para que se vean en el mayor
   número de programas posible:
     1. un archivo .mtl al lado, que es la forma normal en OBJ;
     2. el color escrito en la misma línea de cada vértice (v x y z r g b),
        que es lo que leen Blender y MeshLab aunque falte el .mtl.
   Aviso: Tinkercad no lee ninguna de las dos y lo va a mostrar de un solo
   color. Para tener colores ahí están los archivos por pieza, más abajo. */
const mtlText = (() => {
  const L = ['# Colores de la Vía Expresa Elevada', ''];
  for (const [n, [r, g, b]] of Object.entries(MATS))
    L.push(`newmtl ${n}`, `Kd ${r} ${g} ${b}`, 'Ka 0 0 0', 'Ks 0.03 0.03 0.03', 'Ns 8', 'd 1', '');
  return L.join('\n') + '\n';
})();
writeFileSync(OUT('via-expresa-tinkercad-color.mtl'), mtlText);

const objColor = (() => {
  const L = ['# Vía Expresa Elevada — versión multicolor',
    `# Proyecto de EPT · 1 unidad = 1 metro · mide ${LARGO} x ${ANCHO} unidades`,
    '# Los colores van en el .mtl de al lado y también en cada vértice.',
    '# Deja los dos archivos en la misma carpeta.',
    'mtllib via-expresa-tinkercad-color.mtl', ''];
  V.forEach(([x, y, z], i) => {
    const [r, g, b] = VCOL[i];
    L.push(`v ${x.toFixed(2)} ${y.toFixed(2)} ${z.toFixed(2)} ${r} ${g} ${b}`);
  });
  let g = null, m = null;
  for (const f of F) {
    if (f.o !== g) { L.push(`o ${f.o.replace(/[^\w]+/g, '_')}`); g = f.o; m = null; }
    if (f.m !== m) { L.push(`usemtl ${f.m}`); m = f.m; }
    L.push('f ' + f.ids.join(' '));
  }
  return L.join('\n') + '\n';
})();
writeFileSync(OUT('via-expresa-tinkercad-color.obj'), objColor);

/* ---------- un OBJ por color, para pintar dentro de Tinkercad ----------
   Tinkercad le pone un solo color a cada archivo que importas. Entonces la
   forma de tener la maqueta de colores es importar estas seis piezas por
   separado y pintar cada una con el balde de pintura. Se importan una encima
   de otra y calzan solas, porque todas usan las mismas coordenadas. */
const PIEZAS = {
  '1-terreno-y-pasto':  ['tierra', 'pasto'],
  '2-pistas':           ['pista'],
  '3-concreto':         ['concreto', 'anden'],
  '4-ciclovia':         ['ciclovia'],
  '5-carros-y-bus':     ['bus', 'rojo', 'azul', 'amarillo'],
  '6-arboles':          ['tronco', 'copa'],
};
mkdirSync(join(ROOT, 'modelo-3d', 'piezas-tinkercad'), { recursive: true });
for (const [nombre, materiales] of Object.entries(PIEZAS)) {
  const usa = new Set(materiales);
  const caras = F.filter(f => usa.has(f.m));
  // renumerar: cada archivo lleva solo los vértices que de verdad usa
  const mapa = new Map(), L = [];
  for (const f of caras) for (const id of f.ids)
    if (!mapa.has(id)) { mapa.set(id, mapa.size + 1); const [x, y, z] = V[id - 1]; L.push(`v ${x.toFixed(2)} ${y.toFixed(2)} ${z.toFixed(2)}`); }
  const cab = [`# Vía Expresa Elevada — pieza "${nombre}"`,
    '# Impórtala a Tinkercad y píntala con el balde de pintura.',
    '# Todas las piezas usan las mismas coordenadas, así que calzan solas.', ''];
  const cuerpo = caras.map(f => 'f ' + f.ids.map(id => mapa.get(id)).join(' '));
  writeFileSync(join(ROOT, 'modelo-3d', 'piezas-tinkercad', `${nombre}.obj`),
    cab.concat(L, '', cuerpo).join('\n') + '\n');
}

/* ---------- triángulos ---------- */
const porMaterial = new Map();
for (const f of F) {
  if (!porMaterial.has(f.m)) porMaterial.set(f.m, []);
  const t = porMaterial.get(f.m);
  for (let i = 2; i < f.ids.length; i++) t.push([f.ids[0] - 1, f.ids[i - 1] - 1, f.ids[i] - 1]);
}
const totalTris = [...porMaterial.values()].reduce((a, t) => a + t.length, 0);

/* ---------- STL ---------- */
{
  const buf = Buffer.alloc(84 + 50 * totalTris);
  buf.write('Via Expresa Elevada - version principiante', 0, 'ascii');
  buf.writeUInt32LE(totalTris, 80);
  let off = 84;
  for (const tris of porMaterial.values()) for (const [a, b, c] of tris) {
    const A = V[a], B = V[b], C = V[c];
    const ux = B[0] - A[0], uy = B[1] - A[1], uz = B[2] - A[2];
    const vx = C[0] - A[0], vy = C[1] - A[1], vz = C[2] - A[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const nl = Math.hypot(nx, ny, nz) || 1;
    buf.writeFloatLE(nx / nl, off); buf.writeFloatLE(ny / nl, off + 4); buf.writeFloatLE(nz / nl, off + 8);
    let p = off + 12;
    for (const P of [A, B, C]) { buf.writeFloatLE(P[0], p); buf.writeFloatLE(P[1], p + 4); buf.writeFloatLE(P[2], p + 8); p += 12; }
    buf.writeUInt16LE(0, off + 48);
    off += 50;
  }
  writeFileSync(OUT('via-expresa-tinkercad.stl'), buf);
}

/* ---------- GLB con colores ---------- */
{
  const bufs = [], accessors = [], bufferViews = [], materials = [], primitives = [];
  let offset = 0;
  for (const [nombre, tris] of porMaterial) {
    const data = new Float32Array(tris.length * 9);
    const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
    let k = 0;
    for (const t of tris) for (const idx of t) {
      const p = V[idx];
      for (let c = 0; c < 3; c++) { data[k++] = p[c]; if (p[c] < min[c]) min[c] = p[c]; if (p[c] > max[c]) max[c] = p[c]; }
    }
    const bytes = Buffer.from(data.buffer, data.byteOffset, data.byteLength);
    bufs.push(bytes);
    bufferViews.push({ buffer: 0, byteOffset: offset, byteLength: bytes.length, target: 34962 });
    accessors.push({ bufferView: bufferViews.length - 1, componentType: 5126, count: tris.length * 3, type: 'VEC3', min, max });
    const [r, g, b] = MATS[nombre];
    materials.push({ name: nombre, doubleSided: true, pbrMetallicRoughness: { baseColorFactor: [r, g, b, 1], metallicFactor: 0, roughnessFactor: 0.85 } });
    primitives.push({ attributes: { POSITION: accessors.length - 1 }, material: materials.length - 1, mode: 4 });
    offset += bytes.length;
  }
  const bin = Buffer.concat(bufs);
  const gltf = {
    asset: { version: '2.0', generator: 'genera-modelo-tinkercad.mjs — proyecto EPT' },
    scene: 0, scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0, name: 'ViaExpresaPrincipiante' }],
    meshes: [{ name: 'ViaExpresaPrincipiante', primitives }],
    materials, accessors, bufferViews, buffers: [{ byteLength: bin.length }],
  };
  const pad = (b, relleno) => b.length % 4 ? Buffer.concat([b, Buffer.alloc(4 - b.length % 4, relleno)]) : b;
  const json = pad(Buffer.from(JSON.stringify(gltf), 'utf8'), 0x20), binC = pad(bin, 0);
  const cab = (len, tipo) => { const b = Buffer.alloc(8); b.writeUInt32LE(len, 0); b.writeUInt32LE(tipo, 4); return b; };
  const head = Buffer.alloc(12);
  head.writeUInt32LE(0x46546C67, 0); head.writeUInt32LE(2, 4);
  head.writeUInt32LE(12 + 8 + json.length + 8 + binC.length, 8);
  writeFileSync(OUT('via-expresa-tinkercad.glb'),
    Buffer.concat([head, cab(json.length, 0x4E4F534A), json, cab(binC.length, 0x004E4942), binC]));
}

/* ---------- tabla de medidas ---------- */
const filas = LISTA.map(p => ({ ...p }));
{
  const L = ['# Medidas de la maqueta — Vía Expresa Elevada',
    '',
    `Todo está en **metros de la vida real**. El terreno mide ${LARGO} × ${ANCHO} m`,
    `y la pista elevada va a ${ALTURA} m de altura.`,
    '',
    'En Tinkercad: pones un **Box**, y en la casilla de medidas escribes',
    'Largo, Ancho y Alto tal cual salen acá. La columna "Altura desde el piso"',
    'te dice a qué altura levantarlo (en Tinkercad es la flechita negra de arriba).',
    ''];
  let g = null;
  for (const p of filas) {
    if (p.grupo !== g) {
      g = p.grupo;
      L.push('', `## ${g}`, '',
        '| Pieza | Largo | Ancho | Alto | Altura desde el piso |',
        '|---|---:|---:|---:|---:|');
    }
    L.push(`| ${p.nombre} | ${p.largo} m | ${p.ancho} m | ${p.alto} m | ${p.y} m |`);
  }
  L.push('', '---', '',
    `Generado por \`tools/genera-modelo-tinkercad.mjs\`. Si cambias una medida ahí,`,
    'esta tabla y los archivos 3D se actualizan juntos.', '');
  writeFileSync(OUT('medidas-tinkercad.md'), L.join('\n'));
}

/* ---------- meter la tabla y el OBJ en la página web ---------- */
{
  const htmlPath = join(ROOT, 'modelo-3d.html');
  let html = readFileSync(htmlPath, 'utf8');
  html = html.replace(/(<script id="objtk" type="text\/plain">)[\s\S]*?(<\/script>)/,
    `$1\n${objText}$2`);
  html = html.replace(/(<script id="objtkcolor" type="text\/plain">)[\s\S]*?(<\/script>)/,
    `$1\n${objColor}$2`);
  html = html.replace(/(<script id="mtltkcolor" type="text\/plain">)[\s\S]*?(<\/script>)/,
    `$1\n${mtlText}$2`);
  let g = null, t = [];
  for (const p of filas) {
    if (p.grupo !== g) {
      if (g) t.push('</tbody></table></div>');
      g = p.grupo;
      t.push(`<h3 style="margin-top:22px">${g.replace(/^\d+\.\s*/, '')}</h3>`,
        '<div class="tabla"><table><thead><tr><th>Pieza</th><th class="n">Largo</th>' +
        '<th class="n">Ancho</th><th class="n">Alto</th><th class="n">Altura desde el piso</th>' +
        '</tr></thead><tbody>');
    }
    t.push(`<tr><td>${p.nombre}</td><td class="n">${p.largo} m</td><td class="n">${p.ancho} m</td>` +
      `<td class="n">${p.alto} m</td><td class="n">${p.y} m</td></tr>`);
  }
  t.push('</tbody></table></div>');
  html = html.replace(/(<div id="tablaMedidas">)[\s\S]*?(<\/div><!--\/tablaMedidas-->)/,
    `$1\n${t.join('\n')}\n$2`);
  writeFileSync(htmlPath, html);
}

console.log(`Listo: ${F.length} caras, ${totalTris} triángulos, ${filas.length} tipos de pieza`);
console.log(`Terreno ${LARGO} x ${ANCHO} m · pista elevada a ${ALTURA} m de altura`);
