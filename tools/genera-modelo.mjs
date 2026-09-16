// Vía Expresa Elevada — modelo 3D
//
// A diferencia de una maqueta de cajas apiladas, acá las piezas salen de
// perfiles extruidos, que es como se dibujan de verdad las obras viales: se
// define la forma del corte transversal y se estira a lo largo de la vía. Eso
// da los pilares que se afinan hacia arriba con su cabezal en martillo, las
// barreras con el perfil New Jersey de verdad y el tablero tipo cajón con sus
// voladizos.
//
// Uso:  node tools/genera-modelo.mjs
//
// Saca dos versiones del mismo modelo:
//   DETALLADO  → para el visor de la página y para ver/imprimir en 3D
//   SENCILLO   → menos caras y sin detalles chicos, para Tinkercad
//
// Medidas reales: 1 unidad = 1 metro. Eje Y hacia arriba, X a lo largo de la
// vía, Z cruzándola.
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/* ===================== colores ===================== */
const MATS = {
  tierra:     [0.34, 0.27, 0.20],
  pasto:      [0.42, 0.58, 0.28],
  pastoOsc:   [0.34, 0.47, 0.23],   // el pasto a la sombra del viaducto
  asfalto:    [0.24, 0.26, 0.29],
  asfaltoBus: [0.19, 0.21, 0.24],
  concreto:   [0.78, 0.76, 0.71],
  concretoOsc:[0.66, 0.64, 0.60],
  vereda:     [0.74, 0.72, 0.67],
  ciclovia:   [0.62, 0.30, 0.24],   // las ciclovías de Lima son rojizas
  lineaBl:    [0.90, 0.90, 0.88],
  lineaAm:    [0.84, 0.66, 0.16],
  anden:      [0.80, 0.79, 0.76],
  techo:      [0.86, 0.88, 0.89],
  vidrio:     [0.26, 0.33, 0.39],
  metal:      [0.40, 0.43, 0.46],
  busCuerpo:  [0.84, 0.85, 0.86],
  busFranja:  [0.66, 0.21, 0.17],
  llanta:     [0.13, 0.13, 0.14],
  tronco:     [0.40, 0.30, 0.21],
  copa:       [0.30, 0.48, 0.24],
  copaClara:  [0.38, 0.57, 0.29],
  rojo:       [0.68, 0.19, 0.16],
  azul:       [0.19, 0.36, 0.58],
  blanco:     [0.87, 0.88, 0.89],
  gris:       [0.38, 0.42, 0.46],
  amarillo:   [0.86, 0.68, 0.13],
  faro:       [0.98, 0.94, 0.72],
};

/* ===================== armado de geometría ===================== */
let V, VCOL, F, grupo, matActual, DET;
function reiniciar(detalle) {
  V = []; VCOL = []; F = []; grupo = 'Modelo'; matActual = 'pasto'; DET = detalle;
}
const alto = () => DET === 'alto';
const o = n => { grupo = n; };
const v = (x, y, z) => (V.push([x, y, z]), VCOL.push(MATS[matActual]), V.length);
const face = (...ids) => F.push({ m: matActual, o: grupo, ids });

/* Cada pieza tiene que quedar con las caras mirando hacia afuera: de eso
   dependen la luz, las normales del STL y que el visor pueda descartar las
   caras que no se ven. En vez de acertarle al orden de los puntos pieza por
   pieza —y equivocarse—, se arma la pieza, se le mide el volumen y, si sale
   negativo, se le da la vuelta a todas sus caras de un saque. */
function afuera(construirPieza) {
  const desde = F.length;
  construirPieza();
  let vol = 0;
  for (let i = desde; i < F.length; i++) {
    const ids = F[i].ids;
    for (let k = 2; k < ids.length; k++) {
      const A = V[ids[0] - 1], B = V[ids[k - 1] - 1], C = V[ids[k] - 1];
      const u = [B[0] - A[0], B[1] - A[1], B[2] - A[2]], w = [C[0] - A[0], C[1] - A[1], C[2] - A[2]];
      const cr = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]];
      vol += (A[0] * cr[0] + A[1] * cr[1] + A[2] * cr[2]) / 6;
    }
  }
  if (vol < 0) for (let i = desde; i < F.length; i++) F[i].ids.reverse();
}

