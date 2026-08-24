/* ===========================================================
   games/aviator.js — motor crash por rondas
   Lo comparten Aviator, Spaceman, Balloon y Maverick.
   Ronda: 5 s de apuestas → vuelo → caída → vuelta a empezar.
   =========================================================== */
K.Juegos = K.Juegos || {};
K.Juegos.aviator = function (root, juego) {
  const cfg = juego.cfg || {};
  const tema = cfg.tema || 'avion';
  const vel = cfg.veloz ? 0.15 : 0.085;
  const ESPERA = cfg.veloz ? 3500 : 5000;

  /* ---------------- panel ---------------- */
  const monto = K.G.inputMonto(5);
  const inpAuto = K.el('input', { type: 'number', min: '1.01', step: '0.1', value: '2.00' });
  const chkAuto = K.el('input', { type: 'checkbox', id: 'auto-cash' });
  const sEstado = K.G.stat('Ronda', 'esperando');
  const sCobro = K.G.stat('Cobro actual', K.sol(0));
  const sMejor = K.G.stat('Mejor del historial', '—');
  const sNeto = K.G.stat('Resultado neto', K.sol(0));
  let neto = 0;

  const btn = K.el('button', { class: 'btn bloque', text: 'Apostar la próxima ronda' });
  const btnMitad = cfg.mitad ? K.el('button', { class: 'btn sec bloque', text: 'Cobrar la mitad' }) : null;
  if (btnMitad) btnMitad.disabled = true;

  const panel = K.el('div', { class: 'panel-apuesta' }, [
    monto.wrap,
    K.el('div', { class: 'campo' }, [
      K.el('label', { text: 'Auto-cashout' }),
      K.el('div', { class: 'fila-auto' }, [chkAuto, inpAuto])
    ]),
    btn, btnMitad,
    K.el('div', { class: 'separador' }),
    sEstado.fila, sCobro.fila, sMejor.fila, sNeto.fila
  ].filter(Boolean));

  /* ---------------- lienzo ---------------- */
  const cv = K.el('canvas');
  const grande = K.el('div', { class: 'mult-grande' }, [
    K.el('div', { class: 'n', text: '1.00×' }),
    K.el('div', { class: 'est', text: 'esperando ronda' })
  ]);
  const lienzo = K.el('div', { class: 'crash-lienzo' }, [cv, grande]);
  const hist = K.el('div', { class: 'historial-mult' });
  const zona = K.el('div', { class: 'zona-juego' }, [lienzo, hist]);
  const nNum = K.$('.n', grande), nEst = K.$('.est', grande);
  const ctx = cv.getContext('2d');

  /* ---------------- estado ---------------- */
  let fase = 'espera';          // espera | vuelo | caido
  let apuesta = 0, apuestaLista = 0, mult = 1, crash = 0, t0 = 0, raf = 0;
  let mitadCobrada = false, cobrado = false, muerto = false;
  let puntos = [], particulas = [], estrellas = [], salidaX = 0;

  function dimensionar() {
    const r = lienzo.getBoundingClientRect();
    cv.width = Math.max(320, r.width) * devicePixelRatio;
    cv.height = Math.max(260, r.height) * devicePixelRatio;
    estrellas = [];
    for (let i = 0; i < 60; i++) {
      estrellas.push({ x: Math.random(), y: Math.random(), r: Math.random() * 1.6 + 0.4, v: Math.random() * .3 + .1 });
    }
  }

  /* ---------------- dibujo ---------------- */
  function dibujar(ahora) {
    const W = cv.width, H = cv.height, p = devicePixelRatio;
    const mIzq = 44 * p, mAb = 26 * p, mArr = 16 * p, mDer = 16 * p;
    const x0 = mIzq, y0 = H - mAb, ancho = W - mIzq - mDer, alto = H - mAb - mArr;

    // fondo
    const g = ctx.createLinearGradient(0, 0, 0, H);
    if (tema === 'globo') { g.addColorStop(0, '#1b1233'); g.addColorStop(1, '#0a0a16'); }
    else { g.addColorStop(0, '#0a1326'); g.addColorStop(1, '#04070e'); }
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // estrellas con parallax
    ctx.fillStyle = 'rgba(255,255,255,.5)';
    estrellas.forEach(s => {
      const x = ((s.x - (ahora / 9000) * s.v) % 1 + 1) % 1;
      ctx.globalAlpha = .25 + s.r / 4;
      ctx.beginPath();
      ctx.arc(x * W, s.y * H, s.r * p, 0, 7);
      ctx.fill();
    });
    ctx.globalAlpha = 1;

    // escalas automáticas
    const tAct = fase === 'vuelo' ? (ahora - t0) / 1000 : (puntos.length ? puntos[puntos.length - 1].t : 0);
    const tMax = Math.max(6, tAct * 1.12);
    const mMax = Math.max(2, (fase === 'caido' ? crash : mult) * 1.18);

    // rejilla y ejes
    ctx.strokeStyle = 'rgba(148,163,184,.13)';
    ctx.lineWidth = 1 * p;
    ctx.fillStyle = 'rgba(148,163,184,.55)';
    ctx.font = (9.5 * p) + 'px Barlow, system-ui';
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    for (let i = 0; i <= 4; i++) {
      const v = 1 + (mMax - 1) * i / 4;
      const y = y0 - alto * ((v - 1) / (mMax - 1));
      ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0 + ancho, y); ctx.stroke();
      ctx.fillText(v.toFixed(2) + '×', x0 - 6 * p, y);
    }
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    for (let i = 0; i <= 4; i++) {
      const s = tMax * i / 4;
      const x = x0 + ancho * (i / 4);
      ctx.beginPath(); ctx.moveTo(x, mArr); ctx.lineTo(x, y0); ctx.stroke();
      ctx.fillText(s.toFixed(0) + 's', x, y0 + 6 * p);
    }

    // curva
    if (puntos.length > 1) {
      const px = t => x0 + ancho * K.clamp(t / tMax, 0, 1);
      const py = m => y0 - alto * K.clamp((m - 1) / (mMax - 1), 0, 1);
      ctx.beginPath();
      ctx.moveTo(px(puntos[0].t), y0);
      puntos.forEach(q => ctx.lineTo(px(q.t), py(q.m)));
      ctx.lineTo(px(puntos[puntos.length - 1].t), y0);
      ctx.closePath();
      const gr = ctx.createLinearGradient(0, mArr, 0, y0);
      gr.addColorStop(0, muerto ? 'rgba(244,63,94,.32)' : 'rgba(255,85,0,.34)');
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gr; ctx.fill();

      ctx.beginPath();
      puntos.forEach((q, i) => i ? ctx.lineTo(px(q.t), py(q.m)) : ctx.moveTo(px(q.t), py(q.m)));
      ctx.strokeStyle = muerto ? '#f43f5e' : '#ff5500';
      ctx.lineWidth = 3.2 * p;
      ctx.shadowColor = muerto ? 'rgba(244,63,94,.8)' : 'rgba(255,85,0,.8)';
      ctx.shadowBlur = 14 * p;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // vehículo en la punta
      const u = puntos[puntos.length - 1];
      const ant = puntos[Math.max(0, puntos.length - 6)];
      const ang = Math.atan2(py(u.m) - py(ant.m), px(u.t) - px(ant.t));
      const vx = muerto ? px(u.t) + salidaX : px(u.t);
      const vy = muerto ? py(u.m) - salidaX * 0.35 : py(u.m);
      dibujarVehiculo(vx, vy, ang, p);
    }

    // partículas de la explosión
    particulas.forEach(q => {
      ctx.globalAlpha = Math.max(0, q.vida);
      ctx.fillStyle = q.c;
      ctx.beginPath();
      ctx.arc(q.x, q.y, q.r * p, 0, 7);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }

  function dibujarVehiculo(x, y, ang, p) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(K.clamp(ang, -0.9, 0.2));
    ctx.scale(p, p);
    if (tema === 'globo') {
      ctx.fillStyle = '#ff6ec7';
      ctx.beginPath(); ctx.ellipse(0, -6, 9, 11, 0, 0, 7); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(-4, 3); ctx.lineTo(-2, 8); ctx.moveTo(4, 3); ctx.lineTo(2, 8); ctx.stroke();
      ctx.fillStyle = '#8b5a2b';
      ctx.fillRect(-3.5, 8, 7, 5);
    } else if (tema === 'space') {
      ctx.fillStyle = '#e2e8f0';
      ctx.beginPath(); ctx.arc(0, 0, 8, 0, 7); ctx.fill();
      ctx.fillStyle = '#0f172a';
      ctx.beginPath(); ctx.arc(2, -1, 5, 0, 7); ctx.fill();
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath(); ctx.arc(3, -2, 2, 0, 7); ctx.fill();
    } else {
      // avión: fuselaje, alas y cola
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.moveTo(14, 0); ctx.lineTo(2, 4); ctx.lineTo(-12, 4); ctx.lineTo(-12, -3); ctx.lineTo(2, -3);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath(); ctx.moveTo(2, 0); ctx.lineTo(-6, 10); ctx.lineTo(-2, 0); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(2, 0); ctx.lineTo(-6, -9); ctx.lineTo(-2, 0); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ff5500';
      ctx.beginPath(); ctx.moveTo(-12, -3); ctx.lineTo(-16, -9); ctx.lineTo(-11, -3); ctx.closePath(); ctx.fill();
      // estela
      ctx.fillStyle = 'rgba(255,85,0,.55)';
      ctx.beginPath(); ctx.moveTo(-12, 1); ctx.lineTo(-24, 3); ctx.lineTo(-12, -1); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }

  function explotar() {
    const W = cv.width, H = cv.height, p = devicePixelRatio;
    const u = puntos[puntos.length - 1];
    const mIzq = 44 * p, mAb = 26 * p, mArr = 16 * p, mDer = 16 * p;
    const tMax = Math.max(6, u.t * 1.12), mMax = Math.max(2, crash * 1.18);
    const x = mIzq + (W - mIzq - mDer) * K.clamp(u.t / tMax, 0, 1);
    const y = (H - mAb) - (H - mAb - mArr) * K.clamp((u.m - 1) / (mMax - 1), 0, 1);
    particulas = [];
    for (let i = 0; i < 26; i++) {
      const a = Math.random() * Math.PI * 2, v = (Math.random() * 3 + 1) * p;
      particulas.push({
        x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, r: Math.random() * 2.5 + 1,
        vida: 1, c: K.elige(['#ff5500', '#fbbf24', '#f43f5e', '#fde68a'])
      });
    }
  }

  /* ---------------- ciclo de rondas ---------------- */
  function bucle() {
    const paso = ahora => {
      if (fase === 'vuelo') {
        const t = (ahora - t0) / 1000;
        const exacto = Math.exp(vel * t * (1 + t / 22));   // sin redondear: la curva sale lisa
        mult = K.round2(exacto);
        if (exacto >= crash) { reventar(); return; }
        puntos.push({ t, m: exacto });
        if (puntos.length > 700) puntos.shift();
        nNum.textContent = K.dec(mult) + '×';
        nNum.style.color = '#fff';
        if (apuesta > 0) {
          sCobro.set(K.sol(apuesta * mult));
          btn.textContent = 'Cobrar ' + K.sol(apuesta * mult);
          const objetivo = Number(inpAuto.value) || 0;
          if (chkAuto.checked && objetivo > 1 && mult >= objetivo) { cobrar(); return; }
        }
      }
      if (muerto) {
        salidaX += 3.2 * devicePixelRatio;
        particulas.forEach(q => { q.x += q.vx; q.y += q.vy; q.vy += .08 * devicePixelRatio; q.vida -= .022; });
        particulas = particulas.filter(q => q.vida > 0);
      }
      dibujar(ahora);
      raf = requestAnimationFrame(paso);
    };
    raf = requestAnimationFrame(paso);
  }

  function nuevaRonda() {
    if (fase === 'cerrado') return;
    fase = 'espera';
    muerto = false; cobrado = false; mitadCobrada = false;
    puntos = []; particulas = []; salidaX = 0; mult = 1;
    apuesta = 0;
    sCobro.set(K.sol(0));
    nNum.textContent = '1.00×';
    nNum.style.color = '#fff';
    if (btnMitad) btnMitad.disabled = true;

    const fin = performance.now() + ESPERA;
    const cuenta = () => {
      if (fase !== 'espera') return;
      const resta = Math.max(0, fin - performance.now());
      nEst.textContent = apuestaLista > 0
        ? `apuesta lista · sale en ${(resta / 1000).toFixed(1)} s`
        : `próxima ronda en ${(resta / 1000).toFixed(1)} s`;
      sEstado.set('apuestas abiertas');
      btn.textContent = apuestaLista > 0 ? 'Cancelar apuesta' : 'Apostar la próxima ronda';
      btn.className = apuestaLista > 0 ? 'btn sec bloque' : 'btn bloque';
      btn.disabled = false;
      if (resta <= 0) despegar(); else setTimeout(cuenta, 90);
    };
    cuenta();
  }

  function despegar() {
    apuesta = 0;
    if (apuestaLista > 0) {
      if (K.G.apostar(apuestaLista)) apuesta = apuestaLista;
      apuestaLista = 0;
    }
    crash = K.G.crashAleatorio(0.97);
    fase = 'vuelo';
    t0 = performance.now();
    sEstado.set('en vuelo');
    nEst.textContent = apuesta > 0 ? 'volando con tu apuesta' : 'ronda en curso';
    btn.className = 'btn verde bloque';
    btn.textContent = apuesta > 0 ? 'Cobrar ' + K.sol(apuesta) : 'Ronda en curso';
    btn.disabled = apuesta <= 0;
    if (btnMitad) btnMitad.disabled = apuesta <= 0;
  }

  function cobrar() {
    if (fase !== 'vuelo' || apuesta <= 0 || cobrado) return;
    cobrado = true;
    const m = mult;
    const premio = K.round2(apuesta * m);
    K.G.pagar(premio, juego.nom + ' ' + K.dec(m) + '×');
    neto = K.round2(neto + premio - apuesta);
    sNeto.set(K.sol(neto));
    K.aviso('Cobraste ' + K.sol(premio) + ' en ' + K.dec(m) + '×', 'ok');
    if (K.Progreso) K.Progreso.registrar('crash', { mult: m });
    if (m >= 5) K.confeti(70);
    nEst.textContent = 'cobrado en ' + K.dec(m) + '×';
    apuesta = 0;
    btn.disabled = true;
    btn.textContent = 'Cobrado a ' + K.dec(m) + '×';
    if (btnMitad) btnMitad.disabled = true;
  }

  function cobrarMitad() {
    if (fase !== 'vuelo' || apuesta <= 0 || mitadCobrada) return;
    mitadCobrada = true;
    const premio = K.round2(apuesta / 2 * mult);
    K.G.pagar(premio, juego.nom + ' · mitad a ' + K.dec(mult) + '×');
    neto = K.round2(neto + premio - apuesta / 2);
    sNeto.set(K.sol(neto));
    apuesta = K.round2(apuesta / 2);
    K.aviso('Cobraste la mitad: ' + K.sol(premio), 'ok');
    btnMitad.disabled = true;
  }

  function reventar() {
    fase = 'caido';
    muerto = true;
    mult = crash;
    puntos.push({ t: (performance.now() - t0) / 1000, m: crash });
    explotar();
    nNum.textContent = K.dec(crash) + '×';
    nNum.style.color = '#f43f5e';
    nEst.textContent = tema === 'globo' ? 'reventó' : 'se fue';
    sEstado.set('caída en ' + K.dec(crash) + '×');
    if (apuesta > 0 && !cobrado) {
      neto = K.round2(neto - apuesta);
      sNeto.set(K.sol(neto));
      K.aviso('Se fue en ' + K.dec(crash) + '× · perdiste ' + K.sol(apuesta), 'err');
    }
    K.G.anotar(juego.id, crash);
    const h = K.G.historial(juego.id);
    sMejor.set(h.length ? K.dec(Math.max(...h)) + '×' : '—');
    pintarHistorial();
    btn.disabled = true;
    btn.textContent = 'Ronda terminada';
    btn.className = 'btn bloque';
    if (btnMitad) btnMitad.disabled = true;
    setTimeout(nuevaRonda, 2200);
  }

  function pintarHistorial() {
    hist.innerHTML = '';
    K.G.historial(juego.id).slice(0, 18).forEach(v =>
      hist.appendChild(K.el('span', { class: 'pill ' + K.G.claseMult(v), text: K.dec(v) + '×' })));
  }

  btn.onclick = () => {
    if (fase === 'vuelo') { cobrar(); return; }
    if (fase !== 'espera') return;
    if (apuestaLista > 0) { apuestaLista = 0; K.aviso('Apuesta cancelada.', 'warn'); return; }
    const v = monto.get();
    const val = K.Wallet.puedeApostar(v);
    if (!val.ok) { K.aviso(val.razon, 'err'); return; }
    apuestaLista = v;
    K.aviso('Apuesta lista para la próxima ronda.', 'ok');
  };
  if (btnMitad) btnMitad.onclick = cobrarMitad;

  root.appendChild(K.el('div', { class: 'juego-layout' }, [panel, zona]));
  root.appendChild(K.el('div', {
    class: 'info-juego', html: `<h4>Cómo se decide el vuelo</h4>
    El punto de caída se sortea <b>antes</b> del despegue con <code>P(x ≥ m) = 0.97 / m</code>: hay un 3%
    de rondas que mueren en 1.00× y el retorno teórico queda en <b>97%</b>. El multiplicador que ves
    subir es la animación de un número que ya estaba decidido, así que aguantar más no "empuja" nada y
    ninguna racha anterior cambia la siguiente. El auto-cashout está justamente para no depender de tu
    reflejo, y las apuestas se cierran al despegar, como en el juego real.` }));

  dimensionar();
  pintarHistorial();
  const h = K.G.historial(juego.id);
  if (h.length) sMejor.set(K.dec(Math.max(...h)) + '×');
  const ro = new ResizeObserver(dimensionar);
  ro.observe(lienzo);
  bucle();
  nuevaRonda();

  return () => { fase = 'cerrado'; cancelAnimationFrame(raf); ro.disconnect(); };
};
