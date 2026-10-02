/**
 * AudioService — efectos sintetizados en tiempo real con WebAudio (sin
 * archivos: carga instantánea y sin assets de terceros). Volúmenes
 * master/SFX/música. El contexto se crea tras la primera interacción del
 * usuario (política de autoplay de los navegadores).
 */
export class AudioService {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private sfx!: GainNode;
  private music!: GainNode;
  private noise: AudioBuffer | null = null;
  private lastBounce = 0;
  private volumes = { master: 0.8, sfx: 0.9, music: 0.5 };

  /** Llamar desde un gesto del usuario (pointerdown/keydown). */
  unlock(): void {
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.sfx = this.ctx.createGain();
      this.music = this.ctx.createGain();
      this.sfx.connect(this.master);
      this.music.connect(this.master);
      this.master.connect(this.ctx.destination);
      this.applyVolumes();
      const len = this.ctx.sampleRate * 0.5;
      this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noise.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  setVolumes(master: number, sfx: number, music: number): void {
    this.volumes = { master, sfx, music };
    this.applyVolumes();
  }

  private applyVolumes(): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(this.volumes.master, t, 0.02);
    this.sfx.gain.setTargetAtTime(this.volumes.sfx, t, 0.02);
    this.music.gain.setTargetAtTime(this.volumes.music, t, 0.02);
  }

  private tone(freq: number, dur: number, vol: number, type: OscillatorType = 'sine', delay = 0, slideTo?: number): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime + delay;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.sfx);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  private burst(dur: number, vol: number, freq: number, q = 1, delay = 0): void {
    const ctx = this.ctx;
    if (!ctx || !this.noise) return;
    const t = ctx.currentTime + delay;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = freq;
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(this.sfx);
    src.start(t);
    src.stop(t + dur + 0.02);
  }

  /** Golpe del putter: "tock" con cuerpo según la potencia. */
  hit(power: number): void {
    const v = 0.25 + power * 0.55;
    this.burst(0.05, v, 2400, 2);
    this.tone(210 + power * 60, 0.09, v * 0.8, 'sine', 0, 120);
  }

  /** Rebote contra pared: volumen según la velocidad del impacto. */
  bounce(speed: number): void {
    if (!this.ctx || speed < 0.4) return;
    const now = this.ctx.currentTime;
    if (now - this.lastBounce < 0.04) return;
    this.lastBounce = now;
    const v = Math.min(0.7, speed / 10);
    this.tone(480 + Math.random() * 60, 0.07, v, 'triangle');
    this.burst(0.03, v * 0.6, 1600, 3);
  }

  /** Bola en la copa: traqueteo + fanfarria corta. */
  hole(): void {
    [0, 0.07, 0.13].forEach((d, i) => this.burst(0.04, 0.35 - i * 0.08, 900 - i * 120, 4, d));
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => this.tone(f, 0.28, 0.22, 'triangle', 0.2 + i * 0.09));
  }

  hazard(): void {
    this.burst(0.35, 0.25, 500, 0.7);
    this.tone(330, 0.4, 0.2, 'sawtooth', 0.05, 110);
  }

  /** Cuenta atrás: pitido corto (3, 2, 1) y uno largo y agudo para GO. */
  countdown(isGo: boolean): void {
    if (isGo) {
      this.tone(1046.5, 0.45, 0.3, 'square');
      this.tone(1318.5, 0.45, 0.18, 'triangle', 0.02);
    } else {
      this.tone(659.25, 0.16, 0.25, 'square');
    }
  }

  ui(): void {
    this.tone(880, 0.05, 0.12, 'square');
  }

  dispose(): void {
    void this.ctx?.close();
    this.ctx = null;
  }
}