/* --- caja recta --- */
function caja(x0, x1, y0, y1, z0, z1, m) {
  matActual = m;
  afuera(() => {
  const a = v(x0, y0, z0), b = v(x1, y0, z0), c = v(x1, y0, z1), d = v(x0, y0, z1);
  const e = v(x0, y1, z0), f = v(x1, y1, z0), g = v(x1, y1, z1), h = v(x0, y1, z1);
  face(h, g, f, e); face(a, b, c, d);
  face(a, e, f, b); face(d, c, g, h);
  face(b, f, g, c); face(a, d, h, e);
  });
}
// losa delgada apoyada en el piso (pistas, jardines, veredas)
const losa = (x0, x1, z0, z1, m, y = 0.15, esp = 0.15) => caja(x0, x1, y - esp, y, z0, z1, m);

/* --- extrusión de un perfil a lo largo del eje X ---
   El perfil es una lista de puntos [z, y] que forman una figura cerrada. Es la
   herramienta principal: con ella salen el tablero, las barreras, el cabezal
   de los pilares y el techo de la estación. */
function extruirX(perfil, x0, x1, m, { tapaIni = true, tapaFin = true, mArriba = null } = {}) {
  matActual = m;
  const desde = F.length;
  afuera(() => {
  const n = perfil.length;
  const A = perfil.map(([z, y]) => v(x0, y, z));
  const B = perfil.map(([z, y]) => v(x1, y, z));
  for (let i = 0; i < n; i++) { const j = (i + 1) % n; face(A[i], A[j], B[j], B[i]); }
  if (tapaIni) for (let i = 1; i < n - 1; i++) face(A[0], A[i + 1], A[i]);
  if (tapaFin) for (let i = 1; i < n - 1; i++) face(B[0], B[i], B[i + 1]);
  });
  // Pintar de otro color las caras que miran hacia arriba (el asfalto sobre el
  // tablero). Se hace así, y no apilando una segunda pieza encima, porque dos
  // superficies a la misma altura se pelean por cuál se dibuja primero.
  if (mArriba) for (let i = desde; i < F.length; i++) {
    const [p, q, r] = F[i].ids.map(id => V[id - 1]);
    const u = [q[0] - p[0], q[1] - p[1], q[2] - p[2]], w = [r[0] - p[0], r[1] - p[1], r[2] - p[2]];
    const ny = u[2] * w[0] - u[0] * w[2];
    const nl = Math.hypot(u[1] * w[2] - u[2] * w[1], ny, u[0] * w[1] - u[1] * w[0]) || 1;
    if (ny / nl > 0.7) F[i].m = mArriba;
  }
}
/* --- extrusión a lo largo del eje Z (para los carros, que miran de lado) --- */
function extruirZ(perfil, z0, z1, m) {
  matActual = m;
  afuera(() => {
  const n = perfil.length;
  const A = perfil.map(([x, y]) => v(x, y, z0));
  const B = perfil.map(([x, y]) => v(x, y, z1));
  for (let i = 0; i < n; i++) { const j = (i + 1) % n; face(A[i], B[i], B[j], A[j]); }
  for (let i = 1; i < n - 1; i++) face(A[0], A[i], A[i + 1]);
  for (let i = 1; i < n - 1; i++) face(B[0], B[i + 1], B[i]);
  });
}
/* --- prisma que se afina: la base y el tope tienen distinto tamaño --- */
function prismaAfinado(cx, cz, y0, y1, lx0, lz0, lx1, lz1, m) {
  matActual = m;
  afuera(() => {
  const q = (y, lx, lz) => [
    v(cx - lx / 2, y, cz - lz / 2), v(cx + lx / 2, y, cz - lz / 2),
    v(cx + lx / 2, y, cz + lz / 2), v(cx - lx / 2, y, cz + lz / 2)];
  const A = q(y0, lx0, lz0), B = q(y1, lx1, lz1);
  for (let i = 0; i < 4; i++) { const j = (i + 1) % 4; face(A[i], A[j], B[j], B[i]); }
  face(B[0], B[1], B[2], B[3]); face(A[3], A[2], A[1], A[0]);
  });
}
/* --- cilindro (puede afinarse), eje vertical --- */
function cilindro(cx, cz, y0, y1, r0, r1, m, seg = alto() ? 12 : 6) {
  matActual = m;
  afuera(() => {
  const aro = (y, r) => Array.from({ length: seg }, (_, i) => {
    const a = i / seg * Math.PI * 2;
    return v(cx + Math.cos(a) * r, y, cz + Math.sin(a) * r);
  });
  const A = aro(y0, r0), B = aro(y1, r1);
  for (let i = 0; i < seg; i++) { const j = (i + 1) % seg; face(A[i], A[j], B[j], B[i]); }
  for (let i = 1; i < seg - 1; i++) face(B[0], B[i], B[i + 1]);
  for (let i = 1; i < seg - 1; i++) face(A[0], A[i + 1], A[i]);
  });
}
/* --- cilindro acostado sobre el eje Z: las llantas --- */
function cilindroZ(cx, cy, z0, z1, r, m, seg = alto() ? 10 : 6) {
  matActual = m;
  afuera(() => {
  const aro = z => Array.from({ length: seg }, (_, i) => {
    const a = i / seg * Math.PI * 2;
    return v(cx + Math.cos(a) * r, cy + Math.sin(a) * r, z);
  });
  const A = aro(z0), B = aro(z1);
  for (let i = 0; i < seg; i++) { const j = (i + 1) % seg; face(A[i], B[i], B[j], A[j]); }
  for (let i = 1; i < seg - 1; i++) face(A[0], A[i], A[i + 1]);
  for (let i = 1; i < seg - 1; i++) face(B[0], B[i + 1], B[i]);
  });
}

