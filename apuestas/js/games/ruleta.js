/* ===========================================================
   games/ruleta.js — ruleta europea (un solo cero)
   Variante "rayos": multiplicadores sobre pleno, como
   Lightning Roulette o Mega Fire Blaze.
   =========================================================== */
K.Juegos = K.Juegos || {};
K.Juegos.ruleta = function (root, juego) {
  const rayos = !!(juego.cfg && juego.cfg.rayos);
  const ROJOS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
  const color = n => n === 0 ? 'verde' : ROJOS.has(n) ? 'rojo' : 'negro';

  /* Apuestas exteriores: pago total (incluye la apuesta). */
  const APUESTAS = [
    { id: 'rojo', l: 'Rojo', pago: 2, gana: n => color(n) === 'rojo' },
    { id: 'negro', l: 'Negro', pago: 2, gana: n => color(n) === 'negro' },
    { id: 'par', l: 'Par', pago: 2, gana: n => n !== 0 && n % 2 === 0 },
    { id: 'impar', l: 'Impar', pago: 2, gana: n => n % 2 === 1 },
    { id: 'bajo', l: '1 a 18', pago: 2, gana: n => n >= 1 && n <= 18 },
    { id: 'alto', l: '19 a 36', pago: 2, gana: n => n >= 19 },
    { id: 'd1', l: '1ª docena', pago: 3, gana: n => n >= 1 && n <= 12 },
    { id: 'd2', l: '2ª docena', pago: 3, gana: n => n >= 13 && n <= 24 },
    { id: 'd3', l: '3ª docena', pago: 3, gana: n => n >= 25 },
    { id: 'pleno', l: 'Pleno (número)', pago: rayos ? 30 : 36, gana: (n, num) => n === num }
  ];

  let sel = 'rojo';
  const monto = K.G.inputMonto(5);
  const inpNum = K.el('input', { type: 'number', min: '0', max: '36', value: '7' });
  const sPago = K.G.stat('Pago', '2.00×');
  const sProb = K.G.stat('Probabilidad', K.pct(18 / 37));
  const sUlt = K.G.stat('Últimos', '—');

  const btn = K.el('button', { class: 'btn', text: 'Girar' });
  const panel = K.el('div', { class: 'panel-apuesta' }, [
    monto.wrap,
    K.el('div', { class: 'campo' }, [K.el('label', { text: 'Número para el pleno' }), inpNum]),
    btn,
    K.el('div', { style: 'height:1px;background:var(--linea);margin:2px 0' }),
    sPago.fila, sProb.fila, sUlt.fila
  ]);

  const opciones = K.el('div', { class: 'opciones' });
  const botones = APUESTAS.map(a => {
    const b = K.el('button', { class: a.id === sel ? 'on' : '', onclick: () => elegir(a.id) }, [
      K.el('span', { text: a.l }), K.el('i', { text: a.pago + '×' })
    ]);
    opciones.appendChild(b);
    return b;
  });
  function elegir(id) {
    sel = id;
    botones.forEach((b, i) => b.classList.toggle('on', APUESTAS[i].id === id));
    const a = APUESTAS.find(x => x.id === id);
    sPago.set(K.dec(a.pago) + '×');
    const casos = id === 'pleno' ? 1 : id.startsWith('d') ? 12 : 18;
    sProb.set(K.pct(casos / 37));
  }

  const num = K.el('div', { class: 'ruleta-num', text: '—' });
  const detalle = K.el('div', { class: 'resultado', text: rayos ? 'Los rayos caen antes de cada giro' : 'Ruleta europea · 37 casillas' });
  const rayosCaja = K.el('div', { style: 'text-align:center;font-size:12px;color:var(--ambar);min-height:18px;font-weight:700' });
  const zona = K.el('div', { class: 'zona-juego' }, [
    K.el('div', { style: 'flex:1;display:grid;place-content:center;gap:6px' }, [num, detalle, rayosCaja]),
    opciones
  ]);

  const historia = [];
  let girando = false;

  async function girar() {
    if (girando) return;
    const apuesta = monto.get();
    const a = APUESTAS.find(x => x.id === sel);
    const plenoNum = K.clamp(Math.round(Number(inpNum.value) || 0), 0, 36);
    if (!K.G.apostar(apuesta)) return;
    girando = true; btn.disabled = true;

    /* Rayos: 1 a 5 números con multiplicador, sorteados antes del giro. */
    let mapaRayos = {};
    if (rayos) {
      const cuantos = K.entero(1, 5);
      const nums = K.mezcla([...Array(37).keys()]).slice(0, cuantos);
      nums.forEach(n => mapaRayos[n] = K.elige([50, 50, 100, 100, 150, 200, 300, 500]));
      rayosCaja.innerHTML = '⚡ ' + nums.map(n => `${n} (${mapaRayos[n]}×)`).join(' · ');
    }

    const salida = K.entero(0, 36);
    const t0 = performance.now();
    await new Promise(fin => {
      const paso = ahora => {
        const f = (ahora - t0) / 2200;
        if (f < 1) {
          const n = K.entero(0, 36);
          num.textContent = n;
          num.style.color = 'var(--tenue)';
          setTimeout(() => requestAnimationFrame(paso), 30 + f * 120);
        } else fin();
      };
      requestAnimationFrame(paso);
    });

    num.textContent = salida;
    const c = color(salida);
    num.style.color = c === 'rojo' ? 'var(--rojo)' : c === 'verde' ? 'var(--acento)' : 'var(--texto)';
    historia.unshift(salida);
    if (historia.length > 10) historia.length = 10;
    sUlt.set(historia.slice(0, 6).join(' · '));

    let premio = 0, texto = '';
    if (a.gana(salida, plenoNum)) {
      let mult = a.pago;
      if (a.id === 'pleno' && mapaRayos[salida]) mult = mapaRayos[salida];
      premio = K.round2(apuesta * mult);
      K.G.pagar(premio, juego.nom + ' · ' + a.l);
      texto = `<span style="color:var(--acento)">Salió ${salida} (${c}) · ganaste ${K.sol(premio)}${mult !== a.pago ? ' con rayo ' + mult + '×' : ''}</span>`;
      K.aviso('🎯 Ruleta: salió ' + salida + ' · ' + K.sol(premio));
    } else {
      texto = `<span style="color:var(--tenue)">Salió ${salida} (${c}) · no entró tu apuesta</span>`;
    }
    detalle.innerHTML = texto;
    girando = false; btn.disabled = false;
  }

  btn.onclick = girar;
  elegir(sel);
  root.appendChild(K.el('div', { class: 'juego-layout' }, [panel, zona]));
  root.appendChild(K.G.nota(`<h4>De dónde sale la ventaja</h4>
    Hay 37 casillas pero el rojo paga como si hubiera 36: ganas 18 de 37 veces y cobras el doble, o sea
    <code>18/37 × 2 = 97.3%</code>. Ese <b>2.7%</b> es la ventaja de la casa, y viene entero del cero.
    ${rayos ? 'En la versión con rayos el pleno baja de 36× a 30×; esa rebaja financia los multiplicadores ' +
      'que ves antes de cada giro, así que el retorno total termina siendo parecido.' : ''}`));
};
