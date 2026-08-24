/* ===========================================================
   games/slot.js — motor de tragamonedas "pay anywhere"
   Cuadrícula de 6×5. Pagan 8 símbolos iguales caigan donde
   caigan. La tabla de pagos NO está escrita a mano: se calcula
   al abrir el juego para que el RTP dé exactamente el declarado.
   =========================================================== */
K.Juegos = K.Juegos || {};
K.Juegos.slot = function (root, juego) {
  const cfg = juego.cfg;
  const SIM = cfg.simbolos;                 // del más raro al más común
  const N = SIM.length;
  const COLS = 6, FIL = 5, CELDAS = COLS * FIL;
  const MINIMO = 8;
  const RTP = cfg.rtp / 100;
  const VOL = { baja: 1.05, media: 1.22, alta: 1.42 }[cfg.vol] || 1.2;

  /* --- frecuencias: cada símbolo sale un 18% más que el anterior --- */
  const pesos = SIM.map((_, i) => Math.pow(1.18, i));
  const sumaP = pesos.reduce((a, b) => a + b, 0);
  const prob = pesos.map(p => p / sumaP);

  /* --- probabilidad de que un símbolo aparezca n veces en 30 casillas --- */
  const comb = (n, k) => { let r = 1; for (let i = 0; i < k; i++) r = r * (n - i) / (i + 1); return r; };
  const binom = (n, k, p) => comb(n, k) * Math.pow(p, k) * Math.pow(1 - p, n - k);
  const bonoPorCantidad = n => n >= 12 ? 3 : n >= 10 ? 1.5 : 1;

  /* Valor esperado de "veces que se cobra" por símbolo, ya con los bonos. */
  const esperado = prob.map(p => {
    let e = 0;
    for (let n = MINIMO; n <= CELDAS; n++) e += binom(CELDAS, n, p) * bonoPorCantidad(n);
    return Math.max(e, 1e-9);
  });

  /* Cómo se reparte el RTP entre símbolos: más volatilidad = más peso en los raros. */
  const reparto = SIM.map((_, i) => Math.pow(VOL, N - 1 - i));
  const sumaR = reparto.reduce((a, b) => a + b, 0);
  const pagos = SIM.map((_, i) => (reparto[i] / sumaR) * RTP / esperado[i]);

  const sortear = () => {
    let r = Math.random();
    for (let i = 0; i < N; i++) { r -= prob[i]; if (r <= 0) return i; }
    return N - 1;
  };

  const monto = K.G.inputMonto(2);
  const sUlt = K.G.stat('Último giro', '—');
  const sGiros = K.G.stat('Giros', '0');
  const sGratis = K.G.stat('Giros gratis', '0');
  const sRTP = K.G.stat('RTP teórico', (RTP * 100).toFixed(1) + '%');

  const btn = K.el('button', { class: 'btn', text: 'Girar' });
  const btnAuto = K.el('button', { class: 'btn sec', text: 'Auto ×15' });

  const panel = K.el('div', { class: 'panel-apuesta' }, [
    monto.wrap, btn, btnAuto,
    K.el('div', { style: 'height:1px;background:var(--linea);margin:2px 0' }),
    sUlt.fila, sGiros.fila, sGratis.fila, sRTP.fila,
    K.el('div', { class: 'stat-fila' }, [K.el('span', { text: 'Volatilidad' }), K.el('b', { text: cfg.vol })])
  ]);

  const rejilla = K.el('div', { class: 'slot-rejilla' });
  const celdas = [];
  for (let c = 0; c < COLS; c++) {
    const col = K.el('div', { class: 'slot-col' });
    for (let f = 0; f < FIL; f++) {
      const s = K.el('div', { class: 'slot-sim', text: SIM[sortear()] });
      celdas.push(s); col.appendChild(s);
    }
    rejilla.appendChild(col);
  }
  const msg = K.el('span', { id: 'slot-msg', text: '' });
  const marco = K.el('div', { class: 'slot-marco' }, [
    rejilla,
    K.el('div', { class: 'slot-info' }, [
      K.el('span', { text: '8+ símbolos iguales pagan · 10+ ×1.5 · 12+ ×3' }), msg
    ])
  ]);
  const zona = K.el('div', { class: 'zona-juego' }, [marco]);

  let girando = false, giros = 0, gratis = 0;

  async function girar(esGratis = false) {
    if (girando) return 0;
    const apuesta = monto.get();
    if (!esGratis && !K.G.apostar(apuesta)) return 0;
    girando = true; btn.disabled = true;
    celdas.forEach(c => c.classList.remove('gana'));
    msg.textContent = '';

    /* Resultado primero, animación después: los carretes se frenan
       uno por uno, de izquierda a derecha, como en una máquina real. */
    const res = [];
    for (let i = 0; i < CELDAS; i++) res.push(sortear());

    const t0 = performance.now();
    const frenoCol = c => 420 + c * 150;          // ms hasta que para cada columna
    const ultimoCambio = new Array(COLS).fill(0);
    await new Promise(fin => {
      const paso = t => {
        const dt = t - t0;
        let girandoAlgo = false;
        for (let c = 0; c < COLS; c++) {
          const paro = frenoCol(c);
          if (dt < paro) {
            girandoAlgo = true;
            // cuanto más cerca del freno, más lento cambia el carrete
            const intervalo = dt > paro - 180 ? 80 : 34;
            if (t - ultimoCambio[c] >= intervalo) {
              ultimoCambio[c] = t;
              for (let f = 0; f < FIL; f++) {
                celdas[c * FIL + f].textContent = SIM[Math.floor(Math.random() * N)];
              }
            }
          } else if (!celdas[c * FIL].dataset.parada) {
            for (let f = 0; f < FIL; f++) {
              const cel = celdas[c * FIL + f];
              cel.textContent = SIM[res[c * FIL + f]];
              cel.style.animation = 'none';
              void cel.offsetWidth;
              cel.style.animation = 'aterriza .22s ease-out';
            }
            celdas[c * FIL].dataset.parada = '1';
          }
        }
        if (girandoAlgo) requestAnimationFrame(paso);
        else fin();
      };
      requestAnimationFrame(paso);
    });
    celdas.forEach((c, i) => { c.textContent = SIM[res[i]]; delete c.dataset.parada; });
    await K.enEspera(120);

    const cuenta = new Array(N).fill(0);
    res.forEach(i => cuenta[i]++);
    let premio = 0; const ganadores = [];
    cuenta.forEach((n, i) => {
      if (n >= MINIMO) { premio += apuesta * pagos[i] * bonoPorCantidad(n); ganadores.push(i); }
    });
    premio = K.round2(premio * (esGratis ? 2 : 1));
    celdas.forEach((c, i) => { if (ganadores.includes(res[i])) c.classList.add('gana'); });

    if (premio > 0) {
      K.G.pagar(premio, juego.nom);
      sUlt.set('+' + K.sol(premio));
      msg.innerHTML = `<b style="color:var(--acento)">+${K.sol(premio)}</b>`;
      if (premio >= apuesta * 25) K.aviso('🎉 ' + K.esc(juego.nom) + ': premio de ' + K.sol(premio));
    } else { sUlt.set('—'); msg.textContent = ''; }

    if (!esGratis && ganadores.some(i => cuenta[i] >= 11)) {
      gratis += 5; sGratis.set(String(gratis));
      K.aviso('🎁 5 giros gratis con pago ×2 en ' + K.esc(juego.nom));
    }
    giros++; sGiros.set(String(giros));
    girando = false; btn.disabled = false;

    if (gratis > 0 && !esGratis) {
      while (gratis > 0) { gratis--; sGratis.set(String(gratis)); await K.enEspera(400); await girar(true); }
    }
    return premio;
  }

  btn.onclick = () => girar(false);
  btnAuto.onclick = async () => {
    for (let i = 0; i < 15; i++) {
      if (K.Wallet.est().saldo < monto.get()) { K.aviso('Saldo insuficiente para seguir girando.', 'warn'); break; }
      await girar(false);
      await K.enEspera(230);
    }
  };

  const filasTabla = SIM.map((s, i) =>
    `<tr><td style="font-size:19px">${s}</td><td>${pagos[i] < 1 ? pagos[i].toFixed(2) : pagos[i].toFixed(1)}×</td>
     <td>${(prob[i] * 100).toFixed(1)}%</td><td>${(esperado[i] * 100).toFixed(2)}%</td></tr>`).join('');

  root.appendChild(K.el('div', { class: 'juego-layout' }, [panel, zona]));
  root.appendChild(K.G.nota(`<h4>Tabla de pagos de ${K.esc(juego.nom)}</h4>
    <table class="tabla"><tr><th>Símbolo</th><th>Pago (8+)</th><th>Frecuencia</th><th>Rondas que paga</th></tr>${filasTabla}</table>
    <p style="margin-top:8px">Cada pago sale de dividir la porción de RTP asignada al símbolo entre la
    probabilidad de que aparezca 8 o más veces en las 30 casillas. Por eso el símbolo raro paga cientos
    de veces la apuesta y el común apenas una fracción: los dos aportan lo mismo al retorno teórico de
    <b>${(RTP * 100).toFixed(1)}%</b>. La volatilidad <b>${cfg.vol}</b> decide cuánto de ese retorno se
    concentra en los símbolos raros.</p>`));
};