/* ===================== perfiles ===================== */
// Barrera New Jersey: el perfil de verdad, con su zócalo, la parte inclinada
// que devuelve al carro a la pista y el remate vertical.
const perfilNewJersey = (h = 1.05) => [
  [-0.28, 0], [0.28, 0], [0.28, 0.08], [0.17, 0.33], [0.10, h],
  [-0.10, h], [-0.17, 0.33], [-0.28, 0.08],
];
const mover = (perfil, dz, dy) => perfil.map(([z, y]) => [z + dz, y + dy]);

/* ===================== piezas ===================== */
function carro(cx, y, cz, color, haciaX = true) {
  // el costado del carro, dibujado de perfil y estirado hacia los lados
  const lado = [
    [-2.15, 0.30], [2.15, 0.30], [2.15, 0.70], [1.45, 0.74],
    [0.90, 1.36], [-0.80, 1.40], [-1.40, 0.76], [-2.15, 0.70],
  ];
  const techo = [[1.30, 0.74], [0.92, 1.34], [-0.78, 1.38], [-1.28, 0.78]];
  const gx = cx, gy = y, gz = cz;
  const map = p => haciaX ? p : [p[1], p[0]];   // girar 90° si va cruzado
  const pf = lado.map(([a, b]) => [a, b]);
  if (haciaX) {
    extruirZ(pf.map(([a, b]) => [gx + a, gy + b]), gz - 0.92, gz + 0.92, color);
    extruirZ(techo.map(([a, b]) => [gx + a, gy + b + 0.02]), gz - 0.80, gz + 0.80, 'vidrio');
    if (alto()) for (const dx of [-1.42, 1.42]) for (const dz of [-0.95, 0.77])
      cilindroZ(gx + dx, gy + 0.33, gz + dz, gz + dz + 0.18, 0.33, 'llanta');
  } else {
    extruirX(pf.map(([a, b]) => [gz + a, gy + b]), gx - 0.92, gx + 0.92, color);
    extruirX(techo.map(([a, b]) => [gz + a, gy + b + 0.02]), gx - 0.80, gx + 0.80, 'vidrio');
  }
  void map;
}

function busArticulado(cx, y, cz) {
  const cuerpo = (a, b) => {
    const pf = [[a, 0.32], [b, 0.32], [b, 3.05], [a, 3.05]];
    extruirZ(pf.map(([x, h]) => [cx + x, y + h]), cz - 1.3, cz + 1.3, 'busCuerpo');
    // franja y ventanas
    extruirZ([[cx + a + 0.3, y + 1.95], [cx + b - 0.3, y + 1.95], [cx + b - 0.3, y + 2.75], [cx + a + 0.3, y + 2.75]],
      cz - 1.33, cz + 1.33, 'vidrio');
    extruirZ([[cx + a + 0.2, y + 1.15], [cx + b - 0.2, y + 1.15], [cx + b - 0.2, y + 1.5], [cx + a + 0.2, y + 1.5]],
      cz - 1.33, cz + 1.33, 'busFranja');
  };
  cuerpo(-9, -0.6); cuerpo(0.6, 9);
  caja(cx - 0.7, cx + 0.7, y + 0.6, y + 2.9, cz - 1.15, cz + 1.15, 'busFranja');  // fuelle
  if (alto()) for (const dx of [-7.6, -2.4, 3.2, 7.6])
    for (const dz of [-1.32, 1.14]) cilindroZ(cx + dx, y + 0.5, cz + dz, cz + dz + 0.18, 0.5, 'llanta');
}

