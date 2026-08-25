/* ===========================================================
   video/tour.js — graba un recorrido guiado de KRONOS BET
   Uso: node video/tour.js
   Genera video/kronosbet-recorrido.webm (1600×900).
   =========================================================== */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs');
const path = require('path');

const fuentes = require('./fuentes');

const RAIZ = path.join(__dirname, '..');
const SALIDA = path.join(__dirname, 'kronosbet-recorrido.webm');
const TMP = path.join(__dirname, '.grabacion');

/* ---------------- rótulos sobre la página ---------------- */
const ESTILOS = `
  #tour-capa{position:fixed;inset:0;z-index:99999;pointer-events:none;font-family:"Barlow",system-ui,sans-serif}
  #tour-marca{
    position:absolute;bottom:26px;right:28px;display:flex;align-items:center;gap:9px;
    background:rgba(8,12,20,.82);backdrop-filter:blur(8px);border:1px solid rgba(255,85,0,.4);
    border-radius:10px;padding:7px 14px;color:#fff;font-weight:800;letter-spacing:.04em;font-size:14px;
    box-shadow:0 8px 24px rgba(0,0,0,.5);
  }
  #tour-marca b{color:#ff5500}
  #tour-marca span{font-weight:600;font-size:11.5px;color:#94a3b8;letter-spacing:.08em;text-transform:uppercase}
  #tour-pie{
    position:absolute;left:0;right:0;bottom:0;padding:80px 34px 30px;
    background:linear-gradient(180deg,transparent,rgba(3,6,11,.82) 38%,rgba(3,6,11,.97) 68%);
    color:#f1f5f9;
  }
  #tour-eyebrow{
    font-size:12px;font-weight:800;letter-spacing:.22em;text-transform:uppercase;color:#ff7a33;
    margin-bottom:7px;opacity:0;transform:translateY(6px);transition:.35s;
  }
  #tour-texto{
    font-size:27px;font-weight:700;line-height:1.3;max-width:1080px;text-wrap:balance;
    opacity:0;transform:translateY(10px);transition:.4s;text-shadow:0 3px 18px rgba(0,0,0,.8);
  }
  #tour-capa.on #tour-eyebrow,#tour-capa.on #tour-texto{opacity:1;transform:none}
  #tour-progreso{position:absolute;left:0;bottom:0;height:3px;background:#ff5500;width:0;transition:width .3s linear;box-shadow:0 0 12px rgba(255,85,0,.8)}
  #tour-cursor{
    position:absolute;width:22px;height:22px;border-radius:50%;
    background:rgba(255,85,0,.35);border:2px solid #fff;box-shadow:0 0 14px rgba(255,85,0,.8);
    transform:translate(-50%,-50%);transition:left .45s cubic-bezier(.4,0,.2,1),top .45s cubic-bezier(.4,0,.2,1);
    left:-100px;top:-100px;
  }
  #tour-cursor.click{animation:tour-pulso .4s ease-out}
  @keyframes tour-pulso{0%{box-shadow:0 0 0 0 rgba(255,85,0,.7)}100%{box-shadow:0 0 0 26px rgba(255,85,0,0)}}
  #tour-titulo{
    position:absolute;inset:0;display:grid;place-content:center;text-align:center;gap:14px;
    background:radial-gradient(circle at 50% 45%,rgba(255,85,0,.22),transparent 62%),#04070d;
    opacity:0;transition:.5s;
  }
  #tour-titulo.on{opacity:1;z-index:2}
  #tour-titulo h1{font-family:"Archivo",system-ui,sans-serif;font-size:66px;font-weight:900;color:#fff;letter-spacing:-.02em}
  #tour-titulo h1 em{color:#ff5500;font-style:normal}
  #tour-titulo p{font-size:22px;color:#cbd5e1;max-width:820px;margin:0 auto;line-height:1.45}
  #tour-titulo .pie{font-size:14px;color:#94a3b8;letter-spacing:.1em;text-transform:uppercase;margin-top:10px}
`;

const CAPA = `
  <div id="tour-capa">
    <div id="tour-marca"><b>KRONOS BET</b><span id="tour-seccion">recorrido</span></div>
    <div id="tour-cursor"></div>
    <div id="tour-titulo"><h1></h1><p></p><div class="pie"></div></div>
    <div id="tour-pie"><div id="tour-eyebrow"></div><div id="tour-texto"></div></div>
    <div id="tour-progreso"></div>
  </div>`;

