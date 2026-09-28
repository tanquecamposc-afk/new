/**
 * Generative, mood-driven music. Each mood is a small procedural score that is
 * scheduled a little ahead of time; moods crossfade. `silence()` deliberately
 * removes all music for a while after important events.
 */
import type { Mood } from '../core/types';
import type { AudioEngineT } from './AudioEngine';

const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

interface Layer { gain: GainNode; }

class MusicImpl {
  private eng: AudioEngineT | null = null;
  private layers = new Map<Mood, Layer>();
  private mood: Mood = 'SILENCE';
  private nextBeat = 0;
  private beat = 0;
  private silentUntil = 0;
  private warp = 1;
  private filter!: BiquadFilterNode;

  attach(e: AudioEngineT) {
    this.eng = e;
    const ctx = e.ctx!;
    this.filter = ctx.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.frequency.value = 9000;
    this.filter.connect(e.musicBus);
    const moods: Mood[] = ['EXPLORATION', 'MYSTERY', 'TENSION', 'DANGER', 'CHASE', 'RESET', 'ENDING'];
    for (const m of moods) {
      const g = ctx.createGain();
      g.gain.value = 0;
      g.connect(this.filter);
      const send = ctx.createGain();
      send.gain.value = m === 'CHASE' || m === 'DANGER' ? 0.15 : 0.5;
      g.connect(send).connect(e.reverbSend);
      this.layers.set(m, { gain: g });
    }
    this.setMood(this.mood, true);
  }

  get current(): Mood { return this.mood; }

  setMood(m: Mood, force = false): void {
    if (m === this.mood && !force) return;
    this.mood = m;
    if (!this.eng?.ctx) return;
    const t = this.eng.ctx.currentTime;
    for (const [k, l] of this.layers) {
      const target = k === m && t >= this.silentUntil ? 1 : 0;
      l.gain.gain.cancelScheduledValues(t);
      l.gain.gain.setTargetAtTime(target, t, target ? 1.2 : 0.8);
    }
    this.nextBeat = Math.max(this.nextBeat, t + 0.05);
  }

  silence(seconds: number): void {
    if (!this.eng?.ctx) return;
    const t = this.eng.ctx.currentTime;
    this.silentUntil = t + seconds;
    for (const l of this.layers.values()) {
      l.gain.gain.cancelScheduledValues(t);
      l.gain.gain.setTargetAtTime(0, t, 0.15);
    }
  }

  setWarp(v: number): void {
    this.warp = v;
    if (this.eng?.ctx) this.filter.frequency.setTargetAtTime(v < 0.9 ? 900 : 9000, this.eng.ctx.currentTime, 0.3);
  }

  update(): void {
    const e = this.eng;
    if (!e?.ctx) return;
    const t = e.ctx.currentTime;
    if (this.silentUntil && t >= this.silentUntil) {
      this.silentUntil = 0;
      this.setMood(this.mood, true);
    }
    if (this.mood === 'SILENCE' || t < this.silentUntil) { this.nextBeat = t + 0.1; return; }
    const layer = this.layers.get(this.mood);
    if (!layer) return;
    const bpm = { EXPLORATION: 56, MYSTERY: 48, TENSION: 70, DANGER: 100, CHASE: 138, RESET: 40, ENDING: 52, SILENCE: 60 }[this.mood] * this.warp;
    const spb = 60 / bpm;
    while (this.nextBeat < t + 0.25) {
      this.schedule(this.mood, layer.gain, this.nextBeat, spb, this.beat);
      this.nextBeat += spb;
      this.beat++;
    }
  }