function arbol(cx, cz, h = 7, claro = false) {
  cilindro(cx, cz, 0.15, h * 0.42, 0.22, 0.16, 'tronco');
  const m = claro ? 'copaClara' : 'copa';
  const anillos = alto()
    ? [[h * 0.38, h * 0.20], [h * 0.55, h * 0.30], [h * 0.78, h * 0.26], [h, h * 0.07]]
    : [[h * 0.40, h * 0.24], [h * 0.75, h * 0.24], [h, h * 0.08]];
  for (let i = 0; i < anillos.length - 1; i++)
    cilindro(cx, cz, anillos[i][0], anillos[i + 1][0], anillos[i][1], anillos[i + 1][1], m, alto() ? 8 : 5);
}

function poste(cx, cz, h, brazo) {
  cilindro(cx, cz, 0, h, 0.16, 0.11, 'metal', alto() ? 8 : 4);
  for (const s of (brazo === 0 ? [0] : [-1, 1])) {
    const dz = s * Math.abs(brazo);
    caja(cx - 0.09, cx + 0.09, h - 0.12, h, cz + Math.min(0, dz), cz + Math.max(0, dz), 'metal');
    caja(cx - 0.28, cx + 0.28, h - 0.34, h - 0.06, cz + dz - 0.22, cz + dz + 0.22, 'faro');
    if (brazo === 0) break;
  }
}

/* =====================================================================
   EL CORREDOR
   Cruzando la vía, de un borde al otro (todo en metros):
     vereda 3 · ciclovía 2.5 · jardín 2 · pista 10 · mediana 15 ·
     Metropolitano 3.5 + andén 3.5 + 3.5 · jardín 3 · vereda 4
===================================================================== */
const LARGO = 96, X0 = -LARGO / 2, X1 = LARGO / 2;
const Z0 = -25, Z1 = 25;
const GALIBO = 8;            // altura libre debajo del tablero
const CANTO = 2;             // espesor del tablero
const YTAB = GALIBO + CANTO; // cota de la pista de arriba = 10 m
const MEDIA = 7.5;           // medio ancho del tablero (15 m en total)
const PILARES = [-32, 0, 32];

