// Modelo 3D SIMPLE de la Vía Expresa Elevada.
// Un tramo corto y fácil de entender: la pista elevada sobre 3 columnas, y
// abajo el Metropolitano con su estación, la pista de siempre y la ciclovía.
//
// Uso:  node tools/genera-modelo-simple.mjs
// Genera OBJ + MTL (colores), GLB (colores incluidos en un solo archivo) y STL.
// 1 unidad = 1 metro. Eje Y hacia arriba.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/* ===================== colores ===================== */
const MATS = {
  pasto:     [0.44, 0.64, 0.29],
  base:      [0.36, 0.28, 0.19],   // el canto de la plancha de terreno
  asfalto:   [0.28, 0.30, 0.34],
  asfaltoBus:[0.22, 0.24, 0.27],
  linea:     [0.95, 0.96, 0.97],
  lineaAmar: [0.91, 0.76, 0.13],
  concreto:  [0.78, 0.80, 0.82],
  columna:   [0.72, 0.74, 0.76],
  barrera:   [0.86, 0.88, 0.90],
  anden:     [0.84, 0.85, 0.86],
  techo:     [0.90, 0.92, 0.94],
  poste:     [0.35, 0.38, 0.41],
  ciclovia:  [0.20, 0.52, 0.40],
  vereda:    [0.80, 0.78, 0.72],
  tronco:    [0.42, 0.31, 0.20],
  copa:      [0.28, 0.50, 0.24],
  busPlata:  [0.80, 0.81, 0.83],
  busFranja: [0.70, 0.24, 0.20],
  busVidrio: [0.22, 0.27, 0.32],
  rojo:      [0.75, 0.22, 0.19],
  azul:      [0.24, 0.42, 0.66],
  amarillo:  [0.93, 0.76, 0.14],
  blanco:    [0.90, 0.91, 0.92],
  gris:      [0.45, 0.49, 0.53],
  vidrio:    [0.30, 0.36, 0.42],
};

/* ===================== geometría ===================== */
const V = [];                  // vértices [x,y,z]
const F = [];                  // caras {m, o, ids[]}  (ids 1-based)
let grupo = 'Modelo';
const o = n => { grupo = n; };
const v = (x, y, z) => (V.push([x, y, z]), V.length);
const face = (m, ...ids) => F.push({ m, o: grupo, ids });

// Caja. Las caras van en sentido antihorario vistas desde afuera, que es como
// se sabe hacia dónde mira cada una: de eso dependen la luz en el GLB, las
// normales del STL y que el visor pueda descartar las caras que no se ven.
// `sinArriba` omite la cara superior. Se usa en las piezas que quedan justo
// debajo de otra (el palo cruzado bajo la losa): esa cara no se ve nunca y, si
// se dibuja, el visor a veces la pone encima de la pieza que la tapa.
function box(x0, x1, y0, y1, z0, z1, m, sinArriba = false) {
  const a = v(x0, y0, z0), b = v(x1, y0, z0), c = v(x1, y0, z1), d = v(x0, y0, z1);
  const e = v(x0, y1, z0), f = v(x1, y1, z0), g = v(x1, y1, z1), h = v(x0, y1, z1);
  if (!sinArriba) face(m, h, g, f, e);   // arriba   (+Y)
  face(m, a, b, c, d);   // abajo    (−Y)
  face(m, a, e, f, b);   // atrás    (−Z)
  face(m, d, c, g, h);   // adelante (+Z)
  face(m, b, f, g, c);   // derecha  (+X)
  face(m, a, d, h, e);   // izquierda(−X)
}
// franja plana sobre el terreno (pistas, líneas, jardines)
const piso = (x0, x1, z0, z1, m, y = 0.12) => box(x0, x1, y - 0.12, y, z0, z1, m);

// Caja larga: las caras de arriba y abajo van en cuadrícula y los costados en
// tiras. Dos motivos: el visor ordena las caras por distancia a la cámara y una
// cara de 90 m se ordena mal contra lo que tiene debajo; y hay que partir las
// caras, no la caja, porque cajas sueltas pegadas dejan paredes internas a la
// vista. `mArriba` pinta la cara superior de otro color (asfalto sobre la losa)
// sin necesidad de apilar una segunda caja, que es lo que hacía pelear las
// caras cuando quedaban a la misma altura.
function boxL(x0, x1, y0, y1, z0, z1, m, { mArriba = null, pasoX = 12, pasoZ = 1e9 } = {}) {
  for (let a = x0; a < x1 - 0.01; a += pasoX) {
    const b = Math.min(x1, a + pasoX);
    for (let c = z0; c < z1 - 0.01; c += pasoZ) {
      const d = Math.min(z1, c + pasoZ);
      face(mArriba || m, v(a, y1, d), v(b, y1, d), v(b, y1, c), v(a, y1, c));  // arriba
      face(m, v(a, y0, c), v(b, y0, c), v(b, y0, d), v(a, y0, d));             // abajo
    }
    face(m, v(a, y0, z0), v(a, y1, z0), v(b, y1, z0), v(b, y0, z0));  // lado z0
    face(m, v(a, y0, z1), v(b, y0, z1), v(b, y1, z1), v(a, y1, z1));  // lado z1
  }
  face(m, v(x1, y0, z0), v(x1, y1, z0), v(x1, y1, z1), v(x1, y0, z1));  // tapa x1
  face(m, v(x0, y0, z0), v(x0, y0, z1), v(x0, y1, z1), v(x0, y1, z0));  // tapa x0
}

