/**
 * All sound is synthesized at runtime with the Web Audio API — there are no audio files, so
 * there is nothing to license. Buses: master -> (sfx | ui | ambience).
 *
 * The AudioContext is created lazily on the first user gesture, as browsers require.
 */
import type { SurfaceMaterial } from '../../core/sim/world.js';
import type { GameSettings } from '../../core/meta/settings.js';

type Bus = 'sfx' | 'ui' | 'ambience';

/** Never let more than this many one-shot voices overlap (docs/06 §6.8). */
const MAX_VOICES = 14;

export class AudioEngine {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private readonly buses: Partial<Record<Bus, GainNode>> = {};
  private noiseBuffer: AudioBuffer | null = null;
  private ambienceGain: GainNode | null = null;
  private slideGain: GainNode | null = null;
  private voices = 0;
  private volumes = { master: 0.8, sfx: 0.9, ambience: 0.4, ui: 0.7 };

  applySettings(settings: GameSettings): void {
    this.volumes = { ...settings.audio };
    const ctx = this.context;
    if (!ctx) return;
    const now = ctx.currentTime;
    this.master?.gain.setTargetAtTime(this.volumes.master, now, 0.03);
    this.buses.sfx?.gain.setTargetAtTime(this.volumes.sfx, now, 0.03);
    this.buses.ui?.gain.setTargetAtTime(this.volumes.ui, now, 0.03);
    this.buses.ambience?.gain.setTargetAtTime(this.volumes.ambience, now, 0.03);
  }

  /** Call from a click / key handler. Safe to call many times. */
  unlock(): void {
    try {
      if (!this.context) this.create();
      if (this.context?.state === 'suspended') void this.context.resume();
    } catch {
      // No audio device or blocked by policy: the game simply stays silent.
      this.context = null;
    }
  }

  suspend(): void {
    if (this.context?.state === 'running') void this.context.suspend();
  }

  /* ---- ambience ---------------------------------------------------------------------------- */

  /** Starts (or fades) the wind bed. `level` 0..1. */
  setAmbience(level: number): void {
    const ctx = this.context;
    if (!ctx || !this.buses.ambience || !this.noiseBuffer) return;
    if (!this.ambienceGain) {
      const source = ctx.createBufferSource();
      source.buffer = this.noiseBuffer;
      source.loop = true;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 420;
      filter.Q.value = 0.4;
      // A slow LFO on the filter makes the wind breathe.
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.09;
      const lfoDepth = ctx.createGain();
      lfoDepth.gain.value = 180;
      lfo.connect(lfoDepth).connect(filter.frequency);
      const gain = ctx.createGain();
      gain.gain.value = 0;
      source.connect(filter).connect(gain).connect(this.buses.ambience);
      source.start();
      lfo.start();
      this.ambienceGain = gain;
    }
    this.ambienceGain.gain.setTargetAtTime(0.16 * level, ctx.currentTime, 0.6);
  }

  /** Continuous scrape while sliding; pass 0 to stop. */
  setSlide(level: number): void {
    const ctx = this.context;
    if (!ctx || !this.buses.sfx || !this.noiseBuffer) return;
    if (!this.slideGain) {
      if (level <= 0) return;
      const source = ctx.createBufferSource();
      source.buffer = this.noiseBuffer;
      source.loop = true;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 1500;
      filter.Q.value = 0.8;
      const gain = ctx.createGain();
      gain.gain.value = 0;
      source.connect(filter).connect(gain).connect(this.buses.sfx);
      source.start();
      this.slideGain = gain;
    }
    this.slideGain.gain.setTargetAtTime(0.22 * level, ctx.currentTime, 0.05);
  }

  /* ---- one-shots --------------------------------------------------------------------------- */

  footstep(material: SurfaceMaterial, intensity: number): void {
    const tone: Record<SurfaceMaterial, [number, number]> = {
      grass: [520, 0.9],
      dirt: [640, 1.1],
      sand: [460, 0.8],
      rock: [1100, 1.6],
      wood: [760, 2.2],
      stone: [1000, 1.8],
      metal: [1500, 3.2],
      concrete: [900, 1.5],
      energy: [1800, 2.5],
    };
    const [frequency, q] = tone[material];
    const jitter = 0.9 + Math.random() * 0.2;
    this.noiseBurst('sfx', frequency * jitter, q, 0.075, 0.2 * intensity);
    if (material === 'metal' || material === 'wood') this.tone('sfx', 'triangle', 140 * jitter, 90, 0.06, 0.07 * intensity);
  }