function construir() {
  /* --- terreno --- */
  o('Terreno');
  caja(X0, X1, -1.2, 0, Z0, Z1, 'tierra');
  losa(X0, X1, Z0, Z1, 'pasto', 0.15, 0.15);

  /* --- el piso del corredor --- */
  o('CorredorVial');
  losa(X0, X1, -25, -22, 'vereda');
  losa(X0, X1, -22, -19.5, 'ciclovia');
  losa(X0, X1, -17.5, -7.5, 'asfalto');           // pista de siempre, 3 carriles
  // debajo del viaducto el pasto va más oscuro: es la sombra del tablero
  losa(X0, X1, -7.5, 7.5, 'pastoOsc', 0.16, 0.02);
  losa(X0, X1, 7.5, 11, 'asfaltoBus');
  losa(X0, X1, 14.5, 18, 'asfaltoBus');
  losa(X0, X1, 21, 25, 'vereda');
  // líneas de la pista de abajo
  for (const z of [-14.2, -10.8]) for (let x = X0 + 3; x < X1 - 3; x += 9)
    losa(x, x + 4, z - 0.1, z + 0.1, 'lineaBl', 0.17, 0.02);
  for (const z of [-17.4, -7.6]) losa(X0, X1, z - 0.1, z + 0.1, 'lineaBl', 0.17, 0.02);
  // bordes amarillos del andén
  for (const z of [11.3, 14.2]) losa(X0 + 2, X1 - 2, z - 0.12, z + 0.12, 'lineaAm', 1.06, 0.02);

  /* --- estación del Metropolitano --- */
  o('Estacion');
  caja(-18, 18, 0.15, 1.05, 11, 14.5, 'anden');
  if (alto()) {
    // techo curvo, hecho con una parábola suave
    const N = 10, arco = [];
    for (let i = 0; i <= N; i++) {
      const t = i / N, z = 11 + t * 3.5, d = (t - 0.5) * 2;
      arco.push([z, 4.6 - d * d * 0.55]);
    }
    for (let i = N; i >= 0; i--) arco.push([arco[i][0], arco[i][1] - 0.22]);
    extruirX(arco, -19, 19, 'techo');
  } else {
    caja(-19, 19, 4.3, 4.55, 10.8, 14.7, 'techo');
  }
  for (const x of [-15, -5, 5, 15]) cilindro(x, 12.75, 1.05, 4.15, 0.13, 0.11, 'metal', alto() ? 8 : 4);
  busArticulado(-4, 0.15, 9.25);
  if (alto()) busArticulado(30, 0.15, 16.25);

  /* --- pilares --- */
  o('Columnas');
  for (const x of PILARES) {
    caja(x - 2.6, x + 2.6, 0, 0.55, -2.2, 2.2, 'concretoOsc');            // zapata
    prismaAfinado(x, 0, 0.55, GALIBO - 1.8, 3.4, 2.6, 2.4, 2.0, 'concreto'); // fuste
    // cabezal en martillo: ancho arriba, angosto abajo
    extruirX([[-6.6, GALIBO], [6.6, GALIBO], [6.6, GALIBO - 0.85],
              [1.5, GALIBO - 1.8], [-1.5, GALIBO - 1.8]],
      x - 1.35, x + 1.35, 'concreto');
    if (alto()) for (const z of [-4.4, 0, 4.4])   // apoyos de goma (los aisladores)
      caja(x - 0.75, x + 0.75, GALIBO - 0.32, GALIBO, z - 0.5, z + 0.5, 'llanta');
  }

  /* --- el tablero: sección de cajón con voladizos, y el asfalto es su propia
     cara de arriba (ver extruirX) --- */
  o('ViaElevada');
  extruirX([[-MEDIA, YTAB], [MEDIA, YTAB], [MEDIA, YTAB - 0.55],
            [MEDIA - 3.4, GALIBO], [-(MEDIA - 3.4), GALIBO], [-MEDIA, YTAB - 0.55]],
    X0 + 2, X1 - 2, 'concreto', { mArriba: 'asfalto' });

  /* --- lo que va encima del tablero --- */
  o('ViaElevadaEncima');
  for (const z of [-(MEDIA - 0.3), MEDIA - 0.3])
    extruirX(mover(perfilNewJersey(), z, YTAB), X0 + 2, X1 - 2, 'concreto');
  extruirX(mover(perfilNewJersey(0.9), 0, YTAB), X0 + 2, X1 - 2, 'concretoOsc');
  // marcas de los carriles
  const YM = YTAB + 0.04;
  for (const z of [-3.4, 3.4]) losa(X0 + 3, X1 - 3, z - 0.1, z + 0.1, 'lineaBl', YM, 0.02);
  for (const z of [-1.6, 1.6]) for (let x = X0 + 4; x < X1 - 4; x += 9)
    losa(x, x + 4, z - 0.1, z + 0.1, 'lineaBl', YM, 0.02);
  for (const z of [-(MEDIA - 0.85), MEDIA - 0.85]) losa(X0 + 3, X1 - 3, z - 0.1, z + 0.1, 'lineaBl', YM, 0.02);
  // postes de luz sobre la barrera central
  for (const x of [-24, 8, 40]) poste(x, 0, YTAB + 7.5, 2.6);

  /* --- carros --- */
  o('Vehiculos');
  carro(-28, YTAB + 0.06, -5.2, 'blanco'); carro(2, YTAB + 0.06, -2.4, 'rojo');
  carro(34, YTAB + 0.06, -5.2, 'gris');    carro(-14, YTAB + 0.06, 2.4, 'azul');
  carro(18, YTAB + 0.06, 5.2, 'blanco');   carro(44, YTAB + 0.06, 2.4, 'amarillo');
  carro(-34, 0.15, -15.9, 'azul');  carro(-6, 0.15, -12.5, 'blanco');
  carro(24, 0.15, -15.9, 'rojo');   carro(40, 0.15, -9.1, 'gris');

  /* --- vegetación y alumbrado de la calle --- */
  o('Arboles');
  for (const [i, x] of [-40, -26, -12, 2, 16, 30, 44].entries()) arbol(x, -18.5, 6.5 + (i % 3) * 0.6, i % 3 === 1);
  for (const [i, x] of [-34, -16, 6, 28, 46].entries()) arbol(x, 19.5, 6 + (i % 2) * 0.8, i % 2 === 0);
  if (alto()) for (const x of [-36, -12, 12, 36]) poste(x, -20.8, 6.5, 0);
}

