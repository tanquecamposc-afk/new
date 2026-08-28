/* NEXO ARCADE — engine/audio.js
   Síntesis de audio en tiempo real con WebAudio: sin archivos externos. */
(function (global) {
  'use strict';
  const NX = (global.NX = global.NX || {});
  const M = NX.M;
  const { clamp, rand } = M;

  let ctx = null, master = null, sfxBus = null, musicBus = null, comp = null;
  let unlocked = false;
  const state = { muted: false, volume: 0.75, musicOn: true, musicVol: 0.5, sfxVol: 1 };

  let audioRoto = false;

  function ensure() {
    if (ctx) return ctx;
    if (audioRoto) return null;
    const AC = global.AudioContext || global.webkitAudioContext;
    if (!AC) return null;
    /* Crear el contexto puede fallar: iframes con sandbox, Safari con
       restricciones, demasiados contextos abiertos. Si revienta aquí y no lo
       recogemos, se lleva por delante el arranque del juego. */
    try {
      ctx = new AC();
    } catch (e) {
      audioRoto = true; ctx = null;
      return null;
    }
    try {
      comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -14; comp.knee.value = 24; comp.ratio.value = 8;
      comp.attack.value = 0.004; comp.release.value = 0.18;
      master = ctx.createGain();
      master.gain.value = state.muted ? 0 : state.volume;
      sfxBus = ctx.createGain(); sfxBus.gain.value = state.sfxVol;
      musicBus = ctx.createGain(); musicBus.gain.value = state.musicOn ? state.musicVol : 0;
      sfxBus.connect(comp); musicBus.connect(comp);
      comp.connect(master); master.connect(ctx.destination);
    } catch (e) {
      audioRoto = true; ctx = null;
      return null;
    }
    return ctx;
  }

  function unlock() {
    try {
      ensure();
      if (!ctx) return;
      if (ctx.state === 'suspended') {
        const pr = ctx.resume();
        if (pr && pr.catch) pr.catch(() => {});
      }
      unlocked = true;
    } catch (e) {
      audioRoto = true;
      unlocked = false;
    }
  }

  function now() { return ctx ? ctx.currentTime : 0; }

  /* ---------------------------------------------------------- primitivas */
  function env(node, t0, a, d, s, r, peak, sustain) {
    const g = node.gain;
    g.cancelScheduledValues(t0);
    g.setValueAtTime(0.0001, t0);
    g.exponentialRampToValueAtTime(Math.max(0.0002, peak), t0 + a);
    g.exponentialRampToValueAtTime(Math.max(0.0002, peak * (sustain == null ? 0.5 : sustain)), t0 + a + d);
    g.exponentialRampToValueAtTime(0.0001, t0 + a + d + s + r);
  }

  function tone(o) {
    const c = ensure(); if (!c || state.muted) return;
    const t0 = now() + (o.delay || 0);
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(o.freq, t0);
    if (o.to != null) {
      if (o.sweep === 'lin') osc.frequency.linearRampToValueAtTime(Math.max(1, o.to), t0 + (o.dur || 0.2));
      else osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.to), t0 + (o.dur || 0.2));
    }
    if (o.detune) osc.detune.setValueAtTime(o.detune, t0);
    let node = osc;
    if (o.filter) {
      const f = c.createBiquadFilter();
      f.type = o.filter; f.frequency.setValueAtTime(o.cutoff || 1200, t0);
      if (o.cutoffTo) f.frequency.exponentialRampToValueAtTime(o.cutoffTo, t0 + (o.dur || 0.2));
      f.Q.value = o.q == null ? 1 : o.q;
      node.connect(f); node = f;
    }
    node.connect(gain);
    const dur = o.dur || 0.2;
    const vol = (o.vol == null ? 0.3 : o.vol);
    env(gain, t0, o.a == null ? 0.006 : o.a, o.d == null ? dur * 0.35 : o.d,
        o.s == null ? dur * 0.3 : o.s, o.r == null ? dur * 0.35 : o.r, vol, o.sustain);
    gain.connect(o.bus || sfxBus);
    osc.start(t0);
    osc.stop(t0 + dur + 0.35);
  }

  let noiseBuf = null;
  function noiseBuffer() {
    const c = ensure(); if (!c) return null;
    if (noiseBuf) return noiseBuf;
    const len = Math.floor(c.sampleRate * 1.2);
    noiseBuf = c.createBuffer(1, len, c.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return noiseBuf;
  }

  function noise(o) {
    const c = ensure(); if (!c || state.muted) return;
    o = o || {};
    const t0 = now() + (o.delay || 0);
    const src = c.createBufferSource();
    src.buffer = noiseBuffer();
    src.playbackRate.value = o.rate || 1;
    const f = c.createBiquadFilter();
    f.type = o.filter || 'bandpass';
    f.frequency.setValueAtTime(o.freq || 900, t0);
    if (o.to) f.frequency.exponentialRampToValueAtTime(Math.max(30, o.to), t0 + (o.dur || 0.3));
    f.Q.value = o.q == null ? 1.2 : o.q;
    const g = c.createGain();
    const dur = o.dur || 0.3;
    env(g, t0, o.a == null ? 0.005 : o.a, dur * 0.3, dur * 0.2, dur * 0.5, o.vol == null ? 0.25 : o.vol, o.sustain);
    src.connect(f); f.connect(g); g.connect(o.bus || sfxBus);
    src.start(t0); src.stop(t0 + dur + 0.3);
  }

  /* ------------------------------------------------------------ librería */
  const N = (n) => 440 * Math.pow(2, (n - 69) / 12);   /* nota MIDI -> Hz */

  const LIB = {
    click:   () => tone({ type: 'square', freq: 720, to: 520, dur: 0.05, vol: 0.12 }),
    tap:     () => tone({ type: 'triangle', freq: 480, to: 380, dur: 0.07, vol: 0.14 }),
    blip:    (v) => tone({ type: 'square', freq: 620 + (v || 0) * 40, to: 900, dur: 0.07, vol: 0.14 }),
    select:  () => { tone({ type: 'triangle', freq: 620, dur: 0.07, vol: 0.14 }); tone({ type: 'triangle', freq: 930, dur: 0.1, vol: 0.11, delay: 0.05 }); },
    coin:    () => { tone({ type: 'square', freq: 988, dur: 0.06, vol: 0.16 }); tone({ type: 'square', freq: 1319, dur: 0.16, vol: 0.14, delay: 0.055 }); },
    gem:     () => { tone({ type: 'triangle', freq: 1200, dur: 0.09, vol: 0.14 }); tone({ type: 'triangle', freq: 1800, dur: 0.16, vol: 0.1, delay: 0.06 }); },
    jump:    () => tone({ type: 'square', freq: 300, to: 720, dur: 0.16, vol: 0.15, sweep: 'exp' }),
    hop:     () => tone({ type: 'triangle', freq: 420, to: 820, dur: 0.11, vol: 0.13 }),
    land:    () => noise({ freq: 320, to: 120, dur: 0.12, vol: 0.16, filter: 'lowpass', q: 0.8 }),
    laser:   () => tone({ type: 'sawtooth', freq: 1200, to: 220, dur: 0.16, vol: 0.13, filter: 'lowpass', cutoff: 3000, cutoffTo: 500 }),
    shoot:   () => { tone({ type: 'square', freq: 880, to: 200, dur: 0.1, vol: 0.12 }); noise({ freq: 2400, to: 600, dur: 0.08, vol: 0.08 }); },
    hit:     () => { noise({ freq: 1400, to: 300, dur: 0.13, vol: 0.2, q: 0.7 }); tone({ type: 'square', freq: 180, to: 60, dur: 0.12, vol: 0.14 }); },
    hurt:    () => { tone({ type: 'sawtooth', freq: 340, to: 90, dur: 0.28, vol: 0.2 }); noise({ freq: 700, to: 160, dur: 0.22, vol: 0.13 }); },
    explode: () => { noise({ freq: 900, to: 60, dur: 0.7, vol: 0.32, filter: 'lowpass', q: 0.6 }); tone({ type: 'sawtooth', freq: 120, to: 34, dur: 0.55, vol: 0.2 }); },
    boom:    () => { noise({ freq: 420, to: 40, dur: 1.0, vol: 0.36, filter: 'lowpass', q: 0.4 }); tone({ type: 'sine', freq: 80, to: 26, dur: 0.8, vol: 0.26 }); },
    thud:    () => tone({ type: 'sine', freq: 160, to: 50, dur: 0.2, vol: 0.24 }),
    bounce:  () => tone({ type: 'triangle', freq: 520, to: 300, dur: 0.09, vol: 0.16 }),
    pong:    () => tone({ type: 'square', freq: 700, dur: 0.05, vol: 0.13 }),
    swoosh:  () => noise({ freq: 500, to: 2400, dur: 0.24, vol: 0.1, q: 0.6 }),
    whoosh:  () => noise({ freq: 2200, to: 260, dur: 0.34, vol: 0.12, q: 0.5 }),
    splash:  () => { noise({ freq: 1600, to: 400, dur: 0.4, vol: 0.16 }); tone({ type: 'sine', freq: 420, to: 180, dur: 0.24, vol: 0.1 }); },
    power:   () => { [0, 4, 7, 12].forEach((s, i) => tone({ type: 'triangle', freq: N(69 + s), dur: 0.14, vol: 0.13, delay: i * 0.055 })); },
    levelup: () => { [0, 5, 9, 12, 16].forEach((s, i) => tone({ type: 'square', freq: N(64 + s), dur: 0.16, vol: 0.12, delay: i * 0.07 })); },
    win:     () => { [0, 4, 7, 12, 7, 12, 16].forEach((s, i) => tone({ type: 'triangle', freq: N(65 + s), dur: 0.22, vol: 0.15, delay: i * 0.1 })); },
    lose:    () => { [0, -3, -6, -12].forEach((s, i) => tone({ type: 'sawtooth', freq: N(64 + s), dur: 0.3, vol: 0.15, delay: i * 0.14, filter: 'lowpass', cutoff: 1400 })); },
    error:   () => { tone({ type: 'square', freq: 180, dur: 0.14, vol: 0.16 }); tone({ type: 'square', freq: 150, dur: 0.2, vol: 0.14, delay: 0.1 }); },
    chime:   () => { [0, 7, 12].forEach((s, i) => tone({ type: 'sine', freq: N(76 + s), dur: 0.5, vol: 0.11, delay: i * 0.06 })); },
    tick:    () => tone({ type: 'square', freq: 1500, dur: 0.028, vol: 0.07 }),
    tock:    () => tone({ type: 'square', freq: 900, dur: 0.035, vol: 0.07 }),
    alarm:   () => { for (let i = 0; i < 3; i++) tone({ type: 'square', freq: 880, to: 660, dur: 0.14, vol: 0.12, delay: i * 0.19 }); },
    charge:  () => tone({ type: 'sawtooth', freq: 120, to: 900, dur: 0.6, vol: 0.12, filter: 'lowpass', cutoff: 400, cutoffTo: 4000 }),
    zap:     () => { tone({ type: 'sawtooth', freq: 2400, to: 400, dur: 0.14, vol: 0.12 }); noise({ freq: 3200, to: 900, dur: 0.16, vol: 0.12, q: 3 }); },
    freeze:  () => { tone({ type: 'sine', freq: 1800, to: 2600, dur: 0.3, vol: 0.1 }); noise({ freq: 4200, to: 2200, dur: 0.35, vol: 0.07, q: 4 }); },
    fire:    () => noise({ freq: 700, to: 1600, dur: 0.3, vol: 0.1, q: 0.8 }),
    engine:  (v) => noise({ freq: 90 + (v || 0) * 120, dur: 0.14, vol: 0.05, filter: 'lowpass', q: 2 }),
    step:    () => noise({ freq: 260, to: 140, dur: 0.07, vol: 0.09, filter: 'lowpass' }),
    slide:   () => noise({ freq: 900, to: 1800, dur: 0.2, vol: 0.07, q: 2 }),
    place:   () => tone({ type: 'triangle', freq: 380, to: 300, dur: 0.09, vol: 0.14 }),
    clearline: () => { [0, 4, 7, 11].forEach((s, i) => tone({ type: 'square', freq: N(72 + s), dur: 0.12, vol: 0.11, delay: i * 0.04 })); noise({ freq: 2600, to: 700, dur: 0.3, vol: 0.1 }); },
    combo:   (n) => tone({ type: 'triangle', freq: N(72 + Math.min(14, (n || 0) * 2)), dur: 0.13, vol: 0.14 }),
    open:    () => tone({ type: 'sine', freq: 300, to: 700, dur: 0.2, vol: 0.1 }),
    close:   () => tone({ type: 'sine', freq: 700, to: 300, dur: 0.2, vol: 0.1 }),
    heal:    () => { [0, 5, 9].forEach((s, i) => tone({ type: 'sine', freq: N(72 + s), dur: 0.3, vol: 0.1, delay: i * 0.08 })); },
    shield:  () => tone({ type: 'sine', freq: 500, to: 900, dur: 0.3, vol: 0.11, filter: 'bandpass', cutoff: 900, q: 3 }),
    drop:    () => tone({ type: 'sine', freq: 700, to: 90, dur: 0.3, vol: 0.16 }),
    pop:     () => { tone({ type: 'sine', freq: 900, to: 1400, dur: 0.06, vol: 0.14 }); noise({ freq: 2600, dur: 0.05, vol: 0.08 }); },
    card:    () => noise({ freq: 2800, to: 1200, dur: 0.1, vol: 0.08, q: 1.4 }),
    dice:    () => { for (let i = 0; i < 4; i++) noise({ freq: 1400 + rand(-300, 300), to: 700, dur: 0.06, vol: 0.07, delay: i * 0.05 }); },
    typewriter: () => tone({ type: 'square', freq: 1200 + rand(-140, 140), dur: 0.02, vol: 0.05 }),
  };

  function sfx(name, arg) {
    if (!unlocked || state.muted) return;
    const f = LIB[name];
    if (f) { try { f(arg); } catch (e) { /* audio nunca debe romper el juego */ } }
  }

  /* -------------------------------------------------------------- música */
  /* Secuenciador ligero: progresión de acordes + arpegio + bajo + hi-hat. */
  const SCALES = {
    minor: [0, 2, 3, 5, 7, 8, 10],
    major: [0, 2, 4, 5, 7, 9, 11],
    dorian: [0, 2, 3, 5, 7, 9, 10],
    penta: [0, 3, 5, 7, 10],
    lydian: [0, 2, 4, 6, 7, 9, 11],
  };
  const PROGS = [
    [0, 5, 3, 4], [0, 3, 4, 4], [0, 4, 5, 3], [0, 2, 5, 4], [0, 5, 1, 4],
  ];

  const music = {
    playing: false, timer: 0, step: 0, cfg: null,
    start(cfg) {
      ensure();
      this.cfg = Object.assign({ root: 45, scale: 'minor', bpm: 96, mood: 'calm', density: 1 }, cfg || {});
      this.prog = PROGS[Math.floor(Math.random() * PROGS.length)];
      this.step = 0; this.timer = 0; this.playing = true;
    },
    stop() { this.playing = false; },
    update(dt) {
      if (!this.playing || !state.musicOn || state.muted || !unlocked || !ctx) return;
      const spb = 60 / this.cfg.bpm / 2;      /* corcheas */
      this.timer += dt;
      while (this.timer >= spb) {
        this.timer -= spb;
        this._tick(this.step++);
      }
    },
    _tick(s) {
      const c = this.cfg;
      const sc = SCALES[c.scale] || SCALES.minor;
      const bar = Math.floor(s / 8) % this.prog.length;
      const deg = this.prog[bar];
      const chordRoot = c.root + sc[deg % sc.length] + 12 * Math.floor(deg / sc.length);
      const b = s % 8;
      /* bajo */
      if (b === 0 || b === 3 || b === 6) {
        tone({ type: 'triangle', freq: N(chordRoot - 12), dur: 0.34, vol: 0.16, bus: musicBus, filter: 'lowpass', cutoff: 700 });
      }
      /* arpegio */
      if (c.density > 0.4) {
        const arp = [0, 2, 4, 6];
        const n = chordRoot + sc[(deg + arp[b % 4]) % sc.length] + 12;
        tone({ type: 'square', freq: N(n), dur: 0.16, vol: 0.055, bus: musicBus, filter: 'lowpass', cutoff: 2400 });
      }
      /* pad cada compás */
      if (b === 0) {
        [0, 2, 4].forEach((i, k) => tone({
          type: 'sine', freq: N(chordRoot + sc[(deg + i) % sc.length]),
          dur: 1.6, vol: 0.05, bus: musicBus, delay: k * 0.01, a: 0.4, sustain: 0.8,
        }));
      }
      /* percusión */
      if (c.mood === 'drive' || c.mood === 'tense') {
        if (b % 2 === 0) noise({ freq: 8000, dur: 0.03, vol: 0.03, bus: musicBus, q: 1 });
        if (b === 4) noise({ freq: 1800, to: 900, dur: 0.12, vol: 0.07, bus: musicBus });
        if (b === 0) tone({ type: 'sine', freq: 62, to: 40, dur: 0.16, vol: 0.16, bus: musicBus });
      }
    },
  };

  /* ------------------------------------------------------------ ajustes */
  function setMuted(m) {
    state.muted = !!m;
    if (master) master.gain.setTargetAtTime(state.muted ? 0 : state.volume, now(), 0.02);
  }
  function setVolume(v) {
    state.volume = clamp(v, 0, 1);
    if (master && !state.muted) master.gain.setTargetAtTime(state.volume, now(), 0.02);
  }
  function setMusic(on) {
    state.musicOn = !!on;
    if (musicBus) musicBus.gain.setTargetAtTime(state.musicOn ? state.musicVol : 0, now(), 0.15);
  }

  NX.Audio = {
    unlock, sfx, tone, noise, music, N, SCALES,
    setMuted, setVolume, setMusic, state,
    get ctx() { return ctx; },
    get ready() { return unlocked; },
  };
})(typeof window !== 'undefined' ? window : globalThis);
