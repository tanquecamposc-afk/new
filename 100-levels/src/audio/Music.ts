/**
 * Procedural music sequencer. Each theme is a compact description (tempo,
 * scale, chord progression, instruments, drum grooves); melodies are generated
 * deterministically from the theme seed so every world has a recognisable motif.
 * Intensity layers (0..2) add percussion and lead doubling for boss phases.
 */
import { RNG } from '../core/math';

const SCALES = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  harmonic: [0, 2, 3, 5, 7, 8, 11],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  penta: [0, 3, 5, 7, 10, 12, 15],
  whole: [0, 2, 4, 6, 8, 10, 12],
  dim: [0, 1, 3, 4, 6, 7, 9],
};
type ScaleName = keyof typeof SCALES;

export interface Theme {
  bpm: number;
  root: number; // midi note of the tonic (bass octave)
  scale: ScaleName;
  prog: number[]; // scale degrees, one per bar
  lead: { wave: OscillatorType; oct: number; density: number; vol: number; cutoff: number; decay: number } | null;
  bass: { wave: OscillatorType; pattern: string; vol: number; cutoff: number } | null;
  pad: { wave: OscillatorType; vol: number; cutoff: number } | null;
  arp: { wave: OscillatorType; pattern: number[]; vol: number; oct: number } | null;
  drums: { kick: string; snare: string; hat: string; vol: number } | null;
  seed: number;
  /** Horror style random dissonant stabs. */
  eerie?: boolean;
}

const K4 = 'x---x---x---x---', K_BREAK = 'x-----x---x-----', K_DRIVE = 'x---x---x---x-x-', K_HALF = 'x-------x-------', K_BOSS = 'x-x-x---x-x-x-x-';
const S_BACK = '----x-------x---', S_HALF = '--------x-------', S_BUSY = '----x--x----x-x-', S_NONE = '----------------';
const H8 = 'x-x-x-x-x-x-x-x-', H16 = 'xxxxxxxxxxxxxxxx', H_OFF = '--x---x---x---x-', H_NONE = '----------------';

const mk = (o: Partial<Theme> & { bpm: number; root: number; scale: ScaleName; prog: number[]; seed: number }): Theme => ({
  lead: { wave: 'square', oct: 2, density: 0.55, vol: 0.06, cutoff: 3200, decay: 0.25 },
  bass: { wave: 'sawtooth', pattern: 'x-x-x-x-x-x-x-x-', vol: 0.12, cutoff: 700 },
  pad: { wave: 'sawtooth', vol: 0.035, cutoff: 1200 },
  arp: null,
  drums: { kick: K4, snare: S_BACK, hat: H8, vol: 1 },
  ...o,
});

/** Boss theme factory: aggressive, fast, distinct per root/scale/wave. */
const boss = (root: number, scale: ScaleName, bpm: number, wave: OscillatorType, seed: number, arp = true): Theme =>
  mk({
    bpm, root, scale, seed, prog: [0, 0, 5, 6, 0, 3, 4, 4],
    lead: { wave, oct: 2, density: 0.7, vol: 0.06, cutoff: 3600, decay: 0.18 },
    bass: { wave: 'sawtooth', pattern: 'xxx-xxx-xx-xxx-x', vol: 0.13, cutoff: 900 },
    pad: { wave: 'sawtooth', vol: 0.04, cutoff: 1400 },
    arp: arp ? { wave: 'square', pattern: [0, 2, 4, 7, 4, 2], vol: 0.025, oct: 3 } : null,
    drums: { kick: K_BOSS, snare: S_BUSY, hat: H16, vol: 1.1 },
  });