/* =====================================================================
   SALIDA
===================================================================== */
mkdirSync(join(ROOT, 'modelo-3d'), { recursive: true });
const OUT = n => join(ROOT, 'modelo-3d', n);

function triangulos() {
  const porMat = new Map();
  for (const f of F) {
    if (!porMat.has(f.m)) porMat.set(f.m, []);
    const t = porMat.get(f.m);
    for (let i = 2; i < f.ids.length; i++) t.push([f.ids[0] - 1, f.ids[i - 1] - 1, f.ids[i] - 1]);
  }
  return porMat;
}
function comprobar() {
  let vol = 0, n = [0, 0, 0];
  for (const tris of triangulos().values()) for (const [a, b, c] of tris) {
    const A = V[a], B = V[b], C = V[c];
    const u = [B[0] - A[0], B[1] - A[1], B[2] - A[2]], w = [C[0] - A[0], C[1] - A[1], C[2] - A[2]];
    const cr = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]];
    n[0] += cr[0]; n[1] += cr[1]; n[2] += cr[2];
    vol += (A[0] * cr[0] + A[1] * cr[1] + A[2] * cr[2]) / 6;
  }
  return { vol, cierre: Math.hypot(...n) };
}
const mtlText = (() => {
  const L = ['# Vía Expresa Elevada — colores', ''];
  for (const [n, [r, g, b]] of Object.entries(MATS))
    L.push(`newmtl ${n}`, `Kd ${r} ${g} ${b}`, 'Ka 0 0 0', 'Ks 0.02 0.02 0.02', 'Ns 8', 'd 1', '');
  return L.join('\n') + '\n';
})();

function objTexto({ colores, mtl }) {
  const L = ['# Vía Expresa Elevada — proyecto de EPT',
    `# 1 unidad = 1 metro · el terreno mide ${LARGO} x ${Z1 - Z0} m`];
  if (mtl) L.push(`mtllib ${mtl}`);
  L.push('');
  V.forEach(([x, y, z], i) => {
    const c = colores ? ' ' + VCOL[i].join(' ') : '';
    L.push(`v ${x.toFixed(3)} ${y.toFixed(3)} ${z.toFixed(3)}${c}`);
  });
  let g = null, m = null;
  for (const f of F) {
    if (f.o !== g) { L.push(`o ${f.o}`); g = f.o; m = null; }
    if (mtl && f.m !== m) { L.push(`usemtl ${f.m}`); m = f.m; }
    L.push('f ' + f.ids.join(' '));
  }
  return L.join('\n') + '\n';
}
function stlBuffer() {
  const porMat = triangulos();
  const total = [...porMat.values()].reduce((a, t) => a + t.length, 0);
  const buf = Buffer.alloc(84 + 50 * total);
  buf.write('Via Expresa Elevada - proyecto EPT', 0, 'ascii');
  buf.writeUInt32LE(total, 80);
  let off = 84;
  for (const tris of porMat.values()) for (const [a, b, c] of tris) {
    const A = V[a], B = V[b], C = V[c];
    const u = [B[0] - A[0], B[1] - A[1], B[2] - A[2]], w = [C[0] - A[0], C[1] - A[1], C[2] - A[2]];
    let nx = u[1] * w[2] - u[2] * w[1], ny = u[2] * w[0] - u[0] * w[2], nz = u[0] * w[1] - u[1] * w[0];
    const nl = Math.hypot(nx, ny, nz) || 1;
    buf.writeFloatLE(nx / nl, off); buf.writeFloatLE(ny / nl, off + 4); buf.writeFloatLE(nz / nl, off + 8);
    let p = off + 12;
    for (const P of [A, B, C]) { buf.writeFloatLE(P[0], p); buf.writeFloatLE(P[1], p + 4); buf.writeFloatLE(P[2], p + 8); p += 12; }
    buf.writeUInt16LE(0, off + 48); off += 50;
  }
  return buf;
}
function glbBuffer() {
  const porMat = triangulos();
  const bufs = [], accessors = [], bufferViews = [], materials = [], primitives = [];
  let offset = 0;
  for (const [nombre, tris] of porMat) {
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
    materials.push({ name: nombre, doubleSided: true, pbrMetallicRoughness: { baseColorFactor: [r, g, b, 1], metallicFactor: 0, roughnessFactor: 0.9 } });
    primitives.push({ attributes: { POSITION: accessors.length - 1 }, material: materials.length - 1, mode: 4 });
    offset += bytes.length;
  }
  const bin = Buffer.concat(bufs);
  const gltf = {
    asset: { version: '2.0', generator: 'genera-modelo.mjs — proyecto EPT' },
    scene: 0, scenes: [{ nodes: [0] }], nodes: [{ mesh: 0, name: 'ViaExpresaElevada' }],
    meshes: [{ name: 'ViaExpresaElevada', primitives }],
    materials, accessors, bufferViews, buffers: [{ byteLength: bin.length }],
  };
  const pad = (b, r) => b.length % 4 ? Buffer.concat([b, Buffer.alloc(4 - b.length % 4, r)]) : b;
  const json = pad(Buffer.from(JSON.stringify(gltf), 'utf8'), 0x20), binC = pad(bin, 0);
  const cab = (len, tipo) => { const b = Buffer.alloc(8); b.writeUInt32LE(len, 0); b.writeUInt32LE(tipo, 4); return b; };
  const head = Buffer.alloc(12);
  head.writeUInt32LE(0x46546C67, 0); head.writeUInt32LE(2, 4);
  head.writeUInt32LE(12 + 8 + json.length + 8 + binC.length, 8);
  return Buffer.concat([head, cab(json.length, 0x4E4F534A), json, cab(binC.length, 0x004E4942), binC]);
}

