// Genera el modelo 3D del intercambio "Vía Expresa Elevada" en formato OBJ/MTL
// y lo inyecta en modelo-3d.html para el visor integrado.
//
// Uso:  node tools/genera-modelo-3d.mjs
// Unidades: 1 unidad = 1 metro. Eje Y hacia arriba.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/* ================= materiales ================= */
const MATS = {
  base:         [0.38, 0.29, 0.20],
  terreno:      [0.44, 0.62, 0.33],
  agua:         [0.15, 0.45, 0.42],
  aguaOrilla:   [0.55, 0.68, 0.45],
  asfalto:      [0.26, 0.28, 0.31],
  asfaltoBus:   [0.20, 0.22, 0.25],
  asfaltoDeck:  [0.29, 0.31, 0.35],
  lineaBlanca:  [0.93, 0.94, 0.95],
  lineaAmarilla:[0.90, 0.76, 0.12],
  concreto:     [0.76, 0.78, 0.80],
  concretoCol:  [0.70, 0.72, 0.74],
  barrera:      [0.82, 0.84, 0.86],
  vereda:       [0.80, 0.78, 0.71],
  ciclovia:     [0.22, 0.51, 0.40],
  anden:        [0.85, 0.86, 0.87],
  techo:        [0.92, 0.93, 0.95],
  metal:        [0.36, 0.39, 0.42],
  tronco:       [0.44, 0.34, 0.23],
  copa:         [0.28, 0.48, 0.24],
  copaClara:    [0.36, 0.56, 0.28],
  palma:        [0.25, 0.52, 0.28],
  edificio:     [0.68, 0.70, 0.72],
  edificio2:    [0.61, 0.63, 0.66],
  edificioTecho:[0.55, 0.56, 0.58],
  busPlata:     [0.79, 0.80, 0.82],
  busFranja:    [0.66, 0.28, 0.24],
  autoBlanco:   [0.88, 0.89, 0.90],
  autoRojo:     [0.69, 0.26, 0.23],
  autoAzul:     [0.33, 0.47, 0.62],
  autoAmarillo: [0.90, 0.75, 0.13],
  autoGris:     [0.52, 0.56, 0.60],
};

/* ================= acumuladores OBJ ================= */
const V = [];                 // vértices [x,y,z]
const F = [];                 // caras {m, o, ids[]}
let currentO = 'Escena';
const o = name => { currentO = name; };
const v = (x, y, z) => { V.push([x, y, z]); return V.length; };
const face = (m, ...ids) => { F.push({ m, o: currentO, ids }); };

function box(x0, x1, y0, y1, z0, z1, m, mTop) {
  const a = v(x0, y0, z0), b = v(x1, y0, z0), c = v(x1, y0, z1), d = v(x0, y0, z1);
  const e = v(x0, y1, z0), f = v(x1, y1, z0), g = v(x1, y1, z1), h = v(x0, y1, z1);
  face(mTop || m, e, f, g, h);       // techo
  face(m, a, d, c, b);               // base
  face(m, a, b, f, e);               // z0
  face(m, c, d, h, g);               // z1
  face(m, b, c, g, f);               // x1
  face(m, d, a, e, h);               // x0
}
// capa plana delgada (para pistas y marcas). Divide superficies grandes en
// mosaicos ≤ 24 m: el visor ordena las caras por profundidad (algoritmo del
// pintor) y las caras enormes se ordenan mal.
function slab(x0, x1, z0, z1, yTop, m, t = 0.1) {
  if (x0 > x1) [x0, x1] = [x1, x0];
  if (z0 > z1) [z0, z1] = [z1, z0];
  const MAX = 24;
  for (let xa = x0; xa < x1; xa += MAX) {
    const xb = Math.min(x1, xa + MAX);
    for (let za = z0; za < z1; za += MAX) {
      box(xa, xb, yTop - t, yTop, za, Math.min(z1, za + MAX), m, m);
    }
  }
}