function arbol(x, z, h = 6) {
  box(x - 0.3, x + 0.3, 0, h * 0.45, z - 0.3, z + 0.3, 'tronco');
  const r = h * 0.34;
  box(x - r, x + r, h * 0.42, h * 0.78, z - r, z + r, 'copa');
  box(x - r * 0.6, x + r * 0.6, h * 0.78, h, z - r * 0.6, z + r * 0.6, 'copa');
}
function carro(x, y, z, color, haciaX = true) {
  const L = 4.4, W = 1.9;
  const dx = haciaX ? L / 2 : W / 2, dz = haciaX ? W / 2 : L / 2;
  box(x - dx, x + dx, y + 0.3, y + 1.1, z - dz, z + dz, color);
  const cx = haciaX ? L / 4 : W / 4, cz = haciaX ? W / 4 : L / 4;
  box(x - cx, x + cx, y + 1.1, y + 1.65, z - cz, z + cz, 'vidrio');
}
function busArticulado(x, z) {
  for (const [a, b] of [[-9, -0.5], [0.5, 9]]) {
    box(x + a, x + b, 0.35, 3.2, z - 1.3, z + 1.3, 'busPlata');
    box(x + a + 0.4, x + b - 0.4, 1.9, 2.8, z - 1.35, z + 1.35, 'busVidrio');
    box(x + a + 0.3, x + b - 0.3, 1.0, 1.4, z - 1.36, z + 1.36, 'busFranja');
  }
}

/* =====================================================================
   LA ESCENA — 96 m de largo (X) × 46 m de ancho (Z)
   La pista elevada va a lo largo de X, centrada en Z = 0.
===================================================================== */
const X0 = -48, X1 = 48, Z0 = -23, Z1 = 23;
const ALTO = 8;            // alto libre bajo la pista
const ANCHO = 10;          // media pista (20 m en total)

/* --- terreno --- */
o('Terreno');
box(X0, X1, -1.2, 0, Z0, Z1, 'base');
piso(X0, X1, Z0, Z1, 'pasto', 0.02);

/* --- lo que hay a nivel del piso --- */
o('CorredorVial');
piso(X0, X1, -4, 4, 'pasto');                 // jardín central (van las columnas)
piso(X0, X1, 4, 7, 'asfaltoBus');             // carril del Metropolitano →
piso(X0, X1, 7, 9.5, 'anden');                // estación
piso(X0, X1, 9.5, 12.5, 'asfaltoBus');        // carril del Metropolitano ←
piso(X0, X1, 13.5, 22.5, 'asfalto');          // pista de siempre (3 carriles)
piso(X0, X1, -13, -4, 'asfalto');             // pista del otro lado
piso(X0, X1, -16, -13, 'pasto');              // jardín
piso(X0, X1, -19, -16, 'ciclovia');           // ciclovía
piso(X0, X1, -22, -19, 'vereda');             // vereda
// líneas de las pistas
for (const z of [-10, -7, 16.5, 19.5]) for (let x = X0 + 3; x < X1 - 3; x += 9) piso(x, x + 4, z - 0.15, z + 0.15, 'linea', 0.14);
for (const z of [-13, -4, 13.5, 22.5]) piso(X0, X1, z - 0.15, z + 0.15, 'linea', 0.14);
// bordes amarillos del andén
for (const z of [7.3, 9.2]) piso(X0 + 2, X1 - 2, z - 0.15, z + 0.15, 'lineaAmar', 1.2);
/* --- estación del Metropolitano --- */
o('Estacion');
boxL(X0, X1, 0, 0.9, 12.5, 13.2, 'barrera');   // separador con la pista
boxL(-16, 16, 0, 1.1, 7, 9.5, 'anden', { pasoX: 8 });
for (const x of [-13, -4.5, 4.5, 13]) box(x - 0.25, x + 0.25, 1.1, 4, 8.15, 8.65, 'poste');
boxL(-17, 17, 4, 4.5, 6.6, 9.9, 'techo', { pasoX: 8 });

