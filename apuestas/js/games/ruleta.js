/* ===========================================================
   games/ruleta.js — ruleta europea completa
   · Rueda dibujada con el orden real de casillas
   · Bola que gira al revés, desacelera, rebota y cae en su casilla
   · Paño de apuestas con fichas: plenos, docenas, columnas y
     apuestas exteriores, varias a la vez
   · Variante "rayos" (Lightning / Mega Fire Blaze)
   =========================================================== */
K.Juegos = K.Juegos || {};
K.Juegos.ruleta = function (root, juego) {
  const rayosOn = !!(juego.cfg && juego.cfg.rayos);

  /* Orden real de una rueda europea, empezando por el cero. */
  const RUEDA = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23,
    10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
  const ROJOS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
  const color = n => n === 0 ? 'verde' : ROJOS.has(n) ? 'rojo' : 'negro';
  const PASO = Math.PI * 2 / RUEDA.length;

  /* ---------------- apuestas disponibles ---------------- */
  const PAGO_PLENO = rayosOn ? 30 : 36;      // pago total, con la apuesta incluida
  const cubre = {
    rojo: n => color(n) === 'rojo',
    negro: n => color(n) === 'negro',
    par: n => n !== 0 && n % 2 === 0,
    impar: n => n % 2 === 1,
    bajo: n => n >= 1 && n <= 18,
    alto: n => n >= 19
  };
  function resuelve(spot, n) {
    if (spot.startsWith('n:')) return n === Number(spot.slice(2));
    if (spot.startsWith('doc:')) { const d = Number(spot.slice(4)); return n >= (d - 1) * 12 + 1 && n <= d * 12; }
    if (spot.startsWith('col:')) { const c = Number(spot.slice(4)); return n !== 0 && n % 3 === (c % 3); }
    return cubre[spot] ? cubre[spot](n) : false;
  }
  const pagoDe = spot => spot.startsWith('n:') ? PAGO_PLENO
    : (spot.startsWith('doc:') || spot.startsWith('col:')) ? 3 : 2;

  /* ---------------- estado ---------------- */
  let fichaSel = 5, apuestas = {}, ultimas = [], girando = false, mapaRayos = {};
  let anguloRueda = 0, anguloBola = 0, radioBola = 0.86, resultado = null;
  const total = () => Object.values(apuestas).reduce((a, b) => a + b, 0);

  /* ---------------- panel lateral ---------------- */
  const sTotal = K.G.stat('En el paño', K.sol(0));
  const sSpots = K.G.stat('Apuestas puestas', '0');
  const sUlt = K.G.stat('Último número', '—');
  const sNeto = K.G.stat('Resultado neto', K.sol(0));
  let neto = 0;

  const fichas = K.el('div', { class: 'fichas' });
  [1, 5, 25, 100].forEach(v => {
    const f = K.el('button', { class: 'ficha c' + v + (v === fichaSel ? ' on' : ''), text: v });
    f.onclick = () => {
      fichaSel = v;
      K.$$('.ficha', fichas).forEach(x => x.classList.toggle('on', Number(x.textContent) === v));
    };
    fichas.appendChild(f);
  });

  const btnGirar = K.el('button', { class: 'btn bloque', text: 'Girar la ruleta' });
  const btnDeshacer = K.el('button', { class: 'btn sec chico', text: 'Deshacer' });
  const btnRepetir = K.el('button', { class: 'btn sec chico', text: 'Repetir' });
  const btnLimpiar = K.el('button', { class: 'btn sec chico', text: 'Limpiar' });

  const panel = K.el('div', { class: 'panel-apuesta' }, [
    K.el('div', { class: 'campo' }, [K.el('label', { text: 'Ficha' }), fichas]),
    btnGirar,
    K.el('div', { class: 'trio' }, [btnDeshacer, btnRepetir, btnLimpiar]),
    K.el('div', { class: 'separador' }),
    sTotal.fila, sSpots.fila, sUlt.fila, sNeto.fila
  ]);

  /* ---------------- rueda ---------------- */
  const cv = K.el('canvas');
  const bolaCentro = K.el('div', { class: 'ruleta-resultado', text: '—' });
  const lienzo = K.el('div', { class: 'ruleta-lienzo' }, [cv, bolaCentro]);
  const ctx = cv.getContext('2d');

  function dimensionar() {
    const r = lienzo.getBoundingClientRect();
    const lado = Math.max(240, Math.min(r.width, 420));
    cv.width = lado * devicePixelRatio;
    cv.height = lado * devicePixelRatio;
  }

  function pintarRueda() {
    const W = cv.width, H = cv.height, p = devicePixelRatio;
    const cx = W / 2, cy = H / 2, R = W / 2 - 4 * p;
    ctx.clearRect(0, 0, W, H);

    // aro exterior de madera
    const aro = ctx.createRadialGradient(cx, cy, R * 0.78, cx, cy, R);
    aro.addColorStop(0, '#5a3418');
    aro.addColorStop(.55, '#8a5426');
    aro.addColorStop(1, '#3a2110');
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.fillStyle = aro; ctx.fill();

    // pista de la bola
    ctx.beginPath(); ctx.arc(cx, cy, R * 0.895, 0, 7);
    ctx.fillStyle = '#20140a'; ctx.fill();

    const Rp = R * 0.86;            // borde exterior de las casillas
    const Ri = R * 0.55;            // borde interior
    RUEDA.forEach((n, i) => {
      const a0 = anguloRueda + i * PASO, a1 = a0 + PASO;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a0) * Ri, cy + Math.sin(a0) * Ri);
      ctx.arc(cx, cy, Rp, a0, a1);
      ctx.arc(cx, cy, Ri, a1, a0, true);
      ctx.closePath();
      const c = color(n);
      ctx.fillStyle = c === 'verde' ? '#15803d' : c === 'rojo' ? '#b81d1d' : '#141c29';
      ctx.fill();
      ctx.strokeStyle = 'rgba(214,190,150,.55)';
      ctx.lineWidth = 1.1 * p;
      ctx.stroke();

      // número, en radial
      const am = a0 + PASO / 2;
      ctx.save();
      ctx.translate(cx + Math.cos(am) * (Rp - 13 * p), cy + Math.sin(am) * (Rp - 13 * p));
      ctx.rotate(am + Math.PI / 2);
      ctx.fillStyle = '#fff';
      ctx.font = '800 ' + (11.5 * p) + 'px Archivo, system-ui';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(String(n), 0, 0);
      ctx.restore();

      // rayo del modo Lightning
      if (mapaRayos[n]) {
        ctx.save();
        ctx.translate(cx + Math.cos(am) * (Ri + 11 * p), cy + Math.sin(am) * (Ri + 11 * p));
        ctx.rotate(am + Math.PI / 2);
        ctx.fillStyle = '#fbbf24';
        ctx.font = '900 ' + (8 * p) + 'px Archivo, system-ui';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(mapaRayos[n] + '×', 0, 0);
        ctx.restore();
      }
    });

    // cono central con radios
    const cono = ctx.createRadialGradient(cx - R * .08, cy - R * .1, R * .04, cx, cy, Ri);
    cono.addColorStop(0, '#b7a179');
    cono.addColorStop(.45, '#6d5636');
    cono.addColorStop(1, '#2c2013');
    ctx.beginPath(); ctx.arc(cx, cy, Ri, 0, 7); ctx.fillStyle = cono; ctx.fill();
    ctx.save();
    ctx.translate(cx, cy); ctx.rotate(anguloRueda);
    ctx.strokeStyle = 'rgba(255,240,215,.35)';
    ctx.lineWidth = 2.4 * p;
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * Ri * .28, Math.sin(a) * Ri * .28);
      ctx.lineTo(Math.cos(a) * Ri * .95, Math.sin(a) * Ri * .95);
      ctx.stroke();
    }
    ctx.restore();
    ctx.beginPath(); ctx.arc(cx, cy, Ri * .34, 0, 7);
    const centro = ctx.createRadialGradient(cx - Ri * .1, cy - Ri * .12, Ri * .04, cx, cy, Ri * .34);
    centro.addColorStop(0, '#3b4a63'); centro.addColorStop(1, '#0d1422');
    ctx.fillStyle = centro; ctx.fill();
    ctx.strokeStyle = 'rgba(214,190,150,.45)'; ctx.lineWidth = 1.4 * p; ctx.stroke();

    // bola
    const rb = R * radioBola;
    const bx = cx + Math.cos(anguloBola) * rb, by = cy + Math.sin(anguloBola) * rb;
    ctx.beginPath(); ctx.arc(bx, by, 6.5 * p, 0, 7);
    const gb = ctx.createRadialGradient(bx - 2 * p, by - 2 * p, 1, bx, by, 7 * p);
    gb.addColorStop(0, '#ffffff'); gb.addColorStop(1, '#b9bfcb');
    ctx.fillStyle = gb; ctx.fill();
    ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 6 * p;
    ctx.fill(); ctx.shadowBlur = 0;
  }

  /* ---------------- paño de apuestas ---------------- */
  const pano = K.el('div', { class: 'pano' });
  const spotsNodo = {};

  function ficha(spot, contenedor) {
    let f = spotsNodo[spot];
    if (!f) return;
    const monto = apuestas[spot] || 0;
    let badge = f.querySelector('.ficha-puesta');
    if (monto <= 0) { if (badge) badge.remove(); return; }
    if (!badge) {
      badge = K.el('span', { class: 'ficha-puesta' });
      f.appendChild(badge);
    }
    badge.textContent = monto;
  }

  /* Al pasar por encima de una apuesta se marcan los números que cubre. */
  function marcarCobertura(spot, on) {
    for (let n = 0; n <= 36; n++) {
      const nodo = spotsNodo['n:' + n];
      if (nodo) nodo.classList.toggle('cubierto', on && resuelve(spot, n));
    }
  }
  function conCobertura(nodo, spot) {
    nodo.addEventListener('mouseenter', () => marcarCobertura(spot, true));
    nodo.addEventListener('mouseleave', () => marcarCobertura(spot, false));
    return nodo;
  }

  function apostarEn(spot) {
    if (girando) return;
    apuestas[spot] = K.round2((apuestas[spot] || 0) + fichaSel);
    historialFichas.push(spot);
    ficha(spot);
    refrescarTotales();
  }
  const historialFichas = [];

  function celdaNumero(n) {
    const b = K.el('button', {
      class: 'pano-num ' + color(n), text: String(n),
      onclick: () => apostarEn('n:' + n),
      title: 'Pleno al ' + n + ' · paga ' + PAGO_PLENO + '×'
    });
    spotsNodo['n:' + n] = b;
    return b;
  }

  function construirPano() {
    pano.innerHTML = '';
    const arriba = K.el('div', { style: 'display:grid;grid-template-columns:34px repeat(12,minmax(24px,1fr)) 42px;gap:4px' });
    // cero, alto como las tres filas
    const cero = K.el('button', {
      class: 'pano-num cero', text: '0',
      style: 'grid-row:1 / span 3;height:auto',
      onclick: () => apostarEn('n:0')
    });
    spotsNodo['n:0'] = cero;
    arriba.appendChild(cero);

    // filas: la de arriba termina en 3, 6, 9…
    for (let fila = 0; fila < 3; fila++) {
      for (let col = 0; col < 12; col++) {
        const n = col * 3 + (3 - fila);
        const c = celdaNumero(n);
        c.style.gridRow = String(fila + 1);
        c.style.gridColumn = String(col + 2);
        arriba.appendChild(c);
      }
      const colId = 'col:' + (3 - fila);
      const colBtn = K.el('button', {
        class: 'pano-ext', html: '2:1',
        style: `grid-row:${fila + 1};grid-column:14`,
        onclick: () => apostarEn(colId),
        title: 'Columna · paga 3×'
      });
      spotsNodo[colId] = colBtn;
      arriba.appendChild(conCobertura(colBtn, colId));
    }
    pano.appendChild(arriba);

    const docenas = K.el('div', { class: 'pano-fila', style: 'grid-template-columns:34px repeat(3,1fr) 42px' });
    docenas.appendChild(K.el('span'));
    [['1ª docena', 1], ['2ª docena', 2], ['3ª docena', 3]].forEach(([t, d]) => {
      const id = 'doc:' + d;
      const b = K.el('button', { class: 'pano-ext', text: t, onclick: () => apostarEn(id), title: 'Paga 3×' });
      spotsNodo[id] = b;
      docenas.appendChild(conCobertura(b, id));
    });
    docenas.appendChild(K.el('span'));
    pano.appendChild(docenas);

    const ext = K.el('div', { class: 'pano-fila', style: 'grid-template-columns:34px repeat(6,1fr) 42px' });
    ext.appendChild(K.el('span'));
    [['1-18', 'bajo', ''], ['PAR', 'par', ''], ['ROJO', 'rojo', 'rojo'],
     ['NEGRO', 'negro', 'negro'], ['IMPAR', 'impar', ''], ['19-36', 'alto', '']]
      .forEach(([t, id, cls]) => {
        const b = K.el('button', { class: 'pano-ext ' + cls, text: t, onclick: () => apostarEn(id), title: 'Paga 2×' });
        spotsNodo[id] = b;
        ext.appendChild(conCobertura(b, id));
      });
    ext.appendChild(K.el('span'));
    pano.appendChild(ext);
  }

  function refrescarTotales() {
    sTotal.set(K.sol(total()));
    sSpots.set(String(Object.keys(apuestas).filter(k => apuestas[k] > 0).length));
    btnGirar.textContent = total() > 0 ? 'Girar por ' + K.sol(total()) : 'Girar la ruleta';
  }
  function limpiarFichas() {
    apuestas = {}; historialFichas.length = 0;
    Object.keys(spotsNodo).forEach(s => ficha(s));
    refrescarTotales();
  }

  /* ---------------- giro ---------------- */
  const historial = K.el('div', { class: 'historial-ruleta' });
  const rayosCaja = K.el('div', { class: 'rayos-caja' });
  const mensaje = K.el('div', { class: 'resultado' });

  function pintarHistorial() {
    historial.innerHTML = '';
    ultimas.slice(0, 14).forEach(n =>
      historial.appendChild(K.el('span', { class: 'bola-hist ' + color(n), text: n })));
  }

  function sortearRayos() {
    mapaRayos = {};
    K.$$('.pano-num', pano).forEach(b => { b.classList.remove('rayo'); const r = b.querySelector('.rayo-mult'); if (r) r.remove(); });
    if (!rayosOn) return;
    const cuantos = K.entero(1, 5);
    K.mezcla([...Array(37).keys()]).slice(0, cuantos).forEach(n => {
      mapaRayos[n] = K.elige([50, 50, 100, 100, 150, 200, 300, 500]);
      const b = spotsNodo['n:' + n];
      if (b) {
        b.classList.add('rayo');
        b.appendChild(K.el('span', { class: 'rayo-mult', text: mapaRayos[n] + '×' }));
      }
    });
    rayosCaja.innerHTML = Object.entries(mapaRayos)
      .map(([n, m]) => `<span class="rayo-pill">${n} · ${m}×</span>`).join('');
  }

  const suave = t => 1 - Math.pow(1 - t, 3.4);

  async function girar() {
    if (girando) return;
    const apostado = total();
    if (apostado <= 0) { K.aviso('Pon al menos una ficha en el paño.', 'warn'); return; }
    if (!K.G.apostar(apostado)) return;

    girando = true;
    btnGirar.disabled = true;
    mensaje.textContent = '';
    bolaCentro.textContent = '—';
    bolaCentro.className = 'ruleta-resultado';

    const idx = K.entero(0, RUEDA.length - 1);
    resultado = RUEDA[idx];

    const DUR = 5200;
    const wRueda0 = anguloRueda;
    const dRueda = Math.PI * 2 * 5.5;
    const wRuedaFin = wRueda0 + dRueda;
    // La bola tiene que terminar justo sobre el centro de su casilla.
    const anguloFinal = wRuedaFin + (idx + 0.5) * PASO;
    const dBola = Math.PI * 2 * 9;
    const bola0 = anguloFinal + dBola;

    const t0 = performance.now();
    await new Promise(fin => {
      const paso = ahora => {
        const t = Math.min(1, (ahora - t0) / DUR);
        const e = suave(t);
        anguloRueda = wRueda0 + dRueda * e;
        anguloBola = bola0 - dBola * e;
        // La bola baja de la pista al plato en el último tramo, con dos rebotes.
        if (t < 0.62) radioBola = 0.895;
        else {
          const u = (t - 0.62) / 0.38;
          const caida = 0.895 - (0.895 - 0.72) * suave(u);
          const rebote = u < 0.75 ? Math.abs(Math.sin(u * Math.PI * 3)) * 0.035 * (1 - u) : 0;
          radioBola = caida + rebote;
        }
        pintarRueda();
        if (t < 1) requestAnimationFrame(paso); else fin();
      };
      requestAnimationFrame(paso);
    });

    liquidar(resultado, apostado);
    girando = false;
    btnGirar.disabled = false;
  }

  function liquidar(n, apostado) {
    const c = color(n);
    bolaCentro.textContent = n;
    bolaCentro.className = 'ruleta-resultado ' + c;
    ultimas.unshift(n);
    if (ultimas.length > 20) ultimas.length = 20;
    sUlt.set(n + ' · ' + c);
    pintarHistorial();

    let premio = 0;
    const detalle = [];
    for (const [spot, monto] of Object.entries(apuestas)) {
      if (!monto || !resuelve(spot, n)) continue;
      let mult = pagoDe(spot);
      if (spot === 'n:' + n && mapaRayos[n]) mult = mapaRayos[n];
      const p = K.round2(monto * mult);
      premio += p;
      detalle.push(`${nombreSpot(spot)} ${mult}× → ${K.sol(p)}`);
    }
    premio = K.round2(premio);
    if (premio > 0) {
      K.G.pagar(premio, juego.nom + ' · ' + n);
      mensaje.innerHTML = `<span style="color:var(--verde-2)">Salió el ${n} (${c}) · cobras ${K.sol(premio)}</span>
        <div style="font-size:11.5px;color:var(--tenue);font-weight:500;margin-top:3px">${detalle.join(' · ')}</div>`;
      K.aviso('Salió el ' + n + ' · ' + K.sol(premio), 'ok');
      if (K.Progreso) K.Progreso.registrar('ruleta', {});
      if (premio >= apostado * 8) K.confeti(90);
    } else {
      mensaje.innerHTML = `<span style="color:var(--tenue)">Salió el ${n} (${c}) · no entró ninguna de tus fichas</span>`;
    }
    neto = K.round2(neto + premio - apostado);
    sNeto.set(K.sol(neto));

    // resaltar el número ganador un momento
    const nodo = spotsNodo['n:' + n];
    if (nodo) {
      nodo.style.boxShadow = '0 0 0 3px var(--ambar)';
      setTimeout(() => nodo.style.boxShadow = '', 2200);
    }
    K.G.anotar(juego.id, n);
    sortearRayos();
  }

  const nombreSpot = s => s.startsWith('n:') ? 'Pleno ' + s.slice(2)
    : s.startsWith('doc:') ? s.slice(4) + 'ª docena'
    : s.startsWith('col:') ? 'Columna ' + s.slice(4)
    : ({ rojo: 'Rojo', negro: 'Negro', par: 'Par', impar: 'Impar', bajo: '1-18', alto: '19-36' })[s] || s;

  btnGirar.onclick = girar;
  btnDeshacer.onclick = () => {
    const s = historialFichas.pop();
    if (!s) return;
    apuestas[s] = K.round2(Math.max(0, (apuestas[s] || 0) - fichaSel));
    ficha(s); refrescarTotales();
  };
  btnLimpiar.onclick = limpiarFichas;
  btnRepetir.onclick = () => {
    if (girando) return;
    const copia = { ...apuestas };
    Object.entries(copia).forEach(([s, m]) => { apuestas[s] = K.round2((apuestas[s] || 0) + m); ficha(s); });
    refrescarTotales();
  };

  construirPano();
  sortearRayos();

  const zona = K.el('div', { class: 'zona-juego' }, [
    K.el('div', { class: 'ruleta-arriba' }, [
      K.el('div', { class: 'ruleta-col' }, [lienzo]),
      K.el('div', { class: 'ruleta-datos' }, [
        K.el('div', { class: 'et-hist', text: 'Últimos números' }),
        historial, rayosCaja, mensaje
      ])
    ]),
    pano
  ]);

  root.appendChild(K.el('div', { class: 'juego-layout' }, [panel, zona]));
  root.appendChild(K.el('div', {
    class: 'info-juego', html: `<h4>De dónde sale la ventaja</h4>
    La rueda tiene 37 casillas pero el rojo paga como si hubiera 36: ganas 18 de 37 veces y cobras el
    doble, o sea <code>18/37 × 2 = 97.3%</code>. Ese <b>2.7%</b> es la ventaja de la casa y sale entero
    del cero. Da igual la apuesta que elijas: pleno, docena o color devuelven exactamente lo mismo a la
    larga, solo cambia cada cuánto ganas.
    ${rayosOn ? '<p style="margin-top:8px">En la versión con rayos el pleno baja de 36× a 30×. Esa rebaja ' +
      'financia los multiplicadores que se sortean antes de cada giro, así que el retorno total queda parecido: ' +
      'lo que cambia es que ahora casi todo el premio se concentra en muy pocos giros.</p>' : ''}` }));

  dimensionar(); pintarRueda(); refrescarTotales(); pintarHistorial();
  const ro = new ResizeObserver(() => { dimensionar(); pintarRueda(); });
  ro.observe(lienzo);
  return () => ro.disconnect();
};
