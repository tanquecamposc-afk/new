/* ===========================================================
   games/keno.js — keno de 40 bolas
   Eliges hasta 10 números, salen 10. La tabla de pagos se
   calcula con la distribución hipergeométrica para que el RTP
   sea exactamente el declarado, sea cual sea la cantidad de
   números elegidos.
   =========================================================== */
K.Juegos = K.Juegos || {};
K.Juegos.keno = function (root, juego) {
  const TOTAL = 40, BOLAS = 10, MAX_PICKS = 10;
  const RTP = 0.95;
  const VOL = { baja: 1.6, media: 2.4, alta: 3.4 }[(juego.cfg && juego.cfg.vol) || 'media'];

  const comb = (n, k) => {
    if (k < 0 || k > n) return 0;
    let r = 1;
    for (let i = 0; i < k; i++) r = r * (n - i) / (i + 1);
    return r;
  };
  /* Probabilidad de acertar h de los k elegidos. */
  const probAciertos = (k, h) => comb(k, h) * comb(TOTAL - k, BOLAS - h) / comb(TOTAL, BOLAS);

  /* Tabla de pagos: reparte el RTP entre los aciertos que pagan, con más
     peso en los difíciles, y topa el premio máximo en 5.000× repartiendo
     lo que sobra entre los demás. Sin el tope, acertar 10 de 10 pagaría
     cientos de millones y el resto de la tabla quedaría en nada. */
  const TOPE = 5000;
  function tabla(k) {
    if (k === 0) return {};
    const desde = k <= 2 ? k : k <= 6 ? Math.ceil(k / 2) : Math.ceil(k / 2) + 1;
    const peso = h => Math.pow(VOL, h - desde);
    let libres = [];
    for (let h = desde; h <= k; h++) libres.push(h);
    const pagos = {};
    let restante = RTP;

    for (let vuelta = 0; vuelta < 8; vuelta++) {
      const sumaPesos = libres.reduce((a, h) => a + peso(h), 0) || 1;
      const topados = [];
      for (const h of libres) {
        const p = probAciertos(k, h);
        const pago = p > 0 ? (peso(h) / sumaPesos) * restante / p : 0;
        if (pago > TOPE) topados.push(h);
      }
      if (!topados.length) {
        libres.forEach(h => {
          const p = probAciertos(k, h);
          pagos[h] = p > 0 ? (peso(h) / sumaPesos) * restante / p : 0;
        });
        break;
      }
      topados.forEach(h => {
        pagos[h] = TOPE;
        restante -= TOPE * probAciertos(k, h);
      });
      libres = libres.filter(h => !topados.includes(h));
      if (!libres.length) break;
    }
    return pagos;
  }

  let elegidos = new Set(), salidos = [], jugando = false;

  const monto = K.G.inputMonto(5);
  const sElegidos = K.G.stat('Números elegidos', '0');
  const sMejor = K.G.stat('Pago máximo', '—');
  const sUlt = K.G.stat('Último resultado', '—');
  const sNeto = K.G.stat('Resultado neto', K.sol(0));
  let neto = 0;

  const btn = K.el('button', { class: 'btn bloque', text: 'Elige números' });
  const btnAzar = K.el('button', { class: 'btn sec bloque', text: 'Elegir al azar' });
  const btnLimpiar = K.el('button', { class: 'btn sec bloque', text: 'Limpiar' });

  const panel = K.el('div', { class: 'panel-apuesta' }, [
    monto.wrap, btn, btnAzar, btnLimpiar,
    K.el('div', { class: 'separador' }),
    sElegidos.fila, sMejor.fila, sUlt.fila, sNeto.fila
  ]);

  const rejilla = K.el('div', { class: 'keno-grid' });
  const celdas = [];
  for (let n = 1; n <= TOTAL; n++) {
    const c = K.el('button', { class: 'keno-num', text: n, onclick: () => alternar(n) });
    celdas.push(c);
    rejilla.appendChild(c);
  }
  const bolas = K.el('div', { class: 'keno-bolas' });
  const pagosCaja = K.el('div', { class: 'keno-pagos' });
  const mensaje = K.el('div', { class: 'resultado' });
  const zona = K.el('div', { class: 'zona-juego' }, [rejilla, bolas, mensaje, pagosCaja]);

  function alternar(n) {
    if (jugando) return;
    if (elegidos.has(n)) elegidos.delete(n);
    else {
      if (elegidos.size >= MAX_PICKS) { K.aviso('Máximo ' + MAX_PICKS + ' números.', 'warn'); return; }
      elegidos.add(n);
    }
    refrescar();
  }

  function refrescar() {
    celdas.forEach((c, i) => {
      const n = i + 1;
      c.className = 'keno-num' +
        (elegidos.has(n) ? ' elegido' : '') +
        (salidos.includes(n) ? (elegidos.has(n) ? ' acierto' : ' salido') : '');
    });
    sElegidos.set(elegidos.size + ' de ' + MAX_PICKS);
    bolas.innerHTML = salidos.length
      ? '<span class="et">Bolas:</span>' + salidos.map(n =>
          `<span class="bola${elegidos.has(n) ? ' acierto' : ''}">${n}</span>`).join('')
      : '';
    const t = tabla(elegidos.size);
    const claves = Object.keys(t).map(Number).sort((a, b) => a - b);
    sMejor.set(claves.length ? K.dec(t[claves[claves.length - 1]], 1) + '×' : '—');
    pagosCaja.innerHTML = claves.length
      ? claves.map(h => `<div class="keno-pago"><span>${h} aciertos</span><b>${t[h] < 10 ? t[h].toFixed(2) : t[h].toFixed(0)}×</b>
          <i>${(probAciertos(elegidos.size, h) * 100).toFixed(2)}%</i></div>`).join('')
      : '<div class="keno-vacio">Elige entre 1 y 10 números para ver la tabla de pagos.</div>';
    btn.textContent = elegidos.size ? 'Jugar ' + K.sol(monto.get()) : 'Elige números';
    btn.disabled = elegidos.size === 0 || jugando;
  }

  async function jugar() {
    if (jugando || !elegidos.size) return;
    const apuesta = monto.get();
    if (!K.G.apostar(apuesta)) return;
    jugando = true; btn.disabled = true; mensaje.textContent = '';
    neto = K.round2(neto - apuesta); sNeto.set(K.sol(neto));

    salidos = [];
    const bolsa = K.mezcla([...Array(TOTAL).keys()].map(i => i + 1));
    const sorteo = bolsa.slice(0, BOLAS);
    for (const n of sorteo) {
      salidos.push(n);
      refrescar();
      await K.enEspera(170);
    }

    const aciertos = [...elegidos].filter(n => salidos.includes(n)).length;
    const t = tabla(elegidos.size);
    const mult = t[aciertos] || 0;
    const premio = K.round2(apuesta * mult);
    if (premio > 0) {
      K.G.pagar(premio, juego.nom + ' · ' + aciertos + ' aciertos');
      neto = K.round2(neto + premio); sNeto.set(K.sol(neto));
      mensaje.innerHTML = `<span style="color:var(--verde-2)">${aciertos} aciertos · ${K.dec(mult)}× · ${K.sol(premio)}</span>`;
      if (mult >= 20) K.confeti(90);
    } else {
      mensaje.innerHTML = `<span style="color:var(--tenue)">${aciertos} aciertos · sin premio</span>`;
    }
    sUlt.set(aciertos + ' aciertos');
    jugando = false;
    refrescar();
  }

  btn.onclick = jugar;
  btnAzar.onclick = () => {
    if (jugando) return;
    elegidos = new Set(K.mezcla([...Array(TOTAL).keys()].map(i => i + 1)).slice(0, K.entero(4, 8)));
    salidos = [];
    refrescar();
  };
  btnLimpiar.onclick = () => { if (!jugando) { elegidos.clear(); salidos = []; refrescar(); } };
  monto.inp.oninput = refrescar;

  refrescar();
  root.appendChild(K.el('div', { class: 'juego-layout' }, [panel, zona]));
  root.appendChild(K.G.nota(`<h4>Por qué la tabla cambia según cuántos números elijas</h4>
    Con 40 bolas y 10 sorteadas, la probabilidad de acertar <b>h</b> de tus <b>k</b> números es
    <code>C(k,h) × C(40−k,10−h) / C(40,10)</code>. El juego reparte el ${(RTP * 100).toFixed(0)}% de
    retorno entre los aciertos que pagan, y por eso acertar 8 de 8 puede pagar miles de veces la
    apuesta: es igual de improbable. Elegir más números no mejora tu retorno, solo mueve el premio
    hacia resultados más raros.`));
};
