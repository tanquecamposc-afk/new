/* ===========================================================
   games/rueda.js — game shows de rueda (Crazy Time, Monopoly
   Live, Mega Wheel, Candyland)
   El pago de cada casilla se calcula desde su frecuencia real
   en la rueda, con 96% de retorno teórico.
   =========================================================== */
K.Juegos = K.Juegos || {};
K.Juegos.rueda = function (root, juego) {
  const segs = juego.cfg.segmentos;
  const total = segs.reduce((a, s) => a + s.p, 0);
  const RTP = 0.96;
  const pago = s => Math.round(RTP * total / s.p * 100) / 100;

  const COLORES = ['#25d07a', '#4aa8ff', '#ffc247', '#ff6ec7', '#a678ff', '#ff5c5c', '#19a862', '#5f6f8a'];

  /* La rueda repite cada segmento tantas veces como su frecuencia. */
  const casillas = [];
  segs.forEach((s, i) => { for (let k = 0; k < s.p; k++) casillas.push(i); });
  const orden = K.mezcla(casillas);

  let elegido = 0;
  const monto = K.G.inputMonto(5);
  const sPago = K.G.stat('Pago de tu casilla', pago(segs[0]) + '×');
  const sProb = K.G.stat('Probabilidad', K.pct(segs[0].p / total));
  const sUlt = K.G.stat('Última rueda', '—');

  const btn = K.el('button', { class: 'btn', text: 'Girar la rueda' });
  const panel = K.el('div', { class: 'panel-apuesta' }, [monto.wrap, btn,
    K.el('div', { style: 'height:1px;background:var(--linea);margin:2px 0' }),
    sPago.fila, sProb.fila, sUlt.fila]);

  const opciones = K.el('div', { class: 'opciones' });
  const botonesOp = segs.map((s, i) => {
    const b = K.el('button', { class: i === 0 ? 'on' : '', onclick: () => elegir(i) }, [
      K.el('span', { text: s.l }), K.el('i', { text: pago(s) + '× · ' + K.pct(s.p / total, 0) })
    ]);
    opciones.appendChild(b);
    return b;
  });
  function elegir(i) {
    elegido = i;
    botonesOp.forEach((b, k) => b.classList.toggle('on', k === i));
    sPago.set(pago(segs[i]) + '×');
    sProb.set(K.pct(segs[i].p / total));
  }

  const cv = K.el('canvas');
  const zona = K.el('div', { class: 'zona-juego' }, [
    K.el('div', { class: 'rueda-lienzo' }, [cv]),
    K.el('div', { class: 'resultado', id: 'res-rueda' }),
    opciones
  ]);
  const nRes = K.$('#res-rueda', zona);
  const ctx = cv.getContext('2d');
  let angulo = 0, girando = false;

  function dimensionar() {
    const r = cv.parentElement.getBoundingClientRect();
    cv.width = Math.max(300, r.width) * devicePixelRatio;
    cv.height = Math.max(280, r.height) * devicePixelRatio;
  }

  function pintar() {
    const W = cv.width, H = cv.height, p = devicePixelRatio;
    const cx = W / 2, cy = H / 2 + 10 * p, R = Math.min(W, H) / 2 - 22 * p;
    ctx.clearRect(0, 0, W, H);
    const paso = Math.PI * 2 / orden.length;
    orden.forEach((idx, i) => {
      const a0 = angulo + i * paso, a1 = a0 + paso;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, R, a0, a1);
      ctx.closePath();
      ctx.fillStyle = COLORES[idx % COLORES.length];
      ctx.globalAlpha = idx === elegido ? 1 : .55;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = 'rgba(0,0,0,.35)';
      ctx.lineWidth = 1 * p;
      ctx.stroke();
    });
    ctx.beginPath(); ctx.arc(cx, cy, R * 0.32, 0, 7);
    ctx.fillStyle = '#121924'; ctx.fill();
    ctx.strokeStyle = '#26334a'; ctx.lineWidth = 2 * p; ctx.stroke();
    ctx.fillStyle = '#e9eef7';
    ctx.font = '800 ' + (13 * p) + 'px system-ui';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(segs[elegido].l, cx, cy);
    // aguja
    ctx.beginPath();
    ctx.moveTo(cx - 10 * p, cy - R - 6 * p);
    ctx.lineTo(cx + 10 * p, cy - R - 6 * p);
    ctx.lineTo(cx, cy - R + 12 * p);
    ctx.closePath();
    ctx.fillStyle = '#ffc247'; ctx.fill();
  }

  function girar() {
    if (girando) return;
    const apuesta = monto.get();
    if (!K.G.apostar(apuesta)) return;
    girando = true; btn.disabled = true; nRes.textContent = '';

    const destino = Math.floor(Math.random() * orden.length);
    const paso = Math.PI * 2 / orden.length;
    // La aguja mira hacia arriba: -PI/2. Se calcula el ángulo final exacto.
    const objetivo = -Math.PI / 2 - (destino + 0.5) * paso + Math.PI * 2 * 6;
    const inicio = angulo % (Math.PI * 2);
    const t0 = performance.now(), dur = 4200;
    const paso2 = ahora => {
      const f = Math.min(1, (ahora - t0) / dur);
      const suave = 1 - Math.pow(1 - f, 3.2);
      angulo = inicio + (objetivo - inicio) * suave;
      pintar();
      if (f < 1) requestAnimationFrame(paso2); else resolver(destino, apuesta);
    };
    requestAnimationFrame(paso2);
  }

  function resolver(destino, apuesta) {
    const idx = orden[destino];
    const s = segs[idx];
    sUlt.set(s.l);
    if (idx === elegido) {
      const premio = K.round2(apuesta * pago(s));
      K.G.pagar(premio, juego.nom + ' · ' + s.l);
      nRes.innerHTML = `<span style="color:var(--acento)">Salió ${K.esc(s.l)} · ganaste ${K.sol(premio)}</span>`;
      K.aviso('🎡 ' + K.esc(juego.nom) + ': salió ' + K.esc(s.l) + ' · ' + K.sol(premio));
    } else {
      nRes.innerHTML = `<span style="color:var(--tenue)">Salió ${K.esc(s.l)} · tú tenías ${K.esc(segs[elegido].l)}</span>`;
    }
    girando = false; btn.disabled = false;
  }

  btn.onclick = girar;
  root.appendChild(K.el('div', { class: 'juego-layout' }, [panel, zona]));
  root.appendChild(K.G.nota(`<h4>De la frecuencia al pago</h4>
    La rueda tiene <b>${orden.length}</b> casillas repartidas entre ${segs.length} resultados. El pago
    de cada uno sale de <code>0.96 × ${orden.length} / casillas del resultado</code>, así que todas las
    opciones devuelven el mismo <b>96%</b> a la larga: apostar al segmento raro solo cambia la varianza,
    nunca el valor esperado.`));
  dimensionar(); pintar();
  const ro = new ResizeObserver(() => { dimensionar(); pintar(); });
  ro.observe(cv.parentElement);
  return () => ro.disconnect();
};