(async () => {
  const CSS_FUENTES = fuentes.leer();
  if (fs.existsSync(TMP)) fs.rmSync(TMP, { recursive: true, force: true });
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 1600, height: 900 },
    recordVideo: { dir: TMP, size: { width: 1600, height: 900 } },
    deviceScaleFactor: 1
  });
  const URL_SITIO = 'file://' + path.join(RAIZ, 'index.html');

  const page = await ctx.newPage();
  // Las tipografías van desde el caché local: pedirlas a Google desde acá tarda
  // unos 12 s y esa espera se colaba entera al principio del video.
  await page.route('https://fonts.googleapis.com/**', r => r.abort());
  await page.goto(URL_SITIO, { waitUntil: 'domcontentloaded' });
  await page.addStyleTag({ content: CSS_FUENTES });
  await page.evaluate(() => document.fonts.ready).catch(() => {});
  await page.waitForTimeout(900);

  await page.addStyleTag({ content: ESTILOS });
  await page.evaluate(html => document.body.insertAdjacentHTML('beforeend', html), CAPA);

  const DURACION_TOTAL = 178000;
  let transcurrido = 0;

  const esperar = async ms => { await page.waitForTimeout(ms); transcurrido += ms; };

  /* rótulo inferior */
  async function decir(eyebrow, texto, seccion) {
    await page.evaluate(([e, t, s]) => {
      const capa = document.getElementById('tour-capa');
      capa.classList.remove('on');
      setTimeout(() => {
        document.getElementById('tour-eyebrow').textContent = e;
        document.getElementById('tour-texto').textContent = t;
        if (s) document.getElementById('tour-seccion').textContent = s;
        capa.classList.add('on');
      }, 180);
    }, [eyebrow, texto, seccion || null]);
  }

  const progreso = async () => page.evaluate(p => {
    document.getElementById('tour-progreso').style.width = p + '%';
  }, Math.min(100, transcurrido / DURACION_TOTAL * 100));

  /* bloque = rótulo + acción + espera */
  async function bloque(eyebrow, texto, ms, accion, seccion) {
    await decir(eyebrow, texto, seccion);
    await page.waitForTimeout(400);
    if (accion) {
      try { await accion(); }
      catch (e) { console.log(`  (paso omitido en "${eyebrow}":`, e.message.split('\n')[0], ')'); }
    }
    await esperar(ms);
    await progreso();
  }

  /* cursor falso que se mueve antes de cada clic */
  async function clic(selector, indice = 0) {
    const el = page.locator(selector).nth(indice);
    // Tiempos cortos a propósito: si un clic no sale, el recorrido sigue en vez
    // de dejar treinta segundos de pantalla congelada en el video.
    await el.waitFor({ state: 'visible', timeout: 3000 });
    const caja = await el.boundingBox();
    if (!caja) return;
    const x = caja.x + caja.width / 2, y = caja.y + caja.height / 2;
    await page.evaluate(([x, y]) => {
      const c = document.getElementById('tour-cursor');
      c.style.left = x + 'px'; c.style.top = y + 'px';
    }, [x, y]);
    await page.waitForTimeout(520);
    await page.evaluate(() => {
      const c = document.getElementById('tour-cursor');
      c.classList.remove('click'); void c.offsetWidth; c.classList.add('click');
    });
    await el.click({ force: true, timeout: 3000 });
    await page.waitForTimeout(260);
  }

  const nav = nombre => clic(`#nav button:has-text("${nombre}")`);

  /* Elige la cuota en vivo más cercana a la par. Con el reloj a 30x, los catorce
     segundos que pasan entre elegir y apostar son siete minutos de partido: un
     pronóstico lejano se cierra en el camino y el boleto queda trabado. */
  async function cuotaEstable() {
    const hay = await page.evaluate(() => {
      document.querySelectorAll('[data-tour]').forEach(b => b.removeAttribute('data-tour'));
      const precio = b => parseFloat((b.textContent || '').replace(/[^\d.]/g, ''));
      let mejor = null, dist = Infinity;
      for (const card of document.querySelectorAll('.evento')) {
        const vivo = !!card.querySelector('.badge-vivo');
        for (const b of card.querySelectorAll('.cuota')) {
          const v = precio(b);
          if (b.disabled || !(v > 1)) continue;
          const d = Math.abs(v - 2) + (vivo ? 0 : 5);
          if (d < dist) { dist = d; mejor = b; }
        }
      }
      if (!mejor) return false;
      mejor.dataset.tour = '1';
      return true;
    });
    if (hay) await clic('[data-tour="1"]');
    else await clic('.cuota');
  }

  /* Si el mercado se cerró entre que se eligió y se apuesta, se cambia la
     selección en vez de quedarse con el boleto trabado. */
  async function boletoSano() {
    const cerrada = await page.evaluate(() => !!document.querySelector('.seleccion .cerrada'));
    if (!cerrada) return;
    await page.evaluate(() => document.querySelectorAll('.seleccion .cerrar').forEach(b => b.click()));
    await page.waitForTimeout(300);
    await cuotaEstable();
    await page.evaluate(() => { const i = document.querySelector('#stake'); if (i) { i.value = 50; i.dispatchEvent(new Event('input')); } });
    await page.waitForTimeout(300);
  }

  async function titulo(h1, p, pie, ms) {
    await page.evaluate(([a, b, c]) => {
      const t = document.getElementById('tour-titulo');
      t.querySelector('h1').innerHTML = a;
      t.querySelector('p').textContent = b;
      t.querySelector('.pie').textContent = c;
      t.classList.add('on');
    }, [h1, p, pie]);
    await esperar(ms);
    await page.evaluate(() => document.getElementById('tour-titulo').classList.remove('on'));
    await page.waitForTimeout(500);
  }

  console.log('grabando…');

  /* ---------------- 1. portada ---------------- */
  await titulo('KRONOS <em>BET</em>',
    'Un simulador de casa de apuestas deportivas y casino, hecho para enseñar cómo funciona por dentro.',
    'fichas de demostración · sin dinero real · +18', 7000);

  await bloque('El libro deportivo',
    '231 partidos repartidos en 51 competiciones: fútbol, básquet, tenis, eSports y vóley.',
    6500, null, 'deportes');

  await bloque('En vivo',
    'Los partidos se juegan solos con el reloj a 30×, y las cuotas se mueven en tiempo real con el marcador.',
    7000, async () => { await page.mouse.wheel(0, 380); });

  await bloque('De la probabilidad a la cuota',
    'Cada cuota sale de un modelo: Poisson para el fútbol, normal para el básquet, sets para el tenis.',
    6500, async () => { await page.mouse.wheel(0, -380); });

  /* ---------------- 2. el margen ---------------- */
  await bloque('El margen de la casa',
    'Al tocar una cuota, el boleto enseña la probabilidad implícita y el margen que se lleva la casa.',
    7000, async () => { await cuotaEstable(); });

  await bloque('Overround',
    'La suma de las probabilidades de un mercado siempre pasa del 100%. Esa diferencia es el negocio.',
    6500, async () => {
      await page.evaluate(() => { const i = document.querySelector('#stake'); if (i) { i.value = 50; i.dispatchEvent(new Event('input')); } });
    });

  await bloque('Retardo de aceptación',
    'En vivo, la apuesta tarda entre 3 y 8 segundos en aceptarse: es el freno contra el courtsiding.',
    9500, async () => { await boletoSano(); await clic('#apostar'); });

  /* ---------------- 3. mis apuestas y cashout ---------------- */
  await bloque('Cashout',
    'Cobrar antes de tiempo no cancela nada: es vender tu apuesta al precio actual del mercado.',
    8000, async () => { await nav('Mis apuestas'); });

  /* ---------------- 4. ficha del partido ---------------- */
  await bloque('Ficha del partido',
    'Cada partido abre con su marcador, estadísticas y la gráfica de cómo se movió su cuota.',
    9000, async () => {
      await nav('Deportes');
      await page.waitForTimeout(700);
      await clic('.ev-pie .mas');
    });

  await bloque('Mercados',
    'Hasta siete mercados por partido, y los que ya están decididos se cierran en vez de dar precios absurdos.',
    7000, async () => { await page.mouse.wheel(0, 350); });

  await page.evaluate(() => { const x = document.querySelector('.modal-cab .x'); if (x) x.click(); });

  /* ---------------- 5. casino ---------------- */
  await bloque('El casino',
    'Cuarenta juegos jugables sobre motores propios, ordenados en filas como en un casino real.',
    7500, async () => { await nav('Casino'); }, 'casino');

  await bloque('Mines',
    'El multiplicador no es inventado: es el pago justo por casillas abiertas, con un 3% para la casa.',
    9000, async () => {
      await page.evaluate(() => K.Casino.abrir('mines'));
      await page.waitForTimeout(700);
      await clic('.modal .panel-apuesta .btn');
      await page.waitForTimeout(500);
      for (const i of [2, 7, 13]) { await clic('.modal .celda', i); await page.waitForTimeout(450); }
    });

  await page.evaluate(() => { const x = document.querySelector('.modal-cab .x'); if (x) x.click(); });

  await bloque('Ruleta europea',
    'Rueda con el orden real de las 37 casillas y bola que gira al revés, desacelera y cae en su lugar.',
    5000, async () => {
      await page.evaluate(() => K.Casino.abrir('lightning'));
      await page.waitForTimeout(800);
      await clic('.modal .pano-ext:has-text("ROJO")');
      await clic('.modal .pano-num', 12);
    });

  await bloque('El cero',
    'Hay 37 casillas pero el rojo paga como si hubiera 36. Ese 2.7% es toda la ventaja de la casa.',
    11000, async () => { await clic('.modal .panel-apuesta .btn'); });

  await page.evaluate(() => { const x = document.querySelector('.modal-cab .x'); if (x) x.click(); });

  await bloque('Aviator',
    'El punto de caída se sortea antes del despegue: aguantar más no empuja nada, solo arriesga más.',
    13000, async () => {
      await page.evaluate(() => K.Casino.abrir('aviator'));
      await page.waitForTimeout(800);
      await clic('.modal .panel-apuesta .btn');
    });

  await page.evaluate(() => { const x = document.querySelector('.modal-cab .x'); if (x) x.click(); });

  /* ---------------- 6. virtuales ---------------- */
  await bloque('Carreras virtuales',
    'Una carrera cada minuto, con el resultado sorteado antes de la animación y un margen del 14%.',
    9000, async () => { await nav('Virtuales'); }, 'virtuales');

  await bloque('Por qué existen',
    'No están para que veas una carrera: están para que no tengas que esperar a que se juegue un partido.',
    7000, async () => { await page.mouse.wheel(0, 300); });

  /* ---------------- 7. recompensas ---------------- */
  await bloque('Recompensas',
    'Niveles, misiones diarias, torneo semanal, cashback, jackpot progresivo y dieciocho logros.',
    8000, async () => { await nav('Recompensas'); await page.mouse.wheel(0, 0); }, 'recompensas');

  await bloque('La letra chica',
    'Cada mecánica dice qué palanca activa: la racha duele al cortarse, el nivel sube aunque pierdas.',
    9000, async () => { await page.mouse.wheel(0, 1400); });

  /* ---------------- 8. cómo funciona ---------------- */
  await bloque('Cómo funciona',
    'Y una sección entera con la matemática del sitio: margen, riesgo, latencia, cashout y RTP.',
    8000, async () => { await nav('Cómo funciona'); await page.mouse.wheel(0, 300); }, 'la matemática');

  await bloque('Todo a la vista',
    'Ninguna casa real te explica esto. Aquí está escrito al lado de cada juego.',
    7000, async () => { await page.mouse.wheel(0, 900); });

  /* ---------------- 9. cierre ---------------- */
  await progreso();
  await titulo('Es un <em>simulador</em>',
    'No acepta dinero, no procesa pagos y no está afiliado a ninguna casa real. Si juegas de verdad: mayor de edad, con un límite puesto antes de empezar, y sabiendo que el retorno siempre es menor que 100%.',
    'HTML, CSS y JavaScript · sin dependencias', 11000);

  console.log('cerrando…');
  const video = page.video();
  await page.close();
  await ctx.close();
  await browser.close();

  const origen = video && await video.path();
  if (!origen || !fs.existsSync(origen)) throw new Error('no se generó el video');
  fs.copyFileSync(origen, SALIDA);
  fs.rmSync(TMP, { recursive: true, force: true });
  const mb = (fs.statSync(SALIDA).size / 1048576).toFixed(1);
  console.log('listo:', SALIDA, mb + ' MB');
})();