function cylinder(cx, cz, y0, y1, r, m, seg = 8) {
  const bot = [], top = [];
  for (let i = 0; i < seg; i++) {
    const a = i / seg * Math.PI * 2;
    bot.push(v(cx + Math.cos(a) * r, y0, cz + Math.sin(a) * r));
    top.push(v(cx + Math.cos(a) * r, y1, cz + Math.sin(a) * r));
  }
  for (let i = 0; i < seg; i++) {
    const j = (i + 1) % seg;
    face(m, bot[i], bot[j], top[j], top[i]);
  }
  face(m, ...top.slice().reverse());
}

/* ================= barrido de cintas (rampas y avenida) ================= */
function sweep(samples, half, thick, mTop, mSide) {
  const n = samples.length, rows = [];
  for (let i = 0; i < n; i++) {
    const a = samples[Math.max(0, i - 1)], b = samples[Math.min(n - 1, i + 1)];
    let dx = b.x - a.x, dz = b.z - a.z;
    const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
    const nx = -dz, nz = dx, p = samples[i];
    rows.push({
      Lt: v(p.x + nx * half, p.y, p.z + nz * half),
      Rt: v(p.x - nx * half, p.y, p.z - nz * half),
      Lb: v(p.x + nx * half, p.y - thick, p.z + nz * half),
      Rb: v(p.x - nx * half, p.y - thick, p.z - nz * half),
    });
  }
  for (let i = 0; i < n - 1; i++) {
    const r = rows[i], s = rows[i + 1];
    face(mTop, r.Lt, s.Lt, s.Rt, r.Rt);
    face(mSide, r.Lb, r.Rb, s.Rb, s.Lb);
    face(mSide, r.Lt, r.Lb, s.Lb, s.Lt);
    face(mSide, r.Rt, s.Rt, s.Rb, r.Rb);
  }
  const r0 = rows[0], rn = rows[n - 1];
  face(mSide, r0.Lt, r0.Rt, r0.Rb, r0.Lb);
  face(mSide, rn.Lt, rn.Lb, rn.Rb, rn.Rt);
  return rows;
}
function offsetSamples(samples, off, dy = 0) {
  const n = samples.length, out = [];
  for (let i = 0; i < n; i++) {
    const a = samples[Math.max(0, i - 1)], b = samples[Math.min(n - 1, i + 1)];
    let dx = b.x - a.x, dz = b.z - a.z;
    const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
    const p = samples[i];
    out.push({ x: p.x - dz * off, y: p.y + dy, z: p.z + dx * off });
  }
  return out;
}

/* ================= vegetación y vehículos ================= */
function arbol(x, z, h = 6, m = 'copa') {
  cylinder(x, z, 0, h * 0.45, 0.35, 'tronco', 6);
  const r = h * 0.38, cy = h * 0.68;
  const rings = [[cy - r, 0.4 * r], [cy - r * 0.35, r], [cy + r * 0.45, 0.75 * r]];
  let prev = null;
  for (const [y, rr] of rings) {
    const ring = [];
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * Math.PI * 2 + 0.3;
      ring.push(v(x + Math.cos(a) * rr, y, z + Math.sin(a) * rr));
    }
    if (prev) for (let i = 0; i < 6; i++) face(m, prev[i], prev[(i + 1) % 6], ring[(i + 1) % 6], ring[i]);
    prev = ring;
  }
  const apex = v(x, cy + r, z);
  for (let i = 0; i < 6; i++) face(m, prev[i], prev[(i + 1) % 6], apex);
}
function palmera(x, z, h = 7) {
  cylinder(x, z, 0, h, 0.28, 'tronco', 6);
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * Math.PI * 2, dx = Math.cos(a), dz = Math.sin(a);
    const p1 = v(x, h, z);
    const p2 = v(x + dx * 1.6, h + 0.7, z + dz * 1.6);
    const p3 = v(x + dx * 3.4, h - 0.6, z + dz * 3.4);
    const p2b = v(x + dx * 1.6 - dz * 0.5, h + 0.55, z + dz * 1.6 + dx * 0.5);
    const p3b = v(x + dx * 3.2 - dz * 0.6, h - 0.7, z + dz * 3.2 + dx * 0.6);
    face('palma', p1, p2, p3);
    face('palma', p1, p2b, p3b);
  }
}
function auto(x, y, z, m, along = 'x') {
  const L = 4.4, W = 1.9;
  const dx = along === 'x' ? L / 2 : W / 2, dz = along === 'x' ? W / 2 : L / 2;
  box(x - dx, x + dx, y + 0.25, y + 1.05, z - dz, z + dz, m);
  const cdx = along === 'x' ? L / 4 : W / 4 - 0.1, cdz = along === 'x' ? W / 4 + 0.35 : L / 4;
  box(x - cdx, x + cdx, y + 1.05, y + 1.6, z - cdz, z + cdz, m);
}
function busArticulado(x, y, z) {
  box(x - 9, x - 0.4, y + 0.3, y + 3.1, z - 1.25, z + 1.25, 'busPlata');
  box(x + 0.4, x + 9, y + 0.3, y + 3.1, z - 1.25, z + 1.25, 'busPlata');
  box(x - 0.5, x + 0.5, y + 0.5, y + 2.9, z - 1.1, z + 1.1, 'busFranja');
}