export const THEMES_MUSIC: Record<string, Theme> = {
  menu: mk({ bpm: 92, root: 38, scale: 'minor', seed: 7, prog: [0, 5, 3, 4], lead: { wave: 'triangle', oct: 2, density: 0.35, vol: 0.07, cutoff: 2600, decay: 0.6 }, bass: { wave: 'sawtooth', pattern: 'x-------x---x---', vol: 0.12, cutoff: 500 }, pad: { wave: 'sawtooth', vol: 0.05, cutoff: 900 }, arp: { wave: 'sine', pattern: [0, 2, 4, 7], vol: 0.03, oct: 3 }, drums: { kick: K_HALF, snare: S_HALF, hat: H_OFF, vol: 0.8 } }),
  parkour: mk({ bpm: 128, root: 40, scale: 'dorian', seed: 11, prog: [0, 3, 4, 3], arp: { wave: 'square', pattern: [0, 4, 7, 4], vol: 0.025, oct: 3 }, drums: { kick: K4, snare: S_BACK, hat: H8, vol: 1 } }),
  puzzle: mk({ bpm: 96, root: 43, scale: 'lydian', seed: 23, prog: [0, 1, 0, 4], lead: { wave: 'sine', oct: 2, density: 0.4, vol: 0.08, cutoff: 3000, decay: 0.5 }, bass: { wave: 'triangle', pattern: 'x---x---x---x---', vol: 0.14, cutoff: 600 }, arp: { wave: 'triangle', pattern: [0, 2, 4, 6, 4, 2], vol: 0.035, oct: 3 }, drums: { kick: K_HALF, snare: S_NONE, hat: H_OFF, vol: 0.6 } }),
  combat: mk({ bpm: 140, root: 38, scale: 'harmonic', seed: 31, prog: [0, 5, 6, 4], lead: { wave: 'sawtooth', oct: 2, density: 0.6, vol: 0.05, cutoff: 2800, decay: 0.2 }, bass: { wave: 'sawtooth', pattern: 'x-xx-xx-x-xx-xx-', vol: 0.13, cutoff: 800 }, drums: { kick: K_DRIVE, snare: S_BACK, hat: H16, vol: 1.1 } }),
  racing: mk({ bpm: 150, root: 45, scale: 'minor', seed: 41, prog: [0, 5, 2, 6], lead: { wave: 'sawtooth', oct: 2, density: 0.65, vol: 0.05, cutoff: 4200, decay: 0.15 }, bass: { wave: 'square', pattern: 'xxxxxxxxxxxxxxxx', vol: 0.09, cutoff: 900 }, arp: { wave: 'square', pattern: [0, 7, 4, 7], vol: 0.03, oct: 3 }, drums: { kick: K4, snare: S_BACK, hat: H16, vol: 1.1 } }),
  horror: mk({ bpm: 60, root: 33, scale: 'dim', seed: 53, prog: [0, 1, 0, 6], lead: { wave: 'sine', oct: 3, density: 0.12, vol: 0.05, cutoff: 1800, decay: 1.4 }, bass: { wave: 'sine', pattern: 'x---------------', vol: 0.18, cutoff: 200 }, pad: { wave: 'sawtooth', vol: 0.04, cutoff: 500 }, drums: null, eerie: true }),
  stealth: mk({ bpm: 104, root: 40, scale: 'phrygian', seed: 61, prog: [0, 1, 0, 6], lead: { wave: 'triangle', oct: 2, density: 0.25, vol: 0.06, cutoff: 2200, decay: 0.3 }, bass: { wave: 'sine', pattern: 'x--x--x---x--x--', vol: 0.16, cutoff: 400 }, pad: { wave: 'sawtooth', vol: 0.03, cutoff: 700 }, drums: { kick: K_BREAK, snare: S_NONE, hat: H_OFF, vol: 0.7 } }),
  precision: mk({ bpm: 118, root: 45, scale: 'major', seed: 71, prog: [0, 4, 5, 3], lead: { wave: 'square', oct: 2, density: 0.45, vol: 0.05, cutoff: 3000, decay: 0.2 }, arp: { wave: 'triangle', pattern: [0, 2, 4, 2], vol: 0.03, oct: 3 }, drums: { kick: K4, snare: S_BACK, hat: H_OFF, vol: 0.9 } }),
  survival: mk({ bpm: 100, root: 41, scale: 'dorian', seed: 83, prog: [0, 6, 3, 4], lead: { wave: 'triangle', oct: 2, density: 0.4, vol: 0.07, cutoff: 2400, decay: 0.45 }, bass: { wave: 'triangle', pattern: 'x---x-x-x---x-x-', vol: 0.15, cutoff: 500 }, drums: { kick: K_BREAK, snare: S_HALF, hat: H8, vol: 0.8 } }),
  chaos: mk({ bpm: 160, root: 37, scale: 'whole', seed: 97, prog: [0, 3, 1, 5], lead: { wave: 'sawtooth', oct: 2, density: 0.75, vol: 0.05, cutoff: 4200, decay: 0.15 }, bass: { wave: 'sawtooth', pattern: 'xx-xx-xx-xx-x-x-', vol: 0.13, cutoff: 1000 }, arp: { wave: 'square', pattern: [0, 3, 6, 3], vol: 0.03, oct: 3 }, drums: { kick: K_BOSS, snare: S_BUSY, hat: H16, vol: 1.1 } }),
  classic: mk({ bpm: 140, root: 48, scale: 'major', seed: 101, prog: [0, 3, 4, 0], lead: { wave: 'square', oct: 1, density: 0.7, vol: 0.06, cutoff: 8000, decay: 0.12 }, bass: { wave: 'triangle', pattern: 'x-x-x-x-x-x-x-x-', vol: 0.15, cutoff: 4000 }, pad: null, arp: { wave: 'square', pattern: [0, 2, 4, 7], vol: 0.03, oct: 2 }, drums: { kick: K4, snare: S_BACK, hat: H8, vol: 0.7 } }),
  ending: mk({ bpm: 84, root: 38, scale: 'major', seed: 127, prog: [0, 4, 5, 3, 0, 4, 3, 4], lead: { wave: 'triangle', oct: 2, density: 0.45, vol: 0.08, cutoff: 3000, decay: 0.8 }, bass: { wave: 'sawtooth', pattern: 'x-------x-------', vol: 0.12, cutoff: 500 }, pad: { wave: 'sawtooth', vol: 0.06, cutoff: 1400 }, arp: { wave: 'sine', pattern: [0, 2, 4, 7, 9, 7, 4, 2], vol: 0.035, oct: 3 }, drums: { kick: K_HALF, snare: S_HALF, hat: H_OFF, vol: 0.7 } }),
  // Bosses — each with its own key, mode, tempo and timbre
  guardian: boss(40, 'minor', 138, 'square', 201),
  master: boss(43, 'dim', 120, 'triangle', 203),
  warrior: boss(38, 'harmonic', 150, 'sawtooth', 205),
  race: boss(45, 'minor', 164, 'sawtooth', 207),
  watcher: mk({ bpm: 170, root: 33, scale: 'dim', seed: 209, prog: [0, 1, 0, 1], lead: { wave: 'sawtooth', oct: 3, density: 0.3, vol: 0.04, cutoff: 1400, decay: 0.3 }, bass: { wave: 'sawtooth', pattern: 'x-x-x-x-x-x-x-x-', vol: 0.14, cutoff: 300 }, pad: { wave: 'sawtooth', vol: 0.05, cutoff: 500 }, drums: { kick: 'x---x---x---x---', snare: S_NONE, hat: H_NONE, vol: 1.2 }, eerie: true }),
  fortress: boss(40, 'phrygian', 132, 'triangle', 211, false),
  perfect: boss(45, 'major', 144, 'square', 213),
  apocalypse: boss(36, 'harmonic', 156, 'sawtooth', 215),
  fire: boss(40, 'phrygian', 148, 'sawtooth', 301),
  ice: boss(47, 'minor', 126, 'sine', 303),
  lightning: boss(42, 'whole', 168, 'square', 305),
  shadow: boss(35, 'dim', 118, 'triangle', 307, false),
  storm: boss(44, 'dorian', 150, 'sawtooth', 309),
  earth: boss(33, 'minor', 112, 'sawtooth', 311, false),
  serpent: boss(39, 'harmonic', 136, 'triangle', 313),
  ancient: boss(41, 'lydian', 124, 'square', 315),
  demon: boss(34, 'phrygian', 160, 'sawtooth', 317),
  destroyer: boss(36, 'dim', 172, 'square', 319),
  skyduel: boss(43, 'dorian', 150, 'square', 321),
  the100th: boss(38, 'harmonic', 158, 'sawtooth', 401),
  final_calm: mk({ bpm: 70, root: 38, scale: 'minor', seed: 403, prog: [0, 5, 3, 6], lead: { wave: 'sine', oct: 2, density: 0.25, vol: 0.07, cutoff: 2000, decay: 1 }, bass: { wave: 'sine', pattern: 'x---------------', vol: 0.15, cutoff: 300 }, pad: { wave: 'sawtooth', vol: 0.06, cutoff: 900 }, drums: null }),
};

