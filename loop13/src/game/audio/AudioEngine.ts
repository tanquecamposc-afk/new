/**
 * Procedural audio engine (WebAudio). No audio files: every sound, ambience
 * and music layer is synthesised in real time.
 * Buses: master ─┬─ music
 *                ├─ sfx (+ positional emitters)
 *                ├─ ambience
 *                └─ voice
 * with a shared convolution reverb send.
 */
import type { AreaId, Mood, Settings } from '../core/types';
import { Music } from './Music';

type Vec3 = { x: number; y: number; z: number };

export interface SfxOpts { pos?: Vec3; volume?: number; rate?: number; surface?: string; }

interface Emitter {
  id: string;
  kind: EmitterKind;
  pos: Vec3;
  gain: GainNode;
  panner: PannerNode;
  nodes: AudioScheduledSourceNode[];
  level: number;
  target: number;
}
export type EmitterKind = 'reactor' | 'core' | 'generator' | 'server' | 'phone' | 'radio' | 'fan' | 'alarm' | 'arc';

interface ZoneAmb { noiseF: number; noiseQ: number; noise: number; hum: number; humF: number; air: number; }
const ZONES: Record<AreaId | 'MENU', ZoneAmb> = {
  MENU: { noiseF: 300, noiseQ: 0.7, noise: 0.05, hum: 0.03, humF: 55, air: 0.02 },
  HUB: { noiseF: 520, noiseQ: 0.6, noise: 0.07, hum: 0.035, humF: 60, air: 0.03 },
  LABORATORY: { noiseF: 900, noiseQ: 0.8, noise: 0.05, hum: 0.03, humF: 120, air: 0.03 },
  SECURITY: { noiseF: 1500, noiseQ: 1, noise: 0.05, hum: 0.04, humF: 100, air: 0.02 },
  DORMITORY: { noiseF: 350, noiseQ: 0.5, noise: 0.03, hum: 0.012, humF: 50, air: 0.01 },
  REACTOR: { noiseF: 180, noiseQ: 0.5, noise: 0.12, hum: 0.09, humF: 40, air: 0.05 },
  TEMPORAL_CORE: { noiseF: 700, noiseQ: 2, noise: 0.04, hum: 0.06, humF: 73.4, air: 0.05 },
  ARCHIVES: { noiseF: 400, noiseQ: 0.5, noise: 0.025, hum: 0.012, humF: 50, air: 0.01 },
  MEDICAL: { noiseF: 700, noiseQ: 0.7, noise: 0.04, hum: 0.02, humF: 120, air: 0.02 },
  MAINTENANCE: { noiseF: 260, noiseQ: 0.6, noise: 0.1, hum: 0.05, humF: 48, air: 0.04 },
  RESTRICTED: { noiseF: 1100, noiseQ: 0.9, noise: 0.05, hum: 0.04, humF: 60, air: 0.03 },
  UNKNOWN: { noiseF: 200, noiseQ: 0.4, noise: 0.015, hum: 0.008, humF: 37, air: 0.0 },
};

class Engine {
  ctx: AudioContext | null = null;
  master!: GainNode;
  musicBus!: GainNode;
  sfxBus!: GainNode;
  ambBus!: GainNode;
  voiceBus!: GainNode;
  reverb!: ConvolverNode;
  reverbSend!: GainNode;
  noise!: AudioBuffer;
  private amb: { noiseFilter: BiquadFilterNode; noiseGain: GainNode; hum: OscillatorNode; hum2: OscillatorNode; humGain: GainNode; airGain: GainNode } | null = null;
  private emitters = new Map<string, Emitter>();
  private zone: AreaId | 'MENU' = 'MENU';
  private duck = 1;
  private randomTimer = 3;
  private settings: Settings | null = null;
  private muffled = false;
  private lowpass!: BiquadFilterNode;
  private timeWarp = 1;

  get ready(): boolean { return !!this.ctx; }

