/**
 * Audio system built entirely on the Web Audio API: master / music / SFX buses,
 * a procedural music sequencer (see Music.ts), synthesised sound effects with
 * simple spatialisation, and looping ambient beds.
 */
import * as THREE from 'three';
import { MusicPlayer } from './Music';

export type SfxName =
  | 'step' | 'jump' | 'land' | 'swing' | 'heavy' | 'hit' | 'hurt' | 'death' | 'explosion'
  | 'coin' | 'chest' | 'chestOpen' | 'click' | 'hover' | 'victory' | 'defeat' | 'laser'
  | 'shoot' | 'arrow' | 'magic' | 'zap' | 'fire' | 'ice' | 'roar' | 'door' | 'switch'
  | 'powerup' | 'checkpoint' | 'alarm' | 'alert' | 'jumpscare' | 'heartbeat' | 'whoosh'
  | 'boost' | 'crash' | 'lap' | 'countdown' | 'go' | 'break' | 'pickup' | 'error' | 'dodge'
  | 'secret' | 'levelup' | 'shield' | 'thunder' | 'rumble' | 'target' | 'miss' | 'craft' | 'eat' | 'drink'
  | 'bell' | 'whisper' | 'slam' | 'charge';

export type AmbientName = 'wind' | 'rain' | 'fire' | 'drone' | 'crowd' | 'city' | 'waves' | 'lava' | 'hum' | 'none';

class AudioManagerImpl {
  ctx: AudioContext | null = null;
  master!: GainNode;
  musicBus!: GainNode;
  sfxBus!: GainNode;
  ambientBus!: GainNode;
  private comp!: DynamicsCompressorNode;
  private noiseBuf!: AudioBuffer;
  music!: MusicPlayer;
  private listener = new THREE.Vector3();
  private listenerRight = new THREE.Vector3(1, 0, 0);
  private ambients: { name: AmbientName; nodes: AudioNode[]; gain: GainNode; srcs: AudioScheduledSourceNode[] }[] = [];
  private engineOsc: { o1: OscillatorNode; o2: OscillatorNode; f: BiquadFilterNode; g: GainNode } | null = null;
  private vol = { master: 0.8, music: 0.55, sfx: 0.8 };
  private lastPlay = new Map<string, number>();
  paused = false;