const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

class Track {
  gain: GainNode;
  private step = 0;
  private nextTime = 0;
  private melody: (number | null)[] = [];
  intensity = 0;
  stopped = false;

  constructor(private ctx: AudioContext, out: AudioNode, private noise: AudioBuffer, readonly theme: Theme, readonly name: string) {
    this.gain = ctx.createGain();
    this.gain.gain.value = 0;
    this.gain.connect(out);
    this.nextTime = ctx.currentTime + 0.1;
    this.generateMelody();
  }

  private generateMelody() {
    const th = this.theme;
    const rng = new RNG(th.seed);
    const bars = th.prog.length;
    const scale = SCALES[th.scale];
    // 2-bar motif + variations for the rest (recognisable repetition)
    const motif: (number | null)[] = [];
    let last = 2;
    for (let i = 0; i < 32; i++) {
      const strong = i % 4 === 0;
      if (rng.next() < (th.lead?.density ?? 0.5) * (strong ? 1.3 : 0.8)) {
        last = Math.max(0, Math.min(scale.length + 3, last + rng.pick([-2, -1, -1, 0, 1, 1, 2, 3, -3])));
        motif.push(last);
      } else motif.push(null);
    }
    this.melody = [];
    for (let b = 0; b < bars; b += 2) {
      for (let i = 0; i < 32; i++) {
        const v = b >= 4 && i >= 24 && rng.chance(0.5) ? (motif[i] !== null ? (motif[i] as number) + 2 : null) : motif[i];
        this.melody.push(v);
      }
    }
  }

