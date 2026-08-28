/* NEXO ARCADE — engine/core.js
   Registro de juegos, ciclo de vida, bucle principal y puente con la plataforma. */
(function (global) {
  'use strict';
  const NX = (global.NX = global.NX || {});
  const M = NX.M, GFX = NX.GFX;

  NX._games = Object.create(null);
  NX._pending = Object.create(null);

  /* Registro. Uso:
       NX.game('slug', { w:960, h:540 }, function (E) { return { update, draw }; }); */
  NX.game = function (slug, opts, factory) {
    if (typeof opts === 'function') { factory = opts; opts = {}; }
    NX._games[slug] = { slug, opts: opts || {}, factory };
    const cbs = NX._pending[slug];
    if (cbs) { delete NX._pending[slug]; cbs.forEach((f) => f(NX._games[slug])); }
    return NX._games[slug];
  };
  NX.has = (slug) => !!NX._games[slug];

  /* Carga perezosa del módulo de un juego mediante <script> clásico
     (funciona igual servido por HTTP que abierto con file://). */
  NX.load = function (slug, base) {
    return new Promise((resolve, reject) => {
      if (NX._games[slug]) return resolve(NX._games[slug]);
      (NX._pending[slug] || (NX._pending[slug] = [])).push(resolve);
      if (NX._pending[slug].length > 1) return;
      const s = document.createElement('script');
      s.src = (base || 'assets/js/games/') + slug + '.js';
      s.async = true;
      s.onerror = () => {
        delete NX._pending[slug];
        reject(new Error('No se pudo cargar el juego: ' + slug));
      };
      document.head.appendChild(s);
    });
  };

  /* --------------------------------------------------------------- API */
  /* Puente por defecto: permite ejecutar un juego sin la plataforma. */
  function defaultApi(slug) {
    const key = 'nx:' + slug + ':';
    return {
      slug,
      best: 0,
      hud() {}, score() {}, status() {}, toast() {}, achievement() {},
      over() {}, win() {}, progress() {},
      save(k, v) { try { localStorage.setItem(key + k, JSON.stringify(v)); } catch (e) {} },
      load(k, d) {
        try { const v = localStorage.getItem(key + k); return v == null ? d : JSON.parse(v); }
        catch (e) { return d; }
      },
      vibrate(ms) { if (navigator.vibrate) try { navigator.vibrate(ms); } catch (e) {} },
    };
  }

  /* ------------------------------------------------------------ Engine */
  function Engine(def, host, api, options) {
    const o = Object.assign({
      w: 960, h: 540, fit: 'contain', bg: null, pal: 'neon',
      maxDt: 0.05, fixed: 0, pixel: false, maxDpr: 2.5,
      controls: null, music: null, cursor: 'default',
    }, def.opts, options || {});

    this.def = def;
    this.opts = o;
    this.host = host;
    this.api = api || defaultApi(def.slug);
    this.slug = def.slug;

    const cv = document.createElement('canvas');
    cv.className = 'nx-canvas';
    cv.style.touchAction = 'none';
    /* El lienzo tiene que poder recibir el foco o el teclado nunca le llega,
       sobre todo cuando la web va incrustada en un iframe. */
    cv.tabIndex = 0;
    cv.style.outline = 'none';
    cv.style.cursor = o.cursor;
    if (o.pixel) cv.style.imageRendering = 'pixelated';
    host.appendChild(cv);
    this.canvas = cv;
    this.ctx = cv.getContext('2d', { alpha: false, desynchronized: true });

    this.g = new GFX.G(this.ctx);
    this.pal = typeof o.pal === 'string' ? (GFX.PALETTES[o.pal] || GFX.PALETTES.neon) : o.pal;
    this.g.pal = this.pal;
    this.bg = o.bg || this.pal.bg;

    this.W = o.w; this.H = o.h;
    this.scale = 1; this.dpr = 1;
    this.t = 0; this.dt = 0; this.frame = 0;
    this.paused = false; this.running = false; this._acc = 0;

    this.M = M; this.GFX = GFX;
    this.rng = new M.RNG();
    this.particles = new GFX.Particles(o.particles || 500);
    this.camera = new GFX.Camera(this.W, this.H);
    this.floaters = new GFX.Floaters();
    this.tweens = new GFX.Tweens();
    this.input = new NX.Input(cv);
    this.ui = NX.UI ? new NX.UI(this) : null;
    this.audio = NX.Audio;
    this.fx = NX.FX ? new NX.FX(this) : null;
    if (this.fx && o.fx) this.fx.configure(o.fx);
    if (this.fx && o.fx === false) this.fx.enabled = false;
    cv.addEventListener('pointerdown', () => { try { cv.focus({ preventScroll: true }); } catch (e) { cv.focus(); } });

    const self = this;
    this.input.setTransform((x, y) => ({
      x: x * self.W / Math.max(1, cv.clientWidth),
      y: y * self.H / Math.max(1, cv.clientHeight),
    }));

    this.sfx = (n, a) => NX.Audio.sfx(n, a);
    this.music = NX.Audio.music;

    this._onResize = () => this.resize();
    window.addEventListener('resize', this._onResize);
    if (global.ResizeObserver) {
      this._ro = new ResizeObserver(() => this.resize());
      this._ro.observe(host);
    }
    this.resize();
    this.game = def.factory(this) || {};
    this.resize();                     /* el juego ya puede reaccionar al tamaño */
  }
  const E = Engine.prototype;

  E.resize = function () {
    const host = this.host, cv = this.canvas, o = this.opts;
    const hw = host.clientWidth || o.w, hh = host.clientHeight || o.h;
    if (hw <= 0 || hh <= 0) return;
    const dpr = Math.min(o.maxDpr, global.devicePixelRatio || 1);
    let cssW, cssH;

    if (o.fit === 'fill') {
      cssW = hw; cssH = hh;
      this.W = Math.round(hw); this.H = Math.round(hh);
    } else if (o.fit === 'width') {
      cssW = hw; cssH = hh;
      this.W = o.w; this.H = Math.round(o.w * hh / hw);
    } else {
      const s = Math.min(hw / o.w, hh / o.h);
      cssW = Math.round(o.w * s); cssH = Math.round(o.h * s);
      this.W = o.w; this.H = o.h;
    }
    cv.style.width = cssW + 'px';
    cv.style.height = cssH + 'px';
    const bw = Math.max(1, Math.round(cssW * dpr)), bh = Math.max(1, Math.round(cssH * dpr));
    if (cv.width !== bw || cv.height !== bh) { cv.width = bw; cv.height = bh; }
    this.dpr = dpr;
    this.scale = bw / this.W;
    this.ctx.setTransform(this.scale, 0, 0, bh / this.H, 0, 0);
    this.ctx.imageSmoothingEnabled = !o.pixel;
    this.g.size(this.W, this.H);
    this.camera.resize(this.W, this.H);
    if (this.game && this.game.resize) this.game.resize(this.W, this.H);
    if (!this.running) this._render(0);
  };

  E.start = function () {
    if (this.running) return;
    this.running = true;
    try { this.canvas.focus({ preventScroll: true }); } catch (e) {}
    this._last = performance.now();
    this._visto = this._last;

    const paso = (now) => {
      if (!this.running) return;
      this._raf = requestAnimationFrame(paso);
      this._avanza(now);
    };
    this._raf = requestAnimationFrame(paso);

    /* Red de seguridad: hay entornos donde requestAnimationFrame no llega
       (iframes que el navegador considera ocultos, pestañas en segundo plano,
       visores que congelan el marco). Sin esto el lienzo se queda con el
       primer fotograma pintado y el juego parece una imagen fija. */
    if (this._salva) clearInterval(this._salva);
    this._salva = setInterval(() => {
      if (!this.running) return;
      const now = performance.now();
      if (now - this._visto > 320) this._avanza(now);
    }, 100);

    try {
      if (this.opts.music && NX.Audio.state.musicOn) NX.Audio.music.start(this.opts.music);
    } catch (e) {}
  };

  /* Un paso de reloj, venga de rAF o del intervalo de rescate. */
  E._avanza = function (now) {
    this._visto = now;
    let dt = (now - this._last) / 1000;
    this._last = now;
    if (dt > this.opts.maxDt) dt = this.opts.maxDt;
    if (dt < 0) dt = 0;
    this.tick(dt);
  };

  E.stop = function () {
    this.running = false;
    if (this._raf) cancelAnimationFrame(this._raf);
    if (this._salva) { clearInterval(this._salva); this._salva = 0; }
    NX.Audio.music.stop();
  };

  E.tick = function (dt) {
    this.input.pollGamepad();
    if (!this.paused) {
      this.dt = dt;
      this.t += dt;
      this.frame++;
      const gm = this.game;
      /* eventos derivados de la entrada -> callbacks opcionales del juego */
      const P = this.input.pointer;
      if (P.pressed && gm.pointerdown) gm.pointerdown(P.x, P.y);
      if (P.released && gm.pointerup) gm.pointerup(P.x, P.y);
      if ((P.dx || P.dy) && gm.pointermove) gm.pointermove(P.x, P.y);
      if (this.input.swipe && gm.swipe) gm.swipe(this.input.swipe);
      if (this.input.tap && gm.tap) gm.tap(this.input.tap.x, this.input.tap.y);
      if (this.input.wheelDelta && gm.wheel) gm.wheel(this.input.wheelDelta);
      if (gm.keydown) {
        const pr = this.input._pressed;
        if (pr.size) pr.forEach((code) => gm.keydown(code));
      }
      if (this.opts.fixed) {
        this._acc += dt;
        const fs = this.opts.fixed;
        let guard = 0;
        while (this._acc >= fs && guard++ < 5) { if (gm.update) gm.update(fs); this._acc -= fs; }
      } else if (gm.update) gm.update(dt);

      this.tweens.update(dt);
      this.particles.update(dt);
      this.floaters.update(dt);
      this.camera.update(dt);
      NX.Audio.music.update(dt);
    }
    this._render(dt);
    this.input.endFrame();
  };

  E._render = function (dt) {
    const g = this.g;
    this.ctx.save();
    if (this.bg) g.clear(this.bg);
    if (this.game && this.game.draw) this.game.draw(g);
    this.camera.drawFlash(g);
    this.ctx.restore();
    if (this.fx) this.fx.apply(dt || 0.016);
  };

  E.setPaused = function (p) {
    this.paused = !!p;
    if (this.paused) NX.Audio.music.stop();
    else if (this.opts.music && NX.Audio.state.musicOn) NX.Audio.music.start(this.opts.music);
  };

  E.destroy = function () {
    this.stop();
    if (this.game && this.game.destroy) { try { this.game.destroy(); } catch (e) {} }
    this.input.destroy();
    window.removeEventListener('resize', this._onResize);
    if (this._ro) this._ro.disconnect();
    if (this.canvas.parentNode) this.canvas.parentNode.removeChild(this.canvas);
  };

  /* Reinicia el juego conservando el mismo lienzo. */
  E.restart = function () {
    if (this.game && this.game.destroy) { try { this.game.destroy(); } catch (e) {} }
    this.particles.clear(); this.floaters.clear(); this.tweens.clear();
    this.camera.x = 0; this.camera.y = 0; this.camera.zoom = 1; this.camera.shake = 0; this.camera.flashA = 0;
    this.t = 0; this.frame = 0; this._acc = 0;
    this.paused = false;
    this.game = this.def.factory(this) || {};
    if (this.game.resize) this.game.resize(this.W, this.H);
  };

  /* --------------------------------------------------------- arranque */
  NX.mount = function (slug, host, api, options) {
    const def = NX._games[slug];
    if (!def) throw new Error('Juego no registrado: ' + slug);
    const e = new Engine(def, host, api, options);
    e.start();
    return e;
  };

  NX.Engine = Engine;
})(typeof window !== 'undefined' ? window : globalThis);
