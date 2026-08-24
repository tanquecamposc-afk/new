/* ===========================================================
   odds.js — modelos de probabilidad, margen y cuotas
   Todo el precio que ves en el sitio sale de acá.
   =========================================================== */
K.Odds = (() => {

  /* -------- Poisson: base del fútbol -------- */
  const fact = n => { let r = 1; for (let i = 2; i <= n; i++) r *= i; return r; };
  const poisson = (lam, k) => Math.exp(-lam) * Math.pow(lam, k) / fact(k);

  /* Matriz de marcadores hasta MAX goles por equipo. */
  const MAX = 9;
  function matriz(lh, la) {
    const m = [];
    for (let i = 0; i <= MAX; i++) {
      m[i] = [];
      for (let j = 0; j <= MAX; j++) m[i][j] = poisson(lh, i) * poisson(la, j);
    }
    return m;
  }
  /* Suma de todas las celdas donde se cumple la condición. */
  const sumar = (m, cond) => {
    let s = 0;
    for (let i = 0; i <= MAX; i++) for (let j = 0; j <= MAX; j++) if (cond(i, j)) s += m[i][j];
    return s;
  };

  /* -------------------------------------------------------
     Margen: de probabilidad justa a cuota comercial.
     M = overround (1.05 => 105%). pesos = reparto del dinero
     que ya entró a cada resultado; si un lado carga mucho,
     ese lado paga menos.
     ------------------------------------------------------- */
  function cuotas(probs, M, pesos) {
    const n = probs.length;
    let aj = probs.map((p, i) => {
      if (!pesos) return p;
      const desvio = pesos[i] - 1 / n;
      return p * (1 + 0.9 * desvio);
    });
    const s = aj.reduce((a, b) => a + b, 0) || 1;
    return aj.map(p => {
      const pf = (p / s) * M;
      return Math.max(1.01, Math.floor((1 / pf) * 100) / 100);
    });
  }

  const overround = cs => cs.reduce((a, c) => a + 1 / c, 0);
  const implicita = c => 1 / c;

  /* -------------------------------------------------------
     Valor de cashout.
       stake * cuotaBloqueada / cuotaActual * (1 - margenCash)
     ------------------------------------------------------- */
  function cashout(stake, cuotaBloqueada, cuotaActual, margenCash = 0.05) {
    if (!cuotaActual || cuotaActual <= 1) return 0;
    return Math.max(0, K.round2(stake * cuotaBloqueada / cuotaActual * (1 - margenCash)));
  }

  /* -------------------------------------------------------
     Mercados de fútbol a partir de goles esperados.
     En vivo se recorta lambda por el tiempo que queda y se
     arrastra el marcador actual.
     ------------------------------------------------------- */
  function futbol(ev) {
    const vivo = ev.vivo;
    const min = vivo ? ev.minuto : 0;
    const resta = vivo ? Math.max(0.02, (90 - min) / 90) : 1;
    // Un equipo que va perdiendo empuja un poco más; el que gana se repliega.
    const gl = ev.marcador.l, gv = ev.marcador.v;
    const dif = gl - gv;
    const empujeL = vivo ? (dif < 0 ? 1.12 : dif > 0 ? 0.92 : 1) : 1;
    const empujeV = vivo ? (dif > 0 ? 1.12 : dif < 0 ? 0.92 : 1) : 1;
    const lh = ev.modelo.lh * resta * empujeL;
    const la = ev.modelo.la * resta * empujeV;
    const m = matriz(lh, la);

    const p1 = sumar(m, (i, j) => i + gl > j + gv);
    const px = sumar(m, (i, j) => i + gl === j + gv);
    const p2 = sumar(m, (i, j) => i + gl < j + gv);

    const tot = k => sumar(m, (i, j) => i + j + gl + gv > k);
    const btts = sumar(m, (i, j) => (i + gl) > 0 && (j + gv) > 0);

    // Hándicap europeo: local con -1 gol de arranque.
    const h1 = sumar(m, (i, j) => i + gl - 1 > j + gv);
    const hx = sumar(m, (i, j) => i + gl - 1 === j + gv);
    const h2 = sumar(m, (i, j) => i + gl - 1 < j + gv);

    const L = ev.local, V = ev.visita;
    return [
      { id: '1x2', nombre: 'Resultado del partido', destacado: true, cols: 3,
        sel: [{ id: '1', lab: '1', p: p1, extra: L }, { id: 'X', lab: 'X', p: px, extra: 'Empate' }, { id: '2', lab: '2', p: p2, extra: V }] },
      { id: 'dobleop', nombre: 'Doble oportunidad', cols: 3,
        sel: [{ id: '1X', lab: '1X', p: p1 + px }, { id: '12', lab: '12', p: p1 + p2 }, { id: 'X2', lab: 'X2', p: px + p2 }] },
      { id: 'ou25', nombre: 'Total de goles 2.5', destacado: true, cols: 2,
        sel: [{ id: 'O2.5', lab: 'Más de 2.5', p: tot(2.5) }, { id: 'U2.5', lab: 'Menos de 2.5', p: 1 - tot(2.5) }] },
      { id: 'ou15', nombre: 'Total de goles 1.5', cols: 2,
        sel: [{ id: 'O1.5', lab: 'Más de 1.5', p: tot(1.5) }, { id: 'U1.5', lab: 'Menos de 1.5', p: 1 - tot(1.5) }] },
      { id: 'ou35', nombre: 'Total de goles 3.5', cols: 2,
        sel: [{ id: 'O3.5', lab: 'Más de 3.5', p: tot(3.5) }, { id: 'U3.5', lab: 'Menos de 3.5', p: 1 - tot(3.5) }] },
      { id: 'btts', nombre: 'Ambos equipos anotan', destacado: true, cols: 2,
        sel: [{ id: 'BTTS-S', lab: 'Sí', p: btts }, { id: 'BTTS-N', lab: 'No', p: 1 - btts }] },
      { id: 'hcp', nombre: 'Hándicap ' + L + ' (-1)', cols: 3,
        sel: [{ id: 'H1', lab: '1', p: h1 }, { id: 'HX', lab: 'X', p: hx }, { id: 'H2', lab: '2', p: h2 }] }
    ];
  }

  /* -------- Básquet: margen y total con normal -------- */
  function basket(ev) {
    const vivo = ev.vivo;
    const resta = vivo ? Math.max(0.03, (48 - ev.minuto) / 48) : 1;
    const dif = ev.marcador.l - ev.marcador.v;
    const spread = ev.modelo.spread * resta + dif;      // margen esperado final
    const total = ev.modelo.total * resta + ev.marcador.l + ev.marcador.v;
    const sd = 11.5 * Math.sqrt(resta);
    const sdT = 14 * Math.sqrt(resta);
    const pL = K.cdfNormal(spread / sd);
    const lineaH = Math.round(ev.modelo.spread * resta * 2) / 2 || 0.5;
    const lineaT = Math.round(total / 5) * 5 + 0.5;

    const pHL = K.cdfNormal((spread + lineaH) / sd);
    const pOver = 1 - K.cdfNormal((lineaT - total) / sdT);
    const L = ev.local, V = ev.visita;
    return [
      { id: 'ml', nombre: 'Ganador del partido', destacado: true, cols: 2,
        sel: [{ id: '1', lab: '1', p: pL, extra: L }, { id: '2', lab: '2', p: 1 - pL, extra: V }] },
      { id: 'hcp', nombre: 'Hándicap de puntos', destacado: true, cols: 2, linea: lineaH,
        sel: [{ id: 'H1', lab: L + ' ' + (-lineaH), p: pHL }, { id: 'H2', lab: V + ' +' + lineaH, p: 1 - pHL }] },
      { id: 'tot', nombre: 'Total de puntos ' + lineaT, destacado: true, cols: 2, linea: lineaT,
        sel: [{ id: 'O', lab: 'Más de ' + lineaT, p: pOver }, { id: 'U', lab: 'Menos de ' + lineaT, p: 1 - pOver }] }
    ];
  }

  /* -------- Tenis: del partido a sets y games -------- */
  function tenis(ev) {
    let p = ev.modelo.p1;
    if (ev.vivo) {
      // Cada game ganado mueve la probabilidad; el marcador manda.
      const d = ev.marcador.l - ev.marcador.v;
      p = K.clamp(p + d * 0.11, 0.02, 0.98);
    }
    // Probabilidad de set desde la del partido (al 3, aproximación numérica).
    let q = 0.5, lo = 0.01, hi = 0.99;
    for (let i = 0; i < 40; i++) {
      q = (lo + hi) / 2;
      const pm = q * q * (1 + 2 * (1 - q));
      if (pm < p) lo = q; else hi = q;
    }
    const dosSets = q * q + (1 - q) * (1 - q);            // 2-0 para cualquiera
    const L = ev.local, V = ev.visita;
    return [
      { id: 'ml', nombre: 'Ganador del partido', destacado: true, cols: 2,
        sel: [{ id: '1', lab: '1', p, extra: L }, { id: '2', lab: '2', p: 1 - p, extra: V }] },
      { id: 'sets', nombre: 'Total de sets 2.5', destacado: true, cols: 2,
        sel: [{ id: 'U2.5', lab: 'Menos de 2.5', p: dosSets }, { id: 'O2.5', lab: 'Más de 2.5', p: 1 - dosSets }] },
      { id: 'hcps', nombre: 'Hándicap de sets ±1.5', cols: 2, linea: 1.5,
        sel: [{ id: 'H1', lab: L + ' -1.5', p: q * q }, { id: 'H2', lab: V + ' +1.5', p: 1 - q * q }] }
    ];
  }

  /* -------- Series al mejor de N (eSports, vóley) -------- */
  function series(ev) {
    const bo = ev.modelo.bo || 3;
    const need = Math.ceil(bo / 2);
    let q = ev.modelo.q;
    if (ev.vivo) {
      const d = ev.marcador.l - ev.marcador.v;
      q = K.clamp(q + d * 0.13, 0.03, 0.97);
    }
    // Probabilidad de ganar la serie ganando "need" mapas antes que el rival.
    const comb = (n, k) => { let r = 1; for (let i = 0; i < k; i++) r = r * (n - i) / (i + 1); return r; };
    let pSerie = 0, p20 = 0;
    for (let perd = 0; perd < need; perd++) {
      const juegos = need + perd;
      const pr = comb(juegos - 1, perd) * Math.pow(q, need) * Math.pow(1 - q, perd);
      pSerie += pr;
      if (perd === 0) p20 = pr;
    }
    let pBarrida = p20 + Math.pow(1 - q, need);
    const L = ev.local, V = ev.visita;
    const uni = ev.deporte === 'volley' ? 'sets' : 'mapas';
    return [
      { id: 'ml', nombre: 'Ganador de la serie', destacado: true, cols: 2,
        sel: [{ id: '1', lab: '1', p: pSerie, extra: L }, { id: '2', lab: '2', p: 1 - pSerie, extra: V }] },
      { id: 'barrida', nombre: 'Serie sin ' + uni + ' en contra', destacado: true, cols: 2,
        sel: [{ id: 'SI', lab: 'Sí', p: pBarrida }, { id: 'NO', lab: 'No', p: 1 - pBarrida }] },
      { id: 'hcp', nombre: 'Hándicap de ' + uni + ' ±1.5', cols: 2,
        sel: [{ id: 'H1', lab: L + ' -1.5', p: p20 }, { id: 'H2', lab: V + ' +1.5', p: 1 - p20 }] }
    ];
  }

  /* -------------------------------------------------------
     Punto de entrada: devuelve mercados con cuota comercial
     ya calculada, incluyendo el sesgo por responsabilidad.
     ------------------------------------------------------- */
  function construir(ev) {
    const base = ev.deporte === 'futbol' ? futbol(ev)
      : ev.deporte === 'basket' ? basket(ev)
      : ev.deporte === 'tenis' ? tenis(ev)
      : series(ev);

    // El margen sube en vivo: menos información, más riesgo.
    const M = ev.margen + (ev.vivo ? 0.025 : 0);

    for (const merc of base) {
      const probs = merc.sel.map(s => s.p);
      const exp = merc.sel.map(s => (ev.exposicion && ev.exposicion[merc.id + '|' + s.id]) || 0);
      const totalExp = exp.reduce((a, b) => a + b, 0);
      const pesos = totalExp > 0 ? exp.map(e => e / totalExp) : null;
      const cs = cuotas(probs, M, pesos);
      merc.sel.forEach((s, i) => {
        s.cuota = cs[i];
        s.impl = implicita(cs[i]);
      });
      merc.overround = overround(cs);
      merc.margen = merc.overround - 1;
    }
    return base;
  }

  /* -------------------------------------------------------
     SuperCuota: combinación de "más de 2.5 goles" y "ambos
     anotan" con la cuota mejorada por encima del precio justo.
     Es una promoción de verdad, no una rebaja de mentira: la
     casa vende esa selección con margen negativo.
     ------------------------------------------------------- */
  function superCuota(ev) {
    if (ev.deporte !== 'futbol' || ev.vivo || ev.terminado) return null;
    const m = matriz(ev.modelo.lh, ev.modelo.la);
    const p = sumar(m, (i, j) => i + j > 2.5 && i > 0 && j > 0);
    if (p <= 0.02) return null;
    const justa = 1 / p;
    return {
      p,
      normal: Math.floor(justa / ev.margen * 100) / 100,   // lo que costaría con margen normal
      boost: Math.floor(justa * 1.24 * 100) / 100          // lo que paga la promo
    };
  }

  return { construir, cuotas, overround, implicita, cashout, poisson, matriz, superCuota };
})();