  private pad(dest: AudioNode, notes: number[], start: number, dur: number, vol: number, type: OscillatorType = 'sawtooth', cutoff = 700) {
    const ctx = this.eng!.ctx!;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = cutoff;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, start);
    g.gain.linearRampToValueAtTime(vol, start + dur * 0.35);
    g.gain.linearRampToValueAtTime(0.0001, start + dur);
    f.connect(g).connect(dest);
    for (const n of notes) {
      for (const det of [-6, 6]) {
        const o = ctx.createOscillator();
        o.type = type;
        o.frequency.value = midi(n) * this.warp;
        o.detune.value = det;
        o.connect(f);
        o.start(start);
        o.stop(start + dur + 0.1);
      }
    }
  }

  private schedule(m: Mood, dest: GainNode, t: number, spb: number, beat: number): void {
    const e = this.eng!;
    const rnd = Math.random();
    switch (m) {
      case 'EXPLORATION': {
        const prog = [[57, 60, 64], [53, 57, 60], [48, 55, 60, 64], [52, 55, 59]];
        if (beat % 8 === 0) this.pad(dest, prog[(beat / 8) % 4].map((n) => n - 12), t, spb * 8.5, 0.028, 'sawtooth', 600);
        if (rnd < 0.28) {
          const scale = [69, 72, 74, 76, 79, 81];
          e.tone(dest, 'triangle', midi(scale[Math.floor(Math.random() * scale.length)]) * this.warp, t, spb * 3, 0.035, 0.01);
        }
        break;
      }
      case 'MYSTERY': {
        if (beat % 8 === 0) this.pad(dest, [50, 57, 64], t, spb * 8.5, 0.022, 'triangle', 900);
        if (rnd < 0.22) {
          const scale = [74, 77, 79, 81, 84, 86];
          const f = midi(scale[Math.floor(Math.random() * scale.length)]) * this.warp;
          e.tone(dest, 'sine', f, t, 4, 0.03, 0.003);
          e.tone(dest, 'sine', f * 2.76, t, 1.5, 0.008, 0.003);
        }
        break;
      }
      case 'TENSION': {
        if (beat % 8 === 0) this.pad(dest, [33, 40], t, spb * 8.5, 0.05, 'sawtooth', 280);
        if (beat % 2 === 0) e.tone(dest, 'sine', 55 * this.warp, t, 0.3, 0.16, 0.01, 38);
        if (beat % 16 === 8) { this.pad(dest, [80, 81], t, spb * 6, 0.012, 'sine', 5000); }
        break;
      }
      case 'DANGER': {
        e.tone(dest, 'sawtooth', midi(beat % 4 === 3 ? 34 : 33) * this.warp, t, spb * 0.45, 0.07, 0.005);
        e.tone(dest, 'sawtooth', midi(33) * this.warp, t + spb / 2, spb * 0.4, 0.05, 0.005);
        if (beat % 4 === 0) { e.tone(dest, 'sine', 60, t, 0.35, 0.3, 0.003, 35); e.burst(dest, t, 0.25, 0.05, 'highpass', 4000); }
        if (beat % 8 === 4) this.pad(dest, [81, 82], t, spb * 3, 0.01, 'sine', 6000);
        break;
      }
      case 'CHASE': {
        e.tone(dest, 'sine', 70, t, 0.2, 0.4, 0.002, 40);
        e.burst(dest, t + spb / 2, 0.05, 0.06, 'highpass', 7000);
        if (beat % 2 === 1) e.burst(dest, t, 0.12, 0.12, 'bandpass', 1800, 1);
        const riff = [45, 45, 48, 45, 43, 45, 50, 48];
        e.tone(dest, 'sawtooth', midi(riff[beat % 8] - 12) * this.warp, t, spb * 0.8, 0.06, 0.005);
        if (beat % 8 === 0) this.pad(dest, [69, 70], t, spb * 4, 0.018, 'sawtooth', 3000);
        break;
      }
      case 'RESET': {
        if (beat % 4 === 0) this.pad(dest, [36, 37, 43], t, spb * 4.5, 0.05, 'sawtooth', 400);
        break;
      }
      case 'ENDING': {
        const prog = [[48, 55, 64], [43, 55, 62], [45, 57, 64], [41, 53, 60]];
        if (beat % 8 === 0) this.pad(dest, prog[(beat / 8) % 4], t, spb * 8.5, 0.03, 'triangle', 1400);
        if (rnd < 0.35) e.tone(dest, 'sine', midi([72, 74, 76, 79, 81, 84][Math.floor(Math.random() * 6)]), t, 3, 0.03, 0.005);
        break;
      }
      default: break;
    }
  }
}

export const Music = new MusicImpl();