  private degreeToMidi(deg: number, chordRoot: number, octave: number) {
    const scale = SCALES[this.theme.scale];
    const idx = deg + chordRoot;
    const n = scale.length;
    const oct = Math.floor(idx / n);
    return this.theme.root + scale[((idx % n) + n) % n] + (oct + octave) * 12;
  }

  schedule() {
    if (this.stopped) return;
    const th = this.theme;
    const stepDur = 60 / th.bpm / 4;
    while (this.nextTime < this.ctx.currentTime + 0.15) {
      const t = this.nextTime;
      const s16 = this.step % 16;
      const bar = Math.floor(this.step / 16) % th.prog.length;
      const chord = th.prog[bar];
      // Bass
      if (th.bass && th.bass.pattern[s16] === 'x') {
        this.note(mtof(this.degreeToMidi(0, chord, 0)), t, stepDur * 1.8, th.bass.wave, th.bass.vol, th.bass.cutoff, 0.005, 0.2);
      }
      // Pad (chord at bar start)
      if (th.pad && s16 === 0) {
        for (const d of [0, 2, 4]) this.pad(mtof(this.degreeToMidi(d, chord, 2)), t, stepDur * 16, th.pad.wave, th.pad.vol, th.pad.cutoff);
      }
      // Arp
      if (th.arp && (this.intensity >= 1 || th.drums === null || th.bpm < 100) && s16 % 2 === 0) {
        const d = th.arp.pattern[(s16 / 2) % th.arp.pattern.length];
        this.note(mtof(this.degreeToMidi(d, chord, th.arp.oct)), t, stepDur * 1.5, th.arp.wave, th.arp.vol, 3500, 0.005, 0.12);
      }
      // Lead
      if (th.lead && s16 % 2 === 0) {
        const mi = (Math.floor(this.step / 2)) % this.melody.length;
        const deg = this.melody[mi];
        if (deg !== null && deg !== undefined) {
          const f = mtof(this.degreeToMidi(deg, chord, th.lead.oct));
          this.note(f, t, stepDur * 2 * (1 + th.lead.decay), th.lead.wave, th.lead.vol, th.lead.cutoff, 0.01, th.lead.decay);
          if (this.intensity >= 2) this.note(f * 2, t, stepDur * 2, th.lead.wave, th.lead.vol * 0.4, th.lead.cutoff, 0.01, th.lead.decay);
        }
      }
      // Eerie stabs
      if (th.eerie && s16 === 0 && Math.random() < 0.35) {
        const m = th.root + 24 + Math.floor(Math.random() * 12);
        this.pad(mtof(m), t, 3, 'sine', 0.03, 1500);
        this.pad(mtof(m + 1), t, 3, 'sine', 0.025, 1500);
      }
      // Drums
      if (th.drums) {
        const dv = th.drums.vol;
        if (th.drums.kick[s16] === 'x') this.kick(t, 0.5 * dv);
        if (th.drums.snare[s16] === 'x') this.snare(t, 0.22 * dv);
        const hat = this.intensity >= 1 ? H16 : th.drums.hat;
        if (hat[s16] === 'x') this.hat(t, (s16 % 4 === 2 ? 0.07 : 0.045) * dv);
        if (this.intensity >= 2 && s16 === 15 && bar % 2 === 1) this.snare(t, 0.2 * dv);
      }
      this.nextTime += stepDur;
      this.step++;
    }
  }

