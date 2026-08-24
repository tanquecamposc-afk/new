/* ===========================================================
   games/limbo.js — eliges el objetivo, el juego sortea
   P(resultado >= x) = 0.99 / x  →  RTP 99%
   =========================================================== */
K.Juegos = K.Juegos || {};
K.Juegos.limbo = function (root, juego) {
  const monto = K.G.inputMonto(5);
  const inpObj = K.el('input', { type: 'number', min: '1.01', step: '0.01', value: '2.00' });
  const sProb = K.G.stat('Probabilidad de ganar', '49.50%');
  const sPago = K.G.stat('Pago si acierta', K.sol(10));
  const sRacha = K.G.stat('Racha actual', '0');

  const btn = K.el('button', { class: 'btn bloque', text: 'Apostar' });
  const btnAuto = K.el('button', { class: 'btn sec bloque', text: 'Auto ×10' });

  const panel = K.el('div', { class: 'panel-apuesta' }, [
    monto.wrap,
    K.el('div', { class: 'campo' }, [
      K.el('label', { text: 'Multiplicador objetivo' }), inpObj,
      K.el('div', { class: 'fila-btns' },
        [1.5, 2, 5, 10].map(v => K.el('button', { text: v + '×', onclick: () => { inpObj.value = v.toFixed(2); refrescar(); } })))
    ]),
    btn, btnAuto,
    K.el('div', { class: 'separador' }),
    sProb.fila, sPago.fila, sRacha.fila
  ]);

  const pantalla = K.el('div', { class: 'limbo-pantalla' }, [
    K.el('div', { class: 'res', text: '1.00×' }),
    K.el('div', { class: 'msg', text: 'Elige un objetivo y lanza.' })
  ]);
  const hist = K.el('div', { class: 'limbo-hist' });
  const zona = K.el('div', { class: 'zona-juego' }, [pantalla, hist]);
  const nRes = K.$('.res', pantalla), nMsg = K.$('.msg', pantalla);

  let racha = 0, corriendo = false;

  const objetivo = () => Math.max(1.01, Number(inpObj.value) || 1.01);

  function refrescar() {
    const o = objetivo();
    sProb.set(K.pct(0.99 / o, 2));
    sPago.set(K.sol(monto.get() * o));
  }
  inpObj.oninput = refrescar;
  monto.inp.oninput = refrescar;

  function pintarHistorial() {
    hist.innerHTML = '';
    K.G.historial('limbo').slice(0, 14).forEach(v =>
      hist.appendChild(K.el('span', { class: 'pill ' + K.G.claseMult(v), text: K.dec(v) + '×' })));
  }

  async function jugar() {
    if (corriendo) return;
    const apuesta = monto.get(), obj = objetivo();
    if (!K.G.apostar(apuesta)) return;
    corriendo = true; btn.disabled = true; btnAuto.disabled = true;

    const res = K.G.crashAleatorio(0.99);
    // Cuenta rápida hacia el resultado: nada de suspenso falso, 700 ms.
    const t0 = performance.now();
    await new Promise(fin => {
      const paso = ahora => {
        const p = Math.min(1, (ahora - t0) / 700);
        const v = 1 + (res - 1) * (1 - Math.pow(1 - p, 3));
        nRes.textContent = K.dec(v) + '×';
        nRes.style.color = 'var(--texto)';
        if (p < 1) requestAnimationFrame(paso); else fin();
      };
      requestAnimationFrame(paso);
    });

    const gano = res >= obj;
    nRes.textContent = K.dec(res) + '×';
    nRes.style.color = gano ? 'var(--acento)' : 'var(--rojo)';
    if (gano) {
      const premio = K.round2(apuesta * obj);
      K.G.pagar(premio, 'Limbo ' + K.dec(obj) + '×');
      racha++;
      nMsg.textContent = `Superó tu objetivo de ${K.dec(obj)}× · ganaste ${K.sol(premio)}`;
    } else {
      racha = 0;
      nMsg.textContent = `Se quedó bajo tu objetivo de ${K.dec(obj)}×`;
    }
    sRacha.set(String(racha));
    K.G.anotar('limbo', res);
    pintarHistorial();
    corriendo = false; btn.disabled = false; btnAuto.disabled = false;
    return gano;
  }

  btn.onclick = jugar;
  btnAuto.onclick = async () => {
    for (let i = 0; i < 10; i++) {
      if (K.Wallet.est().saldo < monto.get()) break;
      await jugar();
      await K.enEspera(220);
    }
  };

  refrescar(); pintarHistorial();
  root.appendChild(K.el('div', { class: 'juego-layout' }, [panel, zona]));
  root.appendChild(K.G.nota(`<h4>La matemática del Limbo</h4>
    El sorteo cumple <code>P(resultado ≥ x) = 0.99 / x</code>. Si apuntas a 2× ganas el 49.5% de las
    veces y cobras el doble; si apuntas a 100× ganas el 0.99% y cobras cien veces. El retorno esperado
    es el mismo en los dos casos: <b>99%</b>. Lo único que cambia es la varianza.`));
};
