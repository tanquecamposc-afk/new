/* ===========================================================
   games/base.js — piezas comunes a todos los juegos de casino
   =========================================================== */
K.G = (() => {

  let juegoActual = null;
  const setJuego = j => juegoActual = j;

  /* Descuenta la apuesta. Devuelve false si el monedero la rechaza. */
  function apostar(monto) {
    const val = K.Wallet.puedeApostar(monto);
    if (!val.ok) { K.aviso(val.razon, 'err'); return false; }
    const w = K.Wallet.est();
    K.Wallet.apostar(monto, 'Casino · ' + (juegoActual ? juegoActual.nom : 'juego'));
    w.casino.jugadas++;
    w.casino.apostado = K.round2(w.casino.apostado + monto);
    K.Wallet.persistir();
    return true;
  }

  function pagar(monto, det) {
    if (monto <= 0) return;
    const w = K.Wallet.est();
    w.casino.devuelto = K.round2(w.casino.devuelto + monto);
    K.Wallet.acreditar(monto, det || ('Casino · ' + (juegoActual ? juegoActual.nom : '')), 'premio');
  }

  /* Campo de monto con los atajos típicos de la industria. */
  function inputMonto(inicial = 5) {
    const inp = K.el('input', { type: 'number', min: '0.5', step: '0.5', value: inicial });
    const btns = K.el('div', { class: 'fila-btns' });
    const set = v => inp.value = String(K.round2(Math.max(0.5, v)));
    [['½', () => set(Number(inp.value) / 2)],
     ['2×', () => set(Number(inp.value) * 2)],
     ['Máx', () => set(Math.min(K.Wallet.est().saldo, K.Wallet.est().perfil.limiteApuesta))]]
      .forEach(([t, fn]) => btns.appendChild(K.el('button', { text: t, onclick: fn })));
    const wrap = K.el('div', { class: 'campo' }, [
      K.el('label', { text: 'Apuesta (S/)' }), inp, btns
    ]);
    return { wrap, get: () => K.round2(Number(inp.value) || 0), set, inp };
  }

  function stat(etiqueta, valor) {
    const b = K.el('b', { text: valor });
    const fila = K.el('div', { class: 'stat-fila' }, [K.el('span', { text: etiqueta }), b]);
    return { fila, set: v => b.textContent = v, nodo: b };
  }

  /* Historial corto por juego, guardado en el monedero. */
  function historial(idJuego) {
    const w = K.Wallet.est();
    w.casino.historial[idJuego] ||= [];
    return w.casino.historial[idJuego];
  }
  function anotar(idJuego, valor) {
    const h = historial(idJuego);
    h.unshift(valor);
    if (h.length > 24) h.length = 24;
    K.Wallet.persistir();
  }

  const claseMult = m => m < 2 ? 'bajo' : m < 10 ? 'medio' : 'alto';

  /* Multiplicador de crash con ventaja de la casa del 3%:
     P(resultado >= x) = 0.97 / x  */
  function crashAleatorio(ventaja = 0.97) {
    const u = Math.random();
    if (u < 1 - ventaja) return 1.00;
    return Math.max(1, Math.floor((ventaja / (1 - u)) * 100) / 100);
  }

  const nota = html => K.el('div', { class: 'info-bloque', style: 'margin-top:12px;font-size:12px', html });

  return { setJuego, apostar, pagar, inputMonto, stat, historial, anotar, claseMult, crashAleatorio, nota };
})();