  private note(f: number, t: number, dur: number, wave: OscillatorType, vol: number, cutoff: number, attack: number, decay: number) {
    const c = this.ctx;
    const o = c.createOscillator();
    o.type = wave;
    o.frequency.value = f;
    const fl = c.createBiquadFilter();
    fl.type = 'lowpass';
    fl.frequency.setValueAtTime(cutoff, t);
    fl.frequency.exponentialRampToValueAtTime(Math.max(200, cutoff * 0.4), t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(attack + 0.02, Math.min(dur, decay + 0.08)));
    o.connect(fl).connect(g).connect(this.gain);
    o.start(t);
    o.stop(t + dur + 0.1);
  }

  private pad(f: number, t: number, dur: number, wave: OscillatorType, vol: number, cutoff: number) {
    const c = this.ctx;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + dur * 0.3);
    g.gain.linearRampToValueAtTime(0.0001, t + dur);
    const fl = c.createBiquadFilter();
    fl.type = 'lowpass';
    fl.frequency.value = cutoff;
    fl.connect(g).connect(this.gain);
    for (const det of [-7, 7]) {
      const o = c.createOscillator();
      o.type = wave;
      o.frequency.value = f;
      o.detune.value = det;
      o.connect(fl);
      o.start(t);
      o.stop(t + dur + 0.05);
    }
  }

  private kick(t: number, vol: number) {
    const c = this.ctx;
    const o = c.createOscillator();
    const g = c.createGain();
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(40, t + 0.12);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    o.connect(g).connect(this.gain);
    o.start(t);
    o.stop(t + 0.32);
  }

  private snare(t: number, vol: number) {
    const c = this.ctx;
    const s = c.createBufferSource();
    s.buffer = this.noise;
    const f = c.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 1800;
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    s.connect(f).connect(g).connect(this.gain);
    s.start(t, Math.random());
    s.stop(t + 0.2);
    const o = c.createOscillator();
    const og = c.createGain();
    o.frequency.setValueAtTime(220, t);
    o.frequency.exponentialRampToValueAtTime(120, t + 0.08);
    og.gain.setValueAtTime(vol * 0.6, t);
    og.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
    o.connect(og).connect(this.gain);
    o.start(t);
    o.stop(t + 0.12);
  }

  private hat(t: number, vol: number) {
    const c = this.ctx;
    const s = c.createBufferSource();
    s.buffer = this.noise;
    const f = c.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = 7000;
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    s.connect(f).connect(g).connect(this.gain);
    s.start(t, Math.random());
    s.stop(t + 0.06);
  }

  fadeIn(time = 1.5) {
    this.gain.gain.setTargetAtTime(1, this.ctx.currentTime, time / 3);
  }
  fadeOut(time = 1.2) {
    this.gain.gain.setTargetAtTime(0, this.ctx.currentTime, time / 3);
    setTimeout(() => {
      this.stopped = true;
      this.gain.disconnect();
    }, time * 1000 + 600);
  }
}

export class MusicPlayer {
  private current: Track | null = null;
  private timer: number;

  constructor(private ctx: AudioContext, private out: AudioNode, private noise: AudioBuffer) {
    this.timer = window.setInterval(() => this.current?.schedule(), 25);
  }

  /** Play a theme (crossfades; replaying the same theme does nothing → no duplicated music). */
  play(name: string, intensity = 0) {
    const theme = THEMES_MUSIC[name] ?? THEMES_MUSIC.menu;
    if (this.current && this.current.name === name && !this.current.stopped) {
      this.current.intensity = intensity;
      return;
    }
    this.current?.fadeOut(1.2);
    const t = new Track(this.ctx, this.out, this.noise, theme, name);
    t.intensity = intensity;
    t.fadeIn(1.2);
    this.current = t;
  }

  setIntensity(i: number) {
    if (this.current) this.current.intensity = i;
  }

  stop(fade = 1.2) {
    this.current?.fadeOut(fade);
    this.current = null;
  }

  dispose() {
    window.clearInterval(this.timer);
  }
}