/* =====================================================================
   ESCENA — terreno 260 × 170 m centrado en el origen
   Corredor principal en X · Avenida que cruza (puente) en Z, x = 33..47
===================================================================== */
const X0 = -130, X1 = 130, Z0 = -85, Z1 = 85;

o('Terreno');
{
  const yB = -2.5;
  // césped en mosaicos (caras pequeñas se ordenan bien en el visor)
  for (let x = X0; x < X1; x += 20) for (let z = Z0; z < Z1; z += 17) {
    const a = v(x, 0, z), b = v(Math.min(X1, x + 20), 0, z);
    const c = v(Math.min(X1, x + 20), 0, Math.min(Z1, z + 17)), d = v(x, 0, Math.min(Z1, z + 17));
    face('terreno', a, d, c, b);
  }
  // costados con material "base": el visor los recorta cuando dan la espalda
  // a la cámara, así que el orden de las normales importa (hacia afuera)
  const sides = [
    [[X0, Z0], [X1, Z0], [0, -1]],   // borde norte
    [[X1, Z0], [X1, Z1], [1, 0]],    // borde este
    [[X1, Z1], [X0, Z1], [0, 1]],    // borde sur
    [[X0, Z1], [X0, Z0], [-1, 0]],   // borde oeste
  ];
  for (const [[xa, za], [xb, zb], [ox, oz]] of sides) {
    const steps = Math.ceil(Math.hypot(xb - xa, zb - za) / 40);
    for (let s = 0; s < steps; s++) {
      const t0 = s / steps, t1 = (s + 1) / steps;
      const A = v(xa + (xb - xa) * t0, 0, za + (zb - za) * t0);
      const B = v(xa + (xb - xa) * t1, 0, za + (zb - za) * t1);
      const C = v(xa + (xb - xa) * t1, yB, za + (zb - za) * t1);
      const D = v(xa + (xb - xa) * t0, yB, za + (zb - za) * t0);
      // orientar la cara con la normal hacia (ox, 0, oz)
      const nX = (zb - za), nZ = -(xb - xa);            // normal de A→B→C→D
      if (nX * ox + nZ * oz >= 0) face('base', A, B, C, D);
      else face('base', D, C, B, A);
    }
  }
  // fondo con la normal hacia abajo (cierra el sólido para impresión 3D)
  for (let x = X0; x < X1; x += 65) for (let z = Z0; z < Z1; z += 45) {
    const x2 = Math.min(X1, x + 65), z2 = Math.min(Z1, z + 45);
    const a = v(x, yB, z), b = v(x2, yB, z), c = v(x2, yB, z2), d = v(x, yB, z2);
    face('base', a, b, c, d);
  }
}