/* ---------- versión detallada ---------- */
reiniciar('alto'); construir();
const objAlto = objTexto({ colores: true, mtl: 'via-expresa.mtl' });
writeFileSync(OUT('via-expresa.obj'), objAlto);
writeFileSync(OUT('via-expresa.mtl'), mtlText);
writeFileSync(OUT('via-expresa.glb'), glbBuffer());
writeFileSync(OUT('via-expresa.stl'), stlBuffer());
const chkAlto = comprobar(), carasAlto = F.length;

/* ---------- versión sencilla, para Tinkercad ---------- */
reiniciar('bajo'); construir();
const objBajo = objTexto({ colores: true, mtl: 'via-expresa-tinkercad.mtl' });
writeFileSync(OUT('via-expresa-tinkercad.obj'), objBajo);
writeFileSync(OUT('via-expresa-tinkercad.mtl'), mtlText);
writeFileSync(OUT('via-expresa-tinkercad.glb'), glbBuffer());
writeFileSync(OUT('via-expresa-tinkercad.stl'), stlBuffer());
writeFileSync(OUT('via-expresa-tinkercad-sincolor.obj'), objTexto({ colores: false, mtl: null }));
const chkBajo = comprobar(), carasBajo = F.length;

/* ---------- el modelo partido por colores, para pintar en Tinkercad ---------- */
const PIEZAS = {
  '1-terreno-y-jardines': ['tierra', 'pasto', 'pastoOsc'],
  '2-pistas':             ['asfalto', 'asfaltoBus', 'lineaBl', 'lineaAm'],
  '3-concreto':           ['concreto', 'concretoOsc', 'vereda', 'anden', 'techo', 'metal'],
  '4-ciclovia':           ['ciclovia'],
  '5-carros-y-buses':     ['busCuerpo', 'busFranja', 'vidrio', 'llanta', 'rojo', 'azul', 'blanco', 'gris', 'amarillo', 'faro'],
  '6-arboles':            ['tronco', 'copa', 'copaClara'],
};
rmSync(join(ROOT, 'modelo-3d', 'piezas-tinkercad'), { recursive: true, force: true });
mkdirSync(join(ROOT, 'modelo-3d', 'piezas-tinkercad'), { recursive: true });
for (const [nombre, materiales] of Object.entries(PIEZAS)) {
  const usa = new Set(materiales), caras = F.filter(f => usa.has(f.m));
  const mapa = new Map(), vs = [];
  for (const f of caras) for (const id of f.ids)
    if (!mapa.has(id)) { mapa.set(id, mapa.size + 1); const [x, y, z] = V[id - 1]; vs.push(`v ${x.toFixed(3)} ${y.toFixed(3)} ${z.toFixed(3)}`); }
  const cab = [`# Vía Expresa Elevada — pieza "${nombre}"`,
    '# Impórtala a Tinkercad y píntala con el balde de pintura.',
    '# Las seis piezas usan las mismas coordenadas, así que calzan solas.', ''];
  writeFileSync(join(ROOT, 'modelo-3d', 'piezas-tinkercad', `${nombre}.obj`),
    cab.concat(vs, '', caras.map(f => 'f ' + f.ids.map(id => mapa.get(id)).join(' '))).join('\n') + '\n');
}

