/* ===========================================================
   games/plinko.js — 16 filas de clavijas, tres niveles de riesgo
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

  const btn = K.el('button', { class: 'btn', text: 'Soltar bola' });
  const btn5 = K.el('button', { class: 'btn sec', text: 'Soltar 5' });

  const panel = K.el('div', { class: 'panel-apuesta' }, [
    monto.wrap,
    K.el('div', { class: 'campo' }, [K.el('label', { text: 'Nivel de riesgo' }), selR]),
    btn, btn5,
    K.el('div', { style: 'height:1px;background:var(--linea);margin:2px 0' }),
    sUlt.fila, sBolas.fila, sNeto.fila
  ]);

  const cv = K.el('canvas');
  const cubos = K.el('div', { class: 'plinko-cubos' });
  const zona = K.el('div', { class: 'zona-juego' }, [
    K.el('div', { class: 'plinko-lienzo' }, [cv]), cubos
  ]);
  const ctx = cv.getContext('2d');
  let bolas = [], sueltas = 0, neto = 0;

  function pintarCubos() {
    cubos.innerHTML = '';
    TABLAS[riesgo].forEach(m => {
      const color = m >= 10 ? 'var(--rojo)' : m >= 2 ? 'var(--ambar)' : m >= 1 ? 'var(--acento)' : 'var(--tenue2)';
      cubos.appendChild(K.el('div', { text: m + '×', style: `color:${color};border:1px solid var(--linea)` }));
    });
  }

  function dimensionar() {
    const r = cv.parentElement.getBoundingClientRect();
    cv.width = Math.max(320, r.width) * devicePixelRatio;
    cv.height = Math.max(300, r.height) * devicePixelRatio;
  }

  const pos = (fila, col) => {
    const p = devicePixelRatio, W = cv.width, H = cv.height;
    const paso = W / (FILAS + 3);
    const y = 20 * p + fila * ((H - 40 * p) / FILAS);
    const x = W / 2 + (col - fila / 2) * paso;
    return [x, y];
  };

  function pintar() {
    const p = devicePixelRatio;
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.fillStyle = 'rgba(255,255,255,.22)';
    for (let f = 1; f <= FILAS; f++) {
      for (let c = 0; c <= f; c++) {
        const [x, y] = pos(f, c);
        ctx.beginPath(); ctx.arc(x, y, 2.6 * p, 0, 7); ctx.fill();
      }
    }
    for (const b of bolas) {
      const f = Math.floor(b.t), frac = b.t - f;
      const c0 = b.camino[Math.min(f, FILAS)] || 0;
      const c1 = b.camino[Math.min(f + 1, FILAS)] ?? c0;
      const [x0, y0] = pos(Math.min(f, FILAS), c0);
      const [x1, y1] = pos(Math.min(f + 1, FILAS), c1);
      const x = x0 + (x1 - x0) * frac, y = y0 + (y1 - y0) * frac;
      ctx.beginPath();
      ctx.arc(x, y, 6 * p, 0, 7);
      ctx.fillStyle = '#ffc247';
      ctx.fill();
    }
  }

  function animar() {
    let vivas = false;
    for (const b of bolas) {
      if (b.t < FILAS) { b.t += 0.32; vivas = true; }
      else if (!b.pagada) { b.pagada = true; pagarBola(b); }
    }
    bolas = bolas.filter(b => b.t < FILAS + 1);
    pintar();
    if (vivas || bolas.length) requestAnimationFrame(animar); else pintar();
  }

  function pagarBola(b) {
    const mult = TABLAS[b.riesgo][b.destino];
    const premio = K.round2(b.apuesta * mult);
    K.G.pagar(premio, 'Plinko ' + mult + '×');
    neto = K.round2(neto + premio - b.apuesta);
    sUlt.set(mult + '× · ' + K.sol(premio));
    sNeto.set(K.sol(neto));
    const nodo = cubos.children[b.destino];
    if (nodo) { nodo.style.transform = 'scale(1.15)'; setTimeout(() => nodo.style.transform = '', 250); }
    K.G.anotar('plinko', mult);
  }

  function soltar() {
    const apuesta = monto.get();
    if (!K.G.apostar(apuesta)) return;
    const camino = [0];
    let c = 0;
    for (let f = 0; f < FILAS; f++) { if (Math.random() < 0.5) c++; camino.push(c); }
    bolas.push({ t: 0, camino, destino: c, apuesta, riesgo, pagada: false });
    sueltas++; sBolas.set(String(sueltas));
    if (bolas.length === 1) requestAnimationFrame(animar);
  }

  btn.onclick = soltar;
  btn5.onclick = async () => { for (let i = 0; i < 5; i++) { soltar(); await K.enEspera(180); } };

  pintarCubos();
  root.appendChild(K.el('div', { class: 'juego-layout' }, [panel, zona]));
  root.appendChild(K.G.nota(`<h4>Por qué el centro paga poco</h4>
    La bola toma 16 decisiones de 50/50, así que el destino sigue una binomial: caer al centro es
    <b>miles de veces más probable</b> que caer en un extremo. La tabla de pagos es el reflejo exacto
    de esa distribución, ajustada para que la casa se quede con su parte.`));
  dimensionar(); pintar();
  const ro = new ResizeObserver(() => { dimensionar(); pintar(); });
  ro.observe(cv.parentElement);
  return () => ro.disconnect();
};
