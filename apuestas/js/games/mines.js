/* ===========================================================
   games/mines.js — 25 casillas, minas escondidas
   Multiplicador justo: C(25,k) / C(25-M,k), con 3% de casa.
   =========================================================== */
K.Juegos = K.Juegos || {};
K.Juegos.mines = function (root, juego) {
  const TOTAL = 25;
  let minas = 3, tablero = [], abiertas = 0, activo = false, apuesta = 0;

  const comb = (n, k) => { let r = 1; for (let i = 0; i < k; i++) r = r * (n - i) / (i + 1); return r; };
  const multiplicador = k => k === 0 ? 1 : K.round2(0.97 * comb(TOTAL, k) / comb(TOTAL - minas, k));

  /* ---- panel lateral ---- */
  const monto = K.G.inputMonto(5);
  const selMinas = K.el('select');
  for (let i = 1; i <= 24; i++) selMinas.appendChild(K.el('option', { value: i, text: i + (i === 1 ? ' mina' : ' minas') }));
  selMinas.value = String(minas);
  selMinas.onchange = () => { if (!activo) { minas = Number(selMinas.value); refrescarInfo(); } };

  const sMult = K.G.stat('Multiplicador actual', '1.00×');
  const sProx = K.G.stat('Si abres una más', '—');
  const sCobro = K.G.stat('Cobro disponible', K.sol(0));
  const sProb = K.G.stat('Prob. del próximo paso', '—');

  const btnJugar = K.el('button', { class: 'btn', text: 'Apostar y empezar' });
  const btnCobrar = K.el('button', { class: 'btn sec', text: 'Cobrar' });
  btnCobrar.disabled = true;

  const panel = K.el('div', { class: 'panel-apuesta' }, [
    monto.wrap,
    K.el('div', { class: 'campo' }, [K.el('label', { text: 'Cantidad de minas' }), selMinas]),
    btnJugar, btnCobrar,
    K.el('div', { style: 'height:1px;background:var(--linea);margin:2px 0' }),
    sMult.fila, sProx.fila, sCobro.fila, sProb.fila
  ]);

  /* ---- tablero ---- */
  const grid = K.el('div', { class: 'mines-grid' });
  const zona = K.el('div', { class: 'zona-juego' }, [grid]);
  const celdas = [];
  for (let i = 0; i < TOTAL; i++) {
    const c = K.el('button', { class: 'celda', onclick: () => abrir(i) });
    c.disabled = true;
    celdas.push(c);
    grid.appendChild(c);
  }

  function refrescarInfo() {
    const m = multiplicador(abiertas);
    const prox = multiplicador(abiertas + 1);
    sMult.set(K.dec(m) + '×');
    sProx.set(K.dec(prox) + '×');
    sCobro.set(K.sol(activo ? apuesta * m : 0));
    const seguras = TOTAL - minas - abiertas;
    const quedan = TOTAL - abiertas;
    sProb.set(quedan > 0 ? K.pct(seguras / quedan) : '—');
  }

  function empezar() {
    apuesta = monto.get();
    if (!K.G.apostar(apuesta)) return;
    tablero = new Array(TOTAL).fill(false);
    K.mezcla([...Array(TOTAL).keys()]).slice(0, minas).forEach(i => tablero[i] = true);
    abiertas = 0; activo = true;
    celdas.forEach(c => { c.className = 'celda'; c.innerHTML = ''; c.disabled = false; });
    btnJugar.disabled = true; btnCobrar.disabled = false; selMinas.disabled = true;
    refrescarInfo();
  }

  function abrir(i) {
    if (!activo || celdas[i].classList.contains('revelada')) return;
    if (tablero[i]) {
      celdas[i].className = 'celda mina';
      celdas[i].innerHTML = '<span>💣</span>';
      terminar(false);
      return;
    }
    abiertas++;
    celdas[i].className = 'celda estrella';
    celdas[i].innerHTML = '<span>⭐</span>';
    celdas[i].disabled = true;
    refrescarInfo();
    if (abiertas === TOTAL - minas) cobrar();
  }

  function cobrar() {
    if (!activo || abiertas === 0) { if (abiertas === 0) K.aviso('Abre al menos una casilla antes de cobrar.', 'warn'); return; }
    const m = multiplicador(abiertas);
    const premio = K.round2(apuesta * m);
    K.G.pagar(premio, `Mines · ${abiertas} aciertos a ${K.dec(m)}×`);
    K.aviso(`⭐ Cobraste ${K.sol(premio)} con ${K.dec(m)}×`);
    K.G.anotar('mines', m);
    terminar(true);
  }

  function terminar(gano) {
    activo = false;
    btnJugar.disabled = false; btnCobrar.disabled = true; selMinas.disabled = false;
    celdas.forEach((c, i) => {
      c.disabled = true;
      if (!c.innerHTML) {
        c.innerHTML = tablero[i] ? '<span>💣</span>' : '<span>⭐</span>';
        c.classList.add('revelada');
      }
    });
    if (!gano) { K.aviso('💥 Tocaste una mina. Perdiste ' + K.sol(apuesta) + '.', 'err'); K.G.anotar('mines', 0); }
    refrescarInfo();
  }

  btnJugar.onclick = empezar;
  btnCobrar.onclick = cobrar;
  refrescarInfo();

  root.appendChild(K.el('div', { class: 'juego-layout' }, [panel, zona]));
  root.appendChild(K.G.nota(`<h4>Cómo sale el multiplicador</h4>
    Con <b>${'M'}</b> minas y <b>k</b> casillas abiertas el pago justo es
    <code>C(25,k) / C(25−M,k)</code>. La casa se queda con un 3%: por eso el multiplicador
    que ves está a <code>0.97</code> del valor justo. Más minas, menos probabilidad de seguir vivo
    y más grande el salto por cada acierto.`));
};