/* ---------- tabla de medidas ----------
   Sale de las mismas constantes con las que se arma el modelo, así que nunca
   dice una cosa distinta a la que tiene el archivo 3D. */
const MEDIDAS = [
  ['El terreno', [
    ['Largo del tramo', `${LARGO} m`],
    ['Ancho del corredor', `${Z1 - Z0} m`],
  ]],
  ['La pista elevada', [
    ['Altura libre por debajo', `${GALIBO} m`, 'el Metropolitano necesita 5.50 m como mínimo'],
    ['Canto del tablero', `${CANTO} m`, 'sección de cajón, más delgada en los bordes'],
    ['Ancho del tablero', `${MEDIA * 2} m`, '4 carriles de 3.25 m más las barreras'],
    ['Cota de la pista', `${YTAB} m`],
    ['Barrera New Jersey', '1.05 m de alto'],
    ['Postes de luz', `${(7.5).toFixed(1)} m sobre la pista`, 'brazo doble, alumbran los 4 carriles'],
  ]],
  ['Los pilares', [
    ['Separación entre pilares', `${PILARES[1] - PILARES[0]} m`],
    ['Fuste', '3.40 × 2.60 m abajo, 2.40 × 2.00 m arriba', 'se afina hacia arriba'],
    ['Cabezal en martillo', '13.20 m de ancho'],
    ['Zapata', '5.20 × 4.40 × 0.55 m'],
  ]],
  ['Lo que va abajo', [
    ['Pista de siempre', '10 m', '3 carriles'],
    ['Carriles del Metropolitano', '3.50 m cada uno'],
    ['Andén de la estación', '3.50 m de ancho, 36 m de largo'],
    ['Ciclovía', '2.50 m'],
    ['Veredas', '3 y 4 m'],
  ]],
];
{
  const L = ['# Medidas de la Vía Expresa Elevada', '',
    'Todo en **metros de la vida real**. En el archivo 3D, 1 unidad = 1 metro.', ''];
  for (const [titulo, filas] of MEDIDAS) {
    L.push(`## ${titulo}`, '', '| Qué | Medida | |', '|---|---|---|');
    for (const [q, m, nota = ''] of filas) L.push(`| ${q} | **${m}** | ${nota} |`);
    L.push('');
  }
  L.push('---', '', 'Lo escribe `tools/genera-modelo.mjs`, el mismo programa que arma el modelo.', '');
  writeFileSync(OUT('medidas.md'), L.join('\n'));
}
{
  const p = join(ROOT, 'modelo-3d.html');
  let html = readFileSync(p, 'utf8');
  const meter = (id, txt) => {
    html = html.replace(new RegExp(`(<script id="${id}" type="text/plain">)[\\s\\S]*?(</script>)`), `$1\n${txt}$2`);
  };
  meter('objdata', objAlto);
  meter('mtldata', mtlText);
  meter('glbdata', readFileSync(OUT('via-expresa.glb')).toString('base64') + '\n');
  meter('objtk', objTexto({ colores: false, mtl: null }));
  meter('objtkcolor', objBajo);
  meter('mtltkcolor', mtlText);
  // la tabla de medidas
  const t = [];
  for (const [titulo, filas] of MEDIDAS) {
    t.push(`<h3>${titulo}</h3>`, '<div class="tabla"><table><tbody>');
    for (const [q, m, nota = ''] of filas)
      t.push(`<tr><td>${q}</td><td class="n"><b>${m}</b></td><td class="muted small">${nota}</td></tr>`);
    t.push('</tbody></table></div>');
  }
  html = html.replace(/(<div id="tablaMedidas">)[\s\S]*?(<\/div><!--\/tablaMedidas-->)/, `$1\n${t.join('\n')}\n$2`);
  writeFileSync(p, html);
}

const fmt = c => `volumen ${c.vol.toFixed(0)} m³, cierre ${c.cierre.toFixed(3)}`;
console.log(`DETALLADO: ${carasAlto} caras · ${fmt(chkAlto)}`);
console.log(`SENCILLO : ${carasBajo} caras · ${fmt(chkBajo)}`);
