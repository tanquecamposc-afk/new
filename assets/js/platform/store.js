/* NEXO ARCADE — platform/store.js
   Persistencia local: favoritos, récords, progresión, logros y ajustes. */
(function (global) {
  'use strict';
  const NX = (global.NX = global.NX || {});
  const KEY = 'nexo-arcade:v1';

  const DEFAULTS = {
    favs: [],
    recents: [],
    plays: {},            /* id -> nº de partidas */
    best: {},             /* id -> mejor marca */
    saves: {},            /* id -> estado propio del juego */
    ratings: {},          /* id -> estrellas que le ha puesto el jugador (1-5) */
    flags: {},            /* id -> { motivo, fecha } cuando el jugador lo reporta */
    xp: 0,
    records: 0,           /* récords personales batidos */
    achievements: {},     /* id -> timestamp */
    streak: { last: null, days: 0, best: 0 },
    totalTime: 0,
    settings: {
      theme: 'dark', sound: true, music: true, volume: 0.75,
      side: 'full', reduceFx: false, vpad: 'auto',
    },
    firstSeen: null,
  };

  /* ------------------------------------------------------------- logros */
  const ACHIEVEMENTS = [
    { id: 'primera', ico: '🎮', t: 'Primera partida', d: 'Juega a tu primer juego', xp: 20,
      chk: (s) => s.totalPlays >= 1 },
    { id: 'explorador', ico: '🧭', t: 'Explorador', d: 'Prueba 10 juegos distintos', xp: 60,
      chk: (s) => s.distinct >= 10 },
    { id: 'curioso', ico: '🔍', t: 'Curioso', d: 'Prueba 25 juegos distintos', xp: 120,
      chk: (s) => s.distinct >= 25 },
    { id: 'trotamundos', ico: '🌍', t: 'Trotamundos', d: 'Prueba 50 juegos distintos', xp: 250,
      chk: (s) => s.distinct >= 50 },
    { id: 'coleccionista', ico: '🏆', t: 'Coleccionista', d: 'Prueba todos los juegos del catálogo', xp: 800,
      chk: (s) => s.distinct >= s.total },
    { id: 'habitual', ico: '🔁', t: 'Habitual', d: 'Juega 100 partidas', xp: 150,
      chk: (s) => s.totalPlays >= 100 },
    { id: 'veterano', ico: '🎖️', t: 'Veterano', d: 'Juega 500 partidas', xp: 500,
      chk: (s) => s.totalPlays >= 500 },
    { id: 'critico', ico: '⭐', t: 'Crítico', d: 'Valora 10 juegos con estrellas', xp: 80,
      chk: (s) => s.rated >= 10 },
    { id: 'con-gusto', ico: '❤️', t: 'Con buen gusto', d: 'Marca 5 juegos como favoritos', xp: 40,
      chk: (s) => s.favs >= 5 },
    { id: 'bibliotecario', ico: '📚', t: 'Bibliotecario', d: 'Marca 20 favoritos', xp: 120,
      chk: (s) => s.favs >= 20 },
    { id: 'nivel-5', ico: '⭐', t: 'Nivel 5', d: 'Alcanza el nivel 5', xp: 0, chk: (s) => s.level >= 5 },
    { id: 'nivel-10', ico: '🌟', t: 'Nivel 10', d: 'Alcanza el nivel 10', xp: 0, chk: (s) => s.level >= 10 },
    { id: 'nivel-25', ico: '💫', t: 'Nivel 25', d: 'Alcanza el nivel 25', xp: 0, chk: (s) => s.level >= 25 },
    { id: 'puntero', ico: '📈', t: 'Puntero', d: 'Consigue 1.000 puntos en una partida', xp: 60,
      chk: (s) => s.maxScore >= 1000 },
    { id: 'leyenda', ico: '👑', t: 'Leyenda', d: 'Consigue 25.000 puntos en una partida', xp: 300,
      chk: (s) => s.maxScore >= 25000 },
    { id: 'plusmarquista', ico: '🥇', t: 'Plusmarquista', d: 'Bate 25 récords personales', xp: 180,
      chk: (s) => s.records >= 25 },
    { id: 'imbatible', ico: '🚀', t: 'Imbatible', d: 'Bate 100 récords personales', xp: 400,
      chk: (s) => s.records >= 100 },
    { id: 'constante', ico: '🔥', t: 'Constante', d: 'Juega 3 días seguidos', xp: 90,
      chk: (s) => s.streak >= 3 },
    { id: 'semana-perfecta', ico: '💎', t: 'Semana perfecta', d: 'Juega 7 días seguidos', xp: 250,
      chk: (s) => s.streak >= 7 },
    { id: 'noctambulo', ico: '🌙', t: 'Noctámbulo', d: 'Juega entre las 2 y las 5 de la madrugada', xp: 50,
      chk: (s) => s.hour >= 2 && s.hour < 5 },
    { id: 'estratega', ico: '🏰', t: 'Estratega', d: 'Juega a 5 juegos de estrategia', xp: 80,
      chk: (s) => (s.cats.estrategia || 0) >= 5 },
    { id: 'cerebrito', ico: '🧠', t: 'Cerebrito', d: 'Juega a 5 juegos de mente', xp: 80,
      chk: (s) => (s.cats.mente || 0) >= 5 },
    { id: 'atleta', ico: '🏅', t: 'Atleta', d: 'Juega a 5 juegos de deportes', xp: 80,
      chk: (s) => (s.cats.deportes || 0) >= 5 },
    { id: 'piloto', ico: '🏎️', t: 'Piloto', d: 'Juega a 5 juegos de carreras', xp: 80,
      chk: (s) => (s.cats.carreras || 0) >= 5 },
    { id: 'mente-maestra', ico: '🧩', t: 'Mente maestra', d: 'Juega a 10 puzles distintos', xp: 140,
      chk: (s) => (s.cats.puzzle || 0) >= 10 },
  ];

  /* ---------------------------------------------------------- utilidades */
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function today() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function daysBetween(a, b) {
    if (!a || !b) return 99;
    return Math.round((new Date(b) - new Date(a)) / 86400000);
  }

  const listeners = Object.create(null);

  const Store = {
    data: clone(DEFAULTS),
    available: true,

    init() {
      try {
        const raw = localStorage.getItem(KEY);
        if (raw) {
          const d = JSON.parse(raw);
          this.data = Object.assign(clone(DEFAULTS), d);
          this.data.settings = Object.assign(clone(DEFAULTS.settings), d.settings || {});
          this.data.streak = Object.assign(clone(DEFAULTS.streak), d.streak || {});
        }
      } catch (e) { this.available = false; }
      if (!this.data.firstSeen) this.data.firstSeen = Date.now();
      this._touchStreak();
      this.save();
      return this;
    },

    save() {
      if (!this.available) return;
      try { localStorage.setItem(KEY, JSON.stringify(this.data)); }
      catch (e) { this.available = false; }
    },

    on(ev, fn) { (listeners[ev] || (listeners[ev] = [])).push(fn); return this; },
    emit(ev, arg) { (listeners[ev] || []).forEach((f) => { try { f(arg); } catch (e) {} }); },

    /* ---------------------------------------------------------- racha */
    _touchStreak() {
      const st = this.data.streak;
      const t = today();
      if (st.last === t) return;
      const gap = daysBetween(st.last, t);
      st.days = gap === 1 ? st.days + 1 : 1;
      st.last = t;
      if (st.days > st.best) st.best = st.days;
    },

    /* ------------------------------------------------------- favoritos */
    isFav(id) { return this.data.favs.indexOf(id) >= 0; },
    toggleFav(id) {
      const i = this.data.favs.indexOf(id);
      if (i >= 0) this.data.favs.splice(i, 1);
      else this.data.favs.unshift(id);
      this.save();
      this.checkAchievements();
      this.emit('favs', id);
      return i < 0;
    },

    /* -------------------------------------------------------- recientes */
    addRecent(id) {
      const r = this.data.recents;
      const i = r.indexOf(id);
      if (i >= 0) r.splice(i, 1);
      r.unshift(id);
      if (r.length > 30) r.length = 30;
      this.data.plays[id] = (this.data.plays[id] || 0) + 1;
      this._touchStreak();
      this.save();
      this.emit('recents', id);
    },

    plays(id) { return this.data.plays[id] || 0; },
    totalPlays() {
      let n = 0;
      for (const k in this.data.plays) n += this.data.plays[k];
      return n;
    },
    distinct() { return Object.keys(this.data.plays).length; },

    /* ----------------------------------------------------------- marcas */
    best(id) { return this.data.best[id] || 0; },
    /* Devuelve true si la marca es un récord nuevo. `lower` para tiempos. */
    setBest(id, value, lower) {
      const cur = this.data.best[id];
      const isNew = cur == null || (lower ? value < cur : value > cur);
      if (isNew) {
        this.data.best[id] = value;
        this.data.records++;
        this.save();
        this.emit('record', { id, value });
      }
      return isNew;
    },

    /* ------------------------------------------------- valoración local
       Todo esto vive en el navegador de cada quien. No hay servidor, así
       que las estrellas son las tuyas y solo tú las ves. */
    rating(id) { return this.data.ratings[id] || 0; },
    setRating(id, stars) {
      const n = Math.round(Math.max(0, Math.min(5, stars || 0)));
      if (n) this.data.ratings[id] = n;
      else delete this.data.ratings[id];
      this.save();
      this.checkAchievements();
      this.emit('rating', { id, stars: n });
      return n;
    },
    ratedCount() { return Object.keys(this.data.ratings).length; },

    /* ------------------------------------------------------- reportes */
    isFlagged(id) { return !!this.data.flags[id]; },
    flagOf(id) { return this.data.flags[id] || null; },
    flag(id, motivo) {
      this.data.flags[id] = { motivo: motivo || 'otro', fecha: Date.now() };
      this.save();
      this.emit('flag', { id, motivo });
      return true;
    },
    unflag(id) {
      delete this.data.flags[id];
      this.save();
      this.emit('flag', { id, motivo: null });
      return false;
    },
    flagged() { return Object.keys(this.data.flags); },

    /* Puntuación de relevancia: mezcla la nota curada del catálogo, las
       estrellas del jugador y cuánto lo ha jugado. Sirve para ordenar. */
    relevance(g) {
      const id = typeof g === 'string' ? g : g.id;
      const base = typeof g === 'object' && g.q ? g.q : 3;
      const mine = this.rating(id);
      const nota = mine ? (mine * 2 + base) / 3 : base;
      const partidas = this.plays(id);
      const empuje = Math.log(1 + partidas) / Math.log(12);
      const castigo = this.isFlagged(id) ? 0.25 : 1;
      return nota * (1 + empuje) * castigo;
    },

    /* ---------------------------------------------- guardado por juego */
    gameSave(slug, k, v) {
      const s = this.data.saves[slug] || (this.data.saves[slug] = {});
      s[k] = v;
      this.save();
    },
    gameLoad(slug, k, d) {
      const s = this.data.saves[slug];
      return s && s[k] !== undefined ? s[k] : d;
    },

    /* ----------------------------------------------------- experiencia */
    addXp(n) {
      const before = this.level();
      this.data.xp += Math.max(0, Math.round(n));
      const after = this.level();
      this.save();
      this.emit('xp', this.data.xp);
      if (after > before) this.emit('levelup', after);
      return after > before;
    },
    /* Curva suave: cada nivel cuesta un poco más que el anterior. */
    level() { return Math.floor(Math.pow(this.data.xp / 55, 0.62)) + 1; },
    xpForLevel(l) { return Math.ceil(Math.pow(l - 1, 1 / 0.62) * 55); },
    levelProgress() {
      const l = this.level();
      const a = this.xpForLevel(l), b = this.xpForLevel(l + 1);
      return { level: l, xp: this.data.xp, from: a, to: b, pct: Math.min(1, (this.data.xp - a) / Math.max(1, b - a)) };
    },

    /* --------------------------------------------------------- ajustes */
    set(k, v) { this.data.settings[k] = v; this.save(); this.emit('settings', k); },
    get(k) { return this.data.settings[k]; },

    /* ---------------------------------------------------------- logros */
    stats() {
      const cats = {};
      const CAT = NX.CATALOG;
      Object.keys(this.data.plays).forEach((id) => {
        const g = CAT && CAT.byId[id];
        if (g) cats[g.cat] = (cats[g.cat] || 0) + 1;
      });
      let maxScore = 0;
      for (const k in this.data.best) maxScore = Math.max(maxScore, this.data.best[k] || 0);
      return {
        totalPlays: this.totalPlays(), distinct: this.distinct(),
        total: CAT ? CAT.count : 95, favs: this.data.favs.length,
        level: this.level(), records: this.data.records, maxScore,
        streak: this.data.streak.days, hour: new Date().getHours(), cats,
        rated: this.ratedCount(),
      };
    },

    checkAchievements() {
      const s = this.stats();
      const got = [];
      ACHIEVEMENTS.forEach((a) => {
        if (this.data.achievements[a.id]) return;
        let ok = false;
        try { ok = a.chk(s); } catch (e) {}
        if (ok) {
          this.data.achievements[a.id] = Date.now();
          if (a.xp) this.data.xp += a.xp;
          got.push(a);
        }
      });
      if (got.length) { this.save(); got.forEach((a) => this.emit('achievement', a)); }
      return got;
    },

    hasAchievement(id) { return !!this.data.achievements[id]; },
    ACHIEVEMENTS,

    reset() {
      this.data = clone(DEFAULTS);
      this.data.firstSeen = Date.now();
      this.save();
      this.emit('reset');
    },

    exportJSON() { return JSON.stringify(this.data, null, 2); },
    importJSON(txt) {
      const d = JSON.parse(txt);
      this.data = Object.assign(clone(DEFAULTS), d);
      this.save();
      this.emit('reset');
    },
  };

  NX.Store = Store;
})(typeof window !== 'undefined' ? window : globalThis);