/* --- las columnas (van con lo que está a ras de piso) --- */
o('Columnas');
for (const x of [-30, 0, 30]) {
  box(x - 2.8, x + 2.8, 0, 0.7, -2.8, 2.8, 'columna');                  // base
  box(x - 1.5, x + 1.5, 0.7, ALTO - 1.8, -1.5, 1.5, 'columna', true);   // columna
  box(x - 1.4, x + 1.4, ALTO - 1.8, ALTO - 0.4, -9, 9, 'columna', true);// palo cruzado
}
/* --- la pista elevada. Va en su propio grupo porque el visor la pinta al
   final: está por encima de todo lo demás y así nada se le asoma. --- */
o('ViaElevada');
// La pista: una losa maciza de 2 m de canto, con el asfalto como cara de
// arriba. En la maqueta de cartón esto son las baja lenguas más el cartón
// pegado encima; acá va de una sola pieza para que quede simple.
const YP = ALTO + 1.7;
boxL(X0 + 3, X1 - 3, ALTO - 0.4, YP, -ANCHO, ANCHO, 'concreto', { mArriba: 'asfalto', pasoX: 8, pasoZ: 5 });

/* --- lo que se apoya SOBRE la losa. Grupo aparte porque el visor lo pinta
   después de ella; si no, la losa tapaba la base de las barreras. --- */
o('ViaElevadaEncima');
// barreras: las dos de los bordes y la del medio (metidas 10 cm en la losa)
boxL(X0 + 3, X1 - 3, YP - 0.1, YP + 1.1, -ANCHO, -ANCHO + 0.9, 'barrera');
boxL(X0 + 3, X1 - 3, YP - 0.1, YP + 1.1, ANCHO - 0.9, ANCHO, 'barrera');
boxL(X0 + 3, X1 - 3, YP - 0.1, YP + 0.9, -0.5, 0.5, 'barrera');
// líneas de los carriles
for (const z of [-8.6, 8.6]) boxL(X0 + 4, X1 - 4, YP - 0.02, YP + 0.06, z - 0.15, z + 0.15, 'linea', { pasoX: 8 });
for (const z of [-4.7, 4.7]) for (let x = X0 + 5; x < X1 - 5; x += 9) box(x, x + 4, YP - 0.02, YP + 0.06, z - 0.15, z + 0.15, 'linea');
// dos postes de luz en la barrera del medio
for (const x of [-22, 22]) {
  box(x - 0.2, x + 0.2, ALTO + 2.5, ALTO + 7, -0.2, 0.2, 'poste');
  box(x - 0.2, x + 0.2, ALTO + 6.8, ALTO + 7, -2.6, 2.6, 'poste');
  for (const z of [-2.4, 2.4]) box(x - 0.5, x + 0.5, ALTO + 6.5, ALTO + 6.8, z - 0.5, z + 0.5, 'amarillo');
}

// los carros de arriba van con la pista, en la misma pasada de dibujo
carro(-34, YP, -6.8, 'blanco'); carro(-6, YP, -2.6, 'rojo'); carro(26, YP, -6.8, 'azul');
carro(-20, YP, 2.6, 'amarillo'); carro(12, YP, 6.8, 'blanco'); carro(38, YP, 2.6, 'gris');

/* --- carros y buses de abajo --- */
o('Vehiculos');
carro(-28, 0.12, -11, 'rojo'); carro(4, 0.12, -6, 'blanco'); carro(30, 0.12, -11, 'gris');
carro(-14, 0.12, 15.5, 'azul'); carro(20, 0.12, 20.5, 'amarillo');
// el bus del Metropolitano parado en la estación
busArticulado(0, 5.5);
busArticulado(34, 11);

/* --- árboles --- */
o('Arboles');
for (const x of [-40, -24, -8, 8, 24, 40]) arbol(x, -14.5, 6);
for (const x of [-34, -12, 10, 36]) arbol(x, -21, 5.5);

/* =====================================================================
   ARCHIVOS
===================================================================== */
mkdirSync(join(ROOT, 'modelo-3d'), { recursive: true });
const OUT = n => join(ROOT, 'modelo-3d', n);

/* ---------- MTL ---------- */
const mtl = ['# Vía Expresa Elevada (versión simple) — colores', ''];
for (const [n, [r, g, b]] of Object.entries(MATS))
  mtl.push(`newmtl ${n}`, `Kd ${r} ${g} ${b}`, 'Ka 0 0 0', 'Ks 0.03 0.03 0.03', 'Ns 8', 'd 1', '');