  /** Lazily create the context (must happen after a user gesture). */
  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      return;
    }
    try {
      this.ctx = new AudioContext();
    } catch {
      return;
    }
    const c = this.ctx;
    this.comp = c.createDynamicsCompressor();
    this.comp.threshold.value = -14;
    this.comp.ratio.value = 4;
    this.master = c.createGain();
    this.musicBus = c.createGain();
    this.sfxBus = c.createGain();
    this.ambientBus = c.createGain();
    this.musicBus.connect(this.master);
    this.sfxBus.connect(this.master);
    this.ambientBus.connect(this.master);
    this.master.connect(this.comp);
    this.comp.connect(c.destination);
    this.noiseBuf = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    this.music = new MusicPlayer(c, this.musicBus, this.noiseBuf);
    this.applyVolumes();
  }

  setVolumes(master: number, music: number, sfx: number) {
    this.vol = { master, music, sfx };
    this.applyVolumes();
  }

  private applyVolumes() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(this.vol.master, t, 0.05);
    this.musicBus.gain.setTargetAtTime(this.paused ? this.vol.music * 0.35 : this.vol.music * 0.6, t, 0.1);
    this.sfxBus.gain.setTargetAtTime(this.vol.sfx, t, 0.05);
    this.ambientBus.gain.setTargetAtTime(this.paused ? 0 : this.vol.sfx * 0.6, t, 0.2);
  }

  /** Pause ducks the music, silences ambience and the engine loop. */
  setPaused(p: boolean) {
    this.paused = p;
    this.applyVolumes();
    if (this.engineOsc && this.ctx) this.engineOsc.g.gain.setTargetAtTime(p ? 0 : 0.05, this.ctx.currentTime, 0.05);
  }

  setListener(pos: THREE.Vector3, right: THREE.Vector3) {
    this.listener.copy(pos);
    this.listenerRight.copy(right);
  }

  playMusic(theme: string, intensity = 0) {
    if (!this.ctx) return;
    this.music.play(theme, intensity);
  }
  setMusicIntensity(i: number) {
    this.music?.setIntensity(i);
  }
  stopMusic(fade = 1.2) {
    this.music?.stop(fade);
  }

  private env(g: GainNode, t: number, a: number, peak: number, d: number) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  }

  private tone(type: OscillatorType, f0: number, f1: number, dur: number, vol: number, out: AudioNode, delay = 0, attack = 0.005) {
    const c = this.ctx!;
    const t = c.currentTime + delay;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    this.env(g, t, attack, vol, dur);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + dur + attack + 0.05);
  }

  private noiseHit(dur: number, vol: number, filter: BiquadFilterType, freq: number, out: AudioNode, delay = 0, q = 1, freqEnd?: number) {
    const c = this.ctx!;
    const t = c.currentTime + delay;
    const s = c.createBufferSource();
    s.buffer = this.noiseBuf;
    const f = c.createBiquadFilter();
    f.type = filter;
    f.frequency.setValueAtTime(freq, t);
    if (freqEnd) f.frequency.exponentialRampToValueAtTime(freqEnd, t + dur);
    f.Q.value = q;
    const g = c.createGain();
    this.env(g, t, 0.003, vol, dur);
    s.connect(f).connect(g).connect(out);
    s.start(t, Math.random() * 1.5);
    s.stop(t + dur + 0.05);
  }

  /**
   * Play a synthesised effect. With `pos`, volume falls off with distance and
   * the sound is panned relative to the listener.
   */
  play(name: SfxName, opts: { pos?: THREE.Vector3; vol?: number; pitch?: number; throttle?: number } = {}) {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    const th = opts.throttle ?? 0.03;
    const last = this.lastPlay.get(name) ?? 0;
    if (now - last < th) return;
    this.lastPlay.set(name, now);

    let vol = opts.vol ?? 1;
    let out: AudioNode = this.sfxBus;
    if (opts.pos) {
      const d = opts.pos.distanceTo(this.listener);
      vol *= 1 / (1 + Math.max(0, d - 4) * 0.12);
      if (vol < 0.02) return;
      const pan = this.ctx.createStereoPanner();
      const rel = new THREE.Vector3().subVectors(opts.pos, this.listener);
      pan.pan.value = Math.max(-0.8, Math.min(0.8, rel.normalize().dot(this.listenerRight)));
      pan.connect(this.sfxBus);
      out = pan;
    }
    const p = opts.pitch ?? 1;
    const r = () => 0.92 + Math.random() * 0.16;
    switch (name) {
      case 'step': this.noiseHit(0.07, 0.18 * vol, 'lowpass', 900 * r(), out); this.tone('sine', 90 * r(), 50, 0.06, 0.12 * vol, out); break;
      case 'jump': this.tone('sine', 220 * p, 520 * p, 0.16, 0.18 * vol, out); this.noiseHit(0.12, 0.08 * vol, 'highpass', 2000, out); break;
      case 'land': this.tone('sine', 120, 40, 0.14, 0.35 * vol, out); this.noiseHit(0.12, 0.2 * vol, 'lowpass', 600, out); break;
      case 'swing': this.noiseHit(0.18, 0.28 * vol, 'bandpass', 1800 * p * r(), out, 0, 1.4, 500); break;
      case 'heavy': this.noiseHit(0.32, 0.4 * vol, 'bandpass', 900 * r(), out, 0, 1.2, 250); this.tone('sawtooth', 110, 60, 0.25, 0.08 * vol, out); break;
      case 'hit': this.noiseHit(0.1, 0.45 * vol, 'lowpass', 2500, out); this.tone('square', 180 * r() * p, 60, 0.1, 0.18 * vol, out); break;
      case 'hurt': this.tone('sawtooth', 320, 120, 0.2, 0.2 * vol, out); this.noiseHit(0.15, 0.3 * vol, 'bandpass', 1200, out); break;
      case 'death': this.tone('sawtooth', 300, 40, 1.2, 0.25 * vol, out); this.tone('sine', 150, 30, 1.4, 0.3 * vol, out); break;
      case 'explosion':
        this.noiseHit(1.2, 0.8 * vol, 'lowpass', 1600, out, 0, 0.7, 80);
        this.tone('sine', 110, 28, 0.9, 0.7 * vol, out);
        break;
      case 'coin': this.tone('square', 988 * p, 988 * p, 0.07, 0.1 * vol, out); this.tone('square', 1319 * p, 1319 * p, 0.2, 0.1 * vol, out, 0.07); break;
      case 'pickup': this.tone('triangle', 660, 1320, 0.15, 0.2 * vol, out); break;
      case 'chest': [523, 659, 784, 1047].forEach((f, i) => this.tone('triangle', f, f, 0.2, 0.18 * vol, out, i * 0.07)); break;
      case 'chestOpen':
        this.noiseHit(0.5, 0.3 * vol, 'highpass', 3000, out);
        [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => this.tone('sine', f, f, 0.5, 0.15 * vol, out, 0.1 + i * 0.06));
        break;
      case 'click': this.tone('square', 900, 600, 0.05, 0.08 * vol, out); break;
      case 'hover': this.tone('sine', 1400, 1600, 0.04, 0.04 * vol, out); break;
      case 'error': this.tone('square', 200, 150, 0.2, 0.12 * vol, out); break;
      case 'victory': [523, 659, 784, 1047, 784, 1047].forEach((f, i) => this.tone('triangle', f, f, i === 5 ? 0.9 : 0.18, 0.2 * vol, out, i * 0.13)); break;
      case 'defeat': [392, 370, 349, 262].forEach((f, i) => this.tone('sawtooth', f, f * 0.98, i === 3 ? 1.2 : 0.3, 0.12 * vol, out, i * 0.3)); break;
      case 'levelup': [523, 784, 1047, 1568].forEach((f, i) => this.tone('square', f, f, 0.2, 0.1 * vol, out, i * 0.08)); break;
      case 'laser': this.tone('sawtooth', 1200 * p, 200, 0.2, 0.12 * vol, out); break;
      case 'shoot': this.noiseHit(0.08, 0.4 * vol, 'highpass', 1000, out); this.tone('square', 400, 90, 0.08, 0.2 * vol, out); break;
      case 'arrow': this.noiseHit(0.22, 0.3 * vol, 'bandpass', 2400, out, 0, 2, 900); this.tone('triangle', 180, 120, 0.05, 0.2 * vol, out); break;
      case 'target': this.tone('square', 1760, 1760, 0.05, 0.1 * vol, out); this.tone('sine', 2637, 2637, 0.12, 0.1 * vol, out, 0.04); break;
      case 'miss': this.tone('triangle', 300, 200, 0.12, 0.1 * vol, out); break;
      case 'magic': this.tone('sine', 400 * p, 1600 * p, 0.35, 0.15 * vol, out); this.tone('triangle', 600 * p, 2400 * p, 0.3, 0.08 * vol, out, 0.05); break;
      case 'zap': this.noiseHit(0.25, 0.4 * vol, 'highpass', 3000, out); this.tone('sawtooth', 80, 1200, 0.15, 0.12 * vol, out); break;
      case 'thunder': this.noiseHit(1.8, 0.8 * vol, 'lowpass', 900, out, 0, 0.8, 60); this.noiseHit(0.2, 0.5 * vol, 'highpass', 2000, out); break;
      case 'fire': this.noiseHit(0.5, 0.35 * vol, 'lowpass', 1200, out, 0, 1, 300); break;
      case 'ice': this.tone('sine', 2400, 3200, 0.15, 0.08 * vol, out); this.noiseHit(0.3, 0.2 * vol, 'highpass', 5000, out); break;
      case 'roar':
        this.tone('sawtooth', 90 * p, 55 * p, 1.4, 0.4 * vol, out, 0, 0.1);
        this.tone('square', 60 * p, 40 * p, 1.4, 0.2 * vol, out, 0, 0.1);
        this.noiseHit(1.3, 0.35 * vol, 'bandpass', 500, out, 0, 0.8);
        break;
      case 'door': this.tone('sawtooth', 70, 50, 0.6, 0.18 * vol, out, 0, 0.05); this.noiseHit(0.5, 0.15 * vol, 'lowpass', 500, out); break;
      case 'switch': this.tone('square', 600, 600, 0.04, 0.12 * vol, out); this.tone('square', 900, 900, 0.06, 0.12 * vol, out, 0.05); break;
      case 'powerup': this.tone('square', 300, 1200, 0.3, 0.12 * vol, out); break;
      case 'checkpoint': [660, 880, 1320].forEach((f, i) => this.tone('triangle', f, f, 0.2, 0.15 * vol, out, i * 0.09)); break;
      case 'alarm': this.tone('square', 880, 660, 0.4, 0.12 * vol, out); this.tone('square', 880, 660, 0.4, 0.12 * vol, out, 0.45); break;
      case 'alert': this.tone('square', 1200, 1200, 0.08, 0.14 * vol, out); this.tone('square', 1600, 1600, 0.15, 0.14 * vol, out, 0.09); break;
      case 'jumpscare':
        this.noiseHit(0.9, 0.9 * vol, 'bandpass', 1400, out, 0, 0.5);
        this.tone('sawtooth', 700, 300, 0.8, 0.35 * vol, out);
        this.tone('sawtooth', 745, 318, 0.8, 0.35 * vol, out);
        break;
      case 'heartbeat': this.tone('sine', 60, 40, 0.12, 0.6 * vol, out); this.tone('sine', 55, 38, 0.12, 0.45 * vol, out, 0.18); break;
      case 'whisper': this.noiseHit(1.2, 0.2 * vol, 'bandpass', 2600, out, 0, 6, 1800); break;
      case 'whoosh': this.noiseHit(0.4, 0.3 * vol, 'bandpass', 600, out, 0, 1, 2400); break;
      case 'dodge': this.noiseHit(0.25, 0.25 * vol, 'bandpass', 900, out, 0, 1, 2600); break;
      case 'boost': this.noiseHit(0.8, 0.35 * vol, 'bandpass', 400, out, 0, 1, 3000); this.tone('sawtooth', 150, 600, 0.6, 0.08 * vol, out); break;
      case 'crash': this.noiseHit(0.5, 0.6 * vol, 'lowpass', 3000, out, 0, 1, 200); this.tone('square', 120, 40, 0.3, 0.2 * vol, out); break;
      case 'lap': [784, 988, 1175].forEach((f, i) => this.tone('square', f, f, 0.15, 0.1 * vol, out, i * 0.1)); break;
      case 'countdown': this.tone('square', 440, 440, 0.25, 0.15 * vol, out); break;
      case 'go': this.tone('square', 880, 880, 0.6, 0.18 * vol, out); break;
      case 'break': this.noiseHit(0.4, 0.5 * vol, 'lowpass', 2500, out, 0, 1, 300); this.tone('triangle', 200, 80, 0.2, 0.2 * vol, out); break;
      case 'secret': [784, 740, 622, 440, 415, 659, 831, 1047].forEach((f, i) => this.tone('triangle', f, f, 0.14, 0.14 * vol, out, i * 0.1)); break;
      case 'shield': this.tone('sine', 300, 900, 0.3, 0.15 * vol, out); this.tone('sine', 450, 1350, 0.3, 0.1 * vol, out); break;
      case 'rumble': this.noiseHit(1.5, 0.5 * vol, 'lowpass', 200, out, 0, 1); this.tone('sine', 45, 30, 1.5, 0.4 * vol, out, 0, 0.2); break;
      case 'craft': this.noiseHit(0.1, 0.3 * vol, 'lowpass', 1200, out); this.noiseHit(0.1, 0.3 * vol, 'lowpass', 1000, out, 0.15); this.tone('triangle', 660, 990, 0.2, 0.12 * vol, out, 0.3); break;
      case 'eat': for (let i = 0; i < 3; i++) this.noiseHit(0.06, 0.2 * vol, 'bandpass', 1500, out, i * 0.12, 2); break;
      case 'drink': for (let i = 0; i < 3; i++) this.tone('sine', 400 + i * 80, 700 + i * 80, 0.08, 0.12 * vol, out, i * 0.14); break;
      case 'bell': [0, 1].forEach((k) => this.tone('sine', 523 * (1 + k * 1.5), 520 * (1 + k * 1.5), 2.2, 0.15 * vol, out)); break;
      case 'slam': this.tone('sine', 80, 30, 0.6, 0.6 * vol, out); this.noiseHit(0.5, 0.5 * vol, 'lowpass', 800, out, 0, 1, 100); break;
      case 'charge': this.tone('sawtooth', 100, 800, 0.8, 0.1 * vol, out, 0, 0.3); break;
    }
  }

  /** Looping ambient beds per world (wind, rain, crowd, drones...). */
  setAmbient(names: AmbientName[]) {
    if (!this.ctx) return;
    const c = this.ctx;
    const t = c.currentTime;
    for (const a of this.ambients) {
      a.gain.gain.setTargetAtTime(0, t, 0.4);
      const srcs = a.srcs;
      setTimeout(() => srcs.forEach((s) => { try { s.stop(); } catch { /* already stopped */ } }), 2000);
    }
    this.ambients = [];
    for (const name of names) {
      if (name === 'none') continue;
      const g = c.createGain();
      g.gain.value = 0;
      g.connect(this.ambientBus);
      const srcs: AudioScheduledSourceNode[] = [];
      const nodes: AudioNode[] = [];
      const noiseLoop = (type: BiquadFilterType, freq: number, q: number, vol: number, lfoRate = 0, lfoDepth = 0) => {
        const s = c.createBufferSource();
        s.buffer = this.noiseBuf;
        s.loop = true;
        const f = c.createBiquadFilter();
        f.type = type;
        f.frequency.value = freq;
        f.Q.value = q;
        const vg = c.createGain();
        vg.gain.value = vol;
        s.connect(f).connect(vg).connect(g);
        s.start();
        srcs.push(s);
        if (lfoRate) {
          const l = c.createOscillator();
          const lg = c.createGain();
          l.frequency.value = lfoRate;
          lg.gain.value = lfoDepth;
          l.connect(lg).connect(f.frequency);
          l.start();
          srcs.push(l);
        }
      };
      const droneOsc = (freq: number, type: OscillatorType, vol: number) => {
        const o = c.createOscillator();
        o.type = type;
        o.frequency.value = freq;
        const f = c.createBiquadFilter();
        f.type = 'lowpass';
        f.frequency.value = 300;
        const vg = c.createGain();
        vg.gain.value = vol;
        o.connect(f).connect(vg).connect(g);
        o.start();
        srcs.push(o);
      };
      switch (name) {
        case 'wind': noiseLoop('bandpass', 500, 0.6, 0.5, 0.08, 300); break;
        case 'rain': noiseLoop('highpass', 2500, 0.3, 0.35); noiseLoop('lowpass', 400, 0.5, 0.25); break;
        case 'fire': noiseLoop('lowpass', 700, 0.8, 0.35, 3, 300); break;
        case 'lava': noiseLoop('lowpass', 250, 1, 0.6, 0.3, 100); droneOsc(40, 'sine', 0.25); break;
        case 'drone': droneOsc(55, 'sawtooth', 0.12); droneOsc(58.3, 'sawtooth', 0.12); droneOsc(82.4, 'triangle', 0.08); noiseLoop('bandpass', 300, 2, 0.1, 0.05, 150); break;
        case 'crowd': noiseLoop('bandpass', 700, 0.6, 0.45, 0.3, 250); noiseLoop('bandpass', 1400, 1, 0.15, 0.5, 400); break;
        case 'city': noiseLoop('lowpass', 300, 0.5, 0.4); droneOsc(70, 'triangle', 0.05); break;
        case 'waves': noiseLoop('lowpass', 600, 0.6, 0.5, 0.12, 450); break;
        case 'hum': droneOsc(60, 'sine', 0.1); droneOsc(120, 'triangle', 0.03); break;
      }
      g.gain.setTargetAtTime(1, t + 0.2, 0.8);
      this.ambients.push({ name, nodes, gain: g, srcs });
    }
  }

  /** Continuous engine sound for vehicles; rpm in 0..1 (negative stops). */
  setEngine(rpm: number) {
    if (!this.ctx) return;
    const c = this.ctx;
    if (rpm < 0) {
      if (this.engineOsc) {
        const e = this.engineOsc;
        e.g.gain.setTargetAtTime(0, c.currentTime, 0.1);
        setTimeout(() => { try { e.o1.stop(); e.o2.stop(); } catch { /* ignore */ } }, 500);
        this.engineOsc = null;
      }
      return;
    }
    if (!this.engineOsc) {
      const o1 = c.createOscillator(), o2 = c.createOscillator();
      o1.type = 'sawtooth';
      o2.type = 'square';
      const f = c.createBiquadFilter();
      f.type = 'lowpass';
      f.Q.value = 3;
      const g = c.createGain();
      g.gain.value = 0;
      o1.connect(f);
      o2.connect(f);
      f.connect(g).connect(this.sfxBus);
      o1.start();
      o2.start();
      this.engineOsc = { o1, o2, f, g };
      g.gain.setTargetAtTime(this.paused ? 0 : 0.05, c.currentTime, 0.2);
    }
    const t = c.currentTime;
    this.engineOsc.o1.frequency.setTargetAtTime(45 + rpm * 140, t, 0.05);
    this.engineOsc.o2.frequency.setTargetAtTime(22.5 + rpm * 70, t, 0.05);
    this.engineOsc.f.frequency.setTargetAtTime(300 + rpm * 1800, t, 0.05);
  }

  stopAllLoops() {
    this.setAmbient([]);
    this.setEngine(-1);
  }
}

export const Audio = new AudioManagerImpl();
