/**
 * AudioService — música y efectos sintetizados en tiempo real con WebAudio (sin
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
    if (this.pendingMood) {
      this.playMusic(this.pendingMood);
      this.pendingMood = null;
    }
  }

  private pendingMood: 'menu' | 'game' | null = null;

  /** Cambia la música; si el audio aún no está desbloqueado, empezará con el primer gesto. */
  setMusicMood(mood: 'menu' | 'game'): void {
    if (!this.ctx) {
      this.pendingMood = mood;
      return;
    }
    if (this.musicMood === mood && this.musicTimer) return;
    this.musicMood = mood;
    if (!this.musicTimer) this.playMusic(mood);
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

  /** Agua: chapoteo (ruido filtrado descendente + burbujas). */
  splash(): void {
    this.burst(0.5, 0.4, 900, 0.6);
    this.burst(0.25, 0.25, 2600, 1.2, 0.05);
    [0.08, 0.16, 0.25].forEach((d, i) => this.tone(420 + i * 90, 0.08, 0.08, 'sine', d, 700 + i * 120));
  }

  /** Arena: golpe sordo. */
  sand(): void {
    this.burst(0.18, 0.3, 380, 0.8);
  }

  /** Acelerador: "whoosh" ascendente. */
  whoosh(): void {
    this.tone(220, 0.35, 0.12, 'sawtooth', 0, 880);
    this.burst(0.3, 0.12, 1800, 0.8);
  }

  /** Golpe contra madera (aspas, barreras). */
  knock(speed: number): void {
    if (!this.ctx || speed < 0.4) return;
    const now = this.ctx.currentTime;
    if (now - this.lastBounce < 0.04) return;
    this.lastBounce = now;
    const v = Math.min(0.6, speed / 9);
    this.tone(180, 0.12, v, 'triangle', 0, 120);
    this.burst(0.05, v * 0.7, 700, 2);
  }

  click(): void {
    this.tone(1200, 0.035, 0.08, 'square');
  }

  coin(): void {
    this.tone(987.8, 0.08, 0.15, 'square');
    this.tone(1318.5, 0.25, 0.15, 'square', 0.08);
  }

  victory(): void {
    [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5].forEach((f, i) => this.tone(f, i === 5 ? 0.6 : 0.18, 0.2, 'triangle', i * 0.12));
  }

  levelUp(): void {
    [392, 523.25, 659.25, 783.99, 1046.5].forEach((f, i) => this.tone(f, 0.22, 0.18, 'square', i * 0.07));
  }

  // ---------------- Música generativa ----------------

  private musicTimer: ReturnType<typeof setInterval> | null = null;
  private musicMood: 'menu' | 'game' | null = null;
  private nextNoteTime = 0;
  private step = 0;

  /**
   * Música de fondo sintetizada (sin archivos): progresión I–vi–IV–V con pad,
   * bajo, arpegio y percusión suave. Programación con antelación sobre el
   * reloj de audio (sin saltos aunque el hilo principal vaya cargado).
   */
  playMusic(mood: 'menu' | 'game'): void {
    this.musicMood = mood;
    if (!this.ctx || this.musicTimer) return;
    this.nextNoteTime = this.ctx.currentTime + 0.1;
    this.step = 0;
    this.musicTimer = setInterval(() => this.scheduleMusic(), 50);
  }

  stopMusic(): void {
    if (this.musicTimer) clearInterval(this.musicTimer);
    this.musicTimer = null;
    this.musicMood = null;
  }

  private scheduleMusic(): void {
    const ctx = this.ctx;
    if (!ctx || !this.musicMood) return;
    const bpm = this.musicMood === 'menu' ? 92 : 104;
    const eighth = 60 / bpm / 2;
    // Acordes (semitonos desde C4 = 261.63 Hz): C, Am, F, G.
    const chords = [
      [0, 4, 7, 11],
      [-3, 0, 4, 7],
      [-7, -3, 0, 4],
      [-5, -1, 2, 5],
    ];
    const f = (semi: number, oct = 0) => 261.63 * Math.pow(2, semi / 12 + oct);
    while (this.nextNoteTime < ctx.currentTime + 0.25) {
      const t = this.nextNoteTime;
      const bar = Math.floor(this.step / 8) % 4;
      const beat = this.step % 8;
      const chord = chords[bar]!;
      if (beat === 0) for (const n of chord.slice(0, 3)) this.mtone(f(n), eighth * 8, 0.035, 'triangle', t, 1200);
      if (beat === 0 || beat === 4) this.mtone(f(chord[0]!, -2), eighth * 3.5, 0.12, 'sine', t, 600);
      const arp = [0, 1, 2, 3, 2, 1, 2, 3][beat]!;
      if (this.musicMood === 'game' || beat % 2 === 0) this.mtone(f(chord[arp]!, 1), eighth * 0.9, 0.035, 'square', t, 2400);
      if (this.musicMood === 'game' && beat % 2 === 1) this.mnoise(t, 0.04, 0.03);
      if (this.musicMood === 'game' && (beat === 2 || beat === 6)) this.mnoise(t, 0.12, 0.05, 1800);
      this.nextNoteTime += eighth;
      this.step++;
    }
  }

  private mtone(freq: number, dur: number, vol: number, type: OscillatorType, t: number, cutoff: number): void {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = cutoff;
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.08, dur * 0.3));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(lp).connect(g).connect(this.music);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  private mnoise(t: number, dur: number, vol: number, freq = 7000): void {
    const ctx = this.ctx!;
    if (!this.noise) return;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const hp = ctx.createBiquadFilter();
    hp.type = freq > 5000 ? 'highpass' : 'bandpass';
    hp.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(hp).connect(g).connect(this.music);
    src.start(t);
    src.stop(t + dur + 0.02);
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
    this.stopMusic();
    void this.ctx?.close();
    this.ctx = null;
  }
}