  jump(): void {
    this.noiseBurst('sfx', 900, 0.7, 0.12, 0.14, 1700);
    this.tone('sfx', 'sine', 210, 330, 0.11, 0.07);
  }

  land(fallHeight: number): void {
    const power = Math.min(1, 0.25 + fallHeight / 6);
    this.tone('sfx', 'sine', 110, 46, 0.16, 0.34 * power);
    this.noiseBurst('sfx', 380, 0.6, 0.13, 0.3 * power);
  }

  slideStart(): void {
    this.noiseBurst('sfx', 2200, 0.9, 0.18, 0.16, 900);
  }

  mantle(): void {
    this.noiseBurst('sfx', 700, 1.2, 0.09, 0.18);
    this.tone('sfx', 'triangle', 180, 250, 0.14, 0.08);
  }

  checkpoint(index: number): void {
    const base = 523.25 * Math.pow(2, (index % 8) / 12);
    this.tone('sfx', 'sine', base, base, 0.5, 0.2);
    this.tone('sfx', 'triangle', base * 1.5, base * 1.5, 0.6, 0.12, 0.07);
    this.tone('sfx', 'sine', base * 2, base * 2, 0.7, 0.07, 0.14);
  }

  courseComplete(): void {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((note, i) => {
      this.tone('sfx', 'triangle', note, note, 0.55, 0.16, i * 0.11);
      this.tone('sfx', 'sine', note * 2, note * 2, 0.5, 0.05, i * 0.11);
    });
  }

  uiClick(): void {
    this.tone('ui', 'triangle', 880, 660, 0.06, 0.12);
  }

  uiHover(): void {
    this.tone('ui', 'sine', 1200, 1200, 0.03, 0.04);
  }

  uiBack(): void {
    this.tone('ui', 'triangle', 520, 390, 0.08, 0.1);
  }

  /* ---- internals --------------------------------------------------------------------------- */

  private create(): void {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    const ctx = new Ctor();
    const master = ctx.createGain();
    master.gain.value = this.volumes.master;
    // A gentle limiter keeps stacked effects from clipping.
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -10;
    limiter.ratio.value = 8;
    master.connect(limiter).connect(ctx.destination);
    for (const bus of ['sfx', 'ui', 'ambience'] as const) {
      const gain = ctx.createGain();
      gain.gain.value = this.volumes[bus];
      gain.connect(master);
      this.buses[bus] = gain;
    }
    const length = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    this.noiseBuffer = buffer;
    this.context = ctx;
    this.master = master;
  }

  private beginVoice(seconds: number): boolean {
    if (this.voices >= MAX_VOICES) return false;
    this.voices++;
    window.setTimeout(() => {
      this.voices--;
    }, seconds * 1000 + 60);
    return true;
  }

  private tone(bus: Bus, type: OscillatorType, from: number, to: number, seconds: number, volume: number, delay = 0): void {
    const ctx = this.context;
    const out = this.buses[bus];
    if (!ctx || !out || ctx.state !== 'running' || !this.beginVoice(seconds + delay)) return;
    const start = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(from, start);
    if (to !== from) osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), start + seconds);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), start + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + seconds);
    osc.connect(gain).connect(out);
    osc.start(start);
    osc.stop(start + seconds + 0.03);
  }

  private noiseBurst(bus: Bus, frequency: number, q: number, seconds: number, volume: number, sweepTo?: number): void {
    const ctx = this.context;
    const out = this.buses[bus];
    if (!ctx || !out || !this.noiseBuffer || ctx.state !== 'running' || !this.beginVoice(seconds)) return;
    const start = ctx.currentTime;
    const source = ctx.createBufferSource();
    source.buffer = this.noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(frequency, start);
    if (sweepTo !== undefined) filter.frequency.exponentialRampToValueAtTime(sweepTo, start + seconds);
    filter.Q.value = q;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(Math.max(0.0002, volume), start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + seconds);
    source.connect(filter).connect(gain).connect(out);
    source.start(start, Math.random() * 1.5);
    source.stop(start + seconds + 0.03);
  }
}
