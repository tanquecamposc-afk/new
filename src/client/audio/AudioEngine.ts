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
const MAX_VOICES = 26;
/** Beyond this distance a gunshot is not heard at all. */
const GUNSHOT_RANGE = 130;
const FOOTSTEP_RANGE = 22;

export type GunSound = 'ar' | 'smg' | 'shotgun' | 'sniper' | 'pistol' | 'melee';

interface Spatial {
  gain: number;
  pan: number;
}

export class AudioEngine {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private readonly buses: Partial<Record<Bus, GainNode>> = {};
  private noiseBuffer: AudioBuffer | null = null;
  private ambienceGain: GainNode | null = null;
  private slideGain: GainNode | null = null;
  private voices = 0;
  private volumes = { master: 0.8, sfx: 0.9, ambience: 0.4, ui: 0.7 };
  private listenerX = 0;
  private listenerY = 0;
  private listenerZ = 0;
  private listenerYaw = 0;
  private readonly spatialScratch: Spatial = { gain: 1, pan: 0 };

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

  /** Where the player's ears are (the camera) and which way they face. */
  setListener(x: number, y: number, z: number, yaw: number): void {
    this.listenerX = x;
    this.listenerY = y;
    this.listenerZ = z;
    this.listenerYaw = yaw;
  }

  /** Loudness and stereo position of a sound at a world position; null when out of earshot. */
  private locate(x: number, y: number, z: number, range: number): Spatial | null {
    const dx = x - this.listenerX;
    const dy = y - this.listenerY;
    const dz = z - this.listenerZ;
    const distance = Math.hypot(dx, dy, dz);
    if (distance >= range) return null;
    const falloff = 1 - distance / range;
    const out = this.spatialScratch;
    out.gain = falloff * falloff;
    // Component of the direction along the listener's right-hand side.
    const right = distance > 0.5 ? (dx * Math.cos(this.listenerYaw) - dz * Math.sin(this.listenerYaw)) / distance : 0;
    out.pan = Math.max(-1, Math.min(1, right)) * 0.85;
    return out;
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

  /* ---- combat ------------------------------------------------------------------------------ */

  /** A shot. With a position it is placed in the world; without one it is the player's own. */
  gunshot(kind: GunSound, x?: number, y?: number, z?: number): void {
    let gain = 1;
    let pan = 0;
    if (x !== undefined && y !== undefined && z !== undefined) {
      const spatial = this.locate(x, y, z, GUNSHOT_RANGE);
      if (!spatial) return;
      gain = spatial.gain * 0.85;
      pan = spatial.pan;
    }
    const jitter = 0.94 + Math.random() * 0.12;
    switch (kind) {
      case 'ar':
        this.noiseBurst('sfx', 1900 * jitter, 0.7, 0.11, 0.5 * gain, 560, 0, pan);
        this.tone('sfx', 'sine', 165 * jitter, 58, 0.09, 0.34 * gain, 0, pan);
        break;
      case 'smg':
        this.noiseBurst('sfx', 2700 * jitter, 0.8, 0.07, 0.4 * gain, 900, 0, pan);
        this.tone('sfx', 'triangle', 230 * jitter, 95, 0.05, 0.22 * gain, 0, pan);
        break;
      case 'shotgun':
        this.noiseBurst('sfx', 950 * jitter, 0.5, 0.28, 0.7 * gain, 190, 0, pan);
        this.tone('sfx', 'sine', 112 * jitter, 38, 0.22, 0.55 * gain, 0, pan);
        this.noiseBurst('sfx', 2400, 1.2, 0.05, 0.25 * gain, 1200, 0.34, pan); // pump
        break;
      case 'sniper':
        this.noiseBurst('sfx', 3300 * jitter, 0.6, 0.34, 0.62 * gain, 460, 0, pan);
        this.tone('sfx', 'sine', 132 * jitter, 34, 0.3, 0.6 * gain, 0, pan);
        this.noiseBurst('sfx', 620, 0.5, 0.55, 0.16 * gain, 240, 0.09, pan); // tail
        break;
      default:
        this.noiseBurst('sfx', 2250 * jitter, 0.8, 0.08, 0.42 * gain, 700, 0, pan);
        this.tone('sfx', 'sine', 195 * jitter, 70, 0.07, 0.3 * gain, 0, pan);
        break;
    }
  }

  dryFire(): void {
    this.noiseBurst('sfx', 3400, 3, 0.03, 0.2);
    this.tone('sfx', 'square', 1500, 1100, 0.025, 0.05);
  }

  reloadStart(): void {
    this.noiseBurst('sfx', 1700, 2.2, 0.05, 0.22);
    this.tone('sfx', 'triangle', 320, 210, 0.07, 0.1, 0.05);
  }

  reloadFinish(): void {
    this.noiseBurst('sfx', 2600, 2.5, 0.04, 0.24);
    this.tone('sfx', 'triangle', 420, 640, 0.06, 0.12, 0.03);
  }

  switchItem(): void {
    this.noiseBurst('sfx', 1300, 1.4, 0.06, 0.16, 2300);
  }

  /** Confirmation that one of the player's shots landed (reported by the simulation). */
  hitMarker(headshot: boolean, shield: boolean): void {
    const base = shield ? 1250 : 980;
    this.tone('ui', 'triangle', base, base * 0.8, 0.045, 0.2);
    if (headshot) this.tone('ui', 'sine', 1900, 2400, 0.09, 0.16, 0.02);
  }

  eliminationConfirm(): void {
    this.tone('ui', 'triangle', 660, 660, 0.12, 0.2);
    this.tone('ui', 'triangle', 990, 990, 0.22, 0.2, 0.09);
    this.tone('ui', 'sine', 1320, 1320, 0.3, 0.1, 0.09);
  }

  /** The player was hit. */
  hurt(shieldAbsorbed: boolean): void {
    if (shieldAbsorbed) {
      this.tone('sfx', 'sine', 720, 430, 0.1, 0.22);
      this.noiseBurst('sfx', 2800, 1.5, 0.06, 0.12);
    } else {
      this.tone('sfx', 'sine', 150, 70, 0.16, 0.42);
      this.noiseBurst('sfx', 500, 0.7, 0.1, 0.22);
    }
  }

  shieldBreak(): void {
    this.noiseBurst('sfx', 4200, 1.4, 0.3, 0.3, 900);
    this.tone('sfx', 'sawtooth', 880, 180, 0.3, 0.12);
  }

  pickup(kind: 'weapon' | 'consumable' | 'ammo'): void {
    if (kind === 'ammo') {
      this.noiseBurst('sfx', 2500, 2, 0.04, 0.16);
      this.tone('sfx', 'triangle', 520, 700, 0.06, 0.1);
    } else if (kind === 'weapon') {
      this.noiseBurst('sfx', 1500, 1.6, 0.07, 0.22);
      this.tone('sfx', 'triangle', 300, 450, 0.09, 0.14, 0.03);
    } else {
      this.tone('sfx', 'sine', 620, 930, 0.1, 0.14);
    }
  }

  useStart(): void {
    this.tone('sfx', 'sine', 260, 520, 0.4, 0.09);
  }

  useFinish(shield: boolean): void {
    const base = shield ? 660 : 523.25;
    this.tone('sfx', 'sine', base, base, 0.25, 0.16);
    this.tone('sfx', 'triangle', base * 1.5, base * 1.5, 0.35, 0.1, 0.07);
  }

  countdownBeep(final: boolean): void {
    if (final) {
      this.tone('ui', 'triangle', 880, 880, 0.4, 0.22);
      this.tone('ui', 'sine', 1320, 1320, 0.45, 0.1);
    } else {
      this.tone('ui', 'triangle', 440, 440, 0.12, 0.18);
    }
  }

  showdownPing(): void {
    this.tone('ui', 'sine', 1040, 1040, 0.5, 0.12);
    this.tone('ui', 'sine', 1560, 1560, 0.6, 0.06, 0.12);
  }

  victory(): void {
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5];
    notes.forEach((note, i) => {
      this.tone('sfx', 'triangle', note, note, 0.6, 0.17, i * 0.12);
      this.tone('sfx', 'sine', note * 2, note * 2, 0.5, 0.05, i * 0.12);
    });
  }