o('Lagunas');
function laguna(cx, cz, rx, rz) {
  const N = 18;
  const ptsAt = (f, y) => {
    const arr = [];
    for (let i = 0; i < N; i++) {
      const a = i / N * Math.PI * 2;
      arr.push(v(cx + Math.sign(Math.cos(a)) * Math.abs(Math.cos(a)) ** 0.72 * rx * f, y,
                 cz + Math.sign(Math.sin(a)) * Math.abs(Math.sin(a)) ** 0.72 * rz * f));
    }
    return arr;
  };
  const sO = ptsAt(1.10, 0.05), sI = ptsAt(0.96, 0.05);       // orilla
  for (let i = 0; i < N; i++) { const j = (i + 1) % N; face('aguaOrilla', sO[i], sO[j], sI[j], sI[i]); }
  const rings = [ptsAt(1.0, 0.09), ptsAt(0.66, 0.09), ptsAt(0.33, 0.09)]; // agua por anillos
  for (let r = 0; r < rings.length - 1; r++)
    for (let i = 0; i < N; i++) { const j = (i + 1) % N; face('agua', rings[r][i], rings[r][j], rings[r + 1][j], rings[r + 1][i]); }
  const c = v(cx, 0.09, cz), last = rings[rings.length - 1];
  for (let i = 0; i < N; i++) face('agua', last[i], last[(i + 1) % N], c);
}
laguna(-88, -60, 34, 19);   // laguna noroeste
laguna(92, 58, 30, 21);     // laguna sureste

/* ---------- corredor a nivel (franjas) ---------- */
o('CorredorVial');
slab(X0, X1, -24, -21, 0.12, 'vereda');
slab(X0, X1, -17, -8, 0.10, 'asfalto');       // calzada norte
slab(X0, X1, -8, -5, 0.10, 'asfaltoBus');     // carril Metropolitano
slab(X0, X1, -5, 5, 0.12, 'terreno');         // mediana verde
slab(X0, X1, 5, 8, 0.10, 'asfaltoBus');
slab(X0, X1, 8, 17, 0.10, 'asfalto');         // calzada sur
slab(X0, X1, 19, 21.5, 0.12, 'ciclovia');
slab(X0, X1, 21.5, 24, 0.12, 'vereda');
// líneas de borde
for (const z of [-16.6, -8.4, 8.4, 16.6]) slab(X0, X1, z - 0.18, z + 0.18, 0.16, 'lineaBlanca');
// carriles discontinuos
for (const z of [-14, -11, 11, 14]) for (let x = X0 + 4; x < X1 - 4; x += 9) slab(x, x + 3.6, z - 0.15, z + 0.15, 0.16, 'lineaBlanca');

/* ---------- estación del Metropolitano (andenes laterales) ---------- */
o('EstacionMetropolitano');
for (const s of [-1, 1]) {
  slab(-18, 18, s * 2.6, s * 4.3, 1.1, 'anden', 1.1);
  slab(-17.6, 17.6, s * 4.15, s * 3.95, 1.16, 'lineaAmarilla', 0.05);
  for (const x of [-15, -5, 5, 15]) cylinder(x, s * 3.45, 1.1, 4.3, 0.22, 'metal', 6);
  slab(-19, 19, s * 2.3, s * 4.6, 4.7, 'techo', 0.4);
}

/* ---------- viaducto principal (nivel +13.5) ---------- */
o('ViaductoPrincipal');
const DY = 13.5;                                     // cota superior del tablero
for (let x = X0; x < X1; x += 20) {                  // por segmentos de 20 m
  const xb = Math.min(X1, x + 20);
  box(x, xb, DY - 1.6, DY - 0.35, -9.6, 9.6, 'concreto');        // vigas/estructura
  box(x, xb, DY - 0.35, DY, -10, 10, 'concreto', 'asfaltoDeck'); // losa + asfalto
  box(x, xb, DY, DY + 1.05, -10, -9.35, 'barrera');              // barrera norte
  box(x, xb, DY, DY + 1.05, 9.35, 10, 'barrera');                // barrera sur
  box(x, xb, DY, DY + 0.95, -0.4, 0.4, 'barrera');               // barrera central
}
for (const z of [-8.9, 8.9]) slab(X0 + 1, X1 - 1, z - 0.16, z + 0.16, DY + 0.03, 'lineaBlanca', 0.05);
for (const z of [-4.9, 4.9]) for (let x = X0 + 5; x < X1 - 5; x += 9) slab(x, x + 3.6, z - 0.15, z + 0.15, DY + 0.03, 'lineaBlanca', 0.05);
o('ColumnasViaducto');
for (let x = -120; x <= 120; x += 30) {
  box(x - 2.6, x + 2.6, 0, 0.6, -2.7, 2.7, 'concretoCol');       // zapata
  cylinder(x, 0, 0.6, DY - 3.1, 1.5, 'concretoCol', 10);         // columna
  box(x - 1.4, x + 1.4, DY - 3.1, DY - 1.6, -9.2, 9.2, 'concretoCol'); // viga cabezal
}