  init(): void {
    if (this.ctx || typeof window === 'undefined') return;
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.lowpass = ctx.createBiquadFilter();
    this.lowpass.type = 'lowpass';
    this.lowpass.frequency.value = 20000;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 4;
    this.master.connect(this.lowpass).connect(comp).connect(ctx.destination);
    this.musicBus = ctx.createGain();
    this.sfxBus = ctx.createGain();
    this.ambBus = ctx.createGain();
    this.voiceBus = ctx.createGain();
    [this.musicBus, this.sfxBus, this.ambBus, this.voiceBus].forEach((b) => b.connect(this.master));
    // noise buffer
    this.noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    // reverb impulse (exponentially decaying stereo noise)
    this.reverb = ctx.createConvolver();
    const len = ctx.sampleRate * 3.2;
    const ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const ch = ir.getChannelData(c);
      for (let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2);
    }
    this.reverb.buffer = ir;
    this.reverbSend = ctx.createGain();
    this.reverbSend.gain.value = 0.35;
    this.reverbSend.connect(this.reverb).connect(this.master);
    this.buildAmbience();
    Music.attach(this);
    if (this.settings) this.applySettings(this.settings);
  }

  resume(): void { if (this.ctx?.state === 'suspended') void this.ctx.resume(); }

  applySettings(s: Settings): void {
    this.settings = s;
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(s.master, t, 0.05);
    this.musicBus.gain.setTargetAtTime(s.music * 0.55, t, 0.05);
    this.sfxBus.gain.setTargetAtTime(s.sfx, t, 0.05);
    this.ambBus.gain.setTargetAtTime(s.sfx * 0.9, t, 0.05);
    this.voiceBus.gain.setTargetAtTime(Math.max(s.sfx, 0.4), t, 0.05);
  }

  // ───────────────────────── helpers ─────────────────────────
  now(): number { return this.ctx ? this.ctx.currentTime : 0; }

  private noiseSrc(): AudioBufferSourceNode {
    const s = this.ctx!.createBufferSource();
    s.buffer = this.noise;
    s.loop = true;
    s.playbackRate.value = 0.8 + Math.random() * 0.4;
    return s;
  }

  /** Output node for a one-shot: positional (panner) or plain. */
  private out(opts?: SfxOpts, reverb = 0.25): GainNode {
    const ctx = this.ctx!;
    const g = ctx.createGain();
    g.gain.value = opts?.volume ?? 1;
    if (opts?.pos) {
      const p = this.makePanner(opts.pos);
      g.connect(p).connect(this.sfxBus);
      if (reverb > 0) { const s = ctx.createGain(); s.gain.value = reverb; p.connect(s).connect(this.reverbSend); }
    } else {
      g.connect(this.sfxBus);
      if (reverb > 0) { const s = ctx.createGain(); s.gain.value = reverb; g.connect(s).connect(this.reverbSend); }
    }
    return g;
  }

  private makePanner(pos: Vec3): PannerNode {
    const p = this.ctx!.createPanner();
    p.panningModel = 'equalpower';
    p.distanceModel = 'inverse';
    p.refDistance = 2;
    p.maxDistance = 60;
    p.rolloffFactor = 1.3;
    p.positionX.value = pos.x; p.positionY.value = pos.y; p.positionZ.value = pos.z;
    return p;
  }

  /** Enveloped oscillator note. */
  tone(dest: AudioNode, type: OscillatorType, freq: number, start: number, dur: number, vol: number, attack = 0.005, freqEnd?: number): OscillatorNode {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, start);
    if (freqEnd) o.frequency.exponentialRampToValueAtTime(Math.max(1, freqEnd), start + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), start + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    o.connect(g).connect(dest);
    o.start(start);
    o.stop(start + dur + 0.05);
    return o;
  }

  /** Filtered noise burst. */
  burst(dest: AudioNode, start: number, dur: number, vol: number, type: BiquadFilterType, freq: number, q = 1, freqEnd?: number, attack = 0.003): void {
    const ctx = this.ctx!;
    const s = this.noiseSrc();
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(freq, start);
    if (freqEnd) f.frequency.exponentialRampToValueAtTime(freqEnd, start + dur);
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), start + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    s.connect(f).connect(g).connect(dest);
    s.start(start, Math.random());
    s.stop(start + dur + 0.05);
  }

  // ───────────────────────── one-shots ─────────────────────────
  sfx(name: string, opts?: SfxOpts): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + 0.005;
    const r = opts?.rate ?? 1;
    switch (name) {
      case 'step': {
        const o = this.out(opts, 0.12);
        const surf = opts?.surface ?? 'concrete';
        const f = surf === 'carpet' ? 450 : surf === 'grate' || surf === 'metal' ? 1600 : 900;
        this.burst(o, t, surf === 'carpet' ? 0.08 : 0.06, 0.22, 'bandpass', f * (0.85 + Math.random() * 0.3), 1.2);
        this.burst(o, t, 0.05, 0.12, 'lowpass', 220, 0.7);
        if (surf === 'grate' || surf === 'metal') this.tone(o, 'sine', 2300 + Math.random() * 900, t, 0.09, 0.02);
        break;
      }
      case 'land': {
        const o = this.out(opts, 0.2);
        this.tone(o, 'sine', 110, t, 0.2, 0.35, 0.005, 45);
        this.burst(o, t, 0.12, 0.25, 'lowpass', 600, 0.7);
        break;
      }
      case 'jump': this.burst(this.out(opts, 0.1), t, 0.18, 0.08, 'bandpass', 1400, 0.8, 700, 0.03); break;
      case 'door': {
        const o = this.out(opts, 0.25);
        const osc = this.tone(o, 'sawtooth', 70, t, 0.75, 0.05, 0.08, 120);
        void osc;
        this.burst(o, t, 0.7, 0.12, 'bandpass', 500, 1.5, 900, 0.1);
        this.tone(o, 'sine', 60, t + 0.72, 0.25, 0.3, 0.005, 35);
        this.burst(o, t + 0.72, 0.1, 0.2, 'lowpass', 900);
        break;
      }
      case 'doorLocked': {
        const o = this.out(opts, 0.15);
        this.tone(o, 'square', 196, t, 0.14, 0.07);
        this.tone(o, 'square', 185, t + 0.18, 0.2, 0.07);
        break;
      }
      case 'keypad': this.tone(this.out(opts, 0.05), 'sine', 1050 + Math.random() * 60, t, 0.09, 0.12); break;
      case 'keypadOk': { const o = this.out(opts, 0.1); this.tone(o, 'sine', 880, t, 0.12, 0.14); this.tone(o, 'sine', 1320, t + 0.12, 0.25, 0.14); break; }
      case 'keypadBad': { const o = this.out(opts, 0.1); this.tone(o, 'sawtooth', 140, t, 0.35, 0.1); break; }
      case 'pickup': { const o = this.out(opts, 0.2); this.burst(o, t, 0.05, 0.15, 'highpass', 2500); this.tone(o, 'sine', 740, t + 0.03, 0.4, 0.08); this.tone(o, 'sine', 1110, t + 0.1, 0.5, 0.05); break; }
      case 'paper': { const o = this.out(opts, 0.05); for (let i = 0; i < 5; i++) this.burst(o, t + i * 0.05 + Math.random() * 0.03, 0.08, 0.08, 'bandpass', 3000 + Math.random() * 2500, 0.9); break; }
      case 'clue': { const o = this.out(undefined, 0.6); [659, 988].forEach((f, i) => { this.tone(o, 'sine', f, t + i * 0.16, 1.6, 0.06, 0.01); this.tone(o, 'sine', f * 2.76, t + i * 0.16, 0.6, 0.015); }); break; }
      case 'secret': { const o = this.out(undefined, 0.8); [311, 370, 466].forEach((f, i) => this.tone(o, 'triangle', f, t + i * 0.22, 2.2, 0.06, 0.05)); break; }
      case 'achievement': { const o = this.out(undefined, 0.6); [523, 659, 784, 1046].forEach((f, i) => this.tone(o, 'triangle', f, t + i * 0.07, 1.4, 0.05, 0.01)); break; }
      case 'flashlight': { const o = this.out(opts, 0.02); this.burst(o, t, 0.03, 0.25, 'highpass', 3000); this.tone(o, 'square', 2600, t, 0.02, 0.05); break; }
      case 'zap': case 'arc': {
        const o = this.out(opts, 0.2);
        for (let i = 0; i < 9; i++) this.burst(o, t + Math.random() * 0.35, 0.03 + Math.random() * 0.04, 0.35, 'highpass', 1800 + Math.random() * 3000);
        this.tone(o, 'sawtooth', 60, t, 0.4, 0.12, 0.005, 58);
        break;
      }
      case 'powerDown': { const o = this.out(undefined, 0.5); this.tone(o, 'sawtooth', 220, t, 1.6, 0.14, 0.01, 22); this.tone(o, 'sine', 55, t + 0.1, 1.2, 0.3, 0.01, 30); this.burst(o, t, 0.2, 0.3, 'lowpass', 400); break; }
      case 'powerUp': { const o = this.out(undefined, 0.4); this.tone(o, 'sawtooth', 30, t, 1.4, 0.12, 0.4, 180); this.tone(o, 'sine', 60, t, 1.6, 0.2, 0.6, 120); break; }
      case 'glitch': { const o = this.out(opts, 0.1); for (let i = 0; i < 12; i++) this.tone(o, 'square', 80 + Math.random() * 1600, t + i * 0.035, 0.03, 0.06); break; }
      case 'whoosh': this.burst(this.out(opts, 0.4), t, 0.9 / r, 0.25, 'bandpass', 300, 1.4, 3000, 0.25); break;
      case 'metal': {
        const o = this.out(opts, 0.5);
        [1, 2.76, 5.4, 8.93].forEach((m, i) => this.tone(o, 'sine', 180 * m * (0.95 + Math.random() * 0.1), t, 1.4 - i * 0.25, 0.08 / (i + 1)));
        this.burst(o, t, 0.05, 0.2, 'highpass', 1200);
        break;
      }
      case 'heartbeat': { const o = this.out(undefined, 0); this.tone(o, 'sine', 62, t, 0.16, 0.5, 0.01, 40); this.tone(o, 'sine', 58, t + 0.24, 0.2, 0.35, 0.01, 38); break; }
      case 'breath': {
        const o = this.out(undefined, 0.05);
        const v = opts?.volume ?? 0.07;
        this.burst(o, t, 0.9, v, 'bandpass', 900, 0.8, 1300, 0.35);
        this.burst(o, t + 1.0, 1.1, v * 0.8, 'bandpass', 700, 0.8, 500, 0.3);
        break;
      }
      case 'hurt': { const o = this.out(undefined, 0.2); this.tone(o, 'sine', 90, t, 0.3, 0.5, 0.005, 40); this.burst(o, t, 0.25, 0.3, 'lowpass', 1000); break; }
      case 'death': { const o = this.out(undefined, 1); this.tone(o, 'sine', 70, t, 3.5, 0.6, 0.01, 20); this.burst(o, t, 3, 0.25, 'lowpass', 2000, 0.7, 80, 0.01); break; }
      case 'resetBoom': {
        const o = this.out(undefined, 1.2);
        this.tone(o, 'sine', 48, t, 4, 0.8, 0.02, 18);
        this.tone(o, 'sawtooth', 96, t, 2.5, 0.12, 0.02, 30);
        this.burst(o, t, 3, 0.45, 'lowpass', 6000, 0.5, 60, 0.01);
        break;
      }
      case 'swell': this.burst(this.out(opts, 0.8), t, 2.4 / r, 0.35, 'highpass', 200, 0.7, 6000, 2.2 / r); break;
      case 'type': { const o = this.out(opts, 0.03); for (let i = 0; i < 6; i++) this.burst(o, t + i * (0.07 + Math.random() * 0.06), 0.025, 0.2, 'bandpass', 2500 + Math.random() * 1500, 2); break; }
      case 'relay': { const o = this.out(opts, 0.4); this.tone(o, 'square', 50, t, 0.25, 0.25, 0.005, 35); this.burst(o, t, 0.1, 0.35, 'lowpass', 1500); this.tone(o, 'sawtooth', 110, t + 0.2, 1.4, 0.06, 0.3, 220); this.tone(o, 'sine', 880, t + 0.5, 1.2, 0.05, 0.05); break; }
      case 'generator': { const o = this.out(opts, 0.3); this.tone(o, 'sawtooth', 25, t, 2.2, 0.2, 0.4, 70); this.burst(o, t, 2, 0.25, 'lowpass', 200, 0.7, 700, 0.8); break; }
      case 'ui': this.tone(this.out(undefined, 0), 'sine', 1400, t, 0.04, 0.05); break;
      case 'uiBack': this.tone(this.out(undefined, 0), 'sine', 900, t, 0.05, 0.05); break;
      case 'static': this.burst(this.out(opts, 0.1), t, 1.2, 0.18, 'bandpass', 2200, 0.6); break;
      case 'whisper': {
        const o = this.out(opts, 0.9);
        for (let i = 0; i < 7; i++) {
          const st = t + i * 0.18 + Math.random() * 0.08;
          this.burst(o, st, 0.22, 0.12, 'bandpass', 1500 + Math.random() * 2500, 6, 800 + Math.random() * 800, 0.08);
        }
        break;
      }
      case 'sting': {
        const o = this.out(undefined, 1);
        [110, 116.5, 155.6, 233].forEach((f) => this.tone(o, 'sawtooth', f, t, 3, 0.07, 0.01, f * 0.97));
        this.burst(o, t, 1.2, 0.3, 'highpass', 3000, 0.6, 400, 0.005);
        break;
      }
      case 'observer': { const o = this.out(opts, 0.9); this.tone(o, 'sine', 41, t, 2.5, 0.5, 0.4); this.tone(o, 'sine', 43.5, t, 2.5, 0.3, 0.4); this.burst(o, t, 2, 0.05, 'bandpass', 4000, 8, 2000, 0.8); break; }
      case 'bell': { const o = this.out(undefined, 1.2); [1, 2.01, 2.76, 4.1].forEach((m, i) => this.tone(o, 'sine', 130.8 * m, t, 6 - i, 0.14 / (i + 1), 0.003)); break; }
      case 'phoneLift': { const o = this.out(opts, 0.1); this.burst(o, t, 0.08, 0.3, 'bandpass', 1200, 1); break; }
      case 'anchor': { const o = this.out(opts, 1); [220, 330, 440].forEach((f, i) => this.tone(o, 'sine', f * r, t + i * 0.05, 3, 0.1, 0.02)); this.tone(o, 'sine', 55 * r, t, 3, 0.4, 0.05); break; }
      default: break;
    }
  }

  // ───────────────────────── ambience ─────────────────────────
  private buildAmbience(): void {
    const ctx = this.ctx!;
    const n = this.noiseSrc();
    const nf = ctx.createBiquadFilter();
    nf.type = 'bandpass';
    const ng = ctx.createGain();
    ng.gain.value = 0;
    n.connect(nf).connect(ng).connect(this.ambBus);
    n.start();
    const hum = ctx.createOscillator();
    hum.type = 'sine';
    const hum2 = ctx.createOscillator();
    hum2.type = 'triangle';
    const hg = ctx.createGain();
    hg.gain.value = 0;
    hum.connect(hg);
    const h2g = ctx.createGain();
    h2g.gain.value = 0.3;
    hum2.connect(h2g).connect(hg);
    hg.connect(this.ambBus);
    hum.start(); hum2.start();
    // high air / ventilation hiss
    const air = this.noiseSrc();
    const af = ctx.createBiquadFilter();
    af.type = 'highpass';
    af.frequency.value = 5000;
    const ag = ctx.createGain();
    ag.gain.value = 0;
    air.connect(af).connect(ag).connect(this.ambBus);
    air.start();
    this.amb = { noiseFilter: nf, noiseGain: ng, hum, hum2, humGain: hg, airGain: ag };
    this.setZone('MENU', true);
  }

  setZone(zone: AreaId | 'MENU', immediate = false): void {
    if (!this.ctx || !this.amb) { this.zone = zone; return; }
    if (zone === this.zone && !immediate) return;
    this.zone = zone;
    this.applyZone(immediate ? 0.01 : 1.2);
  }

  private applyZone(tc: number): void {
    if (!this.ctx || !this.amb) return;
    const z = ZONES[this.zone];
    const t = this.ctx.currentTime;
    const a = this.amb;
    a.noiseFilter.frequency.setTargetAtTime(z.noiseF, t, tc);
    a.noiseFilter.Q.setTargetAtTime(z.noiseQ, t, tc);
    a.noiseGain.gain.setTargetAtTime(z.noise * this.duck, t, tc);
    a.hum.frequency.setTargetAtTime(z.humF * this.timeWarp, t, tc);
    a.hum2.frequency.setTargetAtTime(z.humF * 2.01 * this.timeWarp, t, tc);
    a.humGain.gain.setTargetAtTime(z.hum * this.duck, t, tc);
    a.airGain.gain.setTargetAtTime(z.air * this.duck, t, tc);
  }

  /** 0 = silence the world (power loss, frozen time), 1 = normal. */
  setDuck(v: number): void {
    if (Math.abs(v - this.duck) < 0.01) return;
    this.duck = v;
    this.applyZone(0.4);
  }

  /** Slows/pitches ambience and music (time distortion). 1 = normal. */
  setTimeWarp(v: number): void {
    if (Math.abs(v - this.timeWarp) < 0.01) return;
    this.timeWarp = v;
    this.applyZone(0.3);
    Music.setWarp(v);
  }

  setMuffle(on: boolean): void {
    if (!this.ctx || on === this.muffled) return;
    this.muffled = on;
    this.lowpass.frequency.setTargetAtTime(on ? 500 : 20000, this.ctx.currentTime, 0.3);
  }

  // ───────────────────────── positional emitters ─────────────────────────
  emitter(id: string, kind: EmitterKind, pos: Vec3, on: boolean): void {
    if (!this.ctx) return;
    let e = this.emitters.get(id);
    if (!e) {
      if (!on) return;
      e = this.createEmitter(id, kind, pos);
      this.emitters.set(id, e);
    }
    e.target = on ? 1 : 0;
    e.pos = pos;
  }

  private createEmitter(id: string, kind: EmitterKind, pos: Vec3): Emitter {
    const ctx = this.ctx!;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    const panner = this.makePanner(pos);
    const nodes: AudioScheduledSourceNode[] = [];
    gain.connect(panner).connect(this.sfxBus);
    const osc = (type: OscillatorType, f: number, v: number, dest: AudioNode = gain) => {
      const o = ctx.createOscillator(); o.type = type; o.frequency.value = f;
      const g = ctx.createGain(); g.gain.value = v; o.connect(g).connect(dest); o.start(); nodes.push(o); return o;
    };
    const noise = (type: BiquadFilterType, f: number, v: number, q = 1) => {
      const s = this.noiseSrc(); const fl = ctx.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q;
      const g = ctx.createGain(); g.gain.value = v; s.connect(fl).connect(g).connect(gain); s.start(); nodes.push(s); return g;
    };
    switch (kind) {
      case 'reactor': osc('sawtooth', 41, 0.05); osc('sine', 82, 0.25); noise('lowpass', 250, 0.5); break;
      case 'core': { osc('sine', 146.8, 0.08); osc('sine', 220.2, 0.05); osc('sine', 293.7, 0.04); osc('sine', 36.7, 0.35); noise('bandpass', 1800, 0.06, 6); break; }
      case 'generator': osc('sawtooth', 50, 0.06); osc('square', 100, 0.02); noise('lowpass', 400, 0.25); break;
      case 'server': osc('sine', 3150, 0.015); noise('bandpass', 900, 0.12, 0.6); break;
      case 'fan': noise('bandpass', 350, 0.25, 0.8); osc('sine', 38, 0.08); break;
      case 'radio': { noise('bandpass', 2000, 0.12, 0.5); const o = osc('sine', 440, 0.04); o.frequency.setValueAtTime(440, ctx.currentTime); break; }
      case 'arc': noise('highpass', 2500, 0.05); osc('sawtooth', 60, 0.03); break;
      case 'phone': {
        // 440+480 Hz ringing, gated 2s on / 4s off by an LFO-driven gain
        const ring = ctx.createGain(); ring.gain.value = 0; ring.connect(gain);
        osc('sine', 440, 0.12, ring); osc('sine', 480, 0.12, ring);
        const start = ctx.currentTime;
        for (let i = 0; i < 40; i++) {
          const s = start + i * 4;
          for (let k = 0; k < 40; k++) {
            ring.gain.setValueAtTime(k % 2 ? 0 : 1, s + k * 0.05);
          }
          ring.gain.setValueAtTime(0, s + 2);
        }
        break;
      }
      case 'alarm': {
        const o = osc('square', 660, 0.035);
        const lfo = ctx.createOscillator(); lfo.frequency.value = 1.1; const lg = ctx.createGain(); lg.gain.value = 180;
        lfo.connect(lg).connect(o.frequency); lfo.start(); nodes.push(lfo);
        const o2 = osc('sawtooth', 330, 0.02);
        lg.connect(o2.frequency);
        break;
      }
    }
    return { id, kind, pos, gain, panner, nodes, level: 0, target: 1 };
  }

  stopAllEmitters(): void {
    for (const e of this.emitters.values()) {
      e.nodes.forEach((n) => { try { n.stop(); } catch { /* already stopped */ } });
      e.gain.disconnect();
    }
    this.emitters.clear();
  }

  // ───────────────────────── per-frame ─────────────────────────
  update(dt: number, listener: { pos: Vec3; forward: Vec3 }): void {
    if (!this.ctx) return;
    const L = this.ctx.listener;
    const t = this.ctx.currentTime;
    if (L.positionX) {
      L.positionX.setTargetAtTime(listener.pos.x, t, 0.02);
      L.positionY.setTargetAtTime(listener.pos.y, t, 0.02);
      L.positionZ.setTargetAtTime(listener.pos.z, t, 0.02);
      L.forwardX.setTargetAtTime(listener.forward.x, t, 0.02);
      L.forwardY.setTargetAtTime(listener.forward.y, t, 0.02);
      L.forwardZ.setTargetAtTime(listener.forward.z, t, 0.02);
    }
    for (const e of this.emitters.values()) {
      e.level += (e.target * this.duck - e.level) * Math.min(1, dt * 3);
      e.gain.gain.setTargetAtTime(e.level, t, 0.05);
      e.panner.positionX.setTargetAtTime(e.pos.x, t, 0.05);
      e.panner.positionY.setTargetAtTime(e.pos.y, t, 0.05);
      e.panner.positionZ.setTargetAtTime(e.pos.z, t, 0.05);
    }
    // sparse random ambience one-shots per zone (creaks, drips, distant metal)
    this.randomTimer -= dt;
    if (this.randomTimer <= 0 && this.duck > 0.5 && this.zone !== 'MENU') {
      this.randomTimer = 5 + Math.random() * 12;
      const far = { x: listener.pos.x + (Math.random() - 0.5) * 30, y: 2, z: listener.pos.z + (Math.random() - 0.5) * 30 };
      const r = Math.random();
      if (this.zone === 'MAINTENANCE' || this.zone === 'REACTOR') this.sfx(r < 0.5 ? 'metal' : 'static', { pos: far, volume: 0.25 });
      else if (this.zone === 'ARCHIVES' || this.zone === 'DORMITORY') { if (r < 0.4) this.sfx('paper', { pos: far, volume: 0.25 }); }
      else if (r < 0.3) this.sfx('metal', { pos: far, volume: 0.12 });
    }
    Music.update();
  }

  // ───────────────────────── voice ─────────────────────────
  speak(text: string, voice: 'A13' | 'OBSERVER' | 'NONE'): void {
    if (voice === 'NONE' || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    if (this.settings && !this.settings.aiVoice) return;
    try {
      const u = new SpeechSynthesisUtterance(text.replace(/[…]/g, '...'));
      const voices = window.speechSynthesis.getVoices();
      const en = voices.find((v) => /en[-_]GB/i.test(v.lang)) ?? voices.find((v) => /^en/i.test(v.lang));
      if (en) u.voice = en;
      u.lang = 'en-GB';
      u.pitch = voice === 'OBSERVER' ? 0.1 : 0.55;
      u.rate = voice === 'OBSERVER' ? 0.7 : 0.88;
      u.volume = Math.min(1, (this.settings?.master ?? 0.8) * (this.settings?.sfx ?? 0.8) * 1.2);
      window.speechSynthesis.speak(u);
    } catch { /* speech unavailable */ }
  }

  cancelSpeech(): void {
    try { if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel(); } catch { /* ignore */ }
  }

  setMood(m: Mood): void { Music.setMood(m); }
  silence(seconds: number): void { Music.silence(seconds); }
}

export const Audio = new Engine();
export type AudioEngineT = Engine;