  defeat(): void {
    const notes = [392, 329.63, 261.63];
    notes.forEach((note, i) => this.tone('sfx', 'triangle', note, note * 0.97, 0.5, 0.16, i * 0.16));
  }

  /** Somebody else's footstep, placed in the world. */
  remoteFootstep(x: number, y: number, z: number, intensity: number): void {
    const spatial = this.locate(x, y, z, FOOTSTEP_RANGE);
    if (!spatial) return;
    this.noiseBurst('sfx', 620 + Math.random() * 180, 1.1, 0.07, 0.22 * intensity * spatial.gain, undefined, 0, spatial.pan);
  }

  /** An elimination somewhere in the world (not the player's own). */
  remoteElimination(x: number, y: number, z: number): void {
    const spatial = this.locate(x, y, z, 70);
    if (!spatial) return;
    this.noiseBurst('sfx', 3000, 1.2, 0.3, 0.18 * spatial.gain, 700, 0, spatial.pan);
    this.tone('sfx', 'sine', 700, 220, 0.3, 0.1 * spatial.gain, 0, spatial.pan);
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

  /** Routes a voice to its bus, through a stereo panner when it has a position. */
  private output(ctx: AudioContext, node: AudioNode, out: AudioNode, pan: number): void {
    if (pan !== 0 && typeof ctx.createStereoPanner === 'function') {
      const panner = ctx.createStereoPanner();
      panner.pan.value = pan;
      node.connect(panner).connect(out);
    } else {
      node.connect(out);
    }
  }

  private tone(bus: Bus, type: OscillatorType, from: number, to: number, seconds: number, volume: number, delay = 0, pan = 0): void {
    const ctx = this.context;
    const out = this.buses[bus];
    if (!ctx || !out || ctx.state !== 'running' || volume < 0.004 || !this.beginVoice(seconds + delay)) return;
    const start = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(from, start);
    if (to !== from) osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), start + seconds);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), start + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + seconds);
    osc.connect(gain);
    this.output(ctx, gain, out, pan);
    osc.start(start);
    osc.stop(start + seconds + 0.03);
  }

  private noiseBurst(bus: Bus, frequency: number, q: number, seconds: number, volume: number, sweepTo?: number, delay = 0, pan = 0): void {
    const ctx = this.context;
    const out = this.buses[bus];
    if (!ctx || !out || !this.noiseBuffer || ctx.state !== 'running' || volume < 0.004 || !this.beginVoice(seconds + delay)) return;
    const start = ctx.currentTime + delay;
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
    source.connect(filter).connect(gain);
    this.output(ctx, gain, out, pan);
    source.start(start, Math.random() * 1.5);
    source.stop(start + seconds + 0.03);
  }
}