/* ---------- avenida que cruza (puente sobre el corredor) ---------- */
o('AvenidaCruce');
const yAve = z => { const a = Math.abs(z); return a <= 40 ? 7 : Math.max(0.15, 7 * (85 - a) / 45); };
const aveSamples = [];
for (let z = Z0; z <= Z1; z += 5) aveSamples.push({ x: 40, y: yAve(z) + 0.55, z });
sweep(aveSamples, 7, 1.25, 'asfaltoDeck', 'concreto');
for (const off of [6.6, -6.6]) sweep(offsetSamples(aveSamples, off, 0.95), 0.4, 1.0, 'barrera', 'barrera');
for (let z = Z0 + 6; z < Z1 - 8; z += 9)
  slab(39.8, 40.2, z, z + 3.6, yAve(z + 1.8) + 0.62, 'lineaBlanca', 0.05);
o('ColumnasAvenida');
for (const z of [0, -30, -42, -54, -66, 30, 42, 54, 66]) {
  const h = yAve(z) - 0.7; if (h < 1) continue;
  for (const cx of [35.5, 44.5]) cylinder(cx, z, 0, h, 0.9, 'concretoCol', 8);
}

/* ---------- rampas curvas (los "lazos" de la foto) ---------- */
o('RampasCurvas');
const bez = (P0, P1, P2, P3, t) => {
  const u = 1 - t, a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
  return { x: a * P0[0] + b * P1[0] + c * P2[0] + d * P3[0], z: a * P0[1] + b * P1[1] + c * P2[1] + d * P3[1] };
};
const smooth = t => t * t * (3 - 2 * t);
function rampa(P0, P1, P2, P3, y0, y1) {
  const S = [];
  for (let i = 0; i <= 22; i++) {
    const t = i / 22, p = bez(P0, P1, P2, P3, t);
    S.push({ x: p.x, y: y0 + (y1 - y0) * smooth(t), z: p.z });
  }
  sweep(S, 4, 1.2, 'asfaltoDeck', 'concreto');
  for (const off of [3.7, -3.7]) sweep(offsetSamples(S, off, 0.9), 0.35, 1.0, 'barrera', 'barrera');
  for (const t of [0.36, 0.55, 0.8]) {
    const p = bez(P0, P1, P2, P3, t), y = y0 + (y1 - y0) * smooth(t);
    cylinder(p.x, p.z, 0, y - 1.4, 1.0, 'concretoCol', 8);
  }
}
rampa([100, -9], [72, -9], [51, -46], [51, -72], DY, yAve(72) + 0.55);   // viaducto → avenida (norte)
rampa([-20, 9], [8, 9], [29, 46], [29, 72], DY, yAve(72) + 0.55);        // viaducto → avenida (sur)

/* ---------- vegetación ---------- */
o('Vegetacion');
for (let x = -120; x <= 120; x += 24) { if (x > 24 && x < 58) continue; palmera(x, -22.5, 6.5 + (x % 48 === 0 ? 1 : 0)); palmera(x + 10, 22.5, 7); }
const arboles = [
  [-38, -32, 7], [-18, -40, 6], [-52, -30, 5.5], [-30, -70, 7], [-14, -58, 6],
  [70, -74, 7], [96, -78, 6], [118, -46, 6.5], [112, -70, 5.5], [60, -60, 6],
  [-118, 36, 7], [-96, 52, 6], [-72, 34, 6.5], [-48, 64, 7], [-24, 42, 6], [-64, 74, 5.5], [-108, 74, 6.5],
  [24, 62, 6], [20, 78, 6.5], [56, 36, 5.5], [124, 34, 6],
];
arboles.forEach(([x, z, h], i) => arbol(x, z, h, i % 3 === 2 ? 'copaClara' : 'copa'));