const mtlText = mtl.join('\n') + '\n';
writeFileSync(OUT('via-expresa-simple.mtl'), mtlText);

/* ---------- OBJ ---------- */
function buildObj(conColores) {
  const L = ['# Vía Expresa Elevada — versión simple',
    '# Proyecto de EPT 2026 · 1 unidad = 1 metro',
    conColores ? 'mtllib via-expresa-simple.mtl' : '# (sin archivo de colores, para Tinkercad)', ''];
  for (const [x, y, z] of V) L.push(`v ${x.toFixed(2)} ${y.toFixed(2)} ${z.toFixed(2)}`);
  let go = null, gm = null;
  for (const f of F) {
    if (f.o !== go) { L.push(`o ${f.o}`); go = f.o; gm = null; }
    if (conColores && f.m !== gm) { L.push(`usemtl ${f.m}`); gm = f.m; }
    L.push('f ' + f.ids.join(' '));
  }
  return L.join('\n') + '\n';
}
const objText = buildObj(true);
writeFileSync(OUT('via-expresa-simple.obj'), objText);
writeFileSync(OUT('via-expresa-simple-tinkercad.obj'), buildObj(false));

/* ---------- triángulos (para GLB y STL) ---------- */
const porMaterial = new Map();
for (const f of F) {
  if (!porMaterial.has(f.m)) porMaterial.set(f.m, []);
  const t = porMaterial.get(f.m);
  for (let i = 2; i < f.ids.length; i++) t.push([f.ids[0] - 1, f.ids[i - 1] - 1, f.ids[i] - 1]);
}
const totalTris = [...porMaterial.values()].reduce((a, t) => a + t.length, 0);

/* ---------- GLB: un solo archivo, con los colores adentro ---------- */
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
    asset: { version: '2.0', generator: 'genera-modelo-simple.mjs — proyecto EPT 2026' },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0, name: 'ViaExpresaElevada' }],
    meshes: [{ name: 'ViaExpresaElevada', primitives }],
    materials, accessors, bufferViews,
    buffers: [{ byteLength: bin.length }],
  };
  const pad = (b, relleno) => b.length % 4 ? Buffer.concat([b, Buffer.alloc(4 - b.length % 4, relleno)]) : b;
  const jsonChunk = pad(Buffer.from(JSON.stringify(gltf), 'utf8'), 0x20);
  const binChunk = pad(bin, 0);
  const cab = (len, tipo) => { const b = Buffer.alloc(8); b.writeUInt32LE(len, 0); b.writeUInt32LE(tipo, 4); return b; };
  const head = Buffer.alloc(12);
  head.writeUInt32LE(0x46546C67, 0); head.writeUInt32LE(2, 4);
  head.writeUInt32LE(12 + 8 + jsonChunk.length + 8 + binChunk.length, 8);
  const glb = Buffer.concat([head, cab(jsonChunk.length, 0x4E4F534A), jsonChunk, cab(binChunk.length, 0x004E4942), binChunk]);
  writeFileSync(OUT('via-expresa-simple.glb'), glb);
  console.log(`GLB: ${(glb.length / 1024).toFixed(0)} KB (colores incluidos)`);
}

/* ---------- STL ---------- */
{
  const buf = Buffer.alloc(84 + 50 * totalTris);
  buf.write('Via Expresa Elevada simple - EPT 2026', 0, 'ascii');
  buf.writeUInt32LE(totalTris, 80);
  let off = 84;
  for (const tris of porMaterial.values()) for (const [a, b2, c] of tris) {
    const A = V[a], B = V[b2], C = V[c];
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
  writeFileSync(OUT('via-expresa-simple.stl'), buf);
}

/* ---------- inyectar en el visor ---------- */
const htmlPath = join(ROOT, 'modelo-3d.html');
let html = readFileSync(htmlPath, 'utf8');
html = html.replace(/(<script id="objdata" type="text\/plain">)[\s\S]*?(<\/script>)/, `$1\n${objText}$2`);
html = html.replace(/(<script id="mtldata" type="text\/plain">)[\s\S]*?(<\/script>)/, `$1\n${mtlText}$2`);
const glbB64 = readFileSync(OUT('via-expresa-simple.glb')).toString('base64');
html = html.replace(/(<script id="glbdata" type="text\/plain">)[\s\S]*?(<\/script>)/, `$1\n${glbB64}\n$2`);
writeFileSync(htmlPath, html);

console.log(`OBJ: ${V.length} vértices, ${F.length} caras, ${totalTris} triángulos (${(objText.length / 1024).toFixed(0)} KB)`);
