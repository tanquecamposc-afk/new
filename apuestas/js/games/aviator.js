/* ===========================================================
   games/aviator.js — motor crash (Aviator, Spaceman,
   Balloon y Maverick comparten esta base)
   =========================================================== */
K.Juegos = K.Juegos || {};
K.Juegos.aviator = function (root, juego) {
  const cfg = juego.cfg || {};
  const tema = cfg.tema || 'avion';
  const icono = tema === 'globo' ? '🎈' : tema === 'space' ? '🧑‍🚀' : tema === 'rapido' ? '🛩️' : '✈️';
  const vel = cfg.veloz ? 0.155 : 0.085;      // crecimiento del multiplicador por segundo

  const monto = K.G.inputMonto(5);
  const inpAuto = K.el('input', { type: 'number', min: '1.01', step: '0.1', value: '2.00', placeholder: '2.00' });
  const chkAuto = K.el('input', { type: 'checkbox' });
  const sEstado = K.G.stat('Estado', 'Esperando');
  const sCobro = K.G.stat('Cobro actual', K.sol(0));
  const sMejor = K.G.stat('Mejor ronda', '—');

  const btn = K.el('button', { class: 'btn', text: 'Apostar y despegar' });
  const btnMitad = cfg.mitad ? K.el('button', { class: 'btn sec', text: 'Cobrar 50%' }) : null;
  if (btnMitad) btnMitad.disabled = true;

  const panel = K.el('div', { class: 'panel-apuesta' }, [
    monto.wrap,
    K.el('div', { class: 'campo' }, [
      K.el('label', { text: 'Auto-cashout' }),
      K.el('div', { style: 'display:flex;gap:8px;align-items:center' }, [chkAuto, inpAuto])
    ]),
    btn, btnMitad,
    K.el('div', { style: 'height:1px;background:var(--linea);margin:2px 0' }),
    sEstado.fila, sCobro.fila, sMejor.fila
  ]);

  const cv = K.el('canvas');
  const grande = K.el('div', { class: 'mult-grande' }, [
    K.el('div', { class: 'n', text: '1.00×' }),
    K.el('div', { class: 'est', text: 'listo para despegar' })
  ]);
  const lienzo = K.el('div', { class: 'aviator-lienzo' }, [cv, grande]);
  const hist = K.el('div', { class: 'historial-mult' });
  const zona = K.el('div', { class: 'zona-juego' }, [lienzo, hist]);
  const nNum = K.$('.n', grande), nEst = K.$('.est', grande);

  const ctx = cv.getContext('2d');
  let apuesta = 0, activo = false, mult = 1, crash = 0, t0 = 0, raf = 0, mitadCobrada = false, vivo = true;

  function dimensionar() {
    const r = lienzo.getBoundingClientRect();
    cv.width = Math.max(300, r.width) * devicePixelRatio;
    cv.height = Math.max(220, r.height) * devicePixelRatio;
  }

  function dibujar(prog) {
    const W = cv.width, H = cv.height, p = devicePixelRatio;
    ctx.clearRect(0, 0, W, H);
    // rejilla de fondo
    ctx.strokeStyle = 'rgba(255,255,255,.05)';
    ctx.lineWidth = 1 * p;
    for (let i = 1; i < 6; i++) {
      const y = H * i / 6;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
    const margen = 40 * p;
    const x0 = margen, y0 = H - margen;
    const ancho = W - margen * 2, alto = H - margen * 2;
    const av = Math.min(1, prog);
    // curva exponencial normalizada
    const puntos = [];
    for (let i = 0; i <= 60; i++) {
      const f = (i / 60) * av;
      puntos.push([x0 + ancho * f, y0 - alto * Math.pow(f, 1.7)]);
    }
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    puntos.forEach(([x, y]) => ctx.lineTo(x, y));
    ctx.lineTo(puntos.length ? puntos[puntos.length - 1][0] : x0, y0);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, vivo ? 'rgba(37,208,122,.35)' : 'rgba(255,92,92,.3)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(x0, y0);
    puntos.forEach(([x, y]) => ctx.lineTo(x, y));
    ctx.strokeStyle = vivo ? '#25d07a' : '#ff5c5c';
    ctx.lineWidth = 3 * p;
    ctx.stroke();

    const punta = puntos[puntos.length - 1] || [x0, y0];
    ctx.font = (26 * p) + 'px serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(vivo ? icono : '💥', punta[0], punta[1] - 12 * p);
  }

  function pintarHistorial() {
    hist.innerHTML = '';
    K.G.historial(juego.id).slice(0, 16).forEach(v =>
      hist.appendChild(K.el('span', { class: 'pill ' + K.G.claseMult(v), text: K.dec(v) + '×' })));
  }

  function despegar() {
    apuesta = monto.get();
    if (!K.G.apostar(apuesta)) return;
    crash = K.G.crashAleatorio(0.97);
    mult = 1; activo = true; vivo = true; mitadCobrada = false; t0 = performance.now();
    btn.textContent = 'Cobrar ' + K.sol(apuesta);
    btn.className = 'btn';
    if (btnMitad) btnMitad.disabled = false;
    sEstado.set('En vuelo');
    nEst.textContent = 'en vuelo';
    bucle();
  }

  function bucle() {
    const paso = ahora => {
      if (!activo) return;
      const t = (ahora - t0) / 1000;
      mult = K.round2(Math.exp(vel * t * (1 + t / 22)));
      if (mult >= crash) { reventar(); return; }
      nNum.textContent = K.dec(mult) + '×';
      nNum.style.color = 'var(--texto)';
      sCobro.set(K.sol(apuesta * mult));
      btn.textContent = 'Cobrar ' + K.sol(apuesta * mult);
      dibujar(Math.min(0.96, Math.log(mult) / Math.log(Math.max(crash, 6)) * 0.9 + t / 60));
      if (chkAuto.checked && mult >= (Number(inpAuto.value) || 0) && (Number(inpAuto.value) || 0) > 1) { cobrar(); return; }
      raf = requestAnimationFrame(paso);
    };
    raf = requestAnimationFrame(paso);
  }

  function cobrar() {
    if (!activo) return;
    const m = mult;
    const premio = K.round2(apuesta * m);
    K.G.pagar(premio, juego.nom + ' ' + K.dec(m) + '×');
    K.aviso(`${icono} Cobraste ${K.sol(premio)} en ${K.dec(m)}×`);
    nEst.textContent = 'cobrado en ' + K.dec(m) + '×';
    cerrarRonda(m, true);
  }

  function cobrarMitad() {
    if (!activo || mitadCobrada) return;
    mitadCobrada = true;
    const premio = K.round2(apuesta / 2 * mult);
    K.G.pagar(premio, juego.nom + ' · mitad a ' + K.dec(mult) + '×');
    apuesta = K.round2(apuesta / 2);
    K.aviso('Cobraste la mitad: ' + K.sol(premio));
    btnMitad.disabled = true;
  }

  function reventar() {
    vivo = false;
    nNum.textContent = K.dec(crash) + '×';
    nNum.style.color = 'var(--rojo)';
    nEst.textContent = tema === 'globo' ? 'reventó' : 'se fue';
    dibujar(0.96);
    K.aviso('💥 Se fue en ' + K.dec(crash) + '× · perdiste ' + K.sol(apuesta), 'err');
    cerrarRonda(crash, false);
  }

  function cerrarRonda(valor, gano) {
    activo = false;
    cancelAnimationFrame(raf);
    K.G.anotar(juego.id, gano ? valor : crash);
    const h = K.G.historial(juego.id);
    sMejor.set(h.length ? K.dec(Math.max(...h)) + '×' : '—');
    pintarHistorial();
    btn.textContent = 'Apostar y despegar';
    if (btnMitad) btnMitad.disabled = true;
    sEstado.set('Esperando');
    sCobro.set(K.sol(0));
    setTimeout(() => { if (!activo) { nNum.textContent = '1.00×'; nNum.style.color = ''; nEst.textContent = 'listo para despegar'; vivo = true; dibujar(0); } }, 1600);
  }

  btn.onclick = () => activo ? cobrar() : despegar();
  if (btnMitad) btnMitad.onclick = cobrarMitad;

  root.appendChild(K.el('div', { class: 'juego-layout' }, [panel, zona]));
  root.appendChild(K.G.nota(`<h4>Cómo se decide el vuelo</h4>
    El punto de caída se sortea antes del despegue con <code>P(x ≥ m) = 0.97 / m</code>: hay un 3% de
    rondas que mueren en 1.00× y el retorno teórico queda en <b>97%</b>. El multiplicador que ves
    subir es solo la animación de un número que ya estaba decidido, así que salir tarde no "empuja"
    nada. El auto-cashout existe justamente para no depender de tu reflejo.`));

  dimensionar();
  dibujar(0);
  pintarHistorial();
  const h = K.G.historial(juego.id);
  if (h.length) sMejor.set(K.dec(Math.max(...h)) + '×');
  const ro = new ResizeObserver(() => { dimensionar(); dibujar(activo ? 0.5 : 0); });
  ro.observe(lienzo);
  return () => { activo = false; cancelAnimationFrame(raf); ro.disconnect(); };
};