/* ---------- edificios de contexto ---------- */
o('Edificios');
const eds = [[-122, -80, 13, 10, 9], [-104, -76, 11, 9, 15], [-86, -81, 14, 9, 7], [-64, -77, 12, 10, 12], [-44, -80, 12, 8, 8], [-24, -76, 10, 9, 17], [-6, -81, 12, 8, 7], [-122, 70, 11, 9, 6], [-102, 74, 12, 8, 9], [122, -80, 10, 8, 11]];
for (const [x, z, w, d, h] of eds) box(x, x + w, 0, h, z, z + d, (x + z) % 3 ? 'edificio' : 'edificio2', 'edificioTecho');

/* ---------- vehículos ---------- */
o('Vehiculos');
auto(-95, DY, -6.8, 'autoRojo'); auto(-40, DY, -2.6, 'autoBlanco'); auto(25, DY, -7, 'autoGris');
auto(85, DY, -2.8, 'autoAzul'); auto(-70, DY, 2.8, 'autoAmarillo'); auto(0, DY, 6.9, 'autoBlanco'); auto(105, DY, 7.1, 'autoRojo');
auto(-110, 0.1, -14.5, 'autoBlanco'); auto(-80, 0.1, -11, 'autoAmarillo'); auto(-15, 0.1, -14, 'autoAzul');
auto(55, 0.1, 11, 'autoRojo'); auto(90, 0.1, 14.3, 'autoGris'); auto(-55, 0.1, 13.8, 'autoBlanco');
auto(40, yAve(-58) + 0.65, -58, 'autoBlanco', 'z'); auto(43.5, yAve(62) + 0.65, 62, 'autoRojo', 'z'); auto(36.5, yAve(74) + 0.65, 74, 'autoAzul', 'z');
busArticulado(-60, 0.1, -6.5); busArticulado(18, 0.1, 6.5);

/* ================= escribir OBJ / MTL ================= */
const mtl = ['# Vía Expresa Elevada — materiales', ''];
for (const [name, [r, g, b]] of Object.entries(MATS)) {
  mtl.push(`newmtl ${name}`, `Kd ${r} ${g} ${b}`, 'Ka 0 0 0', 'Ks 0.05 0.05 0.05', 'Ns 10', '');
}
const obj = ['# Vía Expresa Elevada — intercambio vial adaptado al Perú',
  '# Proyecto escolar EPT 2026 · 1 unidad = 1 metro · eje Y hacia arriba',
  '# Generado con tools/genera-modelo-3d.mjs',
  'mtllib via-expresa-elevada.mtl', ''];
for (const [x, y, z] of V) obj.push(`v ${x.toFixed(2)} ${y.toFixed(2)} ${z.toFixed(2)}`);
let lastO = null, lastM = null;
for (const f of F) {
  if (f.o !== lastO) { obj.push(`o ${f.o}`); lastO = f.o; lastM = null; }
  if (f.m !== lastM) { obj.push(`usemtl ${f.m}`); lastM = f.m; }
  obj.push('f ' + f.ids.join(' '));
}
const objText = obj.join('\n') + '\n', mtlText = mtl.join('\n') + '\n';
mkdirSync(join(ROOT, 'modelo-3d'), { recursive: true });
writeFileSync(join(ROOT, 'modelo-3d/via-expresa-elevada.obj'), objText);
writeFileSync(join(ROOT, 'modelo-3d/via-expresa-elevada.mtl'), mtlText);

/* ================= inyectar en el visor HTML ================= */
const htmlPath = join(ROOT, 'modelo-3d.html');
let html = readFileSync(htmlPath, 'utf8');
html = html.replace(/(<script id="objdata" type="text\/plain">)[\s\S]*?(<\/script>)/, `$1\n${objText}$2`);
html = html.replace(/(<script id="mtldata" type="text\/plain">)[\s\S]*?(<\/script>)/, `$1\n${mtlText}$2`);
writeFileSync(htmlPath, html);

console.log(`OBJ: ${V.length} vértices, ${F.length} caras (${(objText.length / 1024).toFixed(0)} KB)`);
