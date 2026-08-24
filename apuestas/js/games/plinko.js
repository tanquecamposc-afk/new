/* ===========================================================
   games/plinko.js — 16 filas de clavijas, tres niveles de riesgo
   La bola cae con gravedad y rebota en cada clavija; el destino
   sigue una binomial, igual que en el juego real.
   =========================================================== */
K.Juegos = K.Juegos || {};
K.Juegos.plinko = function (root, juego) {
  const FILAS = 16;
  const TABLAS = {
    bajo:  [16, 9, 2, 1.4, 1.4, 1.2, 1.1, 1, 0.5, 1, 1.1, 1.2, 1.4, 1.4, 2, 9, 16],
    medio: [110, 41, 10, 5, 3, 1.5, 1, 0.5, 0.3, 0.5, 1, 1.5, 3, 5, 10, 41, 110],
    alto:  [1000, 130, 26, 9, 4, 2, 0.2, 0.2, 0.2, 0.2, 0.2, 2, 4, 9, 26, 130, 1000]
  };
  let riesgo = 'medio';

  const monto = K.G.inputMonto(5);
  const selR = K.el('select');
  [['bajo', 'Riesgo bajo'], ['medio', 'Riesgo medio'], ['alto', 'Riesgo alto']]
    .forEach(([v, t]) => selR.appendChild(K.el('option', { value: v, text: t })));
  selR.value = riesgo;
  selR.onchange = () => { riesgo = selR.value; pintarCubos(); };

  const sUlt = K.G.stat('Última bola', '—');
  const sBolas = K.G.stat('Bolas soltadas', '0');
  const sNeto = K.G.stat('Resultado neto', K.sol(0));

  const btn = K.el('button', { class: 'btn bloque', text: 'Soltar bola' });
  const btn10 = K.el('button', { class: 'btn sec bloque', text: 'Soltar 10' });

  const panel = K.el('div', { class: 'panel-apuesta' }, [
    monto.wrap,
    K.el('div', { class: 'campo' }, [K.el('label', { text: 'Nivel de riesgo' }), selR]),
    btn, btn10,
    K.el('div', { class: 'separador' }),
    sUlt.fila, sBolas.fila, sNeto.fila
  ]);

  const cv = K.el('canvas');
  const cubos = K.el('div', { class: 'plinko-cubos' });
  const zona = K.el('div', { class: 'zona-juego' }, [
    K.el('div', { class: 'plinko-lienzo' }, [cv]), cubos
  ]);
  const ctx = cv.getContext('2d');
  let bolas = [], sueltas = 0, neto = 0, corriendo = false, destellos = [];

  function pintarCubos() {
    cubos.innerHTML = '';
    TABLAS[riesgo].forEach((m, i) => {
      const color = m >= 10 ? '#f43f5e' : m >= 2 ? '#fbbf24' : m >= 1 ? '#22c55e' : '#64748b';
      cubos.appendChild(K.el('div', { text: m + '×', style: `color:${color}` }));
    });
  }

  /* ---- geometría ---- */
  let paso = 0, topeY = 0, altoFila = 0;
  function dimensionar() {
    const r = cv.parentElement.getBoundingClientRect();
    cv.width = Math.max(320, r.width) * devicePixelRatio;
    cv.height = Math.max(320, r.height) * devicePixelRatio;
    paso = cv.width / (FILAS + 3);
    topeY = 22 * devicePixelRatio;
    altoFila = (cv.height - 48 * devicePixelRatio) / FILAS;
  }
  const clavija = (fila, col) => [cv.width / 2 + (col - fila / 2) * paso, topeY + fila * altoFila];

  function pintar() {
    const p = devicePixelRatio;
    ctx.clearRect(0, 0, cv.width, cv.height);

    // clavijas
    for (let f = 1; f <= FILAS; f++) {
      for (let c = 0; c <= f; c++) {
        const [x, y] = clavija(f, c);
        ctx.beginPath();
        ctx.arc(x, y, 2.8 * p, 0, 7);
        ctx.fillStyle = 'rgba(226,232,240,.34)';
        ctx.fill();
      }
    }
    // destellos al golpear
    destellos.forEach(d => {
      ctx.globalAlpha = d.vida;
      ctx.beginPath();
      ctx.arc(d.x, d.y, (3 + (1 - d.vida) * 7) * p, 0, 7);
      ctx.strokeStyle = '#ff5500';
      ctx.lineWidth = 1.5 * p;
      ctx.stroke();
    });
    ctx.globalAlpha = 1;

    // bolas
    bolas.forEach(b => {
      const gr = ctx.createRadialGradient(b.x - 2 * p, b.y - 2 * p, 1, b.x, b.y, 7 * p);
      gr.addColorStop(0, '#ffd9b0'); gr.addColorStop(1, '#ff5500');
      ctx.beginPath();
      ctx.arc(b.x, b.y, 5.4 * p, 0, 7);
      ctx.fillStyle = gr;
      ctx.shadowColor = 'rgba(255,85,0,.7)'; ctx.shadowBlur = 10 * p;
      ctx.fill();
      ctx.shadowBlur = 0;
    });
  }

  function animar() {
    const p = devicePixelRatio;
    for (const b of bolas) {
      if (b.fila >= FILAS) {
        // caída final hasta el cubo
        b.vy += 0.55 * p;
        b.y += b.vy;
        if (!b.pagada && b.y > cv.height - 14 * p) { b.pagada = true; pagarBola(b); }
        continue;
      }
      const [mx, my] = clavija(b.fila + 1, b.col + (b.camino[b.fila] ? 1 : 0));
      // avance hacia la siguiente clavija con un arco
      b.t += 0.085;
      const [px0, py0] = clavija(b.fila, b.col);
      const t = Math.min(1, b.t);
      b.x = px0 + (mx - px0) * t;
      b.y = py0 + (my - py0) * (t * t * 0.72 + t * 0.28);   // acelera al caer
      if (t >= 1) {
        b.fila++;
        b.col += b.camino[b.fila - 1] ? 1 : 0;
        b.t = 0;
        destellos.push({ x: mx, y: my, vida: 1 });
      }
    }
    destellos.forEach(d => d.vida -= 0.06);
    destellos = destellos.filter(d => d.vida > 0);
    bolas = bolas.filter(b => b.y < cv.height + 30 * p);
    pintar();
    if (bolas.length || destellos.length) requestAnimationFrame(animar);
    else { corriendo = false; pintar(); }
  }

  function pagarBola(b) {
    const mult = TABLAS[b.riesgo][b.destino];
    const premio = K.round2(b.apuesta * mult);
    K.G.pagar(premio, 'Plinko ' + mult + '×');
    neto = K.round2(neto + premio - b.apuesta);
    sUlt.set(mult + '× · ' + K.sol(premio));
    sNeto.set(K.sol(neto));
    const nodo = cubos.children[b.destino];
    if (nodo) {
      nodo.style.transform = 'scale(1.18)';
      nodo.style.background = 'rgba(255,85,0,.28)';
      setTimeout(() => { nodo.style.transform = ''; nodo.style.background = ''; }, 320);
    }
    if (mult >= 10) K.aviso('Plinko: ' + mult + '× · ' + K.sol(premio), 'ok');
    K.G.anotar('plinko', mult);
  }

  function soltar() {
    const apuesta = monto.get();
    if (!K.G.apostar(apuesta)) return;
    const camino = [];
    let destino = 0;
    for (let f = 0; f < FILAS; f++) { const d = Math.random() < 0.5; camino.push(d); if (d) destino++; }
    const [x, y] = clavija(0, 0);
    bolas.push({ x, y, vy: 0, fila: 0, col: 0, t: 0, camino, destino, apuesta, riesgo, pagada: false });
    sueltas++; sBolas.set(String(sueltas));
    if (!corriendo) { corriendo = true; requestAnimationFrame(animar); }
  }

  btn.onclick = soltar;
  btn10.onclick = async () => {
    for (let i = 0; i < 10; i++) {
      if (K.Wallet.est().saldo < monto.get()) break;
      soltar();
      await K.enEspera(220);
    }
  };

  pintarCubos();
  root.appendChild(K.el('div', { class: 'juego-layout' }, [panel, zona]));
  root.appendChild(K.el('div', {
    class: 'info-juego', html: `<h4>Por qué el centro paga poco</h4>
    La bola toma 16 decisiones de 50/50, así que el destino sigue una binomial: terminar al centro es
    <b>miles de veces más probable</b> que terminar en un extremo — exactamente 12.870 caminos contra
    uno solo. La tabla de pagos es el reflejo de esa distribución, ajustada para que la casa se quede
    con su parte. Subir el riesgo no cambia el retorno: mueve premio del centro a los bordes.` }));

  dimensionar(); pintar();
  const ro = new ResizeObserver(() => { dimensionar(); pintar(); });
  ro.observe(cv.parentElement);
  return () => ro.disconnect();
};
